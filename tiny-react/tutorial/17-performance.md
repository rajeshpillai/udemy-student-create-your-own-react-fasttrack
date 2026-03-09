# Module 17: Performance — memo, Batching & Auto-Tracking

## What You'll Learn

- How `memo()` skips re-rendering components when props haven't changed
- How update batching merges multiple state changes into a single re-render
- How signal auto-tracking in components eliminates the need for `createEffect` wiring
- How these three optimizations work together

## The Problem

In our current framework, **any state change re-renders the entire component tree**. When you toggle one todo item:

1. `setTasks(...)` triggers TodoApp re-render
2. TodoApp produces new VDOM with all TodoItem children
3. **Every** TodoItem re-renders and diffs, even those that didn't change

With 100 items, that's 99 wasted re-renders. And if you call `setState` twice in the same click handler, you get two full re-renders instead of one.

## Fix 1: memo() — Skip Unchanged Components

### shallowEqual

First, a helper to compare props:

```js
function shallowEqual(objA, objB) {
  if (objA === objB) return true;
  if (!objA || !objB) return false;
  const keysA = Object.keys(objA).filter((k) => k !== "children" && k !== "key");
  const keysB = Object.keys(objB).filter((k) => k !== "children" && k !== "key");
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => objA[key] === objB[key]);
}
```

We skip `children` (always recreated, can't compare by reference) and `key` (used for reconciliation, not rendering).

### memo

```js
function memo(component, areEqual) {
  function MemoizedComponent(props) {
    return component(props);
  }
  MemoizedComponent._isMemo = true;
  MemoizedComponent._areEqual = areEqual || shallowEqual;
  return MemoizedComponent;
}
```

`memo` wraps a component function. The wrapper calls the original, but `diffFunctionalComponent` checks the `_isMemo` flag before re-rendering:

```js
// Inside diffFunctionalComponent, before re-rendering:
const componentFn = newVdom.type;
if (componentFn._isMemo) {
  const areEqual = componentFn._areEqual;
  if (areEqual(oldHookOwner._vdom.props || {}, newVdom.props || {})) {
    oldHookOwner._vdom = newVdom;
    return; // Props unchanged — skip re-render
  }
}
```

If props haven't changed, we update the vdom reference (so future comparisons use fresh props) and **return immediately** — no re-render, no diff of children. The entire subtree is skipped.

### Usage

```jsx
const TodoItem = TinyReact.memo(function TodoItem({ task, onDelete, onToggleComplete }) {
  // Only re-renders when task, onDelete, or onToggleComplete change
  return <li>{task.title}</li>;
});
```

**Important**: `memo` compares props by reference (`===`). This is why `useCallback` matters — it keeps function references stable across re-renders. Without `useCallback`, every re-render creates new function objects, defeating `memo`.

| Without useCallback | With useCallback |
|---|---|
| `onDelete` is a new function every render | `onDelete` is the same function |
| `memo` sees different props → re-renders | `memo` sees same props → skips |

## Fix 2: setState Batching

### The Problem

```js
function handleClick() {
  setName("Alice");   // re-render 1
  setAge(30);          // re-render 2
  setTheme("dark");    // re-render 3
}
```

Three state changes = three full re-renders. React batches these into one. Let's do the same.

### scheduleUpdate + flushBatch

```js
let pendingUpdates = new Set();
let isBatching = false;

function scheduleUpdate(callback) {
  pendingUpdates.add(callback);
  if (!isBatching) {
    isBatching = true;
    queueMicrotask(flushBatch);
  }
}

function flushBatch() {
  isBatching = false;
  const updates = [...pendingUpdates];
  pendingUpdates.clear();
  updates.forEach((fn) => fn());
}
```

How it works:

1. `scheduleUpdate` adds a re-render callback to a `Set` (duplicates auto-deduplicated)
2. First call schedules a microtask via `queueMicrotask`
3. Subsequent calls in the same synchronous block just add to the set — no new microtask
4. When JavaScript yields, the microtask runs: flush all pending updates in one batch

### Wire Into useState

```js
const setState = (newValue) => {
  const current = hooks[idx];
  const next = typeof newValue === "function" ? newValue(current) : newValue;
  if (next !== current) {
    hooks[idx] = next;
    scheduleUpdate(owner._rerender);  // Batched, not immediate
  }
};
```

The state value is updated immediately (so functional updates `prev => prev + 1` chain correctly), but the re-render is deferred to the microtask.

### Wire Into Class setState

```js
setState(nextState) {
  this.state = Object.assign({}, this.state, nextState);
  scheduleUpdate(this._rerender);  // Batched
}
```

### Wire Into Signal Writes

```js
function write(newValue) {
  const next = typeof newValue === "function" ? newValue(value) : newValue;
  if (next !== value) {
    value = next;
    [...subscribers].forEach((fn) => scheduleUpdate(fn));  // Batched
  }
}
```

Multiple signal writes in the same tick → one re-render.

### Preventing Double Re-renders

When a parent re-renders and diffs its children, it calls `diffFunctionalComponent` for each child component. If the child also has a pending batched update, it would re-render **twice** — once from the parent's diff, once from its own queued update.

Fix: cancel the child's pending update when the parent already re-renders it:

```js
// Inside diffFunctionalComponent, before re-rendering:
if (oldHookOwner._rerender) {
  pendingUpdates.delete(oldHookOwner._rerender);
}
```

## Fix 3: Signal Auto-Tracking in Components

### The Problem

Previously, signals required explicit wiring:

```js
// Old approach — manual createEffect bridge:
TinyReact.createEffect(() => {
  TinyReact.render(<TodoApp />, root);
});
```

Every signal change re-runs the entire render from scratch. No component-level granularity.

### The Fix

Set `currentTracker` during component renders. Any signal read auto-subscribes the component:

```js
function buildFunctionalComponent(vdom) {
  // ...create owner...

  if (!owner._rerender) {
    owner._rerender = () => reRenderFunctionalComponent(owner);
  }

  currentHookOwner = owner;
  hookIndex = 0;
  const prevTracker = currentTracker;
  currentTracker = owner._rerender;    // ← auto-track signals
  const result = vdom.type(vdom.props || {});
  currentTracker = prevTracker;
  currentHookOwner = null;

  return result;
}
```

Now when `TodoApp` calls `tasks()` during render, the signal subscribes `TodoApp._rerender`. When `tasks` changes, only TodoApp re-renders — not the entire app from the root.

### New Signals App — No createEffect for Rendering

```jsx
// Side effect (logging) still uses createEffect:
TinyReact.createEffect(() => {
  console.log(`Todo count: ${tasks().length}, theme: ${theme()}`);
});

// Just render once — signal changes auto-trigger component re-renders:
TinyReact.render(<TodoApp />, root);
```

The `createEffect` is still useful for non-rendering side effects. But for rendering, auto-tracking + batching handles everything.

## How All Three Work Together

When a user toggles a todo item:

1. `setTasks(prev => prev.map(...))` writes to the signal
2. Signal notifies subscribers → `scheduleUpdate(TodoApp._rerender)`
3. **Batching**: microtask runs → `reRenderFunctionalComponent(TodoApp)`
4. TodoApp re-renders, produces new VDOM with TodoItem children
5. `diffFunctionalComponent` runs for each TodoItem
6. **memo**: `shallowEqual(oldProps, newProps)` — only the changed item has different `task` prop
7. Unchanged TodoItems → `return` (skip re-render, skip diffing children)
8. Changed TodoItem → re-render, diff, minimal DOM update

Result: 1 re-render for TodoApp + 1 re-render for the changed item. 99 items skipped.

## Export memo

```js
const TinyReact = {
  // ...existing...
  memo,
};
```

## Test It

Both todo apps now use `memo`:

```jsx
const TodoItem = TinyReact.memo(function TodoItem({ task, ... }) {
  // ...
});
```

To verify memo is working:
1. Open DevTools → Console
2. Add `console.log("TodoItem render", task.id)` at the top of TodoItem
3. Toggle one item's completion
4. Only ONE TodoItem logs — the others are skipped by memo

To verify batching:
1. Add `console.log("render")` at the top of TodoApp
2. Click a button that triggers multiple state changes
3. Only ONE "render" log appears

## Key Takeaways

1. **`memo(Component)`** wraps a component to skip re-renders when props are shallowly equal
2. **`useCallback` + `memo`** work together — stable references prevent unnecessary re-renders
3. **`scheduleUpdate` + `queueMicrotask`** batches multiple state changes into one render
4. **`pendingUpdates` is a `Set`** — same component re-rendering twice is automatically deduplicated
5. **Signal auto-tracking** subscribes components to signals they read during render
6. **Parent diffs cancel child updates** — prevents double re-renders during top-down diffing

---

[Previous: Module 16 — Signals](./16-signals.md) | [Next: Module 18 — Fragments →](./18-fragments.md)

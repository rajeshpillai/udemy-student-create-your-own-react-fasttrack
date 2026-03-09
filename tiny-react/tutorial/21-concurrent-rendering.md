# Module 21: Concurrent Rendering — Priority-Based Scheduling

## What You'll Learn

- Why synchronous rendering blocks the main thread
- How priority lanes separate urgent and non-urgent updates
- How `startTransition` marks updates as low-priority
- How `requestIdleCallback` defers work to idle time

## The Problem

When you type in a search box that filters a large list:

```jsx
function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(allItems);

  function handleInput(e) {
    setQuery(e.target.value);                    // Must be instant (typing)
    setResults(filterItems(e.target.value));      // Can be deferred (list update)
  }

  return (
    <div>
      <input value={query} onInput={handleInput} />
      <ResultsList items={results} />
    </div>
  );
}
```

Both state changes trigger re-renders at the same priority. If `ResultsList` has 10,000 items, the input feels laggy because the browser can't paint the keystroke until the entire list re-renders.

React 18 solved this with **concurrent rendering**: some updates are urgent (typing), others are transitions (filtering the list). Urgent updates render immediately; transitions yield to the browser.

## Two Priority Lanes

| Priority | Scheduling | Use Case |
|---|---|---|
| **Immediate** | `queueMicrotask` | User input, clicks, keyboard events |
| **Transition** | `requestIdleCallback` / `setTimeout` | List filtering, data loading, background work |

### How It Works

```
User types "a":
  1. setQuery("a")          → IMMEDIATE → microtask → renders input instantly
  2. setResults(filtered)   → TRANSITION → idle callback → renders list when browser is free

Browser paints the input → user sees "a" immediately
Then browser is idle → list filters render
```

The input is never blocked by the list rendering.

## Build It

### Priority State

```js
let pendingUpdates = new Set();       // Immediate-priority queue
let pendingTransitions = new Set();    // Transition-priority queue
let isBatching = false;
let isTransitionBatching = false;
let isInsideTransition = false;        // Are we inside a startTransition callback?
```

### Updated scheduleUpdate

```js
function scheduleUpdate(callback) {
  if (isInsideTransition) {
    // Low-priority: defer to idle time
    pendingTransitions.add(callback);
    if (!isTransitionBatching) {
      isTransitionBatching = true;
      const schedule = typeof requestIdleCallback === "function"
        ? requestIdleCallback
        : (fn) => setTimeout(fn, 5);
      schedule(flushTransitions);
    }
  } else {
    // High-priority: flush on next microtask
    pendingUpdates.add(callback);
    if (!isBatching) {
      isBatching = true;
      queueMicrotask(flushBatch);
    }
  }
}
```

Key details:
- **`isInsideTransition`** — a simple flag set by `startTransition`
- **Immediate queue** → `queueMicrotask` (runs before next paint)
- **Transition queue** → `requestIdleCallback` (runs when browser is idle) with `setTimeout(fn, 5)` fallback

### Flush Functions

```js
function flushBatch() {
  isBatching = false;
  const updates = [...pendingUpdates];
  pendingUpdates.clear();
  updates.forEach((fn) => fn());
}

function flushTransitions() {
  isTransitionBatching = false;
  const updates = [...pendingTransitions];
  pendingTransitions.clear();
  updates.forEach((fn) => fn());
}
```

Both flush the same way — drain the queue and run all updates. The difference is **when** they're scheduled.

### startTransition

```js
function startTransition(callback) {
  isInsideTransition = true;
  callback();
  isInsideTransition = false;
}
```

That's it — three lines. Any `setState` calls inside the callback go to the transition queue instead of the immediate queue.

### Usage

```jsx
function handleInput(e) {
  // Urgent: update the input value immediately
  setQuery(e.target.value);

  // Non-urgent: filter the list when the browser is idle
  TinyReact.startTransition(() => {
    setResults(filterItems(e.target.value));
  });
}
```

## How requestIdleCallback Works

```
Frame timeline:
|-- JS (16ms budget) --|-- Paint --|-- Idle time --|-- Next frame --|

requestIdleCallback runs here ──────────────────↑
```

The browser calls your callback during **idle time** — after the current frame's work and paint are done, but before the next frame starts. If the browser is busy (animations, user input), the callback is delayed until there's an opening.

`setTimeout(fn, 5)` is the fallback for browsers without `requestIdleCallback`. The 5ms delay gives the browser a chance to paint first.

## Comparison

| Without startTransition | With startTransition |
|---|---|
| Input + list render in same microtask | Input renders in microtask, list in idle callback |
| User sees lag on keystroke | User sees instant keystroke |
| Single priority queue | Two priority queues |
| All updates are urgent | Developer marks non-urgent updates |

## Limitations of Our Implementation

Our concurrent rendering is simplified compared to React's:

1. **No fiber architecture**: React breaks the render tree into a linked list of "fibers" so it can pause mid-render. We still render synchronously once we start — we just delay *when* we start.
2. **No time-slicing**: React checks `shouldYield()` during tree traversal to pause and resume. We render the entire tree in one go.
3. **No lane system**: React has ~31 priority lanes. We have 2 (immediate + transition).
4. **No `useTransition` hook**: React's `useTransition` returns `[isPending, startTransition]` so components can show loading states.

The core idea is the same: **not all updates are equally urgent, and the scheduler should reflect that**.

## Export

```js
const TinyReact = {
  // ...existing...
  startTransition,
};
```

## Try It

1. Create a component with a text input and a large filtered list
2. Type quickly without `startTransition` — notice lag
3. Wrap the list update in `startTransition` — input stays responsive
4. Open DevTools → Performance → record while typing. Compare frame timing with and without transitions.

## Key Takeaways

1. **Two priority queues** separate urgent updates from transitions
2. **`startTransition(fn)`** marks state changes inside `fn` as low-priority
3. **Immediate updates** use `queueMicrotask` — render before next paint
4. **Transitions** use `requestIdleCallback` — render when the browser is idle
5. **The flag pattern** (`isInsideTransition`) is how the scheduler knows which queue to use
6. **Real concurrent rendering** (React Fiber) goes further with time-slicing and pause/resume — but the priority concept is the foundation

---

[Previous: Module 20 — Event Delegation](./20-event-delegation.md) | [Next: Module 22 — DevTools](./22-devtools.md)

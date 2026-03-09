# Module 16: Signals — Reactive State Without Hooks

## What You'll Learn

- What signals are and how they differ from hooks
- How auto-tracking works (no dependency arrays!)
- How to implement `createSignal`, `createEffect`, and `createMemo`
- How to build a todo app using signals instead of hooks

## Hooks vs Signals

With **hooks**, you manage state inside components and declare dependencies manually:

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  const doubled = useMemo(() => count * 2, [count]);  // Manual deps

  useEffect(() => {
    console.log(`Count: ${count}`);
  }, [count]);  // Manual deps again

  return <div>{doubled}</div>;
}
```

With **signals**, state lives outside components and dependencies are tracked automatically:

```jsx
const [count, setCount] = createSignal(0);
const doubled = createMemo(() => count() * 2);  // Auto-tracked!

createEffect(() => {
  console.log(`Count: ${count()}`);  // Auto-tracked!
});

function Counter() {
  return <div>{doubled()}</div>;
}
```

Key differences:

| | Hooks | Signals |
|---|---|---|
| State location | Inside components | Anywhere (module level) |
| Dependencies | Manual arrays `[count]` | Automatic tracking |
| Re-render trigger | `setState` → re-render entire component | Signal change → effect re-runs |
| Stale closures | Easy to create bugs | Impossible (always reads latest) |
| Rules | Must be top-level, same order | No rules — call anywhere |

## How Auto-Tracking Works

The secret is a global variable: `currentTracker`.

When `createEffect(fn)` runs `fn`, it sets `currentTracker` to itself. Any signal read during `fn` sees `currentTracker` and subscribes it. When the signal's value changes later, it notifies all subscribers.

```
1. createEffect starts → sets currentTracker = this effect
2. fn() runs → calls count() → count sees currentTracker → subscribes effect
3. fn() runs → calls theme() → theme sees currentTracker → subscribes effect
4. createEffect ends → clears currentTracker
5. Later: setCount(5) → count notifies subscribers → effect re-runs from step 1
```

No dependency array needed. The signal knows who read it.

## Build It

### createSignal

```js
let currentTracker = null;

function createSignal(initialValue) {
  let value = initialValue;
  const subscribers = new Set();

  function read() {
    if (currentTracker) {
      subscribers.add(currentTracker);
    }
    return value;
  }

  function write(newValue) {
    const next = typeof newValue === "function" ? newValue(value) : newValue;
    if (next !== value) {
      value = next;
      // Copy to avoid issues if a subscriber modifies the set during iteration
      [...subscribers].forEach((fn) => fn());
    }
  }

  return [read, write];
}
```

A signal is just a closure over `value` and `subscribers`:
- **`read()`** — returns the value. If something is tracking (an effect is running), it subscribes.
- **`write(newValue)`** — updates the value. If changed, notifies all subscribers. Supports functional updates like `setCount(prev => prev + 1)`.

### createEffect

```js
function createEffect(fn) {
  const execute = () => {
    const prev = currentTracker;
    currentTracker = execute;
    fn();
    currentTracker = prev;
  };
  execute();
}
```

1. Creates an `execute` wrapper that sets `currentTracker` before running `fn`
2. Runs immediately (establishes initial subscriptions)
3. Saves/restores `currentTracker` to support nested effects
4. When a subscribed signal changes, `execute` runs again — re-tracking dependencies

### createMemo

```js
function createMemo(fn) {
  const [read, write] = createSignal(undefined);
  createEffect(() => write(fn()));
  return read;
}
```

A memo is just a signal + an effect:
- The effect runs `fn()` and writes the result to a signal
- The effect auto-tracks whatever signals `fn` reads
- When those signals change, the effect re-runs, updating the memo's signal
- Anyone reading the memo subscribes to it just like any other signal

### Export

```js
const TinyReact = {
  // ...existing exports...
  createSignal,
  createEffect,
  createMemo,
};
```

## Bridging Signals to VDOM Rendering

Here's where it gets interesting. TinyReact uses VDOM diffing. How do signals trigger re-renders?

```jsx
TinyReact.createEffect(() => {
  TinyReact.render(<TodoApp />, root);
});
```

That's it! When `createEffect` runs:

1. Sets `currentTracker`
2. Calls `render()` → calls `TodoApp()` → reads `tasks()`, `theme()`, `remaining()`
3. Those signal reads subscribe this effect
4. Renders the VDOM, diffs against existing DOM

When any signal changes:

1. Effect re-runs → calls `render()` again
2. New VDOM is diffed against existing DOM → minimal updates

The entire re-render cycle is driven by one `createEffect`. No `useState`, no `useEffect`, no dependency arrays.

## The Signals Todo App

State lives at module level — plain signals, not inside any component:

```jsx
const [tasks, setTasks] = TinyReact.createSignal([
  { id: 1, title: "Build createElement", completed: true, edit: false },
  { id: 2, title: "Build signals", completed: true, edit: false },
]);

const [theme, setTheme] = TinyReact.createSignal("light");

const remaining = TinyReact.createMemo(
  () => tasks().filter((t) => !t.completed).length
);
```

Event handlers are plain functions — no `useCallback` needed since there are no stale closures:

```js
function addTodo() {
  if (!newTodoInput || newTodoInput.value.trim() === "") return;
  setTasks((prev) => [
    ...prev,
    { id: nextId++, title: newTodoInput.value.trim(), completed: false, edit: false },
  ]);
  newTodoInput.value = "";
  newTodoInput.focus();
}

function deleteTodo(task) {
  setTasks((prev) => prev.filter((t) => t.id !== task.id));
}

function toggleComplete(task) {
  setTasks((prev) =>
    prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
  );
}
```

Components just read signals and return VDOM:

```jsx
function TodoApp() {
  const currentTasks = tasks();
  const currentTheme = theme();
  const itemsLeft = remaining();

  return (
    <div>
      <h1>Todo App (Signals)</h1>
      <p>{itemsLeft} items remaining</p>
      <button onClick={() => setTheme((t) => t === "light" ? "dark" : "light")}>
        Toggle Theme
      </button>
      <ul>
        {currentTasks.map((task) => <TodoItem key={task.id} task={task} />)}
      </ul>
    </div>
  );
}
```

For DOM refs, we use plain variables instead of `useRef`:

```js
let newTodoInput = null;

// In JSX:
<input ref={(el) => { newTodoInput = el; }} />

// In handler:
newTodoInput.focus();
```

The render bridge — one line that connects signals to the UI:

```jsx
TinyReact.createEffect(() => {
  TinyReact.render(<TodoApp />, root);
});
```

## Compare: Hooks vs Signals

| Aspect | Hooks Todo | Signals Todo |
|---|---|---|
| State declaration | `useState` inside component | `createSignal` at module level |
| Derived state | `useMemo(() => ..., [tasks])` | `createMemo(() => ...)` — no deps |
| Side effects | `useEffect(() => ..., [deps])` | `createEffect(() => ...)` — no deps |
| Stable callbacks | `useCallback(fn, [])` needed | Plain functions — no stale closures |
| DOM refs | `useRef(null)` | Plain `let` variables |
| Theme | Context API + Provider | Signal read anywhere |
| Re-render trigger | `setState` inside component | Signal write → effect re-runs |
| Lines of code | More (hooks boilerplate) | Less (no dependency management) |

## Caveats

Our signal implementation is simplified:

1. **No cleanup**: Effects don't unsubscribe from old signals when dependencies change. In production, you'd clear old subscriptions on each re-run.
2. **No batching**: Multiple signal writes trigger multiple re-renders. Production implementations batch updates.
3. **No disposal**: Effects run forever. Production implementations let you dispose effects when components unmount.
4. **Infinite loop risk**: An effect that reads and writes the same signal will loop. Production implementations detect and prevent this.

These are all solvable — but the ~30 lines of signal code here teach the core concept.

## Try It

1. Open the Signals Todo from the landing page (or navigate to `todo-signals.html`)
2. **Add todos**: Type and press Enter or click Add
3. **Complete**: Double-click any item
4. **Edit**: Click Edit, modify text, click Save
5. **Delete**: Click Delete
6. **Theme**: Toggle dark/light mode
7. Open the console — no stale closure warnings, no dependency array bugs

## Key Takeaways

1. **Signals are reactive containers** — reading subscribes, writing notifies
2. **`currentTracker`** is the entire auto-tracking mechanism — one global variable
3. **`createMemo`** = signal + effect — derived state that auto-updates
4. **No dependency arrays** — signals track consumers automatically
5. **State lives outside components** — no hooks rules, no stale closures
6. **One `createEffect`** bridges signals to VDOM rendering — the entire app re-renders reactively

---

[Previous: Module 15 — Capstone: Todo App](./15-capstone-todo-app.md)

# Module 15: Capstone — Todo App

## What You'll Build

A complete Todo application using every feature of TinyReact:

| Feature | TinyReact API Used |
|---|---|
| Component structure | Functional components |
| State management | `useState` (tasks, theme) |
| Side effects | `useEffect` (logging) |
| DOM access | `useRef` (input focus) |
| Performance | `useMemo`, `useCallback` |
| Theme switching | `createContext`, `useContext` |
| List rendering | Keyed reconciliation |
| Inline editing | Conditional rendering |
| Completion toggle | Immutable state updates |

This is the proof that our ~500-line framework handles real application complexity.

## Architecture

```
TodoApp
├── ThemeContext.Provider (theme state)
├── Header + theme toggle button
├── Input + Add button (useRef for focus)
└── Task list (keyed)
    └── TodoItem × N
        ├── Display mode (double-click to complete)
        └── Edit mode (input + save button, useRef)
```

## The TodoApp Component

This is the root. It owns all state and passes callbacks down:

```jsx
function TodoApp() {
  const [tasks, setTasks] = TinyReact.useState([
    { id: 1, title: "Build createElement", completed: true, edit: false },
    { id: 2, title: "Build diffing algorithm", completed: true, edit: false },
    { id: 3, title: "Build hooks", completed: true, edit: false },
    { id: 4, title: "Build todo app", completed: false, edit: false },
  ]);
  const [theme, setTheme] = TinyReact.useState("light");
  const newTodoRef = TinyReact.useRef(null);
```

### Key Patterns

**Functional setState for safe updates:**
```js
setTasks((prev) => [...prev, newTodo]);  // Always based on latest state
setTasks((prev) => prev.filter((t) => t.id !== task.id));
setTasks((prev) => prev.map((t) => t.id === id ? { ...t, title } : t));
```

Never mutate state. Always create new arrays/objects with spread.

**useCallback for stable references:**
```js
const deleteTodo = TinyReact.useCallback((task) => {
  setTasks((prev) => prev.filter((t) => t.id !== task.id));
}, []);
```

Empty deps `[]` because it only uses `setTasks` (stable) and the `task` argument. No stale closure risk.

**useMemo for derived data:**
```js
const remaining = TinyReact.useMemo(
  () => tasks.filter((t) => !t.completed).length,
  [tasks]
);
```

Only recomputes when `tasks` changes.

**useRef for DOM access:**
```js
const newTodoRef = TinyReact.useRef(null);

// In JSX:
<input ref={(el) => { newTodoRef.current = el; }} />

// In handler:
const addTodo = () => {
  const input = newTodoRef.current;
  input.value = "";
  input.focus();  // Direct DOM manipulation
};
```

**useEffect for side effects:**
```js
TinyReact.useEffect(() => {
  console.log(`Todo count: ${tasks.length}, theme: ${theme}`);
}, [tasks.length, theme]);
```

Runs whenever the count or theme changes.

## The TodoItem Component

Each item reads theme from context and handles its own edit state:

```jsx
function TodoItem({ task, onDelete, onToggleComplete, onToggleEdit, onUpdateTask }) {
  const theme = TinyReact.useContext(ThemeContext);
  const inputRef = TinyReact.useRef(null);

  const itemStyle = TinyReact.useMemo(() => ({
    textDecoration: task.completed ? "line-through" : "none",
    backgroundColor: theme === "dark" ? "#2a2a2a" : "#fff",
  }), [theme, task.completed]);
```

### Conditional Rendering: Edit vs Display Mode

```jsx
{task.edit ? (
  <span>
    <input type="text" value={task.title} ref={(el) => { inputRef.current = el; }} />
    <button onClick={handleSave}>Save</button>
  </span>
) : (
  <span onDblClick={() => onToggleComplete(task)}>
    {task.title}
  </span>
)}
```

## Immutable State Updates

Every state change creates a new object/array. Never mutate:

```js
// WRONG — mutates existing object:
task.completed = !task.completed;
setTasks(tasks);

// RIGHT — creates new object:
setTasks(prev => prev.map(t =>
  t.id === task.id ? { ...t, completed: !t.completed } : t
));
```

The spread operator `{ ...t, completed: !t.completed }` creates a shallow copy with one property overridden. All other items in the array are reused by reference (efficient).

## Try It

1. **Add todos**: Type in the input, press Enter or click Add
2. **Complete**: Double-click any item
3. **Edit**: Click Edit, modify text, click Save
4. **Delete**: Click Delete
5. **Theme**: Toggle dark/light mode — all items update via context
6. **Focus**: After adding a todo, the input auto-focuses

## What You've Built

Step back and look at what you've created:

**A complete React-like framework from scratch:**
- `createElement` — JSX to VDOM conversion
- `render` — Initial mounting to the DOM
- `diff` — O(n) reconciliation with keyed support
- `Component` — Class components with setState and lifecycle
- `useState` — Functional state via hook arrays
- `useEffect` — Side effects with cleanup
- `useRef` — Persistent mutable refs
- `useMemo` / `useCallback` — Memoization
- `createContext` / `useContext` — Global state without prop drilling

**~500 lines of code.** That's all it takes to understand how React works under the hood.

## Where to Go Next

Ideas for extending TinyReact:
- **Fragments** (`<>...</>`) — render multiple elements without a wrapper
- **Error Boundaries** — catch errors in component trees
- **setState batching** — merge multiple setState calls into one render
- **Suspense** — show fallback UI while loading async data
- **Server-Side Rendering** — render VDOM to HTML strings
- **DevTools** — component tree inspector

---

[Previous: Module 14 — Context API](./14-context-api.md) | [Next: Module 16 — Signals →](./16-signals.md)

---

**Congratulations!** You've built React from scratch and understand every piece of how it works. No more black boxes.

**But wait — there's one more module.** In Module 16, we add **Signals** — a completely different paradigm for reactive state. Same todo app, zero hooks, zero dependency arrays. See how the same problem can be solved two different ways.

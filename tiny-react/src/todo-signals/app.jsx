import TinyReact from "../tiny-react";

// Module 16: Todo App using Signals — no hooks, no dependency arrays

const root = document.getElementById("root");

// ── Reactive State (lives outside components) ───────────────────────

const [tasks, setTasks] = TinyReact.createSignal([
  { id: 1, title: "Build createElement", completed: true, edit: false },
  { id: 2, title: "Build diffing algorithm", completed: true, edit: false },
  { id: 3, title: "Build signals", completed: true, edit: false },
  { id: 4, title: "Build todo app with signals", completed: false, edit: false },
]);

const [theme, setTheme] = TinyReact.createSignal("light");

// Derived state — auto-tracks `tasks` signal, recomputes when it changes
const remaining = TinyReact.createMemo(
  () => tasks().filter((t) => !t.completed).length
);

// ── Helpers ─────────────────────────────────────────────────────────

let nextId = 100;
let newTodoInput = null;
let editInputs = {};

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

function toggleEdit(task) {
  setTasks((prev) =>
    prev.map((t) => (t.id === task.id ? { ...t, edit: !t.edit } : t))
  );
}

function saveEdit(taskId) {
  const input = editInputs[taskId];
  if (input) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, title: input.value, edit: false } : t
      )
    );
  }
}

// ── TodoItem Component (memoized — skips re-render if props unchanged) ──

const TodoItem = TinyReact.memo(function TodoItem({ task }) {
  const currentTheme = theme();

  const itemStyle = {
    padding: "10px",
    borderBottom: "1px solid #ddd",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: currentTheme === "dark" ? "#2a2a2a" : "#fff",
    color: currentTheme === "dark" ? "#eee" : "#333",
    textDecoration: task.completed ? "line-through" : "none",
    opacity: task.completed ? "0.6" : "1",
  };

  return (
    <li key={task.id} style={itemStyle}>
      <div style={{ flex: "1" }}>
        {task.edit ? (
          <span>
            <input
              type="text"
              value={task.title}
              ref={(el) => { editInputs[task.id] = el; }}
              style={{ padding: "4px", fontSize: "14px" }}
            />
            <button onClick={() => saveEdit(task.id)} style={{ marginLeft: "4px" }}>
              Save
            </button>
          </span>
        ) : (
          <span
            onDblClick={() => toggleComplete(task)}
            style={{ cursor: "pointer" }}
          >
            {task.title}
          </span>
        )}
      </div>
      <div>
        <button onClick={() => toggleEdit(task)} style={{ marginRight: "4px" }}>
          {task.edit ? "Cancel" : "Edit"}
        </button>
        <button onClick={() => deleteTodo(task)} style={{ color: "red" }}>
          Delete
        </button>
      </div>
    </li>
  );
});

// ── TodoApp Component ───────────────────────────────────────────────

function TodoApp() {
  const currentTasks = tasks();
  const currentTheme = theme();
  const itemsLeft = remaining();

  const containerStyle = {
    maxWidth: "500px",
    margin: "20px auto",
    padding: "20px",
    fontFamily: "system-ui, sans-serif",
    backgroundColor: currentTheme === "dark" ? "#1a1a1a" : "#fafafa",
    color: currentTheme === "dark" ? "#eee" : "#333",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Todo App <span style={{ fontSize: "14px", color: "gray" }}>(Signals)</span></h1>
        <button onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}>
          {currentTheme === "light" ? "Dark" : "Light"} Mode
        </button>
      </div>
      <p style={{ color: "gray", fontSize: "12px" }}>
        Built with TinyReact Signals | {itemsLeft} item{itemsLeft !== 1 ? "s" : ""} remaining |
        Double-click to toggle complete
      </p>

      <div style={{ display: "flex", marginBottom: "16px" }}>
        <input
          type="text"
          ref={(el) => { newTodoInput = el; }}
          placeholder="What needs to be done?"
          onKeyDown={(e) => { if (e.key === "Enter") addTodo(); }}
          style={{ flex: "1", padding: "8px", fontSize: "14px", marginRight: "8px" }}
        />
        <button onClick={addTodo} style={{ padding: "8px 16px" }}>
          Add
        </button>
      </div>

      <ul style={{ listStyle: "none", padding: "0", margin: "0" }}>
        {currentTasks.map((task) => (
          <TodoItem key={task.id} task={task} />
        ))}
      </ul>
    </div>
  );
}

// ── Side effect: log changes (auto-tracks tasks and theme) ──────────

TinyReact.createEffect(() => {
  console.log(`Todo count: ${tasks().length}, theme: ${theme()}`);
});

// ── Render once — signal changes auto-trigger re-renders ────────────
// Components auto-subscribe to signals they read during render.
// When a signal changes, only subscribed components re-render (batched).

TinyReact.render(<TodoApp />, root);

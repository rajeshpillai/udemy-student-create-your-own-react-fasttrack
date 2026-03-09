import TinyReact from "../tiny-react";

// Module 15: Capstone — Todo App using all TinyReact features

const root = document.getElementById("root");

// ── Theme Context ──────────────────────────────────────────────────

const ThemeContext = TinyReact.createContext("light");

// ── TodoItem Component ─────────────────────────────────────────────

function TodoItem({ task, onDelete, onToggleComplete, onToggleEdit, onUpdateTask }) {
  const theme = TinyReact.useContext(ThemeContext);
  const inputRef = TinyReact.useRef(null);

  const itemStyle = TinyReact.useMemo(
    () => ({
      padding: "10px",
      borderBottom: "1px solid #ddd",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme === "dark" ? "#2a2a2a" : "#fff",
      color: theme === "dark" ? "#eee" : "#333",
      textDecoration: task.completed ? "line-through" : "none",
      opacity: task.completed ? "0.6" : "1",
    }),
    [theme, task.completed]
  );

  const handleSave = TinyReact.useCallback(() => {
    if (inputRef.current) {
      onUpdateTask(task.id, inputRef.current.value);
    }
  }, [task.id, onUpdateTask]);

  return (
    <li key={task.id} style={itemStyle}>
      <div style={{ flex: "1" }}>
        {task.edit ? (
          <span>
            <input
              type="text"
              value={task.title}
              ref={(el) => { inputRef.current = el; }}
              style={{ padding: "4px", fontSize: "14px" }}
            />
            <button onClick={handleSave} style={{ marginLeft: "4px" }}>Save</button>
          </span>
        ) : (
          <span
            onDblClick={() => onToggleComplete(task)}
            style={{ cursor: "pointer" }}
          >
            {task.title}
          </span>
        )}
      </div>
      <div>
        <button onClick={() => onToggleEdit(task)} style={{ marginRight: "4px" }}>
          {task.edit ? "Cancel" : "Edit"}
        </button>
        <button onClick={() => onDelete(task)} style={{ color: "red" }}>
          Delete
        </button>
      </div>
    </li>
  );
}

// ── TodoApp Component ──────────────────────────────────────────────

function TodoApp() {
  const [tasks, setTasks] = TinyReact.useState([
    { id: 1, title: "Build createElement", completed: true, edit: false },
    { id: 2, title: "Build diffing algorithm", completed: true, edit: false },
    { id: 3, title: "Build hooks", completed: true, edit: false },
    { id: 4, title: "Build todo app", completed: false, edit: false },
  ]);
  const [theme, setTheme] = TinyReact.useState("light");
  const newTodoRef = TinyReact.useRef(null);

  TinyReact.useEffect(() => {
    console.log(`Todo count: ${tasks.length}, theme: ${theme}`);
  }, [tasks.length, theme]);

  const addTodo = TinyReact.useCallback(() => {
    const input = newTodoRef.current;
    if (!input || input.value.trim() === "") return;

    setTasks((prev) => [
      ...prev,
      { id: Date.now(), title: input.value.trim(), completed: false, edit: false },
    ]);
    input.value = "";
    input.focus();
  }, []);

  const deleteTodo = TinyReact.useCallback((task) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  }, []);

  const toggleComplete = TinyReact.useCallback((task) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, completed: !t.completed } : t
      )
    );
  }, []);

  const toggleEdit = TinyReact.useCallback((task) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, edit: !t.edit } : t
      )
    );
  }, []);

  const updateTask = TinyReact.useCallback((taskId, newTitle) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, title: newTitle, edit: false } : t
      )
    );
  }, []);

  const remaining = TinyReact.useMemo(
    () => tasks.filter((t) => !t.completed).length,
    [tasks]
  );

  const containerStyle = TinyReact.useMemo(
    () => ({
      maxWidth: "500px",
      margin: "20px auto",
      padding: "20px",
      fontFamily: "system-ui, sans-serif",
      backgroundColor: theme === "dark" ? "#1a1a1a" : "#fafafa",
      color: theme === "dark" ? "#eee" : "#333",
      borderRadius: "8px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={theme}>
      <div style={containerStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>Todo App</h1>
          <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            {theme === "light" ? "Dark" : "Light"} Mode
          </button>
        </div>
        <p style={{ color: "gray", fontSize: "12px" }}>
          Built with TinyReact | {remaining} item{remaining !== 1 ? "s" : ""} remaining | Double-click to toggle complete
        </p>

        <div style={{ display: "flex", marginBottom: "16px" }}>
          <input
            type="text"
            ref={(el) => { newTodoRef.current = el; }}
            placeholder="What needs to be done?"
            onKeyDown={(e) => { if (e.key === "Enter") addTodo(); }}
            style={{ flex: "1", padding: "8px", fontSize: "14px", marginRight: "8px" }}
          />
          <button onClick={addTodo} style={{ padding: "8px 16px" }}>
            Add
          </button>
        </div>

        <ul style={{ listStyle: "none", padding: "0", margin: "0" }}>
          {tasks.map((task) => (
            <TodoItem
              key={task.id}
              task={task}
              onDelete={deleteTodo}
              onToggleComplete={toggleComplete}
              onToggleEdit={toggleEdit}
              onUpdateTask={updateTask}
            />
          ))}
        </ul>
      </div>
    </ThemeContext.Provider>
  );
}

TinyReact.render(<TodoApp />, root);

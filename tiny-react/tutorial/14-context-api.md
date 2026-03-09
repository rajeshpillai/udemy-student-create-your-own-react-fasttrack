# Module 14: Context API

## What You'll Learn

- What "prop drilling" is and why it's a problem
- How Context lets you share data without passing props through every level
- How to implement `createContext`, Provider, and `useContext`

## The Problem: Prop Drilling

Imagine a theme that needs to be available everywhere in your app:

```jsx
function App() {
  const [theme, setTheme] = useState("dark");
  return <Layout theme={theme} />;          // ← pass theme
}

function Layout({ theme }) {
  return <Sidebar theme={theme} />;         // ← pass theme (doesn't use it!)
}

function Sidebar({ theme }) {
  return <Button theme={theme} />;          // ← pass theme (doesn't use it!)
}

function Button({ theme }) {
  return <button className={theme}>OK</button>;  // ← finally uses it
}
```

`Layout` and `Sidebar` don't care about `theme` — they just forward it. As your app grows, this "prop drilling" becomes unmaintainable. You pass dozens of props through components that don't need them.

## The Solution: Context

Context creates a **broadcast channel**. A Provider at the top sets a value; any descendant can read it directly, skipping all intermediate components.

```jsx
const ThemeContext = createContext("light");

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Layout />     {/* No theme prop! */}
    </ThemeContext.Provider>
  );
}

function Button() {
  const theme = useContext(ThemeContext);  // Reads directly
  return <button className={theme}>OK</button>;
}
```

`Layout` and `Sidebar` don't even know `theme` exists. `Button` reads it straight from context.

## Build It

### createContext

```js
function createContext(defaultValue) {
  const context = {
    _value: defaultValue,
    _subscribers: new Set(),
    Provider: function ContextProvider(props) {
      context._value = props.value;
      if (props.children && props.children.length === 1) {
        return props.children[0];
      }
      return createElement("span", null, ...(props.children || []));
    },
  };
  return context;
}
```

The context object holds:
- **`_value`** — the current context value
- **`Provider`** — a functional component that sets the value and renders its children

The Provider is simple: it stores `props.value` on the context object, then returns its children. If there's exactly one child, it returns it directly (no wrapper element). Otherwise, it wraps in a `<span>`.

### useContext

```js
function useContext(context) {
  return context._value;
}
```

That's it! `useContext` just reads the current value from the context object. The Provider has already set it during its render (which happens before descendants render).

This works because of the top-down render order: the Provider renders first (setting `_value`), then its children render and can read the updated value.

### Limitation

Our implementation is simplified compared to React's:
- React's Context automatically re-renders consumers when the value changes
- Ours relies on the parent re-rendering (which re-renders children anyway through diffing)
- For this tutorial, this is sufficient — the parent's `setState` triggers a full diff that reaches all descendants

## Test It

```jsx
import TinyReact from "./tiny-react";

const root = document.getElementById("root");
const ThemeContext = TinyReact.createContext("light");

function ThemedButton() {
  const theme = TinyReact.useContext(ThemeContext);
  const style = theme === "dark"
    ? { background: "#333", color: "#fff", padding: "8px 16px" }
    : { background: "#eee", color: "#333", padding: "8px 16px" };

  return <button style={style}>I am {theme} themed!</button>;
}

function Toolbar() {
  return (
    <div>
      <p>Toolbar (no theme prop!)</p>
      <ThemedButton />
    </div>
  );
}

function App() {
  const [theme, setTheme] = TinyReact.useState("light");

  return (
    <div>
      <h1>Context Demo</h1>
      <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
        Toggle Theme ({theme})
      </button>
      <ThemeContext.Provider value={theme}>
        <Toolbar />
      </ThemeContext.Provider>
    </div>
  );
}

TinyReact.render(<App />, root);
```

Click "Toggle Theme":
- The button inside `Toolbar → ThemedButton` changes style
- `Toolbar` never receives a `theme` prop — it's read from context
- The context value flows through without prop drilling

## Key Takeaways

1. **Prop drilling** forces intermediate components to forward props they don't use
2. **`createContext(default)`** creates a context object with a Provider component
3. **`<Context.Provider value={...}>`** sets the context value for all descendants
4. **`useContext(context)`** reads the current value — one line, no props needed
5. **Top-down render order** ensures the Provider sets the value before consumers read it

---

[Previous: Module 13 — useEffect Hook](./13-useeffect-hook.md) | [Next: Module 15 — Capstone: Todo App →](./15-capstone-todo-app.md)

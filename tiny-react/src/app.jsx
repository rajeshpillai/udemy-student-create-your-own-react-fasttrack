import TinyReact from "./tiny-react";

// Module 14: Context API — share state without prop drilling

const root = document.getElementById("root");

// Create a theme context
const ThemeContext = TinyReact.createContext("light");

function ThemedButton() {
  const theme = TinyReact.useContext(ThemeContext);
  const style =
    theme === "dark"
      ? { background: "#333", color: "#fff", padding: "8px 16px", border: "none", borderRadius: "4px" }
      : { background: "#eee", color: "#333", padding: "8px 16px", border: "1px solid #ccc", borderRadius: "4px" };

  return <button style={style}>I am {theme} themed!</button>;
}

function Toolbar() {
  // No props needed — reads from context directly
  return (
    <div style={{ padding: "10px", marginTop: "10px" }}>
      <p>Toolbar component (no theme prop passed!)</p>
      <ThemedButton />
    </div>
  );
}

function App() {
  const [theme, setTheme] = TinyReact.useState("light");

  return (
    <div>
      <h1>Context API Demo</h1>
      <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
        Toggle Theme (current: {theme})
      </button>
      <ThemeContext.Provider value={theme}>
        <Toolbar />
      </ThemeContext.Provider>
    </div>
  );
}

TinyReact.render(<App />, root);

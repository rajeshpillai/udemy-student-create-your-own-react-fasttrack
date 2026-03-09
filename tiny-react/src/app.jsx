import TinyReact from "./tiny-react";

const root = document.getElementById("root");

function LandingPage() {
  const cardStyle = {
    display: "block",
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "16px",
    backgroundColor: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    textDecoration: "none",
    color: "inherit",
  };

  const tagStyle = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "bold",
    marginRight: "6px",
  };

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", fontFamily: "system-ui, sans-serif", padding: "0 20px" }}>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1 style={{ fontSize: "36px", marginBottom: "8px" }}>TinyReact</h1>
        <p style={{ color: "#666", fontSize: "16px", margin: "0" }}>
          A ~650-line React clone built from scratch. Two todo apps, two paradigms.
        </p>
      </div>

      <a href="/todo-hooks.html" style={cardStyle}>
        <h2 style={{ margin: "0 0 8px 0" }}>Todo App — Hooks</h2>
        <p style={{ color: "#666", margin: "0 0 12px 0", fontSize: "14px" }}>
          Built with useState, useEffect, useRef, useMemo, useCallback, and Context API.
          The classic React pattern — components re-render when state changes.
        </p>
        <span style={{ ...tagStyle, backgroundColor: "#e3f2fd", color: "#1565c0" }}>useState</span>
        <span style={{ ...tagStyle, backgroundColor: "#e8f5e9", color: "#2e7d32" }}>useEffect</span>
        <span style={{ ...tagStyle, backgroundColor: "#fff3e0", color: "#e65100" }}>useContext</span>
        <span style={{ ...tagStyle, backgroundColor: "#f3e5f5", color: "#7b1fa2" }}>useRef</span>
      </a>

      <a href="/todo-signals.html" style={cardStyle}>
        <h2 style={{ margin: "0 0 8px 0" }}>Todo App — Signals</h2>
        <p style={{ color: "#666", margin: "0 0 12px 0", fontSize: "14px" }}>
          Built with createSignal, createEffect, and createMemo.
          No hooks, no dependency arrays — reactive state auto-tracks its consumers.
        </p>
        <span style={{ ...tagStyle, backgroundColor: "#fce4ec", color: "#c62828" }}>createSignal</span>
        <span style={{ ...tagStyle, backgroundColor: "#e0f7fa", color: "#00695c" }}>createEffect</span>
        <span style={{ ...tagStyle, backgroundColor: "#fff9c4", color: "#f57f17" }}>createMemo</span>
      </a>

      <div style={{ textAlign: "center", marginTop: "32px", color: "#999", fontSize: "13px" }}>
        <p>
          16 tutorial modules | <a href="https://github.com/rajeshpillai/udemy-student-create-your-own-react-fasttrack" style={{ color: "#666" }}>Source on GitHub</a>
        </p>
      </div>
    </div>
  );
}

TinyReact.render(<LandingPage />, root);

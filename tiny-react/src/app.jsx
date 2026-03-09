import TinyReact from "./tiny-react";

// Module 12: useState — functional components with state!

const root = document.getElementById("root");

function Counter() {
  const [count, setCount] = TinyReact.useState(0);

  return (
    <div style={{ marginTop: "20px" }}>
      <h2>Counter (hooks): {count}</h2>
      <button onClick={() => setCount(count - 1)}>-</button>
      <span style={{ padding: "0 12px" }}>{count}</span>
      <button onClick={() => setCount(count + 1)}>+</button>
      <p style={{ color: "gray", fontSize: "12px" }}>
        Using functional setState: setCount(prev =&gt; prev + 1)
      </p>
      <button onClick={() => setCount((prev) => prev + 10)}>+10 (functional update)</button>
    </div>
  );
}

function NameCard() {
  const [name, setName] = TinyReact.useState("World");
  const [color, setColor] = TinyReact.useState("black");

  return (
    <div style={{ marginTop: "20px" }}>
      <h2 style={{ color: color }}>Hello, {name}!</h2>
      <input
        type="text"
        value={name}
        onInput={(e) => setName(e.target.value)}
        placeholder="Enter your name"
      />
      <button onClick={() => setColor(color === "black" ? "blue" : "black")}>
        Toggle color
      </button>
    </div>
  );
}

TinyReact.render(
  <div>
    <h1>useState Hook Demo</h1>
    <Counter />
    <NameCard />
  </div>,
  root
);

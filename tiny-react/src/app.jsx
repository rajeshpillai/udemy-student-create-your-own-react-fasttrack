import TinyReact from "./tiny-react";

// Module 5: Style objects work — just like in React!

const root = document.getElementById("root");

const headerStyle = {
  color: "white",
  backgroundColor: "darkblue",
  padding: "10px 20px",
  borderRadius: "4px",
};

const element = (
  <div>
    <h1 style={headerStyle}>Hello Tiny React!</h1>
    <p style={{ color: "gray", fontSize: "14px" }}>
      Style objects are converted to CSS automatically.
    </p>
    <p style="color: green">String styles still work too.</p>
    <button
      style={{ padding: "8px 16px", borderBottom: "3px solid blue" }}
      onClick={() => alert("Styled button!")}
    >
      Styled Button
    </button>
  </div>
);

TinyReact.render(element, root);

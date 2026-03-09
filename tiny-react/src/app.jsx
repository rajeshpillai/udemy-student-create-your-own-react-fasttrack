import TinyReact from "./tiny-react";

// Open your browser console and see what JSX actually compiles to!

const element = (
  <div>
    <h1 className="header">Hello Tiny React!</h1>
    <p>This is a paragraph</p>
    <button onClick={() => alert("clicked!")}>Click me</button>
  </div>
);

console.log("Returned value:", element);

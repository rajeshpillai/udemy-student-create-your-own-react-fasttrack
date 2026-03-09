import TinyReact from "./tiny-react";

// Module 3: Our VDOM now renders to the real DOM!

const root = document.getElementById("root");

const element = (
  <div>
    <h1>Hello Tiny React!</h1>
    <h2>We can render to the real DOM now</h2>
    <div>
      nested text
      <div>nested 1.1</div>
    </div>
    <p>This actually shows up on screen!</p>
    {42}
  </div>
);

TinyReact.render(element, root);

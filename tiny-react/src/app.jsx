import TinyReact from "./tiny-react";

// Module 4: Attributes and events now work!

const root = document.getElementById("root");

const element = (
  <div>
    <h1 className="header">Hello Tiny React!</h1>
    <p>Attributes, events, and properties all work now.</p>
    <button onClick={() => alert("Button clicked!")}>Click me!</button>
    <br />
    <input type="text" placeholder="Type something..." />
    <a href="https://github.com" target="_blank">GitHub</a>
  </div>
);

TinyReact.render(element, root);

import TinyReact from "./tiny-react";

// Module 6: Diffing! Re-rendering now updates in place instead of duplicating.

const root = document.getElementById("root");

const render1 = (
  <div>
    <h1 className="header">Hello Tiny React!</h1>
    <h2>This is the first render</h2>
    <div>
      nested 1<div>nested 1.1</div>
    </div>
    <h3>This will change</h3>
    <span>This is some text</span>
    <button onClick={() => alert("First render!")}>Click me</button>
    <h3>This will be removed</h3>
  </div>
);

const render2 = (
  <div>
    <h1 className="header">Hello Tiny React!</h1>
    <h2>This is the SECOND render</h2>
    <div>
      nested 1<div>nested 1.1</div>
    </div>
    <h3 style="background-color: yellow">I told you it would change!</h3>
    <span>Updated text here</span>
    <button onClick={() => alert("Second render!")}>Click me</button>
  </div>
);

// First render
TinyReact.render(render1, root);

// Re-render after 3 seconds — only changed parts update!
setTimeout(() => {
  alert("About to re-render. Watch the DOM — only changes will update.");
  TinyReact.render(render2, root);
}, 3000);

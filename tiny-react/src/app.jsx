import TinyReact from "./tiny-react";

// Module 7: Type mismatches — elements get replaced entirely

const root = document.getElementById("root");

const render1 = (
  <div>
    <h1>Hello Tiny React!</h1>
    <div>I am a div</div>
    <p>I will stay the same</p>
  </div>
);

const render2 = (
  <div>
    <h1>Hello Tiny React!</h1>
    <span>I was a div, now I'm a span!</span>
    <p>I stayed the same</p>
  </div>
);

TinyReact.render(render1, root);

setTimeout(() => {
  alert("Re-rendering: the <div> will be replaced with a <span>");
  TinyReact.render(render2, root);
}, 3000);

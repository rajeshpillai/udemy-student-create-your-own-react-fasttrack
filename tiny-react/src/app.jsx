import TinyReact from "./tiny-react";

// Module 8: Proper unmounting with event listener cleanup

const root = document.getElementById("root");

let clickCount = 0;

const render1 = (
  <div>
    <h1>Unmounting Demo</h1>
    <p>Three buttons below — two will be removed on re-render.</p>
    <button onClick={() => { clickCount++; console.log("Click #" + clickCount); }}>
      Button 1 (stays)
    </button>
    <button onClick={() => console.log("I will be removed!")}>
      Button 2 (removed)
    </button>
    <button onClick={() => console.log("I will also be removed!")}>
      Button 3 (removed)
    </button>
  </div>
);

const render2 = (
  <div>
    <h1>Unmounting Demo</h1>
    <p>Two buttons removed. Event listeners cleaned up — no memory leaks!</p>
    <button onClick={() => { clickCount++; console.log("Click #" + clickCount); }}>
      Button 1 (stayed)
    </button>
  </div>
);

TinyReact.render(render1, root);

setTimeout(() => {
  alert("About to remove two buttons with proper cleanup.");
  TinyReact.render(render2, root);
}, 3000);

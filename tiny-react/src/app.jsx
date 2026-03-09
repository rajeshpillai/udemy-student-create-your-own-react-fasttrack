import TinyReact from "./tiny-react";

// Module 2: Test that children are properly normalized

const element = (
  <div>
    <h1 className="header">Hello Tiny React!</h1>
    <h2>Building React from scratch</h2>
    <div>
      nested text
      <div>nested 1.1</div>
    </div>
    {/* These should be filtered out: */}
    {false && <p>should not appear</p>}
    {true && <p>this should appear</p>}
    {null}
    {undefined}
    {/* Primitives should become text elements: */}
    {42}
    {"a string child"}
  </div>
);

console.log("VDOM tree:", element);
console.log("Children count:", element.children.length, "(expect 6)");

# Module 3: Mounting to the Real DOM

## What You'll Learn

- How `render()` works as the entry point for putting things on screen
- How to convert a VDOM tree into actual browser DOM elements
- What `_virtualElement` back-references are and why we need them
- The recursive pattern that mounts an entire tree

## The Goal

We have a VDOM tree — plain JavaScript objects describing what we want on screen. Now we need to make it real. We need a function that walks the tree and creates actual DOM elements for each node.

This is what `ReactDOM.render()` does in React (or `createRoot().render()` in React 18+).

## The Three Functions

We need three functions that work together:

```
render(vdom, container)
  └── mountElement(vdom, container)
        └── mountSimpleNode(vdom, container)
              ├── create the DOM element
              ├── for each child:
              │     └── mountElement(child, newElement)  ← recursion!
              └── append to container
```

### Why three functions instead of one?

Right now `mountElement` just calls `mountSimpleNode` — it seems pointless. But later, `mountElement` will need to decide: "Is this a simple HTML element, or is it a component?" That routing logic will live in `mountElement`. For now, we're setting up the structure.

## Build It

Open `src/tiny-react.js`. Keep `createElement` as-is and add the rendering functions below it:

### render — The Entry Point

```js
function render(vdom, container) {
  mountElement(vdom, container);
}
```

Simple. It takes a VDOM tree and a real DOM container (like `document.getElementById("root")`), and kicks off the mounting process.

### mountElement — The Router

```js
function mountElement(vdom, container) {
  return mountSimpleNode(vdom, container);
}
```

Right now it just forwards to `mountSimpleNode`. In later modules, this will check if `vdom.type` is a function (a component) and route accordingly.

### mountSimpleNode — The Workhorse

```js
function mountSimpleNode(vdom, container) {
  let newDomElement;

  if (vdom.type === "text") {
    newDomElement = document.createTextNode(vdom.props.textContent);
  } else {
    newDomElement = document.createElement(vdom.type);
  }

  // Store a back-reference from the real DOM to the virtual DOM
  newDomElement._virtualElement = vdom;

  // Recursively mount all children
  vdom.children.forEach((child) => {
    mountElement(child, newDomElement);
  });

  container.appendChild(newDomElement);
  return newDomElement;
}
```

Let's walk through this carefully:

#### Step 1: Create the right kind of DOM node

```js
if (vdom.type === "text") {
  newDomElement = document.createTextNode(vdom.props.textContent);
} else {
  newDomElement = document.createElement(vdom.type);
}
```

Remember our text elements from Module 2? They have `type: "text"` and their content lives in `props.textContent`. For these, we use `document.createTextNode()`.

For everything else (`"div"`, `"h1"`, `"span"`, etc.), we use `document.createElement()`.

#### Step 2: Store a back-reference

```js
newDomElement._virtualElement = vdom;
```

This is crucial. We store the VDOM object directly on the real DOM element as a custom property `_virtualElement`. Why?

When we implement diffing later, we'll need to compare the **old** VDOM with the **new** VDOM. The old VDOM lives on the real DOM elements. Without this reference, we'd have no way to know what the current state of the DOM represents.

#### Step 3: Recursively mount children

```js
vdom.children.forEach((child) => {
  mountElement(child, newDomElement);
});
```

This is where the recursion happens. For each child in the VDOM, we call `mountElement` again — but this time, the container is the element we just created (not the root). This builds the tree top-down.

#### Step 4: Append to the container

```js
container.appendChild(newDomElement);
```

Finally, we attach the fully-built element (with all its children) to its parent.

### Export render

Update the public API:

```js
const TinyReact = {
  createElement,
  render,
};

export default TinyReact;
```

## Test It

Update `src/app.jsx`:

```jsx
import TinyReact from "./tiny-react";

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
```

Save and check your browser. **You should see text on screen for the first time!**

Open DevTools (F12) and inspect the elements. You'll see real DOM nodes — `<div>`, `<h1>`, `<h2>`, `<p>` — matching the JSX structure.

## What's Missing?

Try this:

```jsx
<h1 className="header">Hello</h1>
<button onClick={() => alert("clicked!")}>Click me</button>
```

The text renders, but:
- The `<h1>` doesn't have a `class` attribute
- The button does nothing when clicked

We're creating DOM elements but **ignoring all their props**. We never call `setAttribute`, `addEventListener`, or set any properties.

That's Module 4.

## Key Takeaways

1. **`render(vdom, container)`** is the entry point — like `ReactDOM.render()` in React
2. **`mountSimpleNode`** creates a real DOM element from a VDOM node, recursively mounts children, and appends to the parent
3. **`_virtualElement`** is a back-reference from real DOM to VDOM — essential for diffing later
4. **Text nodes** use `document.createTextNode()`, everything else uses `document.createElement()`
5. **The tree builds top-down** via recursion — each child mounts into its parent

---

[Previous: Module 2 — Cleaning Up Children](./02-cleaning-up-children.md) | [Next: Module 4 — Attributes, Events & Properties →](./04-attributes-events-properties.md)

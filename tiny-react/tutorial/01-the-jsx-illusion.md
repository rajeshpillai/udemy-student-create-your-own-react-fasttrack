# Module 1: The JSX Illusion

## What You'll Learn

- What JSX actually compiles to
- What a "virtual DOM element" is
- How to build `createElement` — the single most important function in React

## The Big Reveal

Before we write any code, let's understand what's really happening. When you write this JSX:

```jsx
<div className="greeting">
  <h1>Hello</h1>
  <p>World</p>
</div>
```

Vite (via esbuild) transforms it into this **before the browser ever sees it**:

```js
TinyReact.createElement("div", { className: "greeting" },
  TinyReact.createElement("h1", null, "Hello"),
  TinyReact.createElement("p", null, "World")
);
```

Notice:
- **Tag name** becomes the first argument (a string like `"div"`, `"h1"`)
- **Props/attributes** become the second argument (an object, or `null` if none)
- **Children** become all remaining arguments (strings, numbers, or more `createElement` calls)

This happens at **build time**, not at runtime. By the time your code runs in the browser, there's no JSX anywhere — just function calls.

## What Should createElement Return?

React calls the return value a "virtual DOM element" (or VDOM node). It's just a **plain JavaScript object** that describes what you want on screen:

```js
{
  type: "div",                          // what kind of element
  props: { className: "greeting" },     // its attributes
  children: [                           // what's inside it
    { type: "h1", props: {}, children: ["Hello"] },
    { type: "p",  props: {}, children: ["World"] }
  ]
}
```

That's it. No magic. A VDOM tree is just nested objects. It's a *description* of the UI — we haven't touched the real DOM yet.

## Build It

Open `src/tiny-react.js` and replace its contents with:

```js
function createElement(type, props, ...children) {
  return {
    type,
    children: children,
    props: { ...props, children: children },
  };
}

const TinyReact = {
  createElement,
};

export default TinyReact;
```

Let's walk through each line:

### `type`
The tag name as a string: `"div"`, `"h1"`, `"span"`, etc. Later, this will also be a function (for components), but strings are enough for now.

### `...children`
The [rest parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters) collects all arguments after `props` into an array. So for:

```js
createElement("div", null, "Hello", "World")
```

`children` becomes `["Hello", "World"]`.

### `props: { ...props, children }`
We spread the original props and also attach `children` to them. This is exactly what React does — `props.children` is how you access children inside a component.

## Test It

Update `src/app.jsx`:

```jsx
import TinyReact from "./tiny-react";

const element = (
  <div>
    <h1 className="header">Hello Tiny React!</h1>
    <h2>Building React from scratch</h2>
    <div>
      nested 1
      <div>nested 1.1</div>
    </div>
  </div>
);

console.log(element);
```

Open the browser console. You should see a nested object tree. Click to expand it:

```
{
  type: "div",
  children: [
    { type: "h1", props: { className: "header" }, children: ["Hello Tiny React!"] },
    { type: "h2", children: ["Building React from scratch"] },
    { type: "div", children: [
      "nested 1",
      { type: "div", children: ["nested 1.1"] }
    ]}
  ],
  props: { ... }
}
```

**That's a virtual DOM tree.** It's a lightweight JavaScript description of the UI. No real DOM elements were created — just objects.

## The Problem with Children

Look carefully at the console output. Notice something odd about the children?

Some children are **strings** (like `"nested 1"`), and some are **objects** (like `{ type: "div", ... }`). Also, what happens if we have conditional rendering?

```jsx
<div>
  {true && <p>visible</p>}
  {false && <p>hidden</p>}
  {null}
  {undefined}
</div>
```

This produces children like: `[{...}, false, null, undefined]`. We've got booleans, nulls, and undefineds mixed in with real elements. That's messy — we need to clean this up.

We'll fix this in the next module by normalizing children: wrapping primitives in text elements and filtering out junk values.

## Key Takeaways

1. **JSX is a compile-time transformation.** It converts tags into `createElement()` calls. No runtime magic.
2. **A virtual DOM element is a plain object** with `type`, `props`, and `children`.
3. **The VDOM tree mirrors the JSX structure** — nested JSX becomes nested objects.
4. **`createElement` is the foundation** — everything else in React builds on top of it.

## Why This Matters

You now understand something most React developers never think about:

> Every time you write `<Component />`, you're just calling a function that returns an object.

React doesn't read your JSX. It never sees angle brackets. It only ever works with the objects that `createElement` produces. Understanding this changes how you think about React forever.

---

[Previous: Module 0 — Project Setup](./00-project-setup.md) | [Next: Module 2 — Cleaning Up Children →](./02-cleaning-up-children.md)

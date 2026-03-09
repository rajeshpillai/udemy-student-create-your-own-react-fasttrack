# Module 2: Cleaning Up Children

## What You'll Learn

- Why children need to be normalized before we can use them
- How to handle text, numbers, booleans, null, and undefined in JSX
- The `[].concat(...).reduce()` pattern for flattening and filtering in one pass

## The Problem

At the end of Module 1, our `createElement` returns whatever children it receives — raw and unprocessed. That's a problem because JSX produces all kinds of junk values in the children array.

Consider this JSX:

```jsx
<div>
  <h1>Title</h1>
  {false && <p>hidden</p>}
  {null}
  {undefined}
  {42}
  {"hello"}
</div>
```

After Vite transforms this, `createElement` receives these children:

```js
children = [
  { type: "h1", ... },   // ← a VDOM object (good)
  false,                   // ← from the && short-circuit
  null,                    // ← explicitly null
  undefined,               // ← explicitly undefined
  42,                      // ← a number (need to handle)
  "hello"                  // ← a string (need to handle)
]
```

We need three rules:

1. **Objects** (VDOM elements) → keep as-is
2. **Primitives** (strings, numbers) → wrap in a text element
3. **Junk** (null, undefined, true, false) → throw away

## Why Filter Booleans?

This is one of React's most useful patterns — conditional rendering:

```jsx
{isLoggedIn && <WelcomeMessage />}
```

When `isLoggedIn` is `false`, this expression evaluates to `false` (JavaScript short-circuit evaluation). We don't want `false` to show up on screen — we want it silently ignored.

Same for `true`:

```jsx
{isValid && <SuccessIcon />}
```

When `isValid` is `true`, the expression evaluates to `<SuccessIcon />` (the right side). But we filter `true` just in case someone writes `{true}` directly — React ignores it, and so should we.

## Why Wrap Primitives?

When you write `{42}` or `{"hello"}` in JSX, you want those to show up as text on screen. But our framework needs every child to be a VDOM object — a plain string or number isn't something we can diff later.

So we wrap them:

```js
// "hello" becomes:
{
  type: "text",
  props: { textContent: "hello" },
  children: []
}
```

Later, when we render this to the DOM, we'll create a `Text` node using `document.createTextNode("hello")`. The `type: "text"` is our signal for that.

## Why Flatten?

Children can be nested arrays. This happens when you map over an array in JSX:

```jsx
<ul>
  {items.map(item => <li>{item}</li>)}
</ul>
```

`.map()` returns an array, so children looks like:

```js
children = [ [{ type: "li", ... }, { type: "li", ... }, { type: "li", ... }] ]
```

That's an array inside an array. We need to flatten it to a single level.

## Build It

Open `src/tiny-react.js` and replace the `createElement` function:

```js
function createElement(type, props, ...children) {
  const childElements = [].concat(...children).reduce((acc, child) => {
    if (child != null && child !== true && child !== false) {
      if (child instanceof Object) {
        acc.push(child);
      } else {
        // Wrap primitives (strings, numbers) as text virtual elements
        acc.push(createElement("text", { textContent: child }));
      }
    }
    return acc;
  }, []);

  return {
    type,
    children: childElements,
    props: { ...props, children: childElements },
  };
}
```

Let's break it down piece by piece:

### Step 1: Flatten with `[].concat(...children)`

```js
[].concat(...children)
```

This takes `children` (which might contain nested arrays from `.map()` calls) and flattens it one level deep. The spread operator (`...`) unpacks the array, and `.concat()` merges everything into a flat array.

### Step 2: Filter and transform with `.reduce()`

```js
.reduce((acc, child) => {
  if (child != null && child !== true && child !== false) {
    // keep this child
  }
  return acc;
}, []);
```

We use `.reduce()` instead of `.filter().map()` so we can filter *and* transform in a single pass:

- `child != null` — eliminates both `null` and `undefined` (loose equality catches both)
- `child !== true && child !== false` — eliminates booleans

### Step 3: Wrap primitives

```js
if (child instanceof Object) {
  acc.push(child);              // Already a VDOM element, keep it
} else {
  acc.push(createElement("text", { textContent: child }));  // Wrap in text element
}
```

`instanceof Object` catches all VDOM elements (which are plain objects). Everything else (strings, numbers) gets wrapped in a `createElement("text", ...)` call. Notice this is **recursive** — `createElement` calls itself to create text elements.

## Test It

Update `src/app.jsx`:

```jsx
import TinyReact from "./tiny-react";

const element = (
  <div>
    <h1 className="header">Hello Tiny React!</h1>
    <h2>Building React from scratch</h2>
    <div>
      nested text
      <div>nested 1.1</div>
    </div>
    {false && <p>should not appear</p>}
    {true && <p>this should appear</p>}
    {null}
    {undefined}
    {42}
    {"a string child"}
  </div>
);

console.log("VDOM tree:", element);
console.log("Children count:", element.children.length, "(expect 6)");
```

Open the console. You should see:

- **6 children** (not 10) — the `false`, `null`, `undefined`, and `true` were filtered out
- The `<h1>` and `<h2>` are VDOM objects with `type: "h1"` and `type: "h2"`
- `"nested text"`, `42`, and `"a string child"` are wrapped as `{ type: "text", props: { textContent: ... } }`
- `<p>this should appear</p>` is there (because `true && expr` evaluates to `expr`)
- `<p>should not appear</p>` is gone (because `false && expr` evaluates to `false`, which we filter)

## Verify the Text Wrapping

Expand the tree in the console and find the `42` child. It should look like:

```js
{
  type: "text",
  props: { textContent: 42, children: [] },
  children: []
}
```

Not a raw number — a proper VDOM element that our renderer will know how to handle.

## Key Takeaways

1. **`[].concat(...children)`** flattens nested arrays (from `.map()` calls in JSX)
2. **`reduce`** lets us filter and transform in one pass — cleaner than chaining `.filter().map()`
3. **`null`, `undefined`, `true`, `false`** are silently dropped — this enables `{condition && <Component />}`
4. **Strings and numbers** are wrapped in `{ type: "text" }` elements so every child is a uniform VDOM object
5. **`createElement` calls itself** recursively to create text elements — it's the only VDOM factory

## What's Next

We have a clean, normalized VDOM tree. But it's still just JavaScript objects sitting in memory — nothing shows up on screen.

In the next module, we'll write a `render()` function that takes a VDOM tree and creates **real DOM elements** from it. That's when things start appearing on the page.

---

[Previous: Module 1 — The JSX Illusion](./01-the-jsx-illusion.md) | [Next: Module 3 — Mounting to the Real DOM →](./03-mounting-to-the-real-dom.md)

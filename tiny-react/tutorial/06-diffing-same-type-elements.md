# Module 6: Diffing Same-Type Elements

## What You'll Learn

- Why we need a diffing algorithm instead of just re-rendering everything
- How React's O(n) heuristic diffing works
- How to recursively compare old and new VDOM trees
- How to update only the parts that actually changed

## The Problem

Right now, every `render()` call creates brand new DOM elements and appends them. Call `render()` twice and you get two copies of everything. That's obviously wrong.

What we want: call `render()` with a new VDOM tree, and the framework **compares** it to what's already on screen, then makes the **minimum changes** needed.

This is **reconciliation** — the core of React's performance model.

## Why Not Just Replace Everything?

You could do this:

```js
function render(vdom, container) {
  container.innerHTML = "";  // nuke everything
  mountElement(vdom, container);  // rebuild from scratch
}
```

This works, but it's terrible:
- **Performance**: destroying and recreating the entire DOM tree on every update
- **Lost state**: input field values, scroll positions, focus — all gone
- **Flicker**: the browser has to re-layout and repaint everything

The diffing approach: compare old and new trees, update only what's different. The `<h1>` didn't change? Don't touch it. Only the `<h3>` text changed? Update just that text node.

## The Diff Algorithm

React uses a **heuristic** algorithm with two key assumptions:

1. **Two elements of different types produce different trees.** If a `<div>` becomes a `<span>`, tear it down and rebuild. Don't try to morph one into the other.

2. **Children are compared by index** (or by `key`, which we'll add later). The first child is compared to the first child, second to second, etc.

These heuristics reduce tree comparison from O(n³) to O(n). Let's implement it.

## Build It

### Change render() to use diff()

```js
function render(vdom, container, oldDom = container.firstChild) {
  diff(vdom, container, oldDom);
}
```

Instead of always mounting, `render()` now calls `diff()`. The `oldDom` defaults to the container's first child — which is the root element from the previous render.

### The diff() Function

```js
function diff(vdom, container, oldDom) {
  const oldvdom = oldDom && oldDom._virtualElement;

  if (!oldDom) {
    // No existing DOM — mount from scratch
    mountElement(vdom, container);
  } else if (oldvdom && oldvdom.type === vdom.type) {
    // Same type — update in place
    if (vdom.type === "text") {
      updateTextNode(oldDom, vdom, oldvdom);
    } else {
      updateDomElement(oldDom, vdom, oldvdom);
    }

    // Update the back-reference to point to the new VDOM
    oldDom._virtualElement = vdom;

    // Recursively diff children by index
    vdom.children.forEach((child, i) => {
      diff(child, oldDom, oldDom.childNodes[i]);
    });

    // Remove extra old children
    const oldNodes = oldDom.childNodes;
    if (oldNodes.length > vdom.children.length) {
      for (let i = oldNodes.length - 1; i >= vdom.children.length; i--) {
        oldNodes[i].remove();
      }
    }
  }
}
```

Let's trace through each branch:

### Branch 1: No existing DOM

```js
if (!oldDom) {
  mountElement(vdom, container);
}
```

First render — nothing exists yet. Just mount the whole tree. This is the same as before.

### Branch 2: Same type — update in place

```js
else if (oldvdom && oldvdom.type === vdom.type) {
```

This is where the magic happens. The old and new elements have the same type (both are `<div>`, or both are `<h1>`, etc.), so we **update the existing DOM element** instead of creating a new one.

For text nodes:
```js
if (vdom.type === "text") {
  updateTextNode(oldDom, vdom, oldvdom);
}
```

For element nodes:
```js
else {
  updateDomElement(oldDom, vdom, oldvdom);
}
```

Both functions compare old and new props and only touch what changed.

### Update the back-reference

```js
oldDom._virtualElement = vdom;
```

After updating, we store the new VDOM on the DOM element. Next time we diff, *this* will be the "old" VDOM.

### Recursively diff children

```js
vdom.children.forEach((child, i) => {
  diff(child, oldDom, oldDom.childNodes[i]);
});
```

For each new child, we diff it against the old child at the same index. If there's no old child at that index (`oldDom.childNodes[i]` is undefined), `diff` sees `!oldDom` and mounts a new element.

### Remove extra old children

```js
const oldNodes = oldDom.childNodes;
if (oldNodes.length > vdom.children.length) {
  for (let i = oldNodes.length - 1; i >= vdom.children.length; i--) {
    oldNodes[i].remove();
  }
}
```

If the old tree had 5 children but the new tree has 3, we need to remove the last 2. We iterate backwards to avoid index shifting issues.

### The updateTextNode Helper

```js
function updateTextNode(domElement, newVirtualElement, oldVirtualElement) {
  if (newVirtualElement.props.textContent !== oldVirtualElement.props.textContent) {
    domElement.textContent = newVirtualElement.props.textContent;
  }
  domElement._virtualElement = newVirtualElement;
}
```

Simple: if the text changed, update it. Always update the back-reference.

## Test It

Update `src/app.jsx`:

```jsx
import TinyReact from "./tiny-react";

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

TinyReact.render(render1, root);

setTimeout(() => {
  alert("About to re-render. Watch the DOM — only changes will update.");
  TinyReact.render(render2, root);
}, 3000);
```

**Before clicking OK on the alert**, open DevTools and enable "Paint flashing" (in Chrome: DevTools → More tools → Rendering → Paint flashing). When the re-render happens, you'll see green flashes **only on the elements that actually changed**. The `<h1>` doesn't flash — it wasn't touched.

Also notice:
- The `<h2>` text updates from "first render" to "SECOND render"
- The `<h3>` gets a yellow background
- The last `<h3>` ("This will be removed") disappears
- The button's click handler changes

## Key Takeaways

1. **`diff()` compares old and new VDOM trees** and makes minimal DOM updates
2. **Same type → update in place.** Props are patched, children are recursively diffed
3. **Children are compared by index** — child 0 vs child 0, child 1 vs child 1, etc.
4. **Extra old children are removed** when the new tree has fewer children
5. **`_virtualElement` is updated** after each diff so the next comparison uses fresh data
6. **This is O(n)** — one pass through the tree, comparing node by node

## What's Missing

What if the type changes? What if a `<div>` becomes a `<span>`? Right now we'd try to update props on the wrong element type. We need to handle type mismatches — that's Module 7.

---

[Previous: Module 5 — Style Props](./05-style-props.md) | [Next: Module 7 — Handling Type Mismatches →](./07-handling-type-mismatches.md)

# Module 7: Handling Type Mismatches

## What You'll Learn

- What happens when an element's type changes between renders
- Why React tears down the old tree instead of morphing it
- How `replaceChild` swaps entire subtrees
- The `createDomElement` helper that builds a complete DOM subtree

## The Problem

In Module 6, our `diff()` handles two cases: no old DOM (mount fresh) and same type (update in place). But what if the type changes?

```jsx
// Render 1:
<div>I am a div</div>

// Render 2:
<span>I was a div, now I'm a span!</span>
```

The old DOM has a `<div>`, the new VDOM wants a `<span>`. Our diff function currently does nothing — it falls through all the `if/else` branches without taking action.

## The Heuristic

React's rule is simple:

> **If the type changes, tear down the old subtree and build a new one from scratch.**

Don't try to morph a `<div>` into a `<span>`. Don't try to reuse any of its children. Just replace the whole thing.

This sounds wasteful, but it's actually a brilliant optimization. The alternative — trying to figure out which children can be reused across different element types — would require O(n³) tree comparison. The replace-everything approach keeps us at O(n).

In practice, elements rarely change type. When they do, the subtrees are usually completely different anyway.

## Build It

### createDomElement — Build a Full Subtree

First, we need a function that takes a VDOM tree and creates the complete DOM subtree (element + all descendants). This is similar to `mountSimpleNode` but returns the element instead of appending it:

```js
function createDomElement(vdom) {
  let newDomElement;
  if (vdom.type === "text") {
    newDomElement = document.createTextNode(vdom.props.textContent);
  } else {
    newDomElement = document.createElement(vdom.type);
    updateDomElement(newDomElement, vdom);
  }

  newDomElement._virtualElement = vdom;

  vdom.children.forEach((child) => {
    newDomElement.appendChild(createDomElement(child));
  });

  return newDomElement;
}
```

Notice it calls itself recursively for each child — building the entire tree bottom-up and returning the root element.

### Add the Type Mismatch Branch to diff()

Add this new branch between the "no old DOM" check and the "same type" check:

```js
function diff(vdom, container, oldDom) {
  const oldvdom = oldDom && oldDom._virtualElement;

  if (!oldDom) {
    mountElement(vdom, container);
  } else if (oldvdom && oldvdom.type !== vdom.type && typeof vdom.type !== "function") {
    // Different type (and not a component) — replace entirely
    const newDomElement = createDomElement(vdom);
    oldDom.parentNode.replaceChild(newDomElement, oldDom);
  } else if (oldvdom && oldvdom.type === vdom.type) {
    // Same type — update in place (existing code)
    // ...
  }
}
```

The condition `typeof vdom.type !== "function"` skips components — we'll handle component type changes separately in a later module. For now, this only handles native element type changes.

`replaceChild(new, old)` atomically swaps the old element with the new one in the DOM. The old element and all its children are removed; the new element and all its children are inserted.

## Test It

Update `src/app.jsx`:

```jsx
import TinyReact from "./tiny-react";

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
```

After the re-render:
- The `<h1>` is untouched (same type, same content)
- The `<div>` is gone, replaced by a `<span>` (type mismatch → full replacement)
- The `<p>` is updated in place (same type)

Inspect the DOM to confirm the `<span>` is a brand new element, not a modified `<div>`.

## Key Takeaways

1. **Different type = full replacement.** React never morphs one element type into another
2. **`createDomElement(vdom)`** recursively builds a complete DOM subtree from a VDOM tree
3. **`replaceChild(new, old)`** atomically swaps elements in the DOM
4. **This heuristic keeps diffing O(n)** — without it, you'd need O(n³) tree comparison
5. **Components are excluded** from this check (`typeof vdom.type !== "function"`) — they're handled separately

---

[Previous: Module 6 — Diffing Same-Type Elements](./06-diffing-same-type-elements.md) | [Next: Module 8 — Removing Stale Nodes →](./08-removing-stale-nodes.md)

# Module 8: Removing Stale Nodes

## What You'll Learn

- Why simply removing DOM elements isn't enough
- How event listeners cause memory leaks if not cleaned up
- How to properly unmount a subtree (children first, then parent)
- How to handle element replacement during mounting

## The Problem

In Module 6, we removed extra children with a simple `oldNodes[i].remove()`. That removes the element from the DOM, but it **doesn't clean up event listeners**.

Here's why that's a problem:

```jsx
<button onClick={handleClick}>Click me</button>
```

When we mounted this button, we called `addEventListener("click", handleClick)`. If we just remove the button from the DOM without calling `removeEventListener`, the browser *might* garbage collect the listener — but it's not guaranteed, especially if there are closures referencing external state.

In a long-running app, this creates **memory leaks**. Thousands of orphaned event listeners, each holding references to their closures, slowly consuming memory.

## The Solution: unmountNode

We need a function that properly tears down a DOM element:

1. Recursively unmount all children (bottom-up cleanup)
2. Remove all event listeners from the element
3. Remove the element from the DOM

```js
function unmountNode(domElement) {
  const virtualElement = domElement._virtualElement;
  if (!virtualElement) {
    domElement.remove();
    return;
  }

  // Recursively unmount children first
  while (domElement.childNodes.length > 0) {
    unmountNode(domElement.firstChild);
  }

  // Remove event listeners to prevent memory leaks
  if (virtualElement.props) {
    Object.keys(virtualElement.props).forEach((propName) => {
      if (propName.slice(0, 2) === "on") {
        const event = propName.toLowerCase().slice(2);
        domElement.removeEventListener(event, virtualElement.props[propName]);
      }
    });
  }

  // Remove from DOM
  domElement.remove();
}
```

### Why Children First?

We unmount children before the parent because:
- Each child might have its own event listeners that need cleanup
- Later (when we add components), each child might need to run `componentWillUnmount` lifecycle methods
- Bottom-up cleanup ensures no orphaned references remain

### Why Use a While Loop?

```js
while (domElement.childNodes.length > 0) {
  unmountNode(domElement.firstChild);
}
```

We always unmount `firstChild` in a loop instead of iterating with an index. Why? Because `unmountNode` removes the child from the DOM, which shifts all subsequent children. Using an index would skip every other child. The while loop avoids this pitfall entirely.

## Update mountSimpleNode for Replacement

When mounting replaces an existing element (e.g., when a component type changes), we need to:
1. Remember the old element's position (its next sibling)
2. Unmount the old element
3. Insert the new element at the same position

```js
function mountSimpleNode(vdom, container, oldDomElement) {
  let newDomElement;
  const nextSibling = oldDomElement && oldDomElement.nextSibling;

  if (vdom.type === "text") {
    newDomElement = document.createTextNode(vdom.props.textContent);
  } else {
    newDomElement = document.createElement(vdom.type);
    updateDomElement(newDomElement, vdom);
  }

  newDomElement._virtualElement = vdom;

  // If replacing an old element, unmount it first
  if (oldDomElement) {
    unmountNode(oldDomElement);
  }

  // Insert at the correct position
  if (nextSibling) {
    container.insertBefore(newDomElement, nextSibling);
  } else {
    container.appendChild(newDomElement);
  }

  // Recursively mount children
  vdom.children.forEach((child) => {
    mountElement(child, newDomElement);
  });

  return newDomElement;
}
```

The key trick is `nextSibling`: we grab the reference *before* removing the old element. After removal, we use `insertBefore(new, nextSibling)` to place the new element exactly where the old one was. If there's no next sibling, `appendChild` puts it at the end.

## Thread oldDomElement Through

Update `mountElement` to pass the old DOM element through:

```js
function mountElement(vdom, container, oldDomElement) {
  return mountSimpleNode(vdom, container, oldDomElement);
}
```

And update the diff to use `unmountNode` instead of `.remove()`:

```js
// In the "remove extra old children" section of diff():
const oldNodes = oldDom.childNodes;
if (oldNodes.length > vdom.children.length) {
  for (let i = oldNodes.length - 1; i >= vdom.children.length; i--) {
    unmountNode(oldNodes[i]);  // was: oldNodes[i].remove()
  }
}
```

## Test It

Update `src/app.jsx`:

```jsx
import TinyReact from "./tiny-react";

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
```

After the re-render, check the Elements panel — Buttons 2 and 3 are gone. Their event listeners are also cleaned up (no stale references in the Event Listeners panel).

## Note: Simplified by Event Delegation (Module 20)

The `removeEventListener` loop shown here is correct for direct event handling. In [Module 20](./20-event-delegation.md), when we switch to event delegation, the entire cleanup simplifies to:

```js
domElement._eventHandlers = null;
```

No `removeEventListener` calls needed — the delegated listener on `document` checks for handlers on each element. When `_eventHandlers` is null, no handler fires. The element gets garbage collected with its handler map.

## Key Takeaways

1. **`unmountNode` cleans up recursively** — children first, then the element itself
2. **Event listeners must be explicitly removed** to prevent memory leaks (simplified by delegation in Module 20)
3. **Use a `while` loop** when removing children, not a `for` loop (removal shifts indices)
4. **`nextSibling` preserves position** when replacing elements — grab it before removing
5. **`mountSimpleNode` now handles replacement** via the optional `oldDomElement` parameter

---

[Previous: Module 7 — Handling Type Mismatches](./07-handling-type-mismatches.md) | [Next: Module 9 — Keyed Reconciliation →](./09-keyed-reconciliation.md)

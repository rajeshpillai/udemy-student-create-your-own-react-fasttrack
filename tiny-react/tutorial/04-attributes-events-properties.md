# Module 4: Attributes, Events & Properties

## What You'll Learn

- How JSX props become real DOM attributes and event listeners
- Why `className` exists instead of `class`
- Why `value` and `checked` can't use `setAttribute`
- How React-style event handling (onClick, onChange) works under the hood

## The Problem

After Module 3, we can render elements to the DOM — but they're naked. No classes, no event handlers, no attributes. Write this:

```jsx
<h1 className="header">Hello</h1>
<button onClick={() => alert("hi")}>Click me</button>
```

Inspect the DOM: the `<h1>` has no `class` attribute, and clicking the button does nothing. Our `mountSimpleNode` creates the element but ignores its props entirely.

## The Solution: updateDomElement

We need a function that takes a real DOM element and applies all the VDOM props to it. This same function will also be used later during diffing — to update an existing element's props without recreating it.

```js
function updateDomElement(domElement, newVirtualElement, oldVirtualElement = {}) {
  const newProps = newVirtualElement.props || {};
  const oldProps = oldVirtualElement.props || {};

  // Set new or changed properties
  Object.keys(newProps).forEach((propName) => {
    const newProp = newProps[propName];
    const oldProp = oldProps[propName];

    if (newProp !== oldProp) {
      if (propName.slice(0, 2) === "on") {
        // Event handler
        const eventName = propName.toLowerCase().slice(2);
        domElement.addEventListener(eventName, newProp, false);
        if (oldProp) {
          domElement.removeEventListener(eventName, oldProp, false);
        }
      } else if (propName === "value" || propName === "checked") {
        // Special properties — set directly
        domElement[propName] = newProp;
      } else if (propName === "className") {
        // JSX uses className, HTML uses class
        domElement.setAttribute("class", newProp);
      } else if (propName !== "children") {
        // Standard attribute
        domElement.setAttribute(propName, newProp);
      }
    }
  });

  // Remove properties that no longer exist
  Object.keys(oldProps).forEach((propName) => {
    const newProp = newProps[propName];
    const oldProp = oldProps[propName];

    if (!newProp) {
      if (propName.slice(0, 2) === "on") {
        const eventName = propName.toLowerCase().slice(2);
        domElement.removeEventListener(eventName, oldProp, false);
      } else if (propName !== "children") {
        domElement.removeAttribute(propName);
      }
    }
  });
}
```

This is a long function, but each section handles a different category of props. Let's break it down.

## Part 1: Setting Props

We iterate over all new props and check if they've changed from the old props:

```js
Object.keys(newProps).forEach((propName) => {
  const newProp = newProps[propName];
  const oldProp = oldProps[propName];

  if (newProp !== oldProp) {
    // Handle this prop...
  }
});
```

The `newProp !== oldProp` check ensures we only touch the DOM when something actually changed. DOM operations are expensive — we want to skip unnecessary ones.

### Event Handlers (onClick, onChange, onKeyDown, etc.)

```js
if (propName.slice(0, 2) === "on") {
  const eventName = propName.toLowerCase().slice(2);
  domElement.addEventListener(eventName, newProp, false);
  if (oldProp) {
    domElement.removeEventListener(eventName, oldProp, false);
  }
}
```

Any prop starting with `"on"` is an event handler. We convert the React-style name to a browser event name:

| JSX prop | → | DOM event |
|---|---|---|
| `onClick` | → | `"click"` |
| `onChange` | → | `"change"` |
| `onKeyDown` | → | `"keydown"` |
| `onDblClick` | → | `"dblclick"` |

The conversion: take `"onClick"`, lowercase it to `"onclick"`, then slice off `"on"` to get `"click"`.

If there was a previous handler (`oldProp`), we remove it first. This prevents handler accumulation — each re-render would otherwise add another listener.

### Special Properties: value and checked

```js
else if (propName === "value" || propName === "checked") {
  domElement[propName] = newProp;
}
```

These two properties **cannot** be set with `setAttribute()`. Here's why:

```js
// This sets the HTML attribute (the initial value):
input.setAttribute("value", "hello");

// This sets the current value (what the user sees):
input.value = "hello";
```

After a user types in an input field, `setAttribute("value", ...)` no longer updates what's displayed — it only changes the attribute in the HTML, not the live value. We need to set the property directly.

### className → class

```js
else if (propName === "className") {
  domElement.setAttribute("class", newProp);
}
```

In JSX, you write `className` instead of `class` because `class` is a reserved keyword in JavaScript. We translate it back to the HTML attribute `"class"`.

### Standard Attributes

```js
else if (propName !== "children") {
  domElement.setAttribute(propName, newProp);
}
```

Everything else (`href`, `type`, `placeholder`, `id`, `target`, etc.) gets set as a normal HTML attribute. We skip `"children"` because that's our internal prop — it shouldn't become a DOM attribute.

## Part 2: Removing Old Props

```js
Object.keys(oldProps).forEach((propName) => {
  const newProp = newProps[propName];
  const oldProp = oldProps[propName];

  if (!newProp) {
    if (propName.slice(0, 2) === "on") {
      const eventName = propName.toLowerCase().slice(2);
      domElement.removeEventListener(eventName, oldProp, false);
    } else if (propName !== "children") {
      domElement.removeAttribute(propName);
    }
  }
});
```

If a prop existed in the old VDOM but not in the new VDOM, we need to clean it up. Remove the event listener or remove the attribute. Without this, removed props would linger on the DOM element forever.

## Wire It Into mountSimpleNode

Now call `updateDomElement` when creating non-text elements:

```js
function mountSimpleNode(vdom, container) {
  let newDomElement;

  if (vdom.type === "text") {
    newDomElement = document.createTextNode(vdom.props.textContent);
  } else {
    newDomElement = document.createElement(vdom.type);
    updateDomElement(newDomElement, vdom);  // ← NEW: apply props
  }

  newDomElement._virtualElement = vdom;

  vdom.children.forEach((child) => {
    mountElement(child, newDomElement);
  });

  container.appendChild(newDomElement);
  return newDomElement;
}
```

We only call it for non-text elements because text nodes don't have attributes.

## Test It

Update `src/app.jsx`:

```jsx
import TinyReact from "./tiny-react";

const root = document.getElementById("root");

const element = (
  <div>
    <h1 className="header">Hello Tiny React!</h1>
    <p>Attributes, events, and properties all work now.</p>
    <button onClick={() => alert("Button clicked!")}>Click me!</button>
    <br />
    <input type="text" placeholder="Type something..." />
    <a href="https://github.com" target="_blank">GitHub</a>
  </div>
);

TinyReact.render(element, root);
```

Check your browser:
- The `<h1>` should have `class="header"` in the Elements panel
- Clicking the button should show an alert
- The input should have a placeholder
- The link should have `href` and `target` attributes

**Everything is interactive now.**

## Note: Event Delegation Upgrade (Module 20)

The event handling shown here attaches listeners directly to each DOM element with `addEventListener`. This works correctly but doesn't scale — 100 buttons means 100 click listeners.

In [Module 20](./20-event-delegation.md), we upgrade to **event delegation**: one listener per event type on `document`, with handlers stored on elements as `_eventHandlers`. The `updateDomElement` code changes from:

```js
domElement.addEventListener(eventName, newProp, false);
```

to:

```js
if (!domElement._eventHandlers) domElement._eventHandlers = {};
domElement._eventHandlers[eventName] = newProp;
ensureDelegatedEvent(eventName);
```

For now, the direct approach teaches the concept. Module 20 shows the optimization.

## Key Takeaways

1. **`updateDomElement(dom, newVdom, oldVdom)`** handles all prop types: events, special properties, className, and standard attributes
2. **Event props** start with `"on"` — we convert them to DOM event names and use `addEventListener`
3. **`value` and `checked`** must be set as DOM properties, not attributes
4. **`className` maps to `class`** because `class` is a JS reserved word
5. **Old props are cleaned up** by iterating `oldProps` and removing anything absent from `newProps`
6. **`children` is skipped** — it's our internal bookkeeping, not a real attribute

---

[Previous: Module 3 — Mounting to the Real DOM](./03-mounting-to-the-real-dom.md) | [Next: Module 5 — Style Props →](./05-style-props.md)

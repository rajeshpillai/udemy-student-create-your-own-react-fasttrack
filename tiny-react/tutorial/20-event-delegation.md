# Module 20: Event Delegation — One Listener to Rule Them All

## What You'll Learn

- Why attaching listeners to every element is wasteful
- How event delegation uses a single listener per event type
- How to implement delegated events with handler lookup via bubbling
- Why this is how React actually handles events

## The Problem

Our current approach attaches event listeners directly to DOM elements:

```js
// What updateDomElement was doing:
domElement.addEventListener("click", handler);
```

With a todo app showing 100 items, each with 3 buttons (Edit, Delete, Complete):
- **300 click listeners** attached to the DOM
- Each listener is a separate object in memory
- On re-render, we remove old listeners and add new ones — 600 operations

This doesn't scale. React solved this from day one with **event delegation**.

## How Event Delegation Works

Instead of listening on every element:

```
<button onClick={handleA}>A</button>   ← listener
<button onClick={handleB}>B</button>   ← listener
<button onClick={handleC}>C</button>   ← listener
```

We listen **once** on the document:

```
document                                ← ONE listener for "click"
  └── <div>
        <button>A</button>
        <button>B</button>
        <button>C</button>
```

When a click happens:
1. Browser fires the event on the target (`<button>B</button>`)
2. Our document listener catches it
3. We walk from `event.target` up to the document, checking each element for a stored handler
4. Found `handleB` on the button → call it

**One listener** handles all clicks in the entire app. Adding/removing elements requires zero listener management.

## Build It

### Handler Storage

Instead of `addEventListener`, store handlers on the DOM element itself:

```js
domElement._eventHandlers = { click: handleClick, keydown: handleKeyDown };
```

### Delegated Root Listeners

Register one listener per event type on the document:

```js
const delegatedEvents = new Set(); // Event types already registered

function ensureDelegatedEvent(eventName) {
  if (delegatedEvents.has(eventName)) return;
  delegatedEvents.add(eventName);

  document.addEventListener(eventName, (nativeEvent) => {
    // Walk from target up to document, simulating bubbling
    let target = nativeEvent.target;
    while (target) {
      const handlers = target._eventHandlers;
      if (handlers && handlers[eventName]) {
        handlers[eventName](nativeEvent);
        // Stop if the handler called stopPropagation
        if (nativeEvent.cancelBubble) break;
      }
      target = target.parentNode;
    }
  });
}
```

Key details:
- **Lazy registration**: Only registers a "click" listener the first time any element uses `onClick`
- **Manual bubbling**: Walks `parentNode` chain, calling handlers at each level
- **stopPropagation support**: Checks `cancelBubble` (set by `stopPropagation()`) to stop early

### Updated updateDomElement

Replace direct `addEventListener`/`removeEventListener` with handler storage:

```js
// Before (direct):
if (propName.slice(0, 2) === "on") {
  const eventName = propName.toLowerCase().slice(2);
  domElement.addEventListener(eventName, newProp, false);
  if (oldProp) {
    domElement.removeEventListener(eventName, oldProp, false);
  }
}

// After (delegated):
if (propName.slice(0, 2) === "on") {
  const eventName = propName.toLowerCase().slice(2);
  if (!domElement._eventHandlers) domElement._eventHandlers = {};
  domElement._eventHandlers[eventName] = newProp;
  ensureDelegatedEvent(eventName);
}
```

No `addEventListener` on the element at all. Just store the handler and ensure the document has a root listener for this event type.

### Updated Prop Removal

```js
// Before:
domElement.removeEventListener(eventName, oldProp, false);

// After:
if (domElement._eventHandlers) {
  delete domElement._eventHandlers[eventName];
}
```

### Updated unmountNode

No need to remove individual event listeners anymore:

```js
// Before:
Object.keys(virtualElement.props).forEach((propName) => {
  if (propName.slice(0, 2) === "on") {
    const event = propName.toLowerCase().slice(2);
    domElement.removeEventListener(event, virtualElement.props[propName]);
  }
});

// After:
domElement._eventHandlers = null;
```

Setting to `null` is enough — the delegated listener checks for `_eventHandlers` before calling anything. When the element is removed from the DOM, no events will target it anyway.

## Performance Comparison

| Metric | Direct Listeners | Event Delegation |
|---|---|---|
| Listeners per 100-item todo | ~300 | ~3 (click, dblclick, keydown) |
| On re-render | Remove + add listeners | Overwrite handler reference |
| On unmount | Remove each listener | Set `null` |
| Memory | One closure per element per event | One closure per event type total |

## How React Does It

React v17+ attaches delegated listeners to the **root container** (not `document`). This allows multiple React roots on the same page without event conflicts. Our implementation uses `document` for simplicity, which works for single-root apps.

React also wraps native events in a `SyntheticEvent` for cross-browser normalization. We skip this — modern browsers are consistent enough that native events work fine for a teaching framework.

## Try It

1. Open DevTools → Elements → select any button
2. Check the Event Listeners panel — **no listeners on the button itself**
3. Check `document` — you'll see delegated listeners for click, dblclick, keydown
4. Click buttons — they work exactly as before, but through delegation
5. Add 50 todo items — still just 3 document listeners total

## Key Takeaways

1. **Event delegation** replaces N listeners with 1 listener per event type
2. **Handlers are stored** on DOM elements as `_eventHandlers`, not as listeners
3. **`ensureDelegatedEvent`** lazily registers document listeners on first use
4. **Manual bubbling** walks `event.target → parentNode → ... → document`
5. **Unmount is trivial** — just null out `_eventHandlers`, no cleanup loop
6. **This is how React works** — event delegation has been in React since v0.1

---

[Previous: Module 19 — Error Boundaries](./19-error-boundaries.md) | [Next: Module 21 — Concurrent Rendering →](./21-concurrent-rendering.md)

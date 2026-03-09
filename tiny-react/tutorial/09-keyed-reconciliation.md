# Module 9: Keyed Reconciliation

## What You'll Learn

- Why index-based diffing breaks with lists
- How `key` props tell React which items moved, were added, or were removed
- How to build a keyed reconciliation algorithm
- The O(n²) → O(n) optimization for removal detection

## The Problem

Our current diffing compares children by **index**: child 0 vs child 0, child 1 vs child 1, etc. This works fine for static trees, but falls apart with **dynamic lists**.

Consider a sortable list:

```jsx
// Before sorting:
<ul>
  <li>Apple</li>     ← index 0
  <li>Banana</li>    ← index 1
  <li>Cherry</li>    ← index 2
</ul>

// After sorting:
<ul>
  <li>Cherry</li>    ← index 0
  <li>Apple</li>     ← index 1
  <li>Banana</li>    ← index 2
</ul>
```

With index-based diffing, the algorithm sees:
- Index 0: "Apple" → "Cherry" — **update text** (wrong! Should reorder)
- Index 1: "Banana" → "Apple" — **update text** (wrong!)
- Index 2: "Cherry" → "Banana" — **update text** (wrong!)

All three items get their text updated. If those `<li>` elements had input fields, checkboxes, or other stateful DOM elements, their state would be **wrong** — the input that belonged to "Apple" now shows text for "Cherry".

## The Solution: Keys

Keys let us match items by **identity** instead of **position**:

```jsx
<li key={1}>Apple</li>
<li key={2}>Banana</li>
<li key={3}>Cherry</li>
```

Now the algorithm knows: "The item with `key=3` (Cherry) moved from index 2 to index 0. I should **reorder the DOM element**, not update its content."

## Build It

Replace the child diffing section in `diff()` with key-aware logic:

### Step 1: Collect keyed elements from the old DOM

```js
const keyedElements = {};
for (let i = 0; i < oldDom.childNodes.length; i++) {
  const domElement = oldDom.childNodes[i];
  const key =
    domElement._virtualElement && domElement._virtualElement.props.key;
  if (key) {
    keyedElements[key] = { domElement, index: i };
  }
}

const hasKeys = Object.keys(keyedElements).length > 0;
```

We build a map: `key → { domElement, index }`. This gives us O(1) lookup when we need to find an old element by key.

### Step 2: Diff children (keyed or unkeyed)

```js
if (!hasKeys) {
  // No keys — diff children by index (as before)
  vdom.children.forEach((child, i) => {
    diff(child, oldDom, oldDom.childNodes[i]);
  });
} else {
  // Keyed reconciliation
  vdom.children.forEach((virtualElement, i) => {
    const key = virtualElement.props.key;
    if (key) {
      const keyedDomElement = keyedElements[key];
      if (keyedDomElement) {
        // Reposition if needed
        if (
          oldDom.childNodes[i] &&
          !oldDom.childNodes[i].isSameNode(keyedDomElement.domElement)
        ) {
          oldDom.insertBefore(
            keyedDomElement.domElement,
            oldDom.childNodes[i]
          );
        }
        diff(virtualElement, oldDom, keyedDomElement.domElement);
      } else {
        // New keyed element — mount it
        mountElement(virtualElement, oldDom);
      }
    }
  });
}
```

For each new child:
1. Look up its key in the old map
2. If found: **reposition** it (using `insertBefore`) if it's not already in the right place, then **diff** it against its old version
3. If not found: it's a **new** item — mount it fresh

The `isSameNode` check avoids unnecessary DOM moves when the element is already in the correct position.

### Step 3: Remove elements with deleted keys

```js
if (hasKeys) {
  const newKeys = new Set(
    vdom.children.map((c) => c.props.key).filter((k) => k != null)
  );
  for (let i = oldNodes.length - 1; i >= 0; i--) {
    const oldChild = oldNodes[i];
    const oldKey =
      oldChild._virtualElement && oldChild._virtualElement.props.key;
    if (oldKey != null && !newKeys.has(oldKey)) {
      unmountNode(oldChild);
    }
  }
} else {
  // Index-based: remove tail (as before)
  if (oldNodes.length > vdom.children.length) {
    for (let i = oldNodes.length - 1; i >= vdom.children.length; i--) {
      unmountNode(oldNodes[i]);
    }
  }
}
```

We build a `Set` of new keys for O(1) lookup, then iterate old children — any old key not in the new set gets unmounted.

Using a `Set` is important. Without it, you'd need a nested loop (for each old child, scan all new children), which is O(n²). The Set makes it O(n).

## Test It

Update `src/app.jsx`:

```jsx
import TinyReact from "./tiny-react";

const root = document.getElementById("root");

const items1 = [
  { id: 1, text: "Apple" },
  { id: 2, text: "Banana" },
  { id: 3, text: "Cherry" },
  { id: 4, text: "Date" },
];

const items2 = [
  { id: 3, text: "Cherry" },
  { id: 1, text: "Apple" },
  { id: 4, text: "Date" },
];

function renderList(items) {
  return (
    <div>
      <h1>Keyed List Demo</h1>
      <p>Items will reorder and one will be removed in 5 seconds.</p>
      <ul>
        {items.map((item) => (
          <li key={item.id} style={{ padding: "8px", borderBottom: "1px solid #ccc" }}>
            {item.id}: {item.text}
            <input type="text" placeholder={"Type in " + item.text} />
          </li>
        ))}
      </ul>
    </div>
  );
}

TinyReact.render(renderList(items1), root);

setTimeout(() => {
  alert(
    "Re-rendering with reordered list. Type something in the inputs first!\n" +
    "With keys: inputs follow their items."
  );
  TinyReact.render(renderList(items2), root);
}, 5000);
```

**Try this experiment:**

1. When the page loads, type something unique in each input field (e.g., "aaa" for Apple, "bbb" for Banana)
2. Wait for the re-render
3. After re-render: Cherry moves to the top, Apple to second, Date to third, Banana is removed
4. **Check the inputs** — the text you typed follows the correct item!

This is the demo that makes keys "click" for students. Without keys, the inputs would stay at their positions while the labels change — completely wrong.

## Key Takeaways

1. **Index-based diffing fails with dynamic lists** — reordering updates content instead of moving elements
2. **Keys match items by identity**, not position — DOM elements move with their data
3. **Build a map** of old keyed elements for O(1) lookup during reconciliation
4. **`insertBefore`** repositions existing DOM nodes without recreating them
5. **Use a `Set`** for new keys to make removal detection O(n) instead of O(n²)
6. **Keys should be stable, unique identifiers** (database IDs, not array indices)

---

[Previous: Module 8 — Removing Stale Nodes](./08-removing-stale-nodes.md) | [Next: Module 10 — Functional Components →](./10-functional-components.md)

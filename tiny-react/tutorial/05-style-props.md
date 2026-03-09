# Module 5: Style Props

## What You'll Learn

- How React accepts style as a JavaScript object instead of a CSS string
- How to convert camelCase property names to kebab-case
- A common regex bug and how to avoid it

## The Problem

In HTML, you write styles as strings:

```html
<div style="color: red; font-size: 14px;">Hello</div>
```

But in React (and now in TinyReact), you write styles as JavaScript objects:

```jsx
<div style={{ color: "red", fontSize: "14px" }}>Hello</div>
```

Why? Because JavaScript objects are easier to compose, merge, and compute dynamically:

```js
const base = { padding: "10px", color: "black" };
const highlight = { color: "red", fontWeight: "bold" };
const merged = { ...base, ...highlight };
// { padding: "10px", color: "red", fontWeight: "bold" }
```

Try doing that with a CSS string — you'd need to parse and merge strings, which is messy.

The trade-off: CSS property names use kebab-case (`font-size`, `background-color`), but JavaScript object keys can't have dashes without quoting. So React uses camelCase: `fontSize`, `backgroundColor`.

We need to convert between the two.

## camelCase → kebab-case

The conversion rule is simple: every uppercase letter gets a dash before it and becomes lowercase.

| JavaScript (camelCase) | CSS (kebab-case) |
|---|---|
| `fontSize` | `font-size` |
| `backgroundColor` | `background-color` |
| `borderBottomColor` | `border-bottom-color` |
| `marginTop` | `margin-top` |
| `color` | `color` (no change) |

Here's the function:

```js
function jsToCss(s) {
  return s.replace(/([A-Z])/g, "-$1").toLowerCase();
}
```

The regex `/([A-Z])/g` finds every uppercase letter. The replacement `"-$1"` puts a dash before it. Then `.toLowerCase()` converts the whole thing.

### The `g` Flag Matters

This is a real bug that's easy to make. Without the `g` (global) flag:

```js
// BUG: only replaces the FIRST match
"borderBottomColor".replace(/([A-Z])/, "-$1").toLowerCase();
// → "border-bottomColor"  ← WRONG! Second "C" is not converted
```

With the `g` flag:

```js
// CORRECT: replaces ALL matches
"borderBottomColor".replace(/([A-Z])/g, "-$1").toLowerCase();
// → "border-bottom-color"  ← RIGHT
```

Always use `/g` when you want to replace all occurrences in a string.

## Style Object → CSS String

```js
function styleObjToCss(styleObj) {
  let css = "";
  for (const prop in styleObj) {
    if (styleObj.hasOwnProperty(prop)) {
      css += `${jsToCss(prop)}: ${styleObj[prop]}; `;
    }
  }
  return css;
}
```

This iterates over each property in the style object, converts the key to kebab-case, and builds a CSS string:

```js
styleObjToCss({ color: "red", fontSize: "14px", borderBottom: "1px solid" })
// → "color: red; font-size: 14px; border-bottom: 1px solid; "
```

The `hasOwnProperty` check ensures we only process the object's own properties, not anything inherited from its prototype.

## Wire It Into updateDomElement

Add the style handling to the prop-setting logic in `updateDomElement`, right after the `className` case:

```js
} else if (propName === "style" && typeof newProp === "object") {
  // Style object: { color: "red", fontSize: "14px" } → CSS string
  domElement.style.cssText = styleObjToCss(newProp);
}
```

We check `typeof newProp === "object"` to distinguish between style objects and style strings. If someone passes `style="color: red"` (a string), it falls through to the normal `setAttribute` path and works as expected.

We use `domElement.style.cssText` because it replaces the entire inline style in one operation — clean and efficient.

## Test It

Update `src/app.jsx`:

```jsx
import TinyReact from "./tiny-react";

const root = document.getElementById("root");

const headerStyle = {
  color: "white",
  backgroundColor: "darkblue",
  padding: "10px 20px",
  borderRadius: "4px",
};

const element = (
  <div>
    <h1 style={headerStyle}>Hello Tiny React!</h1>
    <p style={{ color: "gray", fontSize: "14px" }}>
      Style objects are converted to CSS automatically.
    </p>
    <p style="color: green">String styles still work too.</p>
    <button
      style={{ padding: "8px 16px", borderBottom: "3px solid blue" }}
      onClick={() => alert("Styled button!")}
    >
      Styled Button
    </button>
  </div>
);

TinyReact.render(element, root);
```

Check your browser:
- The `<h1>` should have a dark blue background with white text and rounded corners
- The paragraph should be gray with a smaller font
- The green paragraph uses a string style (still works)
- The button should have padding and a blue bottom border
- Inspect any element — the `style` attribute should contain proper kebab-case CSS

## Key Takeaways

1. **Style objects** are easier to compose and compute than style strings
2. **camelCase → kebab-case** conversion: `fontSize` → `font-size` using regex `/([A-Z])/g`
3. **Always use the `g` flag** in regex when you want to replace all matches, not just the first
4. **`typeof === "object"`** distinguishes style objects from style strings
5. **`style.cssText`** replaces the entire inline style efficiently

## What's Next

We can render and style elements — but only once. If we call `render()` again with different VDOM, it just appends more elements. We need a way to compare old and new VDOM trees and update only what changed.

That's the **diffing algorithm** — the heart of React's performance. Module 6.

---

[Previous: Module 4 — Attributes, Events & Properties](./04-attributes-events-properties.md) | [Next: Module 6 — Diffing Same-Type Elements →](./06-diffing-same-type-elements.md)

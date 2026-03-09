# Module 18: Fragments — Multiple Elements Without a Wrapper

## What You'll Learn

- Why fragments exist and what problem they solve
- How `<>...</>` compiles to `createElement(Fragment, null, ...children)`
- How to implement Fragment rendering using `display: contents`
- The trade-off between true fragments and wrapper-based fragments

## The Problem

Sometimes you need a component to return multiple elements:

```jsx
function UserInfo() {
  return (
    <td>Alice</td>
    <td>alice@example.com</td>
  );
}
```

This doesn't work — JSX requires a single root element. The usual fix is a wrapper `<div>`:

```jsx
function UserInfo() {
  return (
    <div>
      <td>Alice</td>
      <td>alice@example.com</td>
    </div>
  );
}
```

But now there's a `<div>` inside a `<tr>`, which breaks the table layout. **Fragments** solve this — they group children without adding a DOM node:

```jsx
function UserInfo() {
  return (
    <>
      <td>Alice</td>
      <td>alice@example.com</td>
    </>
  );
}
```

## How JSX Compiles Fragments

The `<>...</>` syntax is shorthand for `<Fragment>...</Fragment>`. Vite's esbuild compiles it using the `jsxFragment` config:

```js
// vite.config.js
esbuild: {
  jsxFactory: "TinyReact.createElement",
  jsxFragment: "TinyReact.Fragment",    // ← this
}
```

So `<><td>A</td><td>B</td></>` compiles to:

```js
TinyReact.createElement(TinyReact.Fragment, null,
  TinyReact.createElement("td", null, "A"),
  TinyReact.createElement("td", null, "B")
);
```

Fragment is just a value passed as the `type` argument to `createElement`.

## Build It

### The Fragment Sentinel

```js
const Fragment = Symbol("TinyReact.Fragment");
```

We use a `Symbol` — a unique, unforgeable value. It can't collide with any HTML tag name or component function. When `createElement` receives it as `type`, we know we're dealing with a fragment.

### Rendering Strategy: `display: contents`

True fragments (like React's) render children directly into the parent with no wrapper element at all. This requires fundamental changes to our diffing algorithm because it breaks the 1:1 mapping between VDOM nodes and DOM nodes.

Our pragmatic approach: render a `<div style="display:contents">` wrapper. The CSS `display: contents` property makes the element **invisible to layout** — its children behave as if they were direct children of the parent. No extra box, no layout impact.

```
// What the DOM looks like:
<tr>
  <div style="display: contents">   ← invisible to layout
    <td>Alice</td>
    <td>alice@example.com</td>
  </div>
</tr>

// What the browser renders (visually):
<tr>
  <td>Alice</td>
  <td>alice@example.com</td>
</tr>
```

### Mount Fragment

In `mountSimpleNode`, add a case for Fragment:

```js
if (vdom.type === "text") {
  newDomElement = document.createTextNode(vdom.props.textContent);
} else if (vdom.type === Fragment) {
  // Fragment: invisible wrapper that doesn't affect layout
  newDomElement = document.createElement("div");
  newDomElement.style.display = "contents";
} else {
  newDomElement = document.createElement(vdom.type);
  updateDomElement(newDomElement, vdom);
}
```

That's it for mounting. The rest of `mountSimpleNode` already handles children recursively, so fragment children get mounted normally.

### Create DOM Element

Same change in `createDomElement` (used when replacing elements during type mismatches):

```js
if (vdom.type === "text") {
  newDomElement = document.createTextNode(vdom.props.textContent);
} else if (vdom.type === Fragment) {
  newDomElement = document.createElement("div");
  newDomElement.style.display = "contents";
} else {
  newDomElement = document.createElement(vdom.type);
  updateDomElement(newDomElement, vdom);
}
```

### Diffing

No changes needed! Here's why:

- Fragment is not a function → won't enter the component diffing branch
- `oldvdom.type === vdom.type` works with Symbols → same Fragment type diffs normally
- Children are diffed recursively as with any element
- `updateDomElement` is never called for Fragments (the `else if` branch skips it)

### Export

```js
const TinyReact = {
  createElement,
  Fragment,        // ← new
  render,
  // ...
};
```

## Usage Examples

### Basic Fragment

```jsx
function Header() {
  return (
    <>
      <h1>Title</h1>
      <p>Subtitle</p>
    </>
  );
}
```

### Table Rows

```jsx
function UserRow({ user }) {
  return (
    <>
      <td>{user.name}</td>
      <td>{user.email}</td>
      <td>{user.role}</td>
    </>
  );
}

function UsersTable({ users }) {
  return (
    <table>
      {users.map(user => (
        <tr key={user.id}>
          <UserRow user={user} />
        </tr>
      ))}
    </table>
  );
}
```

### Conditional Groups

```jsx
function Dashboard({ isAdmin }) {
  return (
    <div>
      <h1>Dashboard</h1>
      {isAdmin && (
        <>
          <button>Edit Users</button>
          <button>View Logs</button>
          <button>Settings</button>
        </>
      )}
    </div>
  );
}
```

## The Trade-off

| Approach | Pros | Cons |
|---|---|---|
| `display: contents` wrapper | Simple, preserves 1:1 VDOM↔DOM mapping, diffing works unchanged | Extra DOM node (invisible), rare CSS edge cases |
| True fragments (no wrapper) | Zero DOM overhead, identical to React | Requires rewriting diff to handle 1:N node mapping |

For a teaching framework, the wrapper approach is the right call. It's honest about the trade-off and keeps the codebase simple. Production frameworks like React and Preact handle the complexity of true fragments internally — but the concept is the same.

## Try It

1. Use `<>...</>` in any component
2. Inspect the DOM — you'll see a `<div style="display: contents">` wrapper
3. Verify it doesn't affect layout — children render as if the wrapper isn't there
4. Use Fragments in tables, conditional groups, or anywhere you'd normally need a wrapper `<div>`

## Key Takeaways

1. **Fragments** let components return multiple elements without a wrapper
2. **`<>...</>`** compiles to `createElement(Fragment, null, ...children)`
3. **`Fragment` is a Symbol** — unique and unforgeable, used as the VDOM `type`
4. **`display: contents`** makes a wrapper element invisible to layout
5. **No diffing changes needed** — Fragments diff like any other element type
6. **Total code added: ~5 lines** — one Symbol, two branch conditions, one export

---

[Previous: Module 17 — Performance](./17-performance.md) | [Next: Module 19 — Error Boundaries →](./19-error-boundaries.md)

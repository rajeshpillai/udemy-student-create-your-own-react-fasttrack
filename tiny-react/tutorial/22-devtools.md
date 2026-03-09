# Module 22: DevTools — Component Tree Inspector

## What You'll Learn

- How to expose framework internals for debugging
- How to walk the DOM to reconstruct the component tree
- How to inspect component state, props, and hooks from the console
- How React DevTools work at a conceptual level

## The Problem

When debugging a React app, you need to see:
- Which components are rendered and where
- What props each component received
- What state/hooks each component holds
- Which DOM element a component owns

Without DevTools, you're blind — console.log everywhere, guessing at the tree structure. React ships a browser extension for this. We'll build a lightweight version that works from the console.

## Build It

### The DevTools Object

We expose a global `window.__TINY_REACT_DEVTOOLS__` with four methods:

```js
if (typeof window !== "undefined") {
  window.__TINY_REACT_DEVTOOLS__ = {
    getTree(rootElement) { ... },
    inspect(domElement) { ... },
    highlight(domElement) { ... },
    listComponents(rootElement) { ... },
  };
}
```

### getTree — Component Tree Visualization

Walks the DOM recursively and builds a tree object showing the component hierarchy:

```js
getTree(rootElement) {
  const root = rootElement || document.getElementById("root");
  if (!root) return null;
  return buildTree(root);
}

function buildTree(domElement, depth = 0) {
  const node = { element: domElement.tagName || "#text", children: [] };

  if (domElement._hookOwner) {
    node.component = domElement._hookOwner._vdom.type.name || "Anonymous";
  }
  if (domElement._virtualElement && domElement._virtualElement.component) {
    node.classComponent = domElement._virtualElement.component.constructor.name;
  }

  for (let i = 0; i < domElement.childNodes.length; i++) {
    if (domElement.childNodes[i].nodeType === 1) {
      node.children.push(buildTree(domElement.childNodes[i], depth + 1));
    }
  }
  return node;
}
```

Usage in the console:

```js
// See the full component tree
console.log(JSON.stringify(__TINY_REACT_DEVTOOLS__.getTree(), null, 2));

// Output:
{
  "element": "DIV",
  "component": "TodoApp",
  "children": [
    { "element": "DIV", "children": [
      { "element": "H1", "children": [] },
      { "element": "BUTTON", "children": [] }
    ]},
    { "element": "UL", "children": [
      { "element": "LI", "component": "TodoItem", "children": [...] },
      { "element": "LI", "component": "TodoItem", "children": [...] }
    ]}
  ]
}
```

### inspect — Component Details

Returns props, state, and hooks for a specific DOM element:

```js
inspect(domElement) {
  const info = {};
  if (domElement._virtualElement) {
    const vdom = domElement._virtualElement;
    info.type = typeof vdom.type === "function"
      ? vdom.type.name || "Anonymous"
      : vdom.type;
    info.props = vdom.props;
    info.children = vdom.children.length;
  }
  if (domElement._hookOwner) {
    const owner = domElement._hookOwner;
    info.component = owner._vdom.type.name || "Anonymous";
    info.hooks = getHooks(owner);
    info.dom = owner._dom;
  }
  if (domElement._virtualElement && domElement._virtualElement.component) {
    const comp = domElement._virtualElement.component;
    info.classComponent = comp.constructor.name;
    info.state = comp.state;
    info.props = comp.props;
  }
  return info;
}
```

Usage:

```js
// Select an element in DevTools Elements panel, then:
__TINY_REACT_DEVTOOLS__.inspect($0)

// Output:
{
  component: "TodoItem",
  hooks: [
    { value: "light", deps: undefined },  // useMemo for theme
    { current: null }                       // useRef
  ],
  props: { task: { id: 1, title: "Build createElement", completed: true } },
  dom: <li>...</li>
}
```

### highlight — Visual Identification

Temporarily outlines a DOM element to find it visually:

```js
highlight(domElement) {
  const prev = domElement.style.outline;
  domElement.style.outline = "2px solid red";
  setTimeout(() => { domElement.style.outline = prev; }, 2000);
}
```

Usage:

```js
// Highlight the root component's element
const components = __TINY_REACT_DEVTOOLS__.listComponents();
__TINY_REACT_DEVTOOLS__.highlight(components[0].element);
```

### listComponents — Flat Component List

Lists all mounted components with their names, elements, and state:

```js
listComponents(rootElement) {
  const root = rootElement || document.getElementById("root");
  const components = [];
  walkDom(root, (el) => {
    if (el._hookOwner) {
      const name = el._hookOwner._vdom.type.name || "Anonymous";
      components.push({ name, element: el, hooks: getHooks(el._hookOwner) });
    }
    if (el._virtualElement && el._virtualElement.component) {
      const comp = el._virtualElement.component;
      components.push({ name: comp.constructor.name, element: el, state: comp.state });
    }
  });
  return components;
}

function walkDom(element, callback) {
  if (!element) return;
  callback(element);
  for (let i = 0; i < element.childNodes.length; i++) {
    walkDom(element.childNodes[i], callback);
  }
}
```

Usage:

```js
__TINY_REACT_DEVTOOLS__.listComponents()
// [
//   { name: "TodoApp", element: <div>, hooks: [...] },
//   { name: "TodoItem", element: <li>, hooks: [...] },
//   { name: "TodoItem", element: <li>, hooks: [...] },
// ]
```

## How It Works Internally

Our DevTools rely on metadata stored on DOM elements during rendering:

| Property | Set By | Contains |
|---|---|---|
| `_virtualElement` | `mountSimpleNode`, `diff` | VDOM node (type, props, children) |
| `_hookOwner` | `mountComponent` | Hook owner (hooks array, vdom, dom ref) |
| `.component` | `buildStatefulComponent` | Class component instance (state, props) |
| `_eventHandlers` | `updateDomElement` | Delegated event handlers |

DevTools just reads these existing properties — no extra bookkeeping needed.

## How React DevTools Work

React's DevTools extension:

1. **Fiber tree traversal**: React maintains a fiber tree (linked list). DevTools walks it to build the component tree.
2. **Bridge protocol**: The extension communicates with the page via `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` — a bridge object.
3. **Renderer injection**: React registers itself with the hook on load. DevTools reads from the registered renderer.
4. **Profiler**: Records render timing per component by hooking into the commit phase.

Our approach is simpler — we walk the DOM instead of maintaining a separate tree. This works for small apps but wouldn't scale to production.

## Try It

1. Open the todo app in your browser
2. Open DevTools → Console
3. Try these commands:

```js
// See the component tree
__TINY_REACT_DEVTOOLS__.getTree()

// List all components
__TINY_REACT_DEVTOOLS__.listComponents()

// Inspect a specific element (select one in Elements panel first)
__TINY_REACT_DEVTOOLS__.inspect($0)

// Highlight an element
const comps = __TINY_REACT_DEVTOOLS__.listComponents();
__TINY_REACT_DEVTOOLS__.highlight(comps[0].element);

// See hooks for a specific component
comps[0].hooks
```

## Key Takeaways

1. **DevTools read existing metadata** — `_virtualElement`, `_hookOwner`, `.component` are already on DOM elements
2. **`getTree()`** walks the DOM recursively to build a component hierarchy
3. **`inspect()`** returns props, state, and hooks for any DOM element
4. **`listComponents()`** gives a flat list of all mounted components
5. **React DevTools** use a similar approach but walk the fiber tree instead of the DOM
6. **No runtime cost** — DevTools code only runs when you call it from the console

---

[Previous: Module 21 — Concurrent Rendering](./21-concurrent-rendering.md)

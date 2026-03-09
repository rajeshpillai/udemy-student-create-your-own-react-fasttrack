# Module 12: useState Hook

## What You'll Learn

- How hooks work internally — no magic, just arrays and closures
- Why hooks must be called in the same order every render
- How to implement `useState` from scratch
- How functional setState (`setCount(prev => prev + 1)`) works

## The Big Picture

Class components use `this.state` and `this.setState()`. But modern React prefers **hooks** — functions that let you add state to functional components without writing a class.

```jsx
// Class component (verbose):
class Counter extends Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
    this.increment = this.increment.bind(this);
  }
  increment() { this.setState({ count: this.state.count + 1 }); }
  render() { return <button onClick={this.increment}>{this.state.count}</button>; }
}

// Hooks (concise):
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

Same result, half the code. No `this`, no `bind`, no constructor.

## How Hooks Work Internally

Here's the secret: **hooks are stored in an array, indexed by call order.**

When your component renders:
```js
function MyComponent() {
  const [name, setName] = useState("Alice");  // hooks[0]
  const [age, setAge] = useState(25);          // hooks[1]
  // ...
}
```

The first `useState` reads/writes `hooks[0]`, the second reads/writes `hooks[1]`. The framework tracks the current index and increments it with each call.

**This is why hooks can't be inside conditions:**

```js
// BROKEN: hook order changes between renders
if (someCondition) {
  const [a, setA] = useState(0);  // Sometimes hooks[0], sometimes skipped
}
const [b, setB] = useState(0);    // Sometimes hooks[1], sometimes hooks[0] — WRONG
```

If `someCondition` changes, the indices shift and hooks return wrong values. React enforces this with the "Rules of Hooks" lint rule. Now you know *why* the rule exists.

## Build It

### The Hook Infrastructure

We need three pieces of module-level state:

```js
let currentHookOwner = null;        // Which component is currently rendering
let hookIndex = 0;                   // Which hook we're on
const hookStates = new WeakMap();    // component → hooks array
```

And a helper to get/create the hooks array:

```js
function getHooks(owner) {
  if (!hookStates.has(owner)) {
    hookStates.set(owner, []);
  }
  return hookStates.get(owner);
}
```

We use a `WeakMap` so that when a component is garbage collected, its hooks are too. No memory leaks.

### Setting Hook Context

Before calling a functional component, we set `currentHookOwner` so that `useState` (and later hooks) know which component they belong to:

```js
function buildFunctionalComponent(vdom) {
  if (!vdom._hookOwner) {
    vdom._hookOwner = { _dom: null, _vdom: vdom };
  }
  const owner = vdom._hookOwner;
  owner._vdom = vdom;

  currentHookOwner = owner;
  hookIndex = 0;
  const result = vdom.type(vdom.props || {});
  currentHookOwner = null;

  return result;
}
```

The `_hookOwner` is a lightweight object that tracks:
- `_dom`: the real DOM element (needed to trigger re-renders)
- `_vdom`: the VDOM node (needed to re-call the component function)

We reset `hookIndex = 0` before each render so hooks read from the start of the array.

### Re-rendering a Functional Component

When `setState` is called, we need to re-render:

```js
function reRenderFunctionalComponent(owner) {
  const dom = owner._dom;
  if (!dom || !dom.parentNode) return;
  const container = dom.parentNode;
  const vdom = owner._vdom;

  currentHookOwner = owner;
  hookIndex = 0;
  const newVdom = vdom.type(vdom.props || {});
  currentHookOwner = null;

  diff(newVdom, container, dom);
}
```

Same pattern: set context, call the component, diff the result.

### useState Implementation

```js
function useState(initialValue) {
  const owner = currentHookOwner;
  const hooks = getHooks(owner);
  const idx = hookIndex++;

  // Initialize on first render
  if (hooks[idx] === undefined) {
    hooks[idx] = typeof initialValue === "function" ? initialValue() : initialValue;
  }

  const setState = (newValue) => {
    const current = hooks[idx];
    const next = typeof newValue === "function" ? newValue(current) : newValue;
    if (next !== current) {
      hooks[idx] = next;
      reRenderFunctionalComponent(owner);
    }
  };

  return [hooks[idx], setState];
}
```

Step by step:

1. **`hookIndex++`** — each `useState` call gets the next slot in the array
2. **First render**: `hooks[idx]` is `undefined`, so we initialize it. If `initialValue` is a function (lazy initialization), we call it.
3. **Subsequent renders**: `hooks[idx]` already has the value. We just read it.
4. **`setState`** — the returned setter:
   - Accepts a value OR a function (`setCount(5)` or `setCount(prev => prev + 1)`)
   - If the value hasn't changed (`next !== current`), skip the re-render
   - Otherwise, store the new value and re-render the component

### Wire It Into mountComponent

After mounting, store the DOM reference on the hook owner:

```js
// In mountComponent, after mountElement:
if (vdom._hookOwner) {
  vdom._hookOwner._dom = newDomElement;
}
```

### Export useState

```js
const TinyReact = {
  createElement,
  render,
  Component,
  useState,
};
```

## Test It

```jsx
import TinyReact from "./tiny-react";

const root = document.getElementById("root");

function Counter() {
  const [count, setCount] = TinyReact.useState(0);

  return (
    <div>
      <h2>Counter: {count}</h2>
      <button onClick={() => setCount(count - 1)}>-</button>
      <span style={{ padding: "0 12px" }}>{count}</span>
      <button onClick={() => setCount(count + 1)}>+</button>
      <button onClick={() => setCount(prev => prev + 10)}>+10</button>
    </div>
  );
}

function NameCard() {
  const [name, setName] = TinyReact.useState("World");
  const [color, setColor] = TinyReact.useState("black");

  return (
    <div>
      <h2 style={{ color }}>Hello, {name}!</h2>
      <input type="text" value={name} onInput={(e) => setName(e.target.value)} />
      <button onClick={() => setColor(color === "black" ? "blue" : "black")}>
        Toggle color
      </button>
    </div>
  );
}

TinyReact.render(
  <div>
    <h1>useState Demo</h1>
    <Counter />
    <NameCard />
  </div>,
  root
);
```

- **Counter**: Click +/- to increment/decrement. Click "+10" for functional update.
- **NameCard**: Two independent `useState` calls. Type to change the name, click to toggle color. They don't interfere with each other.

## Key Takeaways

1. **Hooks are stored in an array**, indexed by call order — that's why they can't be conditional
2. **`currentHookOwner`** tracks which component is rendering, so hooks know where to store state
3. **`hookIndex` resets to 0** at the start of each render — hooks read from the beginning
4. **`setState` supports functions**: `setCount(prev => prev + 1)` is safer than `setCount(count + 1)` when multiple updates queue
5. **`WeakMap`** prevents memory leaks — hooks are garbage collected with their component
6. **Re-render** calls the component function again, reads updated hook values, and diffs the result

---

[Previous: Module 11 — Lifecycle Methods & Refs](./11-lifecycle-methods-and-refs.md) | [Next: Module 13 — useEffect Hook →](./13-useeffect-hook.md)

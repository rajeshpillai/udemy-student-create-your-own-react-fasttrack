# Module 10: Functional Components

## What You'll Learn

- What a "component" actually is under the hood
- How functional components work (they're just functions that return VDOM)
- How to detect if a VDOM element is a component or a native element
- How component composition works (components rendering components)

## The Big Idea

Until now, every VDOM element has `type` as a **string** — `"div"`, `"h1"`, `"span"`. JSX like `<div>` compiles to `createElement("div", ...)`.

But what about `<Greeting name="World" />`? This compiles to:

```js
createElement(Greeting, { name: "World" })
```

The `type` is not a string — **it's the function itself**. The framework needs to detect this and call the function to get the VDOM tree it produces.

That's what a component is: a function (or class) that returns VDOM. The framework calls it, takes the result, and renders that.

## Functional Components

A functional component is a plain JavaScript function that takes props and returns a VDOM tree:

```jsx
const Heart = (props) => <span style={props.style}>&hearts;</span>;

// Usage:
<Heart style={{ color: "red" }} />
```

When the framework encounters `{ type: Heart, props: { style: {...} } }`, it needs to:
1. Recognize that `type` is a function
2. Call `Heart({ style: {...} })`
3. Get back the VDOM tree: `{ type: "span", ... }`
4. Render that VDOM tree

## Build It

### Detection: Is it a component?

When `mountElement` receives a VDOM element, it checks the type:

```js
function mountElement(vdom, container, oldDomElement) {
  if (typeof vdom.type === "function") {
    return mountComponent(vdom, container, oldDomElement);
  } else {
    return mountSimpleNode(vdom, container, oldDomElement);
  }
}
```

### Functional vs Stateful

We need to distinguish functional components from class components. A class component has a `render` method on its prototype:

```js
function isFunctionalComponent(vdom) {
  const nodeType = vdom && vdom.type;
  return (
    nodeType &&
    typeof nodeType === "function" &&
    !(nodeType.prototype && nodeType.prototype.render)
  );
}
```

If it has `prototype.render`, it's a class. If not, it's a function.

### Building a Functional Component

```js
function buildFunctionalComponent(vdom) {
  return vdom.type(vdom.props || {});
}
```

That's it! Call the function with its props. It returns VDOM.

### Mounting a Component

```js
function mountComponent(vdom, container, oldDomElement) {
  let nextvDom, component, newDomElement;

  if (isFunctionalComponent(vdom)) {
    nextvDom = buildFunctionalComponent(vdom);
  } else {
    nextvDom = buildStatefulComponent(vdom);
    component = nextvDom.component;
  }

  // A component might return another component — recurse
  if (typeof nextvDom.type === "function") {
    return mountComponent(nextvDom, container, oldDomElement);
  }

  newDomElement = mountElement(nextvDom, container, oldDomElement);

  if (component) {
    component.setDomElement(newDomElement);
  }

  return newDomElement;
}
```

Key points:
- **Recursive composition**: A component can return another component. `<App />` might return `<Layout />` which returns `<div>`. We keep calling `mountComponent` until we reach a native element.
- **`buildStatefulComponent`** (for classes) stores a reference on the VDOM so we can find the component instance later during diffing.

### Component Diffing

When the diff algorithm encounters a component type (`typeof vdom.type === "function"`), it delegates to:

```js
function diffComponent(newVirtualElement, oldComponent, container, domElement) {
  if (oldComponent && newVirtualElement.type === oldComponent.constructor) {
    // Same component type — update props and re-render
    oldComponent.updateProps(newVirtualElement.props);
    const nextElement = oldComponent.render();
    nextElement.component = oldComponent;
    diff(nextElement, container, domElement);
  } else {
    // Different component type — remount
    mountElement(newVirtualElement, container, domElement);
  }
}
```

Same component type? Update its props and diff its new render output against the old DOM.
Different component type? Tear down and remount entirely.

## The Component Base Class

We also introduce the `Component` class that stateful components will extend:

```js
class Component {
  constructor(props) {
    this.props = props;
    this.state = {};
    this.prevState = {};
  }

  setState(nextState) {
    if (!this.prevState) this.prevState = this.state;
    this.state = Object.assign({}, this.state, nextState);

    const dom = this.getDomElement();
    const container = dom.parentNode;
    const newvdom = this.render();
    diff(newvdom, container, dom);
  }

  setDomElement(dom) { this._dom = dom; }
  getDomElement() { return this._dom; }
  updateProps(props) { this.props = props; }

  // Lifecycle stubs
  componentDidMount() {}
  componentWillUnmount() {}
  shouldComponentUpdate(nextProps, nextState) {
    return nextProps !== this.props || nextState !== this.state;
  }
  componentDidUpdate(prevProps, prevState) {}
}
```

### How setState Works

1. Merge new state with existing state (`Object.assign` — shallow merge)
2. Get the DOM element this component rendered to
3. Call `render()` to produce new VDOM
4. Diff the new VDOM against the current DOM

This is the core loop: **state change → render → diff → minimal DOM update**.

## Test It

Update `src/app.jsx`:

```jsx
import TinyReact from "./tiny-react";

const root = document.getElementById("root");

// Functional component
const Heart = (props) => <span style={props.style}>&hearts;</span>;

const Button = (props) => (
  <button onClick={props.onClick}>{props.children}</button>
);

const Greeting = (props) => (
  <div className="greeting">
    <h2>Welcome, {props.name}!</h2>
    <Button onClick={() => alert("I love React!")}>
      I <Heart style={{ color: "red" }} /> React
    </Button>
  </div>
);

// Stateful component with setState
class Counter extends TinyReact.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
    this.increment = this.increment.bind(this);
    this.decrement = this.decrement.bind(this);
  }

  increment() {
    this.setState({ count: this.state.count + 1 });
  }

  decrement() {
    this.setState({ count: this.state.count - 1 });
  }

  render() {
    return (
      <div style={{ marginTop: "20px" }}>
        <h2>Counter: {this.state.count}</h2>
        <Button onClick={this.decrement}>-</Button>
        <span style={{ padding: "0 10px" }}>{this.state.count}</span>
        <Button onClick={this.increment}>+</Button>
      </div>
    );
  }
}

TinyReact.render(
  <div>
    <Greeting name="Developer" />
    <Counter />
  </div>,
  root
);
```

You should see:
- **Greeting** with a heart icon and a clickable button (functional components composing)
- **Counter** with + and - buttons that update the count (stateful component with `setState`)
- Clicking + and - updates only the count — the Greeting section is untouched

## Key Takeaways

1. **Components have `type` as a function**, not a string — the framework calls the function to get VDOM
2. **Functional components** are functions that take props and return VDOM — simplest possible component
3. **`isFunctionalComponent`** checks for `prototype.render` to distinguish from class components
4. **Components can return components** — `mountComponent` recurses until it reaches a native element
5. **`setState`** merges state, calls `render()`, and diffs — triggering minimal DOM updates
6. **Component instances are stored** on VDOM nodes so diffing can find them later

---

[Previous: Module 9 — Keyed Reconciliation](./09-keyed-reconciliation.md) | [Next: Module 11 — Lifecycle Methods & Refs →](./11-lifecycle-methods-and-refs.md)

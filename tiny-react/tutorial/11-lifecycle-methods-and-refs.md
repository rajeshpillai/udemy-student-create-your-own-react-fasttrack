# Module 11: Lifecycle Methods & Refs

## What You'll Learn

- What lifecycle methods are and when each one fires
- How to wire lifecycle hooks into the mount/update/unmount cycle
- How refs give you direct access to DOM elements
- How to clean up resources (timers, subscriptions) on unmount

## Component Lifecycle

A class component goes through three phases:

```
MOUNTING           UPDATING              UNMOUNTING
─────────          ────────              ──────────
constructor()      shouldComponentUpdate()
render()           render()
DOM updated        DOM updated
componentDidMount()  componentDidUpdate()  componentWillUnmount()
```

### Mounting (component appears on screen)
1. `constructor(props)` — initialize state, bind methods
2. `render()` — return VDOM tree
3. DOM is created and inserted
4. `componentDidMount()` — safe to access DOM, start timers, fetch data

### Updating (props or state change)
1. `shouldComponentUpdate(nextProps, nextState)` — return `false` to skip render
2. `render()` — return new VDOM tree
3. DOM is diffed and updated
4. `componentDidUpdate(prevProps)` — respond to updates

### Unmounting (component removed from screen)
1. `componentWillUnmount()` — clean up timers, subscriptions, listeners

## Wiring Lifecycle Methods

### componentDidMount — in mountComponent

After the component's DOM is created and inserted:

```js
function mountComponent(vdom, container, oldDomElement) {
  // ... build and mount ...

  if (component) {
    component.setDomElement(newDomElement);
    component.componentDidMount();  // ← NEW
  }

  return newDomElement;
}
```

### shouldComponentUpdate + componentDidUpdate — in diffComponent

Before re-rendering, check if the component wants to update:

```js
function diffComponent(newVirtualElement, oldComponent, container, domElement) {
  if (oldComponent && newVirtualElement.type === oldComponent.constructor) {
    if (oldComponent.shouldComponentUpdate(newVirtualElement.props, oldComponent.state)) {
      const prevProps = oldComponent.props;
      oldComponent.updateProps(newVirtualElement.props);
      const nextElement = oldComponent.render();
      nextElement.component = oldComponent;
      diff(nextElement, container, domElement);
      oldComponent.componentDidUpdate(prevProps);  // ← NEW
    }
    // If shouldComponentUpdate returns false, skip entirely
  } else {
    mountElement(newVirtualElement, container, domElement);
  }
}
```

### componentWillUnmount — in unmountNode

Before tearing down a component:

```js
function unmountNode(domElement) {
  const virtualElement = domElement._virtualElement;
  if (!virtualElement) { domElement.remove(); return; }

  const oldComponent = virtualElement.component;
  if (oldComponent) {
    oldComponent.componentWillUnmount();  // ← NEW
  }

  // ... rest of cleanup ...
}
```

## Refs — Direct DOM Access

Sometimes you need the actual DOM element: to focus an input, measure dimensions, or integrate with a non-React library. Refs are the escape hatch.

A ref is a **callback function** that receives the DOM element after mounting:

```jsx
<input ref={(el) => { this.textInput = el; }} />
// After mount: this.textInput is the real <input> DOM element
// this.textInput.focus() works!
```

### Wiring Refs

**In mountSimpleNode** — call ref after the element is created:
```js
if (vdom.props && vdom.props.ref) {
  vdom.props.ref(newDomElement);
}
```

**In mountComponent** — ref receives the component instance (not DOM):
```js
if (component.props.ref) {
  component.props.ref(component);
}
```

**In unmountNode** — call ref with `null` to clean up:
```js
if (virtualElement.props && virtualElement.props.ref) {
  virtualElement.props.ref(null);
}
```

**In createDomElement** — also wire ref for replaced subtrees:
```js
if (vdom.props && vdom.props.ref) {
  vdom.props.ref(newDomElement);
}
```

## Test It

```jsx
import TinyReact from "./tiny-react";

const root = document.getElementById("root");

class Timer extends TinyReact.Component {
  constructor(props) {
    super(props);
    this.state = { seconds: 0 };
  }

  componentDidMount() {
    console.log("Timer: componentDidMount — starting interval");
    this.interval = setInterval(() => {
      this.setState({ seconds: this.state.seconds + 1 });
    }, 1000);
  }

  componentWillUnmount() {
    console.log("Timer: componentWillUnmount — clearing interval");
    clearInterval(this.interval);
  }

  render() {
    return <p>Elapsed: {this.state.seconds}s</p>;
  }
}

class App extends TinyReact.Component {
  constructor(props) {
    super(props);
    this.state = { showTimer: true };
    this.toggle = this.toggle.bind(this);
  }

  toggle() {
    this.setState({ showTimer: !this.state.showTimer });
  }

  render() {
    return (
      <div>
        <h1>Lifecycle & Refs Demo</h1>
        <button onClick={this.toggle}>
          {this.state.showTimer ? "Unmount Timer" : "Mount Timer"}
        </button>
        {this.state.showTimer && <Timer />}
        <div style={{ marginTop: "20px" }}>
          <input
            type="text"
            placeholder="I get focused on mount"
            ref={(el) => { if (el) el.focus(); }}
          />
        </div>
      </div>
    );
  }
}

TinyReact.render(<App />, root);
```

Watch the console:
1. On load: "componentDidMount — starting interval" — timer starts counting
2. Click "Unmount Timer": "componentWillUnmount — clearing interval" — timer stops, interval cleaned up
3. Click "Mount Timer": Timer remounts, starts fresh from 0
4. The input field auto-focuses on load (ref callback runs after mount)

## Key Takeaways

1. **`componentDidMount()`** runs once after the component's DOM is first inserted — safe for side effects
2. **`componentWillUnmount()`** runs before removal — clean up everything (timers, listeners, subscriptions)
3. **`shouldComponentUpdate()`** lets components skip re-renders for performance
4. **`componentDidUpdate()`** runs after every re-render — useful for responding to prop/state changes
5. **Refs** are callbacks that receive the real DOM element (or component instance) — use for focus, measurement, third-party integration
6. **Refs receive `null`** on unmount — always check before using

---

[Previous: Module 10 — Functional Components](./10-functional-components.md) | [Next: Module 12 — useState Hook →](./12-usestate-hook.md)

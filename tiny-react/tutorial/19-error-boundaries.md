# Module 19: Error Boundaries — Catching Render Errors Gracefully

## What You'll Learn

- Why uncaught render errors crash the entire app
- How error boundaries catch errors in the component tree
- How to implement `componentDidCatch` and `getDerivedStateFromError`
- How the component stack tracks the render hierarchy

## The Problem

What happens when a component throws during render?

```jsx
function BuggyCounter({ count }) {
  if (count === 3) throw new Error("Crash!");
  return <div>{count}</div>;
}
```

Without error boundaries, this error:
1. Propagates up through `mountComponent` / `diff`
2. Crashes the entire `render()` call
3. Leaves the user with a blank screen or broken UI
4. No recovery possible

React's solution: **error boundaries** — class components that catch errors in their subtree and render fallback UI instead.

## How Error Boundaries Work

An error boundary is a class component that implements one or both of:

| Method | When It Runs | Purpose |
|---|---|---|
| `static getDerivedStateFromError(error)` | During render, synchronously | Returns new state (e.g., `{ hasError: true }`) |
| `componentDidCatch(error, info)` | After render, asynchronously | Side effects: logging, error reporting |

```jsx
class ErrorBoundary extends TinyReact.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Caught by boundary:", error);
    console.error("Component stack:", info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <div style={{ color: "red", padding: "20px" }}>
        <h2>Something went wrong</h2>
        <p>{this.state.error.message}</p>
      </div>;
    }
    // Normal render — show children
    return this.props.children[0];
  }
}
```

Usage:

```jsx
<ErrorBoundary>
  <BuggyCounter count={count} />
</ErrorBoundary>
```

When `BuggyCounter` throws, `ErrorBoundary` catches it and renders the fallback UI instead of crashing the whole app.

## Build It

### The Component Stack

During rendering, we need to know which class components are ancestors of the current render. This lets us find the nearest error boundary when an error occurs.

```js
const componentStack = []; // Tracks class components during render
```

We push class components onto this stack before rendering their children, and pop them after.

### isErrorBoundary

A helper to detect whether a class component is an error boundary:

```js
function isErrorBoundary(component) {
  return (
    (component.componentDidCatch !== Component.prototype.componentDidCatch) ||
    (component.constructor.getDerivedStateFromError !== Component.getDerivedStateFromError)
  );
}
```

A component is a boundary if it overrides either `componentDidCatch` or `getDerivedStateFromError` from the base class.

### handleRenderError

When a render error occurs, walk the stack to find the nearest boundary:

```js
function handleRenderError(error, container, oldDomElement) {
  for (let i = componentStack.length - 1; i >= 0; i--) {
    const boundary = componentStack[i];
    if (isErrorBoundary(boundary)) {
      // Derive error state
      const derivedState = boundary.constructor.getDerivedStateFromError(error);
      if (derivedState) {
        boundary.state = Object.assign({}, boundary.state, derivedState);
      }

      // Notify the boundary
      const info = {
        componentStack: componentStack.map(c => c.constructor.name).join(" > ")
      };
      boundary.componentDidCatch(error, info);

      // Re-render the boundary with error state
      const dom = boundary.getDomElement();
      if (dom && dom.parentNode) {
        const newVdom = boundary.render();
        diff(newVdom, dom.parentNode, dom);
      }
      return;
    }
  }
  // No error boundary found — rethrow (crashes as before)
  throw error;
}
```

The flow:
1. Walk backward through `componentStack` (innermost → outermost)
2. First component that overrides `componentDidCatch` or `getDerivedStateFromError` is the boundary
3. Call `getDerivedStateFromError` to get new state (e.g., `{ hasError: true }`)
4. Call `componentDidCatch` for side effects (logging)
5. Re-render the boundary — its `render()` checks `this.state.hasError` and shows fallback UI

### Wrap mountComponent

Push/pop class components on the stack, and catch errors:

```js
function mountComponent(vdom, container, oldDomElement) {
  let nextvDom, component, newDomElement;

  try {
    if (isFunctionalComponent(vdom)) {
      nextvDom = buildFunctionalComponent(vdom);
    } else {
      nextvDom = buildStatefulComponent(vdom);
      component = nextvDom.component;
      componentStack.push(component);    // ← track for error boundaries
    }

    if (typeof nextvDom.type === "function") {
      newDomElement = mountComponent(nextvDom, container, oldDomElement);
    } else {
      newDomElement = mountElement(nextvDom, container, oldDomElement);
    }
  } catch (error) {
    if (component) componentStack.pop();
    handleRenderError(error, container, oldDomElement);
    // Return a fallback empty node
    newDomElement = document.createTextNode("");
    container.appendChild(newDomElement);
    return newDomElement;
  }

  // ... rest of mountComponent (hook owner, lifecycle calls)

  if (component) {
    componentStack.pop();               // ← clean up after successful render
    component.setDomElement(newDomElement);
    component.componentDidMount();
  }

  return newDomElement;
}
```

### Add Lifecycle Stubs to Component

```js
class Component {
  // ...existing methods...

  componentDidCatch(error, info) {}

  static getDerivedStateFromError(error) {
    return null;
  }
}
```

These are no-ops by default. Only subclasses that override them become error boundaries.

## What Error Boundaries Catch

| Caught | Not Caught |
|---|---|
| Errors in `render()` | Errors in event handlers |
| Errors in lifecycle methods | Errors in `setTimeout` / `async` code |
| Errors in constructors | Errors in the boundary itself |

This matches React's behavior. Event handlers should use regular `try/catch` — they don't happen during rendering.

## Example: Wrapping the Todo App

```jsx
class AppErrorBoundary extends TinyReact.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("App error:", error.message);
    console.error("Stack:", info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", textAlign: "center", color: "#c00" }}>
          <h1>Something went wrong</h1>
          <p>{this.state.error.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children[0];
  }
}

// Wrap your app:
TinyReact.render(
  <AppErrorBoundary>
    <TodoApp />
  </AppErrorBoundary>,
  root
);
```

The "Try Again" button resets the error state, causing the boundary to re-render and attempt to mount `TodoApp` again.

## Try It

1. Create a component that throws on a specific condition
2. Wrap it in an `ErrorBoundary`
3. Trigger the error — see the fallback UI appear
4. Check the console for `componentDidCatch` logs
5. Click "Try Again" to recover

## Key Takeaways

1. **Error boundaries are class components** that override `componentDidCatch` or `getDerivedStateFromError`
2. **`componentStack`** tracks the render hierarchy — we walk it backward to find boundaries
3. **`getDerivedStateFromError`** returns new state synchronously during the error
4. **`componentDidCatch`** handles side effects like error logging
5. **Only render errors are caught** — event handlers and async code use regular `try/catch`
6. **No boundary = crash** — errors rethrow if no boundary is found, preserving the default behavior

---

[Previous: Module 18 — Fragments](./18-fragments.md) | [Next: Module 20 — Event Delegation →](./20-event-delegation.md)

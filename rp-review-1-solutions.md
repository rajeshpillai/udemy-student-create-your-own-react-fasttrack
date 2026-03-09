# TinyReact Framework - Solutions & Modernization Guide

Solutions organized by priority. Each section references the review issue it addresses.

---

## Part A: Bug Fixes (Apply Immediately)

### Fix BUG-1: `jsToCss` global regex flag

```js
// Before (dom.js:425)
let transformedText = s.replace(/([A-Z])/, '-$1').toLowerCase();

// After
let transformedText = s.replace(/([A-Z])/g, '-$1').toLowerCase();
```

### Fix BUG-2: Event listener removal uses wrong event name

```js
// Before (dom.js:395-396)
domElement.removeEventListener(propName, oldProp, false);

// After
const eventName = propName.toLowerCase().slice(2);
domElement.removeEventListener(eventName, oldProp, false);
```

### Fix BUG-3: Strict equality in `shouldComponentUpdate`

```js
// Before (dom.js:471)
return nextProps != this.props || nextState != this.state;

// After
return nextProps !== this.props || nextState !== this.state;
```

### Fix BUG-7: Call `componentWillMount` before first render

```js
// Before (dom.js:241-246)
function buildStatefulComponent(virtualElement) {
    const component = new virtualElement.type(virtualElement.props);
    const nextElement = component.render();
    nextElement.component = component;
    return nextElement;
}

// After
function buildStatefulComponent(virtualElement) {
    const component = new virtualElement.type(virtualElement.props);
    component.componentWillMount();
    const nextElement = component.render();
    nextElement.component = component;
    return nextElement;
}
```

### Fix BUG-9: Safer style type check

```js
// Before (dom.js:380)
propName === "style" && !newProps[propName].substring

// After
propName === "style" && typeof newProps[propName] === "object"
```

### Fix QUALITY-5: Don't mutate state array in sort

```js
// Before (todo-app.js:354)
tasks = this.state.tasks.sort(...)

// After
tasks = [...this.state.tasks].sort(...)
```

---

## Part B: Performance Optimizations

### Fix PERF-1 & PERF-2: Cache keyed element lookups

```js
// Replace the keyed removal block (dom.js:117-145) with:
const oldNodes = oldDom.childNodes;
const hasKeyedElements = Object.keys(keyedElements).length > 0;

if (hasKeyedElements) {
    // Build a Set of new keys for O(1) lookup
    const newKeys = new Set(
        vdom.children
            .map(c => c.props.key)
            .filter(k => k != null)
    );

    // Remove old nodes whose keys are no longer present
    for (let i = oldNodes.length - 1; i >= 0; i--) {
        const oldChild = oldNodes[i];
        const oldVdom = oldChild._virtualElement;
        const oldKey = oldVdom && oldVdom.props && oldVdom.props.key;
        if (oldKey != null && !newKeys.has(oldKey)) {
            unmountNode(oldChild, oldDom);
        }
    }
} else {
    if (oldNodes.length > vdom.children.length) {
        for (let i = oldNodes.length - 1; i >= vdom.children.length; i--) {
            unmountNode(oldNodes[i], oldDom);
        }
    }
}
```

### Fix PERF-4: Check `shouldComponentUpdate` in `setState`

```js
setState(nextState) {
    if (!this.prevState) this.prevState = this.state;
    this.state = Object.assign({}, this.state, nextState);

    if (!this.shouldComponentUpdate(this.props, this.state)) {
        return; // Skip re-render
    }

    let dom = this.getDomElement();
    let container = dom.parentNode;
    let newvdom = this.render();
    diff(newvdom, container, dom);
}
```

### Add setState batching

```js
// Add at module scope inside the IIFE
let updateQueue = [];
let isBatching = false;

function enqueueUpdate(component) {
    if (!updateQueue.includes(component)) {
        updateQueue.push(component);
    }
    if (!isBatching) {
        flushUpdates();
    }
}

function flushUpdates() {
    isBatching = true;
    while (updateQueue.length > 0) {
        const component = updateQueue.shift();
        const dom = component.getDomElement();
        const container = dom.parentNode;
        const newvdom = component.render();
        diff(newvdom, container, dom);
    }
    isBatching = false;
}

// Updated setState
setState(nextState) {
    if (!this.prevState) this.prevState = this.state;
    this.state = Object.assign({}, this.state, nextState);
    enqueueUpdate(this);
}
```

---

## Part C: Missing Features (New Course Modules)

### C1. Fragment Support

```js
// Add Fragment as a symbol
const Fragment = Symbol('Fragment');

// In createElement, handle Fragment type
function createElement(type, attributes = {}, ...children) {
    // ... existing child processing ...
    if (type === Fragment) {
        return { type: Fragment, children: childElements, props: { children: childElements } };
    }
    return {
        type,
        children: childElements,
        props: Object.assign({ children: childElements }, attributes)
    };
}

// In mountSimpleNode, if vdom.type === Fragment, mount children directly into container
// In diff, if vdom.type === Fragment, diff children against container's children
```

Usage: `<TinyReact.Fragment><p>A</p><p>B</p></TinyReact.Fragment>`

### C2. Hooks (useState, useEffect)

This is the single most impactful feature to add. Here's a minimal implementation:

```js
// Module-level hook state
let currentComponent = null;
let hookIndex = 0;
let hookStates = new WeakMap(); // component -> hooks[]

function getHooks(component) {
    if (!hookStates.has(component)) {
        hookStates.set(component, []);
    }
    return hookStates.get(component);
}

// For functional components, we need a wrapper
function buildFunctionalComponent(vnode) {
    // Create a pseudo-component for hook tracking
    if (!vnode._hookOwner) {
        vnode._hookOwner = { _dom: null };
    }
    currentComponent = vnode._hookOwner;
    hookIndex = 0;

    const result = vnode.type(vnode.props || {});

    currentComponent = null;
    return result;
}

// useState implementation
function useState(initialValue) {
    const component = currentComponent;
    const hooks = getHooks(component);
    const idx = hookIndex++;

    if (hooks[idx] === undefined) {
        hooks[idx] = typeof initialValue === 'function' ? initialValue() : initialValue;
    }

    const setState = (newValue) => {
        const val = typeof newValue === 'function' ? newValue(hooks[idx]) : newValue;
        if (val !== hooks[idx]) {
            hooks[idx] = val;
            // Re-render the component
            const dom = component._dom;
            if (dom) {
                const container = dom.parentNode;
                const newvdom = buildFunctionalComponent(dom._virtualElement);
                diff(newvdom, container, dom);
            }
        }
    };

    return [hooks[idx], setState];
}

// useEffect implementation
function useEffect(callback, deps) {
    const hooks = getHooks(currentComponent);
    const idx = hookIndex++;

    const oldDeps = hooks[idx] ? hooks[idx].deps : undefined;
    const hasChanged = !oldDeps || !deps ||
        deps.some((dep, i) => dep !== oldDeps[i]);

    if (hasChanged) {
        // Schedule effect to run after render
        const cleanup = hooks[idx] ? hooks[idx].cleanup : null;
        queueMicrotask(() => {
            if (cleanup) cleanup();
            const newCleanup = callback();
            hooks[idx] = { deps, cleanup: newCleanup };
        });
    }

    if (!hooks[idx]) {
        hooks[idx] = { deps, cleanup: null };
    }
}
```

Usage:
```jsx
function Counter() {
    const [count, setCount] = TinyReact.useState(0);
    TinyReact.useEffect(() => {
        document.title = `Count: ${count}`;
    }, [count]);

    return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### C3. Context API

```js
function createContext(defaultValue) {
    const context = {
        _value: defaultValue,
        Provider: null,
        Consumer: null,
    };

    // Provider is a component that sets context value
    context.Provider = class extends Component {
        constructor(props) {
            super(props);
        }
        render() {
            context._value = this.props.value;
            // Render children directly
            return this.props.children.length === 1
                ? this.props.children[0]
                : createElement(Fragment, null, ...this.props.children);
        }
    };

    // Consumer is a functional component using render prop
    context.Consumer = function(props) {
        return props.children[0](context._value);
    };

    return context;
}

// Also add useContext hook
function useContext(context) {
    return context._value;
}
```

Usage:
```jsx
const ThemeContext = TinyReact.createContext('light');

// Provider
<ThemeContext.Provider value="dark">
    <App />
</ThemeContext.Provider>

// Consumer
<ThemeContext.Consumer>
    {theme => <div className={theme}>Hello</div>}
</ThemeContext.Consumer>
```

### C4. Error Boundaries

```js
// In the Component class, add:
static getDerivedStateFromError(error) { return null; }
componentDidCatch(error, info) { }

// Wrap render calls in try-catch (in buildStatefulComponent, updateComponent):
function buildStatefulComponent(virtualElement) {
    const component = new virtualElement.type(virtualElement.props);
    component.componentWillMount();

    try {
        const nextElement = component.render();
        nextElement.component = component;
        return nextElement;
    } catch (error) {
        // Walk up to find nearest error boundary
        const errorState = component.constructor.getDerivedStateFromError
            ? component.constructor.getDerivedStateFromError(error)
            : null;

        if (errorState) {
            component.state = Object.assign({}, component.state, errorState);
            component.componentDidCatch(error, { componentStack: '' });
            const fallback = component.render();
            fallback.component = component;
            return fallback;
        }
        throw error; // Re-throw if not an error boundary
    }
}
```

### C5. `useMemo` and `useCallback`

```js
function useMemo(factory, deps) {
    const hooks = getHooks(currentComponent);
    const idx = hookIndex++;

    const prev = hooks[idx];
    const hasChanged = !prev || !deps ||
        deps.some((dep, i) => dep !== prev.deps[i]);

    if (hasChanged) {
        const value = factory();
        hooks[idx] = { value, deps };
        return value;
    }
    return prev.value;
}

function useCallback(callback, deps) {
    return useMemo(() => callback, deps);
}
```

### C6. useRef hook

```js
function useRef(initialValue) {
    const hooks = getHooks(currentComponent);
    const idx = hookIndex++;

    if (hooks[idx] === undefined) {
        hooks[idx] = { current: initialValue };
    }
    return hooks[idx];
}
```

---

## Part D: React 19 Specific Features

### D1. `use()` hook - Resolve promises and context in render

```js
function use(usable) {
    // If it's a context, return the value
    if (usable && usable._value !== undefined) {
        return usable._value;
    }

    // If it's a promise (thenable)
    if (usable && typeof usable.then === 'function') {
        const hooks = getHooks(currentComponent);
        const idx = hookIndex++;

        if (!hooks[idx]) {
            hooks[idx] = { status: 'pending', value: null, error: null };

            usable.then(
                value => {
                    hooks[idx].status = 'resolved';
                    hooks[idx].value = value;
                    // Trigger re-render
                    enqueueUpdate(currentComponent);
                },
                error => {
                    hooks[idx].status = 'rejected';
                    hooks[idx].error = error;
                }
            );
        }

        if (hooks[idx].status === 'pending') {
            throw usable; // Suspense catches this
        }
        if (hooks[idx].status === 'rejected') {
            throw hooks[idx].error;
        }
        return hooks[idx].value;
    }

    throw new Error('use() requires a Context or Promise');
}
```

### D2. Actions & useActionState (React 19 form handling)

```js
function useActionState(action, initialState) {
    const [state, setState] = useState(initialState);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState(null);

    const formAction = async (formData) => {
        setIsPending(true);
        setError(null);
        try {
            const result = await action(state, formData);
            setState(result);
        } catch (e) {
            setError(e);
        } finally {
            setIsPending(false);
        }
    };

    return [state, formAction, isPending];
}
```

### D3. useOptimistic (React 19)

```js
function useOptimistic(state, updateFn) {
    const [optimisticState, setOptimisticState] = useState(state);

    // Sync with actual state when it changes
    useEffect(() => {
        setOptimisticState(state);
    }, [state]);

    const addOptimistic = (optimisticValue) => {
        setOptimisticState(prev =>
            updateFn ? updateFn(prev, optimisticValue) : optimisticValue
        );
    };

    return [optimisticState, addOptimistic];
}
```

### D4. Document Metadata support (React 19)

```js
// Intercept <title>, <meta>, <link> in createElement
function createElement(type, attributes = {}, ...children) {
    // ... existing logic ...

    // React 19: Hoist metadata to <head>
    if (type === 'title' || type === 'meta' || type === 'link') {
        queueMicrotask(() => {
            if (type === 'title') {
                document.title = children.join('');
            } else {
                const existing = type === 'meta'
                    ? document.querySelector(`meta[name="${attributes.name}"]`)
                    : document.querySelector(`link[href="${attributes.href}"]`);
                if (existing) {
                    Object.assign(existing, attributes);
                } else {
                    const el = document.createElement(type);
                    Object.entries(attributes || {}).forEach(([k, v]) => el.setAttribute(k, v));
                    document.head.appendChild(el);
                }
            }
        });
        return null; // Don't render in body
    }

    return { type, children: childElements, props: Object.assign({ children: childElements }, attributes) };
}
```

---

## Part E: Build & Tooling Modernization

### E1. Migrate to ES Modules + Vite

```bash
npm init -y
npm install vite --save-dev
```

```js
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
    esbuild: {
        jsxFactory: 'TinyReact.createElement',
        jsxFragment: 'TinyReact.Fragment',
    },
});
```

Convert IIFE to ES modules:
```js
// src/tiny-react.js
export function createElement(...) { }
export function render(...) { }
export class Component { }
export { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext };
```

### E2. Add TypeScript Declarations

```ts
// types/tiny-react.d.ts
declare namespace TinyReact {
    interface VNode {
        type: string | Function;
        props: Record<string, any>;
        children: VNode[];
    }

    function createElement(type: string | Function, props?: object, ...children: any[]): VNode;
    function render(vdom: VNode, container: HTMLElement): void;

    class Component<P = {}, S = {}> {
        props: P;
        state: S;
        setState(nextState: Partial<S>): void;
        render(): VNode;
    }

    function useState<T>(initial: T): [T, (v: T | ((prev: T) => T)) => void];
    function useEffect(cb: () => void | (() => void), deps?: any[]): void;
    function useRef<T>(initial: T): { current: T };
}
```

---

## Part F: Suggested New Course Modules

Based on the gap analysis, here are recommended additions ordered by teaching value:

| Module | Topic | Builds On |
|---|---|---|
| 20 | Fragment support | Module 19 |
| 21 | setState batching | Module 14 |
| 22 | `componentWillMount` fix + lifecycle diagram | Module 15-16 |
| 23 | `useState` hook | Module 9-10 (functional components) |
| 24 | `useEffect` hook | Module 23 |
| 25 | `useRef` hook | Module 17 (refs) |
| 26 | Context API + `useContext` | Module 23 |
| 27 | `useMemo` / `useCallback` | Module 23 |
| 28 | Error Boundaries | Module 16 |
| 29 | Suspense basics + `use()` (React 19) | Module 24 |
| 30 | Actions + `useActionState` (React 19) | Module 23 |
| 31 | ES Modules + Vite migration | All modules |

---

## Quick Wins Checklist

- [ ] Fix `jsToCss` regex (add `g` flag)
- [ ] Fix event removal bug (use lowercase event name)
- [ ] Fix `==` to `===` throughout
- [ ] Call `componentWillMount` in `buildStatefulComponent`
- [ ] Clone array before sort in `sortToDo`
- [ ] Add `shouldComponentUpdate` check in `setState`
- [ ] Use `WeakMap` instead of `_virtualElement` on DOM nodes
- [ ] Add Fragment support
- [ ] Implement `useState` and `useEffect`
- [ ] Migrate to Vite + ES modules

# Build Your Own React — Course Plan

> **Goal:** Teach React internals and patterns to junior developers by recreating React from scratch, one concept at a time. Each module produces a working, runnable increment. By the end, students understand *why* React works the way it does — not just *how* to use it.

---

## Prerequisites for Students

- Comfortable with JavaScript (ES6+): arrow functions, destructuring, spread, classes
- Basic DOM API knowledge (document.createElement, appendChild, addEventListener)
- Familiarity with using React (have built at least one small app)
- Node.js installed, basic terminal usage

## Tooling Setup

| Tool | Purpose |
|---|---|
| Vite | Dev server, HMR, JSX transform via esbuild |
| TypeScript (optional) | Type declarations for the framework API |
| Vitest | Unit testing each module |
| No other dependencies | The framework itself is zero-dependency |

### Project Scaffold (Module 0)

```
tiny-react/
├── src/
│   ├── tiny-react.js          # Framework source (students build this)
│   ├── app.jsx                # Demo app (evolves each module)
│   └── index.js               # Entry point
├── tests/
│   └── module-XX.test.js      # One test file per module
├── vite.config.js             # JSX factory → TinyReact.createElement
├── index.html
└── package.json
```

Vite config wires JSX to our factory:
```js
esbuild: {
  jsxFactory: 'TinyReact.createElement',
  jsxFragment: 'TinyReact.Fragment',
}
```

---

## Part 1 — Virtual DOM & Rendering (Modules 1–6)

*Students learn: what JSX compiles to, what a virtual DOM node is, how the browser DOM is created from it.*

### Module 1: The JSX Illusion

**Concept:** JSX is not magic — it's function calls.

**What students build:**
- An empty `createElement(type, props, ...children)` stub that logs its arguments
- Wire Vite JSX transform so `<div className="a">hello</div>` calls our function

**Key teaching moment:** Open browser console, show that every JSX tag is just a function call. Demystify JSX completely before writing any framework code.

**Test:** `createElement('div', { id: 'test' }, 'hello')` returns `{ type: 'div', props: { id: 'test', children: [...] }, children: [...] }`

---

### Module 2: Building the Virtual DOM Tree

**Concept:** A VDOM is a plain JS object tree that mirrors the DOM you want.

**What students build:**
- Full `createElement` implementation
- Flatten nested children arrays (`[].concat(...children)`)
- Wrap primitives (string, number) as `{ type: 'text', props: { textContent: value } }`

**Test:** Nested JSX produces correct deeply-nested object tree.

---

### Module 3: Filtering Junk from Children

**Concept:** React ignores `null`, `undefined`, `true`, `false` in JSX — here's why.

**What students build:**
- Filter children with `.reduce()` to drop `null`, `undefined`, `true`, `false`
- This enables `{condition && <Component />}` pattern

**Key teaching moment:** Show `{2 === 1 && <div>hidden</div>}` — the `false` must be silently ignored, not rendered as text.

**Test:** `createElement('div', null, false, null, 'visible', undefined)` produces one child.

---

### Module 4: Mounting to the Real DOM

**Concept:** Converting a VDOM tree into actual browser DOM nodes.

**What students build:**
- `render(vdom, container)` — the entry point
- `mountElement(vdom, container)` — routes to simple node mounting
- `mountSimpleNode(vdom, container)` — creates DOM elements, sets `_virtualElement` back-reference
- Recursively mount children

**Demo:** Render a static nested HTML structure from JSX. Inspect the DOM — it matches the VDOM.

**Test:** `render(<div><p>hello</p></div>, root)` produces correct DOM structure.

---

### Module 5: Attributes, Events & Properties

**Concept:** Props on VDOM nodes become attributes, properties, and event listeners on real DOM.

**What students build:**
- `updateDomElement(dom, newVdom, oldVdom)` handling:
  - Event listeners (`onClick` → `addEventListener('click', handler)`)
  - Special props (`value`, `checked` — set as properties, not attributes)
  - `className` → `class` attribute mapping
  - Skip the `children` prop
  - Remove old props that no longer exist

**Key teaching moment:** Why `className` instead of `class`? Why can't you `setAttribute('value', ...)`? Real browser quirks.

**Test:** `<input type="text" value="hello" className="field" onClick={fn} />` produces correctly configured DOM node.

---

### Module 6: Style Props — Strings and Objects

**Concept:** React accepts style as an object `{ color: 'red', fontSize: '14px' }`.

**What students build:**
- Detect style prop type (string vs object) using `typeof`
- `styleObjToCss()` — convert JS style object to CSS string
- `jsToCss()` — camelCase to kebab-case (`borderBottom` → `border-bottom`) using `/([A-Z])/g` regex

**Bug lesson:** Show what happens with only `/([A-Z])/` (no `g` flag) — `borderBottomColor` breaks. Teach regex global flag.

**Test:** `{ borderBottom: '1px solid', backgroundColor: 'red' }` → `"border-bottom: 1px solid; background-color: red;"`

---

## Part 2 — Reconciliation / Diffing (Modules 7–10)

*Students learn: why React doesn't just re-render everything, how the diffing algorithm decides what to change.*

### Module 7: Diffing Same-Type Elements

**Concept:** When re-rendering, compare old and new VDOM trees. Same type? Update in place.

**What students build:**
- `diff(vdom, container, oldDom)` — core reconciliation entry point
- Read `oldDom._virtualElement` to get the old VDOM
- Same type + same tag → call `updateDomElement` to patch props
- Same type + text → call `updateTextNode` to patch text content
- Recursively diff children by index

**Demo:** Render a tree, then render a modified version 3 seconds later. Show that only changed nodes update (inspect with DevTools highlight).

**Test:** Changing a `<h3>` text doesn't destroy/recreate the `<div>` parent.

---

### Module 8: Handling Type Mismatches

**Concept:** Different type = tear down old, build new. React never tries to morph a `<div>` into a `<span>`.

**What students build:**
- `createDomElement(vdom)` — recursively build a fresh DOM subtree
- In `diff()`: if `vdom.type !== oldvdom.type` and not a function → `replaceChild`

**Key teaching moment:** This is the heuristic that makes React's O(n) diffing possible. Without it, you'd need O(n³) tree edit distance.

**Test:** Replacing `<div>content</div>` with `<span>content</span>` creates a new element.

---

### Module 9: Removing Stale Nodes

**Concept:** When the new tree has fewer children, the extras must be cleaned up.

**What students build:**
- `unmountNode(domElement)` — recursive cleanup:
  - Remove event listeners
  - Clear ref callbacks with `null`
  - Recursively unmount children
  - Remove from DOM
- In `diff()`: after child reconciliation, remove excess old children

**Key teaching moment:** Memory leaks. Show what happens if you skip event listener cleanup — listeners accumulate, handlers reference stale closures.

**Test:** Rendering 3 items then 2 items removes the third from DOM and cleans up listeners.

---

### Module 10: Keyed Reconciliation

**Concept:** Keys tell React which items in a list moved, were added, or removed — without keys, it diffs by index (badly).

**What students build:**
- Collect keyed old children into a `Map<key, { domElement, index }>`
- Match new children by key, reposition with `insertBefore` if needed
- Mount new keyed elements that don't exist in old map
- Build a `Set` of new keys, unmount old elements whose keys are absent

**Demo — the "key" demo:** Render a sortable list without keys — show inputs losing their values. Add keys — inputs stick to their items. This is the demo that makes keys "click" for students.

**Bug lesson:** Show the O(n²) approach (nested loop) and optimize to O(n) with a Set. Teach algorithmic thinking.

**Test:** Reversing a keyed list reorders DOM nodes, doesn't recreate them.

---

## Part 3 — Components (Modules 11–16)

*Students learn: what components actually are under the hood, how state triggers re-renders.*

### Module 11: Functional Components

**Concept:** A functional component is just a function that returns VDOM.

**What students build:**
- `isFunction(vdom)` — check if `vdom.type` is a function
- `isFunctionalComponent(vdom)` — function type + no `render` prototype
- `buildFunctionalComponent(vdom)` — call `vdom.type(vdom.props)`
- `mountComponent(vdom, container)` — route to functional or stateful builder
- Handle recursive components (a functional component returning another component)

**Demo:** `const Heart = (props) => <span style={props.style}>&hearts;</span>`

**Test:** `<Heart style="color:red" />` renders a styled span.

---

### Module 12: Functional Component Diffing

**Concept:** When a functional component re-renders, diff its output — not the component itself.

**What students build:**
- `diffComponent()` — check if same component type, route to update or remount
- `isSameComponentType()` — compare constructors
- When replacing: unmount old DOM, mount new component in its place

**Test:** Re-rendering `<Greeting message="morning" />` then `<Greeting message="night" />` updates text without full remount.

---

### Module 13: The Component Base Class

**Concept:** Class components are objects with state and a render method.

**What students build:**
- `Component` class with:
  - `constructor(props)` — stores props, initializes empty state
  - `render()` — to be overridden by subclasses
  - `setDomElement(dom)` / `getDomElement()` — track the root DOM node
  - `updateProps(props)` — update props on re-render
- `buildStatefulComponent()` — instantiate class, call `render()`, store component ref on vdom

**Demo:**
```jsx
class Alert extends TinyReact.Component {
  render() {
    return <div>{this.props.message}</div>;
  }
}
```

**Test:** `<Alert message="hello" />` renders, `component.props.message === 'hello'`.

---

### Module 14: setState and Re-rendering

**Concept:** `setState` merges state, then triggers diff against the old DOM.

**What students build:**
- `setState(nextState)` — `Object.assign({}, this.state, nextState)` then re-render
- Get current DOM element, call `render()`, diff result against existing DOM

**Key teaching moment:** Why `Object.assign` and not `this.state.x = y`? Show a mutation bug — state reference stays the same, `shouldComponentUpdate` can't detect changes.

**Demo:** A counter component. Click button → state updates → UI re-renders. Put a `console.log` in render to prove it re-runs.

**Test:** `setState({ count: 1 })` triggers render, DOM reflects new state.

---

### Module 15: Lifecycle Methods

**Concept:** Components have lifecycle hooks — mount, update, unmount phases.

**What students build:**
- Add stubs to `Component`: `componentWillMount`, `componentDidMount`, `componentWillReceiveProps`, `shouldComponentUpdate`, `componentWillUpdate`, `componentDidUpdate`, `componentWillUnmount`
- Wire them into the correct places:
  - `componentWillMount()` → before first `render()` in `buildStatefulComponent`
  - `componentDidMount()` → after DOM insertion in `mountComponent`
  - `componentWillUnmount()` → in `unmountNode` before removal
- Wire update cycle in `updateComponent`:
  - `componentWillReceiveProps(nextProps)`
  - `shouldComponentUpdate(nextProps, nextState)` → skip render if returns false
  - `componentWillUpdate(nextProps, nextState)`
  - render + diff
  - `componentDidUpdate(prevProps, prevState)`

**Diagram:** Draw the lifecycle on a whiteboard / slide. Students should be able to predict which methods fire and in what order.

**Demo:** TodoItem with console.log in every lifecycle method. Add, edit, delete items — watch the console.

**Test:** Mount → `cwm` then `cdm`. Update → `cwrp` then `scu` then `cwu` then `cdu`. Unmount → `cwu`.

---

### Module 16: Refs — Accessing the Real DOM

**Concept:** Sometimes you need the actual DOM element (focus an input, measure size). Refs are the escape hatch.

**What students build:**
- In `mountSimpleNode`: if `vdom.props.ref`, call `ref(newDomElement)`
- In `mountComponent`: if `component.props.ref`, call `ref(component)`
- In `createDomElement`: call ref after creation
- In `unmountNode`: call `ref(null)` to clean up

**Demo:**
```jsx
<input ref={el => (this.textInput = el)} />
// Later: this.textInput.focus()
```

**Test:** After mount, ref callback receives the actual DOM element. After unmount, ref callback receives null.

---

## Part 4 — Modernization: Hooks (Modules 17–22)

*Students learn: how hooks work internally — no magic, just arrays and closures.*

### Module 17: The Hook Infrastructure

**Concept:** Hooks are stored in an array per component. The call order must be stable — that's why hooks can't be conditional.

**What students build:**
- Module-level state: `currentComponent`, `hookIndex`, `hookStates` (WeakMap)
- Modify `buildFunctionalComponent` to set `currentComponent` before calling the function, reset after
- `getHooks(component)` — returns or initializes the hook array

**Key teaching moment:** Show what breaks when you put a hook inside an `if` block. The index shifts, hooks return wrong values. This is *the* reason for the Rules of Hooks.

**Test:** Two sequential `useState` calls produce independent state slots at indices 0 and 1.

---

### Module 18: useState

**Concept:** `useState` returns a value and a setter. The setter triggers re-render.

**What students build:**
```js
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
      // trigger re-render of this component
      reRenderComponent(component);
    }
  };

  return [hooks[idx], setState];
}
```

**Demo:** Rewrite the counter as a functional component with `useState`.

**Test:** `const [count, setCount] = useState(0); setCount(1);` → re-render with count === 1.

---

### Module 19: useEffect

**Concept:** Side effects (API calls, subscriptions, DOM mutations) run after render, with cleanup.

**What students build:**
- Compare dependency arrays to decide if effect should re-run
- Schedule effect with `queueMicrotask` (runs after render, before paint)
- Store and invoke cleanup function from previous effect
- Empty deps `[]` = run once. No deps = run every render.

**Demo:** `useEffect(() => { document.title = \`Count: ${count}\` }, [count])`

**Test:** Effect runs after mount. Effect re-runs when deps change. Cleanup runs before re-run and on unmount.

---

### Module 20: useRef

**Concept:** A mutable box that persists across renders without causing re-renders.

**What students build:**
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

**Key teaching moment:** `useRef` vs `useState` — ref changes don't trigger re-render. Show the "stale closure" problem and how refs solve it.

**Test:** `ref.current` persists across renders. Changing it doesn't trigger re-render.

---

### Module 21: useMemo & useCallback

**Concept:** Avoid expensive recomputation and unnecessary child re-renders.

**What students build:**
- `useMemo(factory, deps)` — cache computed value, recompute only when deps change
- `useCallback(fn, deps)` — sugar for `useMemo(() => fn, deps)`

**Demo:** A filtered list that only recomputes when the filter changes, not on every render.

**Test:** `useMemo(() => expensiveFn(), [dep])` — factory runs once, returns cached value on re-render with same dep.

---

### Module 22: Custom Hooks

**Concept:** Hooks compose. Extract reusable stateful logic into custom hooks.

**What students build (demo, no framework changes needed):**
- `useLocalStorage(key, initial)` — syncs state with localStorage
- `useDebounce(value, delay)` — debounced state updates
- `useFetch(url)` — returns `{ data, loading, error }`

**Key teaching moment:** Custom hooks are just functions that call other hooks. No special API needed — the hook infrastructure already supports this.

---

## Part 5 — Advanced Patterns (Modules 23–28)

### Module 23: Fragments

**What students build:**
- `Fragment` symbol
- In `createElement`: detect Fragment type, return children without a wrapper
- In `mountSimpleNode` / `diff`: handle Fragment by mounting/diffing children directly into parent

**Test:** `<><p>A</p><p>B</p></>` renders two `<p>` tags as siblings, no wrapper div.

---

### Module 24: Context API & useContext

**What students build:**
- `createContext(defaultValue)` — returns `{ Provider, Consumer, _value }`
- Provider component sets `context._value` from props
- `useContext(context)` — returns `context._value`

**Demo:** Theme toggle (light/dark) without prop drilling.

**Test:** Nested component reads context value set by ancestor Provider.

---

### Module 25: Error Boundaries

**What students build:**
- `static getDerivedStateFromError(error)` — returns error state
- `componentDidCatch(error, info)` — logging
- Wrap `render()` calls in try-catch, walk up to nearest error boundary

**Demo:** A component that throws → error boundary catches and shows fallback UI.

**Test:** Error in child render triggers parent boundary's fallback, doesn't crash app.

---

### Module 26: setState Batching

**What students build:**
- `updateQueue` array + `isBatching` flag
- `enqueueUpdate(component)` — deduplicates and queues
- `flushUpdates()` — processes queue, renders each component once
- Batch within event handlers using a wrapper

**Key teaching moment:** Call `setState` 3 times in a click handler. Without batching: 3 renders. With batching: 1 render.

**Test:** Three `setState` calls in one handler produce a single render cycle.

---

### Module 27: Memo & PureComponent

**What students build:**
- `memo(FunctionalComponent)` — wraps component, shallow-compares props, skips render if equal
- `PureComponent` class — `shouldComponentUpdate` does shallow prop + state comparison
- `shallowEqual(a, b)` utility

**Demo:** Parent re-renders but memoized child doesn't (console.log proves it).

**Test:** `memo(Child)` skips render when props haven't changed.

---

### Module 28: Portals

**What students build:**
- `createPortal(children, domNode)` — renders children into a different DOM node
- Modify `mountSimpleNode` to respect portal target

**Demo:** A modal that renders into `document.body` instead of the component tree.

**Test:** `createPortal(<div>modal</div>, document.body)` appends to body, not parent container.

---

## Part 6 — React 19 Features (Modules 29–32)

### Module 29: The `use()` Hook

**Concept:** Read promises and context directly in render.

**What students build:**
- `use(thenable)` — if pending, throw the promise (Suspense catches it); if resolved, return value
- `use(context)` — shortcut for `useContext`

**Demo:** `const data = use(fetchPromise)` inside render — no `useEffect` + `useState` dance.

---

### Module 30: Suspense (Simplified)

**What students build:**
- `Suspense` component that catches thrown promises from children
- Shows `fallback` prop while promise is pending
- Re-renders children when promise resolves

**Demo:** `<Suspense fallback={<Spinner />}><DataComponent /></Suspense>`

---

### Module 31: Actions & useActionState

**Concept:** React 19 form handling — actions are async functions that manage pending/error state.

**What students build:**
- `useActionState(actionFn, initialState)` → `[state, formAction, isPending]`
- `formAction` wraps the async action with pending state management

**Demo:** A form that submits to an API, shows loading state, handles errors — all with one hook.

---

### Module 32: useOptimistic

**Concept:** Show optimistic UI while async action completes.

**What students build:**
- `useOptimistic(actualState, updateFn)` → `[optimisticState, addOptimistic]`
- Immediately applies optimistic value, reverts to actual state when async completes

**Demo:** "Like" button that shows +1 immediately, confirms after API call.

---

## Part 7 — Production Readiness (Modules 33–35)

### Module 33: Build Pipeline with Vite

**What students learn:**
- ES modules export/import for the framework
- Production build with minification
- Source maps for debugging
- JSX transform configuration

---

### Module 34: TypeScript Declarations

**What students build:**
- `.d.ts` file covering: `createElement`, `render`, `Component`, all hooks, `createContext`, `memo`, `createPortal`
- Students get autocomplete and type checking for their framework

---

### Module 35: Dev Tools & Error Messages

**What students build:**
- Component name tracking (store `type.name` on vdom)
- Warning system: missing keys in lists, hooks called conditionally, setState after unmount
- Simple component tree inspector (renders to a collapsible `<pre>` overlay)

---

## Capstone Project: Todo App

After completing all modules, students build the Todo app using the framework they created:
- Functional components with hooks (`useState`, `useEffect`, `useRef`)
- Keyed list rendering with add/delete/reorder
- Inline editing with refs
- Double-click to complete (style objects)
- Sort with optimistic UI
- Error boundary around the list
- Context for theme switching

This replaces the class-based todo-app.js with a modern hooks-based equivalent, proving the framework works end-to-end.

---

## Module Dependency Graph

```
Module 1-3: createElement
    ↓
Module 4-6: DOM Rendering
    ↓
Module 7-10: Reconciliation ──────────────────┐
    ↓                                          ↓
Module 11-12: Functional Components     Module 13-16: Class Components
    ↓                                          ↓
Module 17-22: Hooks                     Module 15: Lifecycle Methods
    ↓                                          ↓
Module 23-28: Advanced Patterns ←──────────────┘
    ↓
Module 29-32: React 19 Features
    ↓
Module 33-35: Production Readiness
    ↓
Capstone: Todo App
```

---

## Teaching Principles

1. **One concept per module.** Never introduce two ideas at once. If a module feels like it teaches two things, split it.

2. **Break it first, then fix it.** Before implementing a feature, show the bug or limitation that motivates it. Students should *feel the pain* before seeing the solution.

3. **Tests validate understanding.** Each module has a test file. Students run tests to confirm their implementation works. Tests also serve as documentation of expected behavior.

4. **Console is the debugger.** Liberal use of `console.log` in lifecycle methods, hooks, and diff functions. Students should trace execution flow in the console before using breakpoints.

5. **Compare to real React.** After each module, show the equivalent React source code (simplified). Students see that their implementation follows the same principles.

6. **Incremental files.** Each module produces a snapshot file (`tiny-react.module-XX.js`) so students can reset to any checkpoint if they get stuck.

---

## Estimated Pacing

| Section | Modules | Suggested Time |
|---|---|---|
| Part 1: VDOM & Rendering | 1–6 | 3–4 hours |
| Part 2: Reconciliation | 7–10 | 3–4 hours |
| Part 3: Components | 11–16 | 4–5 hours |
| Part 4: Hooks | 17–22 | 4–5 hours |
| Part 5: Advanced | 23–28 | 3–4 hours |
| Part 6: React 19 | 29–32 | 2–3 hours |
| Part 7: Production | 33–35 | 2–3 hours |
| Capstone | Todo App | 2–3 hours |
| **Total** | **35 + capstone** | **~25–30 hours** |

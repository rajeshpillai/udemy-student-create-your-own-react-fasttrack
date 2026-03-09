# TinyReact Framework - Code Review

## Overview

TinyReact is a ~487-line educational React-like framework implementing: virtual DOM, createElement, reconciliation/diffing, functional & class components, setState, lifecycle methods, refs, keyed reconciliation, and style objects. Accompanied by a full Todo app demo.

---

## 1. Bugs & Correctness Issues

### BUG-1: `jsToCss` only replaces the first uppercase letter
**File:** `dom.js:425` | **Severity:** High

```js
s.replace(/([A-Z])/, '-$1').toLowerCase();
```
Missing the `g` flag. `borderBottomColor` becomes `border-bottomColor` instead of `border-bottom-color`.

### BUG-2: Event listener leak on prop removal
**File:** `dom.js:395-396` | **Severity:** Medium

When removing old event props, the code passes `propName` (e.g., `"onClick"`) to `removeEventListener` instead of the lowercased event name:
```js
domElement.removeEventListener(propName, oldProp, false);
// Should be:
domElement.removeEventListener(propName.toLowerCase().slice(2), oldProp, false);
```

### BUG-3: `shouldComponentUpdate` uses `!=` instead of `!==`
**File:** `dom.js:471` | **Severity:** Medium

```js
return nextProps != this.props || nextState != this.state;
```
Loose equality can produce unexpected results with object comparison. Should use `!==`.

### BUG-4: `setState` doesn't batch updates
**File:** `dom.js:437-450` | **Severity:** Medium

Each `setState` call triggers an immediate full diff/reconciliation. Calling `setState` twice in sequence causes two full render cycles. React batches these.

### BUG-5: Keyed reconciliation doesn't handle new keyed elements correctly
**File:** `dom.js:108-113` | **Severity:** Medium

When a keyed element is not found in the old DOM, it calls `mountElement(virtualElement, oldDom)` but never positions it correctly. It just appends to the end, ignoring the expected index position.

### BUG-6: Keyed removal doesn't handle text nodes
**File:** `dom.js:129` | **Severity:** Low

`oldChild.getAttribute("key")` throws if `oldChild` is a text node (text nodes have no `getAttribute`).

### BUG-7: `componentWillMount` is never called
**File:** `dom.js:241-246, 466` | **Severity:** Medium

`buildStatefulComponent` creates the component and calls `render()`, but never invokes `componentWillMount()` before rendering.

### BUG-8: `diff` receives 4 args but signature only accepts 3
**File:** `dom.js:204` | **Severity:** Low

```js
diff(nextElement, container, domElement, oldComponent);
```
The `diff` function signature is `diff(vdom, container, oldDom)` -- the 4th argument is silently ignored. No harm, but indicates dead code.

### BUG-9: `style` prop with string value and `.substring` check is fragile
**File:** `dom.js:380` | **Severity:** Low

```js
propName === "style" && !newProps[propName].substring
```
Uses duck-typing to distinguish string vs object. A style value of `0` or `null` would pass this check incorrectly.

---

## 2. Architecture & Design Issues

### ARCH-1: No Fragment support
No way to return multiple elements from a component without a wrapping div. React solved this with `<React.Fragment>` / `<>`.

### ARCH-2: No error boundaries
Any error in `render()` or lifecycle methods will crash the entire app with no recovery mechanism.

### ARCH-3: Synchronous rendering blocks the main thread
Everything is synchronous. Large component trees will cause frame drops and jank. React 18+ uses concurrent rendering with fibers.

### ARCH-4: No context API
No way to pass data through the component tree without prop drilling.

### ARCH-5: IIFE module pattern
The `TinyReact` IIFE is functional but dated. No ES module support, no tree-shaking capability, requires global namespace pollution.

### ARCH-6: Flat reconciliation (no Fiber architecture)
Recursive diffing cannot be interrupted. Once started, it must complete, blocking user interaction.

### ARCH-7: Component instance tied to a single DOM element
`component.setDomElement(newDomElement)` assumes 1:1 mapping. If a component's root element type changes between renders, the stale `_dom` reference can cause `setState` to diff against the wrong parent.

---

## 3. Performance Issues

### PERF-1: `Object.keys()` called multiple times on same objects
**File:** `dom.js:91, 118, 125`

`Object.keys(keyedElements)` is computed multiple times in the same diff pass. Should cache the result.

### PERF-2: Linear search for keyed element removal
**File:** `dom.js:127-144`

Nested loops: for each old child, iterates all new children to check if key exists. O(n*m) complexity. Should build a Set of new keys first.

### PERF-3: `updateDomElement` iterates all props on every diff
**File:** `dom.js:357-403`

Even unchanged props are checked. No short-circuit for identical prop objects.

### PERF-4: No `shouldComponentUpdate` check in `setState` path
**File:** `dom.js:437-450`

`setState` always calls `render()` and `diff()`. It never checks `shouldComponentUpdate` before re-rendering.

### PERF-5: `createDomElement` is called for type mismatches but rebuilds entire subtree
**File:** `dom.js:57-58`

When types differ, the entire old subtree is replaced. No attempt to reuse matching children deeper in the tree.

---

## 4. Missing React 19 Features

| Feature | Status | Priority |
|---|---|---|
| Hooks (useState, useEffect, etc.) | Missing | Critical |
| Concurrent rendering / Fiber | Missing | High |
| Suspense & lazy loading | Missing | High |
| Server Components (RSC) | Missing | High |
| `use()` hook (React 19) | Missing | High |
| Actions & form handling (React 19) | Missing | High |
| `useOptimistic` (React 19) | Missing | Medium |
| `useFormStatus` (React 19) | Missing | Medium |
| Context API | Missing | Medium |
| Portals | Missing | Medium |
| Error Boundaries | Missing | Medium |
| Fragments | Missing | Medium |
| Memo / PureComponent | Missing | Low |
| useRef (object-based) | Missing | Low |
| forwardRef | Missing | Low |
| useId | Missing | Low |
| Document metadata (`<title>`, `<meta>`) | Missing | Low |
| Asset loading APIs | Missing | Low |

---

## 5. Code Quality Issues

### QUALITY-1: Inconsistent function declaration style
Mix of `const fn = function()`, `function fn()`, and arrow functions with no clear convention.

### QUALITY-2: No input validation in `createElement`
Passing invalid types (numbers, objects) silently produces broken VDOM nodes.

### QUALITY-3: `_virtualElement` stored directly on DOM nodes
Pollutes native DOM elements. Could conflict with other libraries. A WeakMap would be cleaner.

### QUALITY-4: Unused `context` parameter
**File:** `dom.js:236`
`buildFunctionalComponent(vnode, context)` -- `context` is never used.

### QUALITY-5: `sortToDo` mutates state array in-place
**File:** `todo-app.js:354-366`
`this.state.tasks.sort(...)` mutates the existing array before calling `setState`. Should clone first.

### QUALITY-6: Todo app uses `==` for comparisons
**File:** `todo-app.js:323, 333`
`t.id != task.id` and `value.trim() == ""` use loose equality.

### QUALITY-7: Typo in code comment
**File:** `dom.js:287` -- "agains" should be "again"

### QUALITY-8: `dangerouslySetInnerHTML` not supported
No mechanism for raw HTML injection (which React provides as an escape hatch).

---

## 6. Security Concerns

### SEC-1: No XSS protection
Text content is set via `textContent` (safe), but `setAttribute` with user input could inject attributes. `innerHTML` isn't used, which is good, but `href="javascript:..."` on anchor tags is not sanitized.

### SEC-2: No prop type validation
No PropTypes or runtime type checking. Passing wrong prop types fails silently.

---

## 7. Developer Experience Issues

### DX-1: No dev tools integration
No component tree inspector, no state viewer, no time-travel debugging.

### DX-2: No meaningful error messages
When something breaks (e.g., rendering null, missing key prop), errors are cryptic browser errors, not framework-level messages.

### DX-3: Browser-only Babel transpilation
Using in-browser Babel (`text/babel`) is slow and not suitable for production. No build pipeline (webpack/vite).

### DX-4: No hot module replacement (HMR)
Requires full page reload for every change.

---

## Summary Scorecard

| Category | Score | Notes |
|---|---|---|
| Correctness | 6/10 | Several bugs in event cleanup, CSS conversion, lifecycle |
| Performance | 5/10 | Synchronous, no batching, O(n*m) keyed removal |
| Completeness | 4/10 | Missing hooks, context, fragments, concurrent rendering |
| Code Quality | 6/10 | Readable for education but inconsistent patterns |
| Security | 7/10 | No innerHTML usage (good), but no attribute sanitization |
| DX | 4/10 | No tooling, error messages, or build pipeline |
| **Overall** | **5.5/10** | Solid educational foundation, needs modernization |

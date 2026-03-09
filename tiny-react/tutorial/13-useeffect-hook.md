# Module 13: useEffect, useRef, useMemo, useCallback

## What You'll Learn

- How `useEffect` manages side effects with dependency tracking and cleanup
- How `useRef` creates a mutable box that persists across renders
- How `useMemo` caches expensive computations
- How `useCallback` is just sugar on top of `useMemo`
- Why effects run *after* render, not during

## useEffect — Side Effects

In class components, side effects live in `componentDidMount`, `componentDidUpdate`, and `componentWillUnmount`. That splits related logic across three methods.

`useEffect` unifies all three:

```jsx
useEffect(() => {
  // Runs after render (like componentDidMount + componentDidUpdate)
  const id = setInterval(() => tick(), 1000);

  return () => {
    // Cleanup (like componentWillUnmount)
    clearInterval(id);
  };
}, [dep1, dep2]); // Only re-run when these values change
```

### The Dependency Array

| Pattern | Behavior |
|---|---|
| `useEffect(fn)` | Run after **every** render |
| `useEffect(fn, [])` | Run **once** after first render (mount only) |
| `useEffect(fn, [a, b])` | Run when **a or b changes** |

### Implementation

```js
function useEffect(callback, deps) {
  const owner = currentHookOwner;
  const hooks = getHooks(owner);
  const idx = hookIndex++;

  const prevHook = hooks[idx];
  const prevDeps = prevHook ? prevHook.deps : undefined;

  const hasChanged =
    !prevDeps ||                              // First render
    !deps ||                                  // No deps = always run
    deps.some((dep, i) => dep !== prevDeps[i]); // Any dep changed

  if (hasChanged) {
    hooks[idx] = { deps, cleanup: prevHook ? prevHook.cleanup : null };

    // Schedule after render
    queueMicrotask(() => {
      if (hooks[idx].cleanup) {
        hooks[idx].cleanup();      // Run previous cleanup
      }
      const cleanup = callback();  // Run the effect
      hooks[idx].cleanup = typeof cleanup === "function" ? cleanup : null;
    });
  } else {
    hooks[idx] = prevHook;
  }
}
```

Key details:

**`queueMicrotask`** schedules the effect to run after the current render completes. Effects should never block rendering — they run asynchronously.

**Dependency comparison** uses `!==` (reference equality). If you pass `[obj]` and `obj` is a new object each render, the effect will run every time — even if the object's contents are the same. This is why you often need `useMemo`.

**Cleanup** runs *before* the next effect, not immediately. This ensures cleanup and the new effect are always paired correctly.

## useRef — Persistent Mutable Box

`useRef` returns an object `{ current: value }` that persists across renders. Unlike `useState`, changing `.current` does **not** trigger a re-render.

Use cases:
- Storing interval/timeout IDs
- Referencing DOM elements
- Tracking previous values

```js
function useRef(initialValue) {
  const hooks = getHooks(currentHookOwner);
  const idx = hookIndex++;

  if (hooks[idx] === undefined) {
    hooks[idx] = { current: initialValue };
  }
  return hooks[idx];
}
```

It's just a `useState` that never triggers re-renders. The same object reference is returned every time — only `.current` changes.

```jsx
const intervalRef = useRef(null);

useEffect(() => {
  intervalRef.current = setInterval(tick, 1000);
  return () => clearInterval(intervalRef.current);
}, []);
```

## useMemo — Cached Computation

If a computation is expensive and its inputs haven't changed, don't recompute it:

```js
function useMemo(factory, deps) {
  const hooks = getHooks(currentHookOwner);
  const idx = hookIndex++;

  const prevHook = hooks[idx];
  const hasChanged =
    !prevHook ||
    !deps ||
    deps.some((dep, i) => dep !== prevHook.deps[i]);

  if (hasChanged) {
    const value = factory();
    hooks[idx] = { value, deps };
    return value;
  }
  return prevHook.value;
}
```

Same dependency checking pattern as `useEffect`, but synchronous — the value is computed during render, not after.

```jsx
const formatted = useMemo(() => {
  // Only recomputes when `seconds` changes
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}, [seconds]);
```

## useCallback — Stable Function Reference

`useCallback` is just `useMemo` for functions:

```js
function useCallback(callback, deps) {
  return useMemo(() => callback, deps);
}
```

Why? Because a new function is created every render:

```jsx
// This creates a NEW function object on every render:
<button onClick={() => handleClick(id)}>Click</button>

// This keeps the same function reference if `id` hasn't changed:
const handler = useCallback(() => handleClick(id), [id]);
<button onClick={handler}>Click</button>
```

Stable references prevent unnecessary re-renders of child components (when combined with `memo`, which we'll add later).

## Test It

```jsx
import TinyReact from "./tiny-react";

const root = document.getElementById("root");

function Timer() {
  const [seconds, setSeconds] = TinyReact.useState(0);
  const [running, setRunning] = TinyReact.useState(true);
  const intervalRef = TinyReact.useRef(null);

  TinyReact.useEffect(() => {
    if (running) {
      console.log("Effect: starting interval");
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);

      return () => {
        console.log("Cleanup: clearing interval");
        clearInterval(intervalRef.current);
      };
    }
  }, [running]);

  const formattedTime = TinyReact.useMemo(() => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, [seconds]);

  return (
    <div>
      <h2>Timer: {formattedTime}</h2>
      <p>{running ? "Running..." : "Paused"}</p>
      <button onClick={() => setRunning(!running)}>
        {running ? "Pause" : "Resume"}
      </button>
    </div>
  );
}

function App() {
  const [showTimer, setShowTimer] = TinyReact.useState(true);

  return (
    <div>
      <h1>Hooks Demo</h1>
      <button onClick={() => setShowTimer(!showTimer)}>
        {showTimer ? "Unmount Timer" : "Mount Timer"}
      </button>
      {showTimer && <Timer />}
    </div>
  );
}

TinyReact.render(<App />, root);
```

Watch the console:
1. **Mount**: "Effect: starting interval" — timer starts
2. **Pause**: "Cleanup: clearing interval" then nothing — effect doesn't restart because `running` is false
3. **Resume**: "Effect: starting interval" — restarts
4. **Unmount**: "Cleanup: clearing interval" — proper cleanup, no leaked intervals

## Key Takeaways

1. **`useEffect(fn, deps)`** runs `fn` after render when any dep changes; returns optional cleanup function
2. **Effects run asynchronously** via `queueMicrotask` — they never block rendering
3. **Cleanup runs before the next effect**, not immediately — ensures paired cleanup
4. **`useRef`** returns a persistent `{ current }` object — changes don't trigger re-renders
5. **`useMemo`** caches values by deps — avoids expensive recomputation
6. **`useCallback`** is `useMemo(() => fn, deps)` — stabilizes function references
7. **All hooks use the same pattern**: array slot + dependency comparison

---

[Previous: Module 12 — useState Hook](./12-usestate-hook.md) | [Next: Module 14 — Context API →](./14-context-api.md)

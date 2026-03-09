// TinyReact — Module 20: Event Delegation

// ── Fragment ─────────────────────────────────────────────────────────

const Fragment = Symbol("TinyReact.Fragment");

function createElement(type, props, ...children) {
  const childElements = [].concat(...children).reduce((acc, child) => {
    if (child != null && child !== true && child !== false) {
      if (child instanceof Object) {
        acc.push(child);
      } else {
        acc.push(createElement("text", { textContent: child }));
      }
    }
    return acc;
  }, []);

  return {
    type,
    children: childElements,
    props: { ...props, children: childElements },
  };
}

// ── Update Batching ─────────────────────────────────────────────────

let pendingUpdates = new Set();
let isBatching = false;

function scheduleUpdate(callback) {
  pendingUpdates.add(callback);
  if (!isBatching) {
    isBatching = true;
    queueMicrotask(flushBatch);
  }
}

function flushBatch() {
  isBatching = false;
  const updates = [...pendingUpdates];
  pendingUpdates.clear();
  updates.forEach((fn) => fn());
}

// ── Hooks Infrastructure ────────────────────────────────────────────

let currentHookOwner = null; // The component currently being rendered
let hookIndex = 0; // Which hook we're on in the current render
const hookStates = new WeakMap(); // component → hooks[]

// ── Error Boundary Stack ─────────────────────────────────────────────

const componentStack = []; // Tracks class components during render for error boundaries

function getHooks(owner) {
  if (!hookStates.has(owner)) {
    hookStates.set(owner, []);
  }
  return hookStates.get(owner);
}

function reRenderFunctionalComponent(owner) {
  const dom = owner._dom;
  if (!dom || !dom.parentNode) return;
  const container = dom.parentNode;
  const vdom = owner._vdom;

  // Set hook and signal-tracking context
  currentHookOwner = owner;
  hookIndex = 0;
  const prevTracker = currentTracker;
  currentTracker = owner._rerender;
  const newVdom = vdom.type(vdom.props || {});
  currentTracker = prevTracker;
  currentHookOwner = null;

  diff(newVdom, container, dom);
}

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
      scheduleUpdate(owner._rerender);
    }
  };

  return [hooks[idx], setState];
}

function useEffect(callback, deps) {
  const owner = currentHookOwner;
  const hooks = getHooks(owner);
  const idx = hookIndex++;

  const prevHook = hooks[idx];
  const prevDeps = prevHook ? prevHook.deps : undefined;

  // Determine if effect should run
  const hasChanged =
    !prevDeps || // First render (no previous deps)
    !deps || // No deps array = run every render
    deps.some((dep, i) => dep !== prevDeps[i]); // Any dep changed

  if (hasChanged) {
    // Store the new hook data immediately (before the effect runs)
    hooks[idx] = { deps, cleanup: prevHook ? prevHook.cleanup : null };

    // Schedule effect to run after render (async, like React)
    queueMicrotask(() => {
      // Run previous cleanup first
      if (hooks[idx].cleanup) {
        hooks[idx].cleanup();
      }
      // Run the effect and store its cleanup function
      const cleanup = callback();
      hooks[idx].cleanup = typeof cleanup === "function" ? cleanup : null;
    });
  } else {
    // No change — keep previous hook data
    hooks[idx] = prevHook;
  }
}

function useRef(initialValue) {
  const hooks = getHooks(currentHookOwner);
  const idx = hookIndex++;

  if (hooks[idx] === undefined) {
    hooks[idx] = { current: initialValue };
  }
  return hooks[idx];
}

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

function useCallback(callback, deps) {
  return useMemo(() => callback, deps);
}

// ── Context API ─────────────────────────────────────────────────────

function createContext(defaultValue) {
  const context = {
    _value: defaultValue,
    _subscribers: new Set(),
    Provider: function ContextProvider(props) {
      context._value = props.value;
      // Render children directly (no wrapper element)
      if (props.children && props.children.length === 1) {
        return props.children[0];
      }
      return createElement("span", null, ...(props.children || []));
    },
  };
  return context;
}

function useContext(context) {
  return context._value;
}

// ── Render entry point ──────────────────────────────────────────────

function render(vdom, container, oldDom = container.firstChild) {
  diff(vdom, container, oldDom);
}

// ── Diffing ─────────────────────────────────────────────────────────

function diff(vdom, container, oldDom) {
  const oldvdom = oldDom && oldDom._virtualElement;

  if (!oldDom) {
    // No existing DOM — mount from scratch
    mountElement(vdom, container);
  } else if (oldvdom && oldvdom.type !== vdom.type && typeof vdom.type !== "function") {
    // Different type (and not a component) — replace entirely
    const newDomElement = createDomElement(vdom);
    oldDom.parentNode.replaceChild(newDomElement, oldDom);
  } else if (typeof vdom.type === "function") {
    // Component — delegate to appropriate diffing
    if (isFunctionalComponent(vdom)) {
      diffFunctionalComponent(vdom, container, oldDom);
    } else {
      diffComponent(vdom, oldDom._virtualElement && oldDom._virtualElement.component, container, oldDom);
    }
  } else if (oldvdom && oldvdom.type === vdom.type) {
    // Same type — update in place
    if (vdom.type === "text") {
      updateTextNode(oldDom, vdom, oldvdom);
    } else {
      updateDomElement(oldDom, vdom, oldvdom);
    }

    // Update the back-reference to point to the new VDOM
    oldDom._virtualElement = vdom;

    // Collect keyed old children into a map for O(1) lookup
    const keyedElements = {};
    for (let i = 0; i < oldDom.childNodes.length; i++) {
      const domElement = oldDom.childNodes[i];
      const key =
        domElement._virtualElement && domElement._virtualElement.props.key;
      if (key) {
        keyedElements[key] = { domElement, index: i };
      }
    }

    const hasKeys = Object.keys(keyedElements).length > 0;

    if (!hasKeys) {
      // No keys — diff children by index (as before)
      vdom.children.forEach((child, i) => {
        diff(child, oldDom, oldDom.childNodes[i]);
      });
    } else {
      // Keyed reconciliation
      vdom.children.forEach((virtualElement, i) => {
        const key = virtualElement.props.key;
        if (key) {
          const keyedDomElement = keyedElements[key];
          if (keyedDomElement) {
            // Reposition if needed
            if (
              oldDom.childNodes[i] &&
              !oldDom.childNodes[i].isSameNode(keyedDomElement.domElement)
            ) {
              oldDom.insertBefore(
                keyedDomElement.domElement,
                oldDom.childNodes[i]
              );
            }
            diff(virtualElement, oldDom, keyedDomElement.domElement);
          } else {
            // New keyed element — mount it
            mountElement(virtualElement, oldDom);
          }
        }
      });
    }

    // Remove extra old children
    const oldNodes = oldDom.childNodes;
    if (hasKeys) {
      // Keyed: remove elements whose keys are no longer present
      const newKeys = new Set(
        vdom.children.map((c) => c.props.key).filter((k) => k != null)
      );
      for (let i = oldNodes.length - 1; i >= 0; i--) {
        const oldChild = oldNodes[i];
        const oldKey =
          oldChild._virtualElement && oldChild._virtualElement.props.key;
        if (oldKey != null && !newKeys.has(oldKey)) {
          unmountNode(oldChild);
        }
      }
    } else {
      // Index-based: remove tail
      if (oldNodes.length > vdom.children.length) {
        for (let i = oldNodes.length - 1; i >= vdom.children.length; i--) {
          unmountNode(oldNodes[i]);
        }
      }
    }
  }
}

// ── Mounting ────────────────────────────────────────────────────────

function mountElement(vdom, container, oldDomElement) {
  if (typeof vdom.type === "function") {
    return mountComponent(vdom, container, oldDomElement);
  } else {
    return mountSimpleNode(vdom, container, oldDomElement);
  }
}

// ── Component Mounting & Diffing ────────────────────────────────────

function isFunctionalComponent(vdom) {
  const nodeType = vdom && vdom.type;
  return (
    nodeType &&
    typeof nodeType === "function" &&
    !(nodeType.prototype && nodeType.prototype.render)
  );
}

function buildFunctionalComponent(vdom) {
  // Create a hook owner for this functional component instance
  if (!vdom._hookOwner) {
    vdom._hookOwner = { _dom: null, _vdom: vdom };
  }
  const owner = vdom._hookOwner;
  owner._vdom = vdom;

  // Create stable rerender function (used by batching and signal tracking)
  if (!owner._rerender) {
    owner._rerender = () => reRenderFunctionalComponent(owner);
  }

  // Set hook and signal-tracking context before calling the component
  currentHookOwner = owner;
  hookIndex = 0;
  const prevTracker = currentTracker;
  currentTracker = owner._rerender;
  const result = vdom.type(vdom.props || {});
  currentTracker = prevTracker;
  currentHookOwner = null;

  return result;
}

function buildStatefulComponent(vdom) {
  const component = new vdom.type(vdom.props);
  const nextElement = component.render();
  nextElement.component = component;
  return nextElement;
}

// ── Error Boundary Helpers ───────────────────────────────────────────

function isErrorBoundary(component) {
  // A class component is an error boundary if it overrides componentDidCatch
  // or provides a static getDerivedStateFromError
  return (
    (component.componentDidCatch !== Component.prototype.componentDidCatch) ||
    (component.constructor.getDerivedStateFromError !== Component.getDerivedStateFromError)
  );
}

function handleRenderError(error, container, oldDomElement) {
  // Walk the component stack to find the nearest error boundary
  for (let i = componentStack.length - 1; i >= 0; i--) {
    const boundary = componentStack[i];
    if (isErrorBoundary(boundary)) {
      // Found an error boundary — derive error state
      const derivedState = boundary.constructor.getDerivedStateFromError(error);
      if (derivedState) {
        boundary.state = Object.assign({}, boundary.state, derivedState);
      }

      // Notify the boundary
      const info = { componentStack: componentStack.map(c => c.constructor.name).join(" > ") };
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
  // No error boundary found — rethrow
  throw error;
}

function mountComponent(vdom, container, oldDomElement) {
  let nextvDom, component, newDomElement;

  try {
    if (isFunctionalComponent(vdom)) {
      nextvDom = buildFunctionalComponent(vdom);
    } else {
      nextvDom = buildStatefulComponent(vdom);
      component = nextvDom.component;
      componentStack.push(component);
    }

    // A component might return another component — recurse
    if (typeof nextvDom.type === "function") {
      newDomElement = mountComponent(nextvDom, container, oldDomElement);
    } else {
      newDomElement = mountElement(nextvDom, container, oldDomElement);
    }
  } catch (error) {
    if (component) componentStack.pop();
    handleRenderError(error, container, oldDomElement);
    // Return a fallback empty node so the parent can continue
    newDomElement = document.createTextNode("");
    container.appendChild(newDomElement);
    return newDomElement;
  }

  // Store hook owner's DOM reference for functional components
  if (vdom._hookOwner) {
    vdom._hookOwner._dom = newDomElement;
    // Only set _hookOwner on DOM for the innermost component
    // (inner mounts run first, so only set if not already claimed)
    if (!newDomElement._hookOwner) {
      newDomElement._hookOwner = vdom._hookOwner;
    }
  }

  // Store component reference on the DOM for diffing
  if (component) {
    componentStack.pop();
    component.setDomElement(newDomElement);
    component.componentDidMount();
    // Support ref on component: ref receives the component instance
    if (component.props.ref) {
      component.props.ref(component);
    }
  }

  return newDomElement;
}

function diffFunctionalComponent(newVdom, container, oldDom) {
  const oldHookOwner = oldDom._hookOwner;

  if (oldHookOwner && oldHookOwner._vdom.type === newVdom.type) {
    // memo check: skip re-render if props unchanged
    const componentFn = newVdom.type;
    if (componentFn._isMemo) {
      const areEqual = componentFn._areEqual;
      if (areEqual(oldHookOwner._vdom.props || {}, newVdom.props || {})) {
        oldHookOwner._vdom = newVdom;
        return; // Props unchanged — skip re-render
      }
    }

    // Cancel any pending batched update (parent is already re-rendering us)
    if (oldHookOwner._rerender) {
      pendingUpdates.delete(oldHookOwner._rerender);
    }

    // Same functional component type — reuse hook state
    newVdom._hookOwner = oldHookOwner;
    oldHookOwner._vdom = newVdom;

    // Re-render with hook and signal-tracking context
    currentHookOwner = oldHookOwner;
    hookIndex = 0;
    const prevTracker = currentTracker;
    currentTracker = oldHookOwner._rerender;
    const nextVdom = newVdom.type(newVdom.props || {});
    currentTracker = prevTracker;
    currentHookOwner = null;

    // Diff the rendered output against current DOM
    diff(nextVdom, container, oldDom);

    // Update DOM reference (stays same for same-type root elements)
    if (oldDom.parentNode) {
      oldHookOwner._dom = oldDom;
    }
  } else {
    // Different component type or no previous hook owner — mount fresh
    mountElement(newVdom, container, oldDom);
  }
}

function diffComponent(newVirtualElement, oldComponent, container, domElement) {
  if (
    oldComponent &&
    newVirtualElement.type === oldComponent.constructor
  ) {
    // Same component type — check shouldComponentUpdate
    if (oldComponent.shouldComponentUpdate(newVirtualElement.props, oldComponent.state)) {
      const prevProps = oldComponent.props;

      // Update props and re-render
      oldComponent.updateProps(newVirtualElement.props);
      const nextElement = oldComponent.render();
      nextElement.component = oldComponent;
      diff(nextElement, container, domElement);

      oldComponent.componentDidUpdate(prevProps);
    }
  } else {
    // Different component type — remount
    mountElement(newVirtualElement, container, domElement);
  }
}

function mountSimpleNode(vdom, container, oldDomElement) {
  let newDomElement;
  const nextSibling = oldDomElement && oldDomElement.nextSibling;

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

  newDomElement._virtualElement = vdom;

  // If replacing an old element, unmount it first
  if (oldDomElement) {
    unmountNode(oldDomElement);
  }

  // Insert at the correct position
  if (nextSibling) {
    container.insertBefore(newDomElement, nextSibling);
  } else {
    container.appendChild(newDomElement);
  }

  // Store component reference on the DOM element
  const component = vdom.component;
  if (component) {
    component.setDomElement(newDomElement);
  }

  // Recursively mount children
  vdom.children.forEach((child) => {
    mountElement(child, newDomElement);
  });

  // Call ref callback with the real DOM element
  if (vdom.props && vdom.props.ref) {
    vdom.props.ref(newDomElement);
  }

  return newDomElement;
}

// ── Unmounting ──────────────────────────────────────────────────────

function unmountNode(domElement) {
  const virtualElement = domElement._virtualElement;
  if (!virtualElement) {
    domElement.remove();
    return;
  }

  // Call componentWillUnmount lifecycle
  const oldComponent = virtualElement.component;
  if (oldComponent) {
    oldComponent.componentWillUnmount();
  }

  // Recursively unmount children first
  while (domElement.childNodes.length > 0) {
    unmountNode(domElement.firstChild);
  }

  // Clear ref callback
  if (virtualElement.props && virtualElement.props.ref) {
    virtualElement.props.ref(null);
  }

  // Clear delegated event handlers (no removeEventListener needed)
  domElement._eventHandlers = null;

  // Remove from DOM
  domElement.remove();
}

// ── Create DOM from VDOM (full subtree) ─────────────────────────────

function createDomElement(vdom) {
  let newDomElement;
  if (vdom.type === "text") {
    newDomElement = document.createTextNode(vdom.props.textContent);
  } else if (vdom.type === Fragment) {
    newDomElement = document.createElement("div");
    newDomElement.style.display = "contents";
  } else {
    newDomElement = document.createElement(vdom.type);
    updateDomElement(newDomElement, vdom);
  }

  newDomElement._virtualElement = vdom;

  vdom.children.forEach((child) => {
    newDomElement.appendChild(createDomElement(child));
  });

  if (vdom.props && vdom.props.ref) {
    vdom.props.ref(newDomElement);
  }

  return newDomElement;
}

// ── Event Delegation ─────────────────────────────────────────────────
// Instead of attaching listeners to every element, we attach ONE listener
// per event type on the document and dispatch by walking up from the target.

const delegatedEvents = new Set(); // Event types we've already registered

function ensureDelegatedEvent(eventName) {
  if (delegatedEvents.has(eventName)) return;
  delegatedEvents.add(eventName);

  document.addEventListener(eventName, (nativeEvent) => {
    // Walk from target up to document, simulating bubbling
    let target = nativeEvent.target;
    while (target) {
      const handlers = target._eventHandlers;
      if (handlers && handlers[eventName]) {
        handlers[eventName](nativeEvent);
        // Stop if the handler called stopPropagation
        if (nativeEvent.cancelBubble) break;
      }
      target = target.parentNode;
    }
  });
}

// ── DOM Element Updates ─────────────────────────────────────────────

function updateTextNode(domElement, newVirtualElement, oldVirtualElement) {
  if (newVirtualElement.props.textContent !== oldVirtualElement.props.textContent) {
    domElement.textContent = newVirtualElement.props.textContent;
  }
  domElement._virtualElement = newVirtualElement;
}

function updateDomElement(domElement, newVirtualElement, oldVirtualElement = {}) {
  const newProps = newVirtualElement.props || {};
  const oldProps = oldVirtualElement.props || {};

  Object.keys(newProps).forEach((propName) => {
    const newProp = newProps[propName];
    const oldProp = oldProps[propName];

    if (newProp !== oldProp) {
      if (propName.slice(0, 2) === "on") {
        const eventName = propName.toLowerCase().slice(2);
        // Store handler on element, register delegation on document
        if (!domElement._eventHandlers) domElement._eventHandlers = {};
        domElement._eventHandlers[eventName] = newProp;
        ensureDelegatedEvent(eventName);
      } else if (propName === "value" || propName === "checked") {
        domElement[propName] = newProp;
      } else if (propName === "className") {
        domElement.setAttribute("class", newProp);
      } else if (propName === "style" && typeof newProp === "object") {
        domElement.style.cssText = styleObjToCss(newProp);
      } else if (propName !== "children") {
        domElement.setAttribute(propName, newProp);
      }
    }
  });

  Object.keys(oldProps).forEach((propName) => {
    const newProp = newProps[propName];

    if (!newProp) {
      if (propName.slice(0, 2) === "on") {
        const eventName = propName.toLowerCase().slice(2);
        if (domElement._eventHandlers) {
          delete domElement._eventHandlers[eventName];
        }
      } else if (propName !== "children") {
        domElement.removeAttribute(propName);
      }
    }
  });
}

// ── Style Helpers ───────────────────────────────────────────────────

function styleObjToCss(styleObj) {
  let css = "";
  for (const prop in styleObj) {
    if (styleObj.hasOwnProperty(prop)) {
      css += `${jsToCss(prop)}: ${styleObj[prop]}; `;
    }
  }
  return css;
}

function jsToCss(s) {
  return s.replace(/([A-Z])/g, "-$1").toLowerCase();
}

// ── Component Base Class ─────────────────────────────────────────────

class Component {
  constructor(props) {
    this.props = props;
    this.state = {};
    this.prevState = {};
  }

  setState(nextState) {
    if (!this.prevState) this.prevState = this.state;
    this.state = Object.assign({}, this.state, nextState);

    if (!this._rerender) {
      this._rerender = () => {
        const dom = this.getDomElement();
        if (!dom || !dom.parentNode) return;
        const container = dom.parentNode;
        const newvdom = this.render();
        diff(newvdom, container, dom);
      };
    }
    scheduleUpdate(this._rerender);
  }

  setDomElement(dom) {
    this._dom = dom;
  }

  getDomElement() {
    return this._dom;
  }

  updateProps(props) {
    this.props = props;
  }

  // Lifecycle stubs — override in subclasses
  componentDidMount() {}
  componentWillUnmount() {}
  shouldComponentUpdate(nextProps, nextState) {
    return nextProps !== this.props || nextState !== this.state;
  }
  componentDidUpdate(prevProps, prevState) {}
  componentDidCatch(error, info) {}

  static getDerivedStateFromError(error) {
    return null;
  }
}

// ── Signals ─────────────────────────────────────────────────────────

let currentTracker = null;

function createSignal(initialValue) {
  let value = initialValue;
  const subscribers = new Set();

  function read() {
    if (currentTracker) {
      subscribers.add(currentTracker);
    }
    return value;
  }

  function write(newValue) {
    const next = typeof newValue === "function" ? newValue(value) : newValue;
    if (next !== value) {
      value = next;
      // Batch signal notifications — multiple writes = single re-render
      [...subscribers].forEach((fn) => scheduleUpdate(fn));
    }
  }

  return [read, write];
}

function createEffect(fn) {
  const execute = () => {
    const prev = currentTracker;
    currentTracker = execute;
    fn();
    currentTracker = prev;
  };
  execute();
}

function createMemo(fn) {
  const [read, write] = createSignal(undefined);
  createEffect(() => write(fn()));
  return read;
}

// ── memo ────────────────────────────────────────────────────────────

function shallowEqual(objA, objB) {
  if (objA === objB) return true;
  if (!objA || !objB) return false;
  const keysA = Object.keys(objA).filter((k) => k !== "children" && k !== "key");
  const keysB = Object.keys(objB).filter((k) => k !== "children" && k !== "key");
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => objA[key] === objB[key]);
}

function memo(component, areEqual) {
  function MemoizedComponent(props) {
    return component(props);
  }
  MemoizedComponent._isMemo = true;
  MemoizedComponent._areEqual = areEqual || shallowEqual;
  return MemoizedComponent;
}

// ── Public API ──────────────────────────────────────────────────────

const TinyReact = {
  createElement,
  Fragment,
  render,
  Component,
  memo,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  createContext,
  useContext,
  createSignal,
  createEffect,
  createMemo,
};

export default TinyReact;

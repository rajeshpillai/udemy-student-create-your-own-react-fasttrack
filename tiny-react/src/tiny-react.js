// TinyReact — Module 12: useState Hook

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

// ── Hooks Infrastructure ────────────────────────────────────────────

let currentHookOwner = null; // The component currently being rendered
let hookIndex = 0; // Which hook we're on in the current render
const hookStates = new WeakMap(); // component → hooks[]

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

  // Set hook context
  currentHookOwner = owner;
  hookIndex = 0;
  const newVdom = vdom.type(vdom.props || {});
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
      reRenderFunctionalComponent(owner);
    }
  };

  return [hooks[idx], setState];
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
    // Component — delegate to component diffing
    diffComponent(vdom, oldDom._virtualElement.component, container, oldDom);
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

  // Set hook context before calling the component function
  currentHookOwner = owner;
  hookIndex = 0;
  const result = vdom.type(vdom.props || {});
  currentHookOwner = null;

  return result;
}

function buildStatefulComponent(vdom) {
  const component = new vdom.type(vdom.props);
  const nextElement = component.render();
  nextElement.component = component;
  return nextElement;
}

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

  // Store hook owner's DOM reference for functional components
  if (vdom._hookOwner) {
    vdom._hookOwner._dom = newDomElement;
  }

  // Store component reference on the DOM for diffing
  if (component) {
    component.setDomElement(newDomElement);
    component.componentDidMount();
    // Support ref on component: ref receives the component instance
    if (component.props.ref) {
      component.props.ref(component);
    }
  }

  return newDomElement;
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

  // Remove event listeners to prevent memory leaks
  if (virtualElement.props) {
    Object.keys(virtualElement.props).forEach((propName) => {
      if (propName.slice(0, 2) === "on") {
        const event = propName.toLowerCase().slice(2);
        domElement.removeEventListener(event, virtualElement.props[propName]);
      }
    });
  }

  // Remove from DOM
  domElement.remove();
}

// ── Create DOM from VDOM (full subtree) ─────────────────────────────

function createDomElement(vdom) {
  let newDomElement;
  if (vdom.type === "text") {
    newDomElement = document.createTextNode(vdom.props.textContent);
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
        domElement.addEventListener(eventName, newProp, false);
        if (oldProp) {
          domElement.removeEventListener(eventName, oldProp, false);
        }
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
    const oldProp = oldProps[propName];

    if (!newProp) {
      if (propName.slice(0, 2) === "on") {
        const eventName = propName.toLowerCase().slice(2);
        domElement.removeEventListener(eventName, oldProp, false);
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

    const dom = this.getDomElement();
    const container = dom.parentNode;
    const newvdom = this.render();

    // Diff the new render against the current DOM
    diff(newvdom, container, dom);
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
}

// ── Public API ──────────────────────────────────────────────────────

const TinyReact = {
  createElement,
  render,
  Component,
  useState,
};

export default TinyReact;

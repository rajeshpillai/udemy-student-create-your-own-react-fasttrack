// TinyReact — Module 6: Diffing Same-Type Elements

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
  } else if (oldvdom && oldvdom.type === vdom.type) {
    // Same type — update in place
    if (vdom.type === "text") {
      updateTextNode(oldDom, vdom, oldvdom);
    } else {
      updateDomElement(oldDom, vdom, oldvdom);
    }

    // Update the back-reference to point to the new VDOM
    oldDom._virtualElement = vdom;

    // Recursively diff children by index
    vdom.children.forEach((child, i) => {
      diff(child, oldDom, oldDom.childNodes[i]);
    });

    // Remove extra old children
    const oldNodes = oldDom.childNodes;
    if (oldNodes.length > vdom.children.length) {
      for (let i = oldNodes.length - 1; i >= vdom.children.length; i--) {
        oldNodes[i].remove();
      }
    }
  }
}

// ── Mounting ────────────────────────────────────────────────────────

function mountElement(vdom, container) {
  return mountSimpleNode(vdom, container);
}

function mountSimpleNode(vdom, container) {
  let newDomElement;

  if (vdom.type === "text") {
    newDomElement = document.createTextNode(vdom.props.textContent);
  } else {
    newDomElement = document.createElement(vdom.type);
    updateDomElement(newDomElement, vdom);
  }

  newDomElement._virtualElement = vdom;

  vdom.children.forEach((child) => {
    mountElement(child, newDomElement);
  });

  container.appendChild(newDomElement);
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

// ── Public API ──────────────────────────────────────────────────────

const TinyReact = {
  createElement,
  render,
};

export default TinyReact;

// TinyReact — Module 5: Style Props

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

function render(vdom, container) {
  mountElement(vdom, container);
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

function updateDomElement(domElement, newVirtualElement, oldVirtualElement = {}) {
  const newProps = newVirtualElement.props || {};
  const oldProps = oldVirtualElement.props || {};

  // Set new or changed properties
  Object.keys(newProps).forEach((propName) => {
    const newProp = newProps[propName];
    const oldProp = oldProps[propName];

    if (newProp !== oldProp) {
      if (propName.slice(0, 2) === "on") {
        // Event handler: onClick → addEventListener("click", handler)
        const eventName = propName.toLowerCase().slice(2);
        domElement.addEventListener(eventName, newProp, false);
        if (oldProp) {
          domElement.removeEventListener(eventName, oldProp, false);
        }
      } else if (propName === "value" || propName === "checked") {
        // Special properties that must be set directly, not via setAttribute
        domElement[propName] = newProp;
      } else if (propName === "className") {
        // JSX uses className, HTML uses class
        domElement.setAttribute("class", newProp);
      } else if (propName === "style" && typeof newProp === "object") {
        // Style object: { color: "red", fontSize: "14px" } → CSS string
        domElement.style.cssText = styleObjToCss(newProp);
      } else if (propName !== "children") {
        // Standard attribute — skip "children" since that's our internal prop
        domElement.setAttribute(propName, newProp);
      }
    }
  });

  // Remove properties that no longer exist
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
  // Convert camelCase to kebab-case: borderBottom → border-bottom
  return s.replace(/([A-Z])/g, "-$1").toLowerCase();
}

// ── Public API ──────────────────────────────────────────────────────

const TinyReact = {
  createElement,
  render,
};

export default TinyReact;

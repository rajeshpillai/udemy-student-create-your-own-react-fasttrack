// TinyReact — Module 3: Mounting to the Real DOM

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
  }

  // Store a back-reference from the real DOM to the virtual DOM
  newDomElement._virtualElement = vdom;

  // Recursively mount all children
  vdom.children.forEach((child) => {
    mountElement(child, newDomElement);
  });

  container.appendChild(newDomElement);
  return newDomElement;
}

// ── Public API ──────────────────────────────────────────────────────

const TinyReact = {
  createElement,
  render,
};

export default TinyReact;

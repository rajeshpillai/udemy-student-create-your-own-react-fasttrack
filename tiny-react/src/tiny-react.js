// TinyReact — Module 2: createElement with normalized children
//
// createElement now:
// 1. Flattens nested children arrays
// 2. Filters out null, undefined, true, false
// 3. Wraps primitive values (strings, numbers) in "text" virtual elements

function createElement(type, props, ...children) {
  const childElements = [].concat(...children).reduce((acc, child) => {
    if (child != null && child !== true && child !== false) {
      if (child instanceof Object) {
        acc.push(child);
      } else {
        // Wrap primitives (strings, numbers) as text virtual elements
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

const TinyReact = {
  createElement,
};

export default TinyReact;

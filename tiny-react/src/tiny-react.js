// TinyReact — Module 1: createElement stub
//
// This is where we'll build our React clone, one function at a time.
// Right now, all we have is a stub that logs what JSX compiles to.

function createElement(type, props, ...children) {
  console.log("createElement", { type, props, children });
}

const TinyReact = {
  createElement,
};

export default TinyReact;

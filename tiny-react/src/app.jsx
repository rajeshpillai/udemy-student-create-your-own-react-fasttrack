import TinyReact from "./tiny-react";

// Module 10: Functional and Stateful Components!

const root = document.getElementById("root");

// Functional component
const Heart = (props) => <span style={props.style}>&hearts;</span>;

// Functional component with children
const Button = (props) => (
  <button onClick={props.onClick}>{props.children}</button>
);

// Functional component composing other components
const Greeting = (props) => (
  <div className="greeting">
    <h2>Welcome, {props.name}!</h2>
    <Button onClick={() => alert("I love React!")}>
      I <Heart style={{ color: "red" }} /> React
    </Button>
  </div>
);

// Stateful component with setState
class Counter extends TinyReact.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
    this.increment = this.increment.bind(this);
    this.decrement = this.decrement.bind(this);
  }

  increment() {
    this.setState({ count: this.state.count + 1 });
  }

  decrement() {
    this.setState({ count: this.state.count - 1 });
  }

  render() {
    return (
      <div style={{ marginTop: "20px" }}>
        <h2>Counter: {this.state.count}</h2>
        <Button onClick={this.decrement}>-</Button>
        <span style={{ padding: "0 10px" }}>{this.state.count}</span>
        <Button onClick={this.increment}>+</Button>
      </div>
    );
  }
}

TinyReact.render(
  <div>
    <Greeting name="Developer" />
    <Counter />
  </div>,
  root
);

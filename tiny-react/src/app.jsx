import TinyReact from "./tiny-react";

// Module 11: Lifecycle methods and refs

const root = document.getElementById("root");

class Timer extends TinyReact.Component {
  constructor(props) {
    super(props);
    this.state = { seconds: 0 };
  }

  componentDidMount() {
    console.log("Timer: componentDidMount — starting interval");
    this.interval = setInterval(() => {
      this.setState({ seconds: this.state.seconds + 1 });
    }, 1000);
  }

  componentWillUnmount() {
    console.log("Timer: componentWillUnmount — clearing interval");
    clearInterval(this.interval);
  }

  componentDidUpdate() {
    console.log("Timer: componentDidUpdate — seconds:", this.state.seconds);
  }

  render() {
    return <p>Elapsed: {this.state.seconds}s</p>;
  }
}

class App extends TinyReact.Component {
  constructor(props) {
    super(props);
    this.state = { showTimer: true, inputValue: "" };
    this.toggle = this.toggle.bind(this);
  }

  toggle() {
    this.setState({ showTimer: !this.state.showTimer });
  }

  render() {
    return (
      <div>
        <h1>Lifecycle & Refs Demo</h1>

        <button onClick={this.toggle}>
          {this.state.showTimer ? "Unmount Timer" : "Mount Timer"}
        </button>
        {this.state.showTimer && <Timer />}

        <div style={{ marginTop: "20px" }}>
          <h3>Ref Demo — focus the input:</h3>
          <input
            type="text"
            placeholder="I get focused on mount"
            ref={(el) => { if (el) el.focus(); }}
          />
        </div>
      </div>
    );
  }
}

TinyReact.render(<App />, root);

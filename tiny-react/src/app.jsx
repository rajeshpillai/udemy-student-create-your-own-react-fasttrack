import TinyReact from "./tiny-react";

// Module 13: useEffect, useRef, useMemo, useCallback

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

      // Cleanup: runs before next effect and on unmount
      return () => {
        console.log("Cleanup: clearing interval");
        clearInterval(intervalRef.current);
      };
    }
  }, [running]); // Only re-run when `running` changes

  const formattedTime = TinyReact.useMemo(() => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, [seconds]);

  return (
    <div style={{ marginTop: "20px" }}>
      <h2>Timer: {formattedTime}</h2>
      <p style={{ color: "gray" }}>
        {running ? "Running..." : "Paused"} | Raw seconds: {seconds}
      </p>
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
      <h1>useEffect + useRef + useMemo Demo</h1>
      <button onClick={() => setShowTimer(!showTimer)}>
        {showTimer ? "Unmount Timer" : "Mount Timer"}
      </button>
      {showTimer && <Timer />}
    </div>
  );
}

TinyReact.render(<App />, root);

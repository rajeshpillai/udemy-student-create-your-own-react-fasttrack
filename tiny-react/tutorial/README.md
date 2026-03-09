# Build Your Own React — Tutorial Index

A step-by-step guide to building a React-like framework from scratch.

## Part 1: Virtual DOM & Rendering

| Module | Topic | What You Build |
|---|---|---|
| [00](./00-project-setup.md) | Project Setup | Vite + JSX config |
| [01](./01-the-jsx-illusion.md) | The JSX Illusion | `createElement` stub |
| [02](./02-cleaning-up-children.md) | Cleaning Up Children | Child normalization |
| [03](./03-mounting-to-the-real-dom.md) | Mounting to the Real DOM | `render`, `mountElement`, `mountSimpleNode` |
| [04](./04-attributes-events-properties.md) | Attributes, Events & Properties | `updateDomElement` |
| [05](./05-style-props.md) | Style Props | `styleObjToCss`, `jsToCss` |

## Part 2: Reconciliation

| Module | Topic | What You Build |
|---|---|---|
| [06](./06-diffing-same-type-elements.md) | Diffing Same-Type Elements | `diff`, `updateTextNode` |
| [07](./07-handling-type-mismatches.md) | Handling Type Mismatches | `createDomElement`, `replaceChild` |
| [08](./08-removing-stale-nodes.md) | Removing Stale Nodes | `unmountNode` |
| [09](./09-keyed-reconciliation.md) | Keyed Reconciliation | Key-based child diffing |

## Part 3: Components

| Module | Topic | What You Build |
|---|---|---|
| [10](./10-functional-components.md) | Components | Functional + class + `setState` + diffing |
| [11](./11-lifecycle-methods-and-refs.md) | Lifecycle Methods & Refs | `componentDidMount`, `componentWillUnmount`, ref callbacks |

## Part 4: Hooks

| Module | Topic | What You Build |
|---|---|---|
| [12](./12-usestate-hook.md) | useState | Hook infrastructure + `useState` |
| [13](./13-useeffect-hook.md) | useEffect & Friends | `useEffect`, `useRef`, `useMemo`, `useCallback` |

## Part 5: Advanced

| Module | Topic | What You Build |
|---|---|---|
| [14](./14-context-api.md) | Context API | `createContext`, `useContext` |
| [15](./15-capstone-todo-app.md) | Capstone: Todo App | Full app using all features |

## Part 6: Signals & Performance

| Module | Topic | What You Build |
|---|---|---|
| [16](./16-signals.md) | Signals | `createSignal`, `createEffect`, `createMemo` + Signals Todo App |
| [17](./17-performance.md) | Performance | `memo`, setState batching, signal auto-tracking |

## Part 7: Production Features

| Module | Topic | What You Build |
|---|---|---|
| [18](./18-fragments.md) | Fragments | `<>...</>` via `Fragment` symbol + `display: contents` |
| [19](./19-error-boundaries.md) | Error Boundaries | `componentDidCatch`, `getDerivedStateFromError`, component stack |

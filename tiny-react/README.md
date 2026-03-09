# TinyReact — Build Your Own React From Scratch

A ~600-line React clone built step-by-step across 16 tutorial modules. Covers virtual DOM, reconciliation, components, hooks, context, and more.

## Quick Start

```bash
cd tiny-react
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. The app (currently the capstone Todo app) will be running.

## How to Follow the Tutorial

Each module has a **tutorial markdown** and a **matching git commit**. You can follow the tutorials in [tutorial/](tutorial/) sequentially — every line of code is included in the markdown with full explanations.

### Option A: Read the tutorials and code along

1. Start with [tutorial/00-project-setup.md](tutorial/00-project-setup.md)
2. Create a fresh project and type the code yourself
3. Run `npm run dev` after each module to see your progress
4. Each module tells you exactly what to put in `src/tiny-react.js` and `src/app.jsx`

### Option B: Step through the git history

Each module is a single commit. You can checkout any step:

```bash
# See all module commits
git log --oneline

# Checkout a specific module (e.g., Module 6: Diffing)
git checkout <commit-hash>

# Run it
npm run dev
```

## Running & Testing Each Module

Every module updates two files:

| File | Purpose |
|---|---|
| `src/tiny-react.js` | The framework — you build this |
| `src/app.jsx` | Demo app — tests the features you just built |

After editing, just check your browser — Vite hot-reloads automatically.

### What to verify at each module:

| Module | What to check |
|---|---|
| **00-01** Setup + createElement | Open console → see `createElement` calls logged |
| **02** Children cleanup | Console → VDOM tree with 6 children (nulls/booleans filtered) |
| **03** Mounting | Text appears on screen for the first time |
| **04** Attributes & Events | Click a button → alert fires. Inspect DOM → `class` attribute present |
| **05** Style Props | Elements have colored backgrounds, borders, padding from style objects |
| **06** Diffing | After 3s re-render, only changed elements flash (enable Paint Flashing in DevTools) |
| **07** Type Mismatches | `<div>` replaced by `<span>` — inspect DOM to confirm |
| **08** Unmounting | Buttons removed cleanly. Check Event Listeners panel — no orphans |
| **09** Keyed Reconciliation | Type in inputs, wait for reorder — inputs follow their items |
| **10** Components | Functional `Greeting` renders. `Counter` class component increments/decrements |
| **11** Lifecycle & Refs | Timer starts on mount, stops on unmount. Input auto-focuses |
| **12** useState | Functional `Counter` with +/- buttons. `NameCard` with two independent states |
| **13** useEffect + useRef + useMemo | Pausable timer with formatted time. Console logs effect start/cleanup |
| **14** Context | Toggle theme button — nested `ThemedButton` changes style without props |
| **15** Capstone Todo | Full CRUD todo app: add, edit, delete, complete, theme toggle |

## Project Structure

```
tiny-react/
├── index.html              # HTML shell with <div id="root">
├── package.json            # Vite dev dependency
├── vite.config.js          # JSX → TinyReact.createElement
├── src/
│   ├── tiny-react.js       # The framework (~600 lines)
│   └── app.jsx             # Demo application
└── tutorial/
    ├── README.md           # Tutorial index
    ├── 00-project-setup.md
    ├── 01-the-jsx-illusion.md
    ├── 02-cleaning-up-children.md
    ├── 03-mounting-to-the-real-dom.md
    ├── 04-attributes-events-properties.md
    ├── 05-style-props.md
    ├── 06-diffing-same-type-elements.md
    ├── 07-handling-type-mismatches.md
    ├── 08-removing-stale-nodes.md
    ├── 09-keyed-reconciliation.md
    ├── 10-functional-components.md
    ├── 11-lifecycle-methods-and-refs.md
    ├── 12-usestate-hook.md
    ├── 13-useeffect-hook.md
    ├── 14-context-api.md
    └── 15-capstone-todo-app.md
```

## What TinyReact Implements

| Category | APIs |
|---|---|
| Virtual DOM | `createElement` |
| Rendering | `render` |
| Reconciliation | O(n) diffing, keyed lists, type replacement, unmounting |
| Class Components | `Component`, `setState`, lifecycle methods |
| Hooks | `useState`, `useEffect`, `useRef`, `useMemo`, `useCallback` |
| Context | `createContext`, `useContext` |
| DOM | Attributes, events, `className`, `style` objects, `value`/`checked`, refs |

## Prerequisites

- Node.js v18+
- Basic JavaScript (ES6+)
- Basic DOM knowledge

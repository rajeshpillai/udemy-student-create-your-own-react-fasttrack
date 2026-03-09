# TinyReact — Build Your Own React From Scratch

A ~850-line React clone built step-by-step across 21 tutorial modules. Covers virtual DOM, reconciliation, components, hooks, context, signals, performance, fragments, error boundaries, event delegation, and more.

## Quick Start

```bash
cd tiny-react
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. The landing page shows links to both demo apps:

- **Todo App (Hooks)** — built with useState, useEffect, useRef, useMemo, useCallback, Context
- **Todo App (Signals)** — built with createSignal, createEffect, createMemo — no hooks, no dependency arrays

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
| **15** Capstone Todo (Hooks) | Full CRUD todo app: add, edit, delete, complete, theme toggle |
| **16** Signals + Todo (Signals) | Same todo app rebuilt with signals — no hooks, no dependency arrays |
| **17** Performance | `memo` skips unchanged components. Batching + signal auto-tracking |
| **18** Fragments | Use `<>...</>` — inspect DOM for `display: contents` wrapper |
| **19** Error Boundaries | Wrap components — errors show fallback UI instead of crashing |
| **20** Event Delegation | Check Event Listeners panel — no per-element listeners, only on document |

## Project Structure

```
tiny-react/
├── index.html              # Landing page
├── todo-hooks.html         # Hooks todo app entry
├── todo-signals.html       # Signals todo app entry
├── package.json            # Vite dev dependency
├── vite.config.js          # JSX factory + multi-page config
├── src/
│   ├── tiny-react.js       # The framework (~700 lines)
│   ├── app.jsx             # Landing page
│   ├── todo-hooks/
│   │   └── app.jsx         # Todo app using hooks
│   └── todo-signals/
│       └── app.jsx         # Todo app using signals
└── tutorial/
    ├── README.md           # Tutorial index
    ├── 00-project-setup.md
    ├── ...
    ├── 15-capstone-todo-app.md
    ├── 16-signals.md
    └── 17-performance.md
```

## What TinyReact Implements

| Category | APIs |
|---|---|
| Virtual DOM | `createElement`, `Fragment` |
| Rendering | `render` |
| Reconciliation | O(n) diffing, keyed lists, type replacement, unmounting |
| Class Components | `Component`, `setState`, lifecycle methods, error boundaries |
| Hooks | `useState`, `useEffect`, `useRef`, `useMemo`, `useCallback` |
| Context | `createContext`, `useContext` |
| Signals | `createSignal`, `createEffect`, `createMemo` |
| Performance | `memo`, `scheduleUpdate` batching, signal auto-tracking |
| DOM | Attributes, events (delegated), `className`, `style` objects, `value`/`checked`, refs |

## Prerequisites

- Node.js v18+
- Basic JavaScript (ES6+)
- Basic DOM knowledge

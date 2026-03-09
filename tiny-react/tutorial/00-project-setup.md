# Module 0: Project Setup

## What We're Building

We're going to build a working React clone from scratch. Not a toy — a real virtual DOM framework that supports components, state, reconciliation, hooks, and more.

By the end, you'll understand exactly how React works under the hood, because you'll have built every piece yourself.

## Prerequisites

You need:
- **Node.js** (v18 or later) installed on your machine
- A **code editor** (VS Code recommended)
- A **terminal** you're comfortable with
- **JavaScript fundamentals**: variables, functions, arrays, objects, classes, arrow functions, destructuring, spread operator
- **Basic DOM knowledge**: you've used `document.createElement` and `addEventListener` before

You do **not** need prior React experience — but if you've used React before, you'll have a lot of "aha!" moments.

## Create the Project

Open your terminal and run:

```bash
mkdir tiny-react
cd tiny-react
```

Initialize a new Node.js project:

```bash
npm init -y
```

Open `package.json` and replace its contents with:

```json
{
  "name": "tiny-react",
  "version": "0.0.1",
  "description": "Build your own React from scratch",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

The `"type": "module"` line tells Node.js we're using ES modules (`import`/`export`) instead of the older `require()` syntax.

## Install Vite

[Vite](https://vitejs.dev/) is a modern development server. It gives us:
- **Instant hot reload** — change a file, see the result immediately
- **JSX transformation** — converts JSX syntax into function calls (we'll see this in Module 1)
- **Zero config** — works out of the box for our needs

Install it:

```bash
npm install vite --save-dev
```

## Configure JSX

Here's the key insight that makes this whole project work:

> **JSX is not tied to React.** It's just syntax sugar that gets transformed into function calls. We can tell the build tool to call *our* function instead of `React.createElement`.

Create a file called `vite.config.js` in the project root:

```js
import { defineConfig } from "vite";

export default defineConfig({
  esbuild: {
    jsxFactory: "TinyReact.createElement",
    jsxFragment: "TinyReact.Fragment",
  },
});
```

This tells Vite: "When you see JSX like `<div>hello</div>`, transform it into `TinyReact.createElement('div', null, 'hello')` instead of `React.createElement(...)`.

## Create the HTML Shell

Create `index.html` in the project root:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tiny React</title>
    <style>
      body {
        font-family: system-ui, -apple-system, sans-serif;
        max-width: 800px;
        margin: 40px auto;
        padding: 0 20px;
        background: #fafafa;
        color: #333;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/app.jsx"></script>
  </body>
</html>
```

This is our entire HTML file. Just a `<div id="root">` where our framework will render, and a script tag pointing to our app. That's it.

## Create the Source Files

Create the `src/` directory:

```bash
mkdir src
```

Create `src/tiny-react.js` — this will be our framework file:

```js
function createElement(type, props, ...children) {
  console.log("createElement", { type, props, children });
}

const TinyReact = {
  createElement,
};

export default TinyReact;
```

Right now `createElement` does nothing but log. That's intentional — we're starting from zero.

Create `src/app.jsx` — this is our test application:

```jsx
import TinyReact from "./tiny-react";

const element = (
  <div>
    <h1 className="header">Hello Tiny React!</h1>
    <p>This is a paragraph</p>
  </div>
);

console.log("Returned value:", element);
```

## Run It

```bash
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`). You'll see a blank page — that's expected! We haven't rendered anything yet.

**Open the browser console** (F12 → Console tab). You should see multiple `createElement` calls logged:

```
createElement { type: 'h1', props: { className: 'header' }, children: ['Hello Tiny React!'] }
createElement { type: 'p', props: null, children: ['This is a paragraph'] }
createElement { type: 'div', props: null, children: [undefined, undefined] }
```

This is the moment everything clicks: **JSX is just function calls**. Every `<tag>` in your code becomes a call to `TinyReact.createElement()`. The browser never sees JSX — Vite transforms it before it reaches the browser.

## Your Project Structure

```
tiny-react/
├── index.html            ← HTML shell with #root div
├── package.json          ← Project config
├── vite.config.js        ← JSX → TinyReact.createElement
└── src/
    ├── tiny-react.js     ← Our framework (we build this)
    └── app.jsx           ← Test application
```

## What's Next

In the next module, we'll make `createElement` return a proper virtual DOM object instead of just logging. That object will be a plain JavaScript representation of the UI we want — and it's the foundation of everything React does.

---

[Next: Module 1 — The JSX Illusion →](./01-the-jsx-illusion.md)

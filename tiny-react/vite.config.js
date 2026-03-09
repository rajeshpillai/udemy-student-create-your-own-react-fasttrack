import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  esbuild: {
    jsxFactory: "TinyReact.createElement",
    jsxFragment: "TinyReact.Fragment",
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        "todo-hooks": resolve(__dirname, "todo-hooks.html"),
        "todo-signals": resolve(__dirname, "todo-signals.html"),
      },
    },
  },
});

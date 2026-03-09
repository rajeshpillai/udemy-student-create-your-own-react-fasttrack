import { defineConfig } from "vite";

export default defineConfig({
  esbuild: {
    jsxFactory: "TinyReact.createElement",
    jsxFragment: "TinyReact.Fragment",
  },
});

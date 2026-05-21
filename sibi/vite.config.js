import { defineConfig } from "vite";

export default defineConfig({
  cacheDir: ".vite-cache",
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
});

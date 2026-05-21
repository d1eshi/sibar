import { defineConfig } from "vite";

const PIERRE_MODULE_PATH_PATTERN =
  /(?:^|[/\\])node_modules(?:[/\\].*)?[/\\]@pierre[/\\][^/\\]+(?:[/\\]|$)|(?:^|[/\\])node_modules[/\\]\.pnpm[/\\]@pierre\+[^/\\]+@/;

export function isPierreModuleLevelDirectiveWarning(warning) {
  const message = String(warning?.message ?? "");
  const source = String(warning?.id ?? warning?.loc?.file ?? "");
  const warningText = `${source}\n${message}`;

  return (
    warning?.code === "MODULE_LEVEL_DIRECTIVE" &&
    message.includes("Module level directives cause errors when bundled") &&
    message.includes('"use client"') &&
    PIERRE_MODULE_PATH_PATTERN.test(warningText)
  );
}

export default defineConfig({
  cacheDir: ".vite-cache",
  build: {
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        if (isPierreModuleLevelDirectiveWarning(warning)) {
          return;
        }

        defaultHandler(warning);
      },
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
});

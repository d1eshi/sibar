import { defineConfig } from "vite";
import { appendFileSync } from "node:fs";

const PIERRE_REACT_DIST_FILE_PATTERN =
  /@pierre[/\\](?<packageName>[^/\\]+)[/\\]dist[/\\]react[/\\](?<filePath>[^"'\\\s]+?\.js)\b/;

// This is intentionally strict: if @pierre ships new React bundles with `"use client"`
// directives (or we start importing new surfaces), we want tests to force us to make an
// explicit decision instead of silently widening a filter.
export const ALLOWED_PIERRE_USE_CLIENT_REACT_FILES = Object.freeze([
  "@pierre/diffs/dist/react/CodeView.js",
  "@pierre/diffs/dist/react/File.js",
  "@pierre/diffs/dist/react/FileDiff.js",
  "@pierre/diffs/dist/react/MultiFileDiff.js",
  "@pierre/diffs/dist/react/PatchDiff.js",
  "@pierre/diffs/dist/react/UnresolvedFile.js",
  "@pierre/diffs/dist/react/Virtualizer.js",
  "@pierre/diffs/dist/react/WorkerPoolContext.js",
  "@pierre/trees/dist/react/FileTree.js",
  "@pierre/trees/dist/react/useFileTree.js",
  "@pierre/trees/dist/react/useFileTreeSearch.js",
  "@pierre/trees/dist/react/useFileTreeSelection.js",
  "@pierre/trees/dist/react/useFileTreeSelector.js",
]);

const ALLOWED_PIERRE_USE_CLIENT_REACT_FILES_SET = new Set(ALLOWED_PIERRE_USE_CLIENT_REACT_FILES);

export function getPierreReactDistFileId(warning) {
  const message = String(warning?.message ?? "");
  const id = String(warning?.id ?? warning?.loc?.file ?? "");

  const haystack = `${id}\n${message}`;
  const match = haystack.match(PIERRE_REACT_DIST_FILE_PATTERN);
  if (!match?.groups) return null;

  const packageName = match.groups.packageName;
  const filePath = match.groups.filePath.replaceAll("\\", "/");
  return `@pierre/${packageName}/dist/react/${filePath}`;
}

export function isPierreModuleLevelDirectiveWarning(warning) {
  const message = String(warning?.message ?? "");
  const pierreReactFileId = getPierreReactDistFileId(warning);

  if (pierreReactFileId == null) return false;
  if (!ALLOWED_PIERRE_USE_CLIENT_REACT_FILES_SET.has(pierreReactFileId)) return false;

  return (
    warning?.code === "MODULE_LEVEL_DIRECTIVE" &&
    message.includes("Module level directives cause errors when bundled") &&
    message.includes('"use client"')
  );
}

export default defineConfig({
  cacheDir: ".vite-cache",
  build: {
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        if (isPierreModuleLevelDirectiveWarning(warning)) {
          const traceFile = process.env.SIBI_PIERRE_WARNING_TRACE_FILE;
          if (traceFile) {
            const fileId = getPierreReactDistFileId(warning);
            if (fileId) appendFileSync(traceFile, `${fileId}\n`, "utf8");
          }
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

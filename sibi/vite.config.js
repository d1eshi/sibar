import { defineConfig } from "vite";
import { appendFileSync } from "node:fs";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { repoInventory } from "../src/repo-inventory/repo-inventory.js";

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
const SIBI_APP_ROOT = path.dirname(fileURLToPath(import.meta.url));
const SIBI_APP_ROOT_REAL = realpath(SIBI_APP_ROOT);

function isInsideRealPath(rootPath, candidatePath) {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

async function resolveInventorySourceRoot(sourceRoot) {
  const normalizedSourceRoot = normalizeSourceRootLabel(sourceRoot);
  const absoluteSourceRoot = path.resolve(SIBI_APP_ROOT, normalizedSourceRoot);
  if (!isInsideRealPath(SIBI_APP_ROOT, absoluteSourceRoot)) {
    return {
      normalizedSourceRoot,
      absoluteSourceRoot,
      isInsideAppRoot: false,
    };
  }

  const [appRootRealPath, sourceRootRealPath] = await Promise.all([SIBI_APP_ROOT_REAL, realpath(absoluteSourceRoot)]);

  return {
    normalizedSourceRoot,
    absoluteSourceRoot,
    isInsideAppRoot: isInsideRealPath(appRootRealPath, sourceRootRealPath),
  };
}

function normalizeContentPath(value) {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "") return "";

  if (path.isAbsolute(trimmed)) return "";
  if (/(^|[\\/])\.\.(?:[\\/]|$)/.test(trimmed)) return "";
  if (trimmed.includes("\0")) return "";

  const normalized = path.normalize(trimmed).replaceAll("\\", "/");
  return normalized.replace(/^\.\//, "").replace(/\/+$/, "");
}

async function resolveFileContentTarget({ sourceRoot, rawPath }) {
  const normalizedSourceRoot = normalizeFileContentSourceRoot(sourceRoot ?? "src");
  if (!normalizedSourceRoot) {
    return {
      kind: "invalid-source-root",
      normalizedSourceRoot: "src",
      message: "sourceRoot must stay inside the Sibi app root",
    };
  }

  const sourceRootResolution = await resolveInventorySourceRoot(normalizedSourceRoot);
  const normalizedPath = normalizeContentPath(rawPath);

  if (!sourceRootResolution.isInsideAppRoot) {
    return {
      kind: "invalid-source-root",
      normalizedSourceRoot,
      message: "sourceRoot must stay inside the Sibi app root",
    };
  }

  if (!normalizedPath) {
    return {
      kind: "invalid-path",
      normalizedSourceRoot,
      message: "path must be a relative file path inside the selected sourceRoot",
    };
  }

  const sourceRootPrefix = `${normalizedSourceRoot}/`;
  const normalizedRelativePath = normalizedPath.startsWith(sourceRootPrefix)
    ? normalizedPath.slice(sourceRootPrefix.length)
    : normalizedPath;

  if (!normalizedRelativePath || normalizedRelativePath === normalizedSourceRoot) {
    return {
      kind: "invalid-path",
      normalizedSourceRoot,
      message: "path must be a regular file inside the selected sourceRoot",
    };
  }

  const absoluteSourceRoot = path.resolve(SIBI_APP_ROOT, normalizedSourceRoot);
  const sourceRootItem = path.resolve(absoluteSourceRoot, normalizedRelativePath);

  try {
    const [sourceRootRealPath, targetRealPath, targetStats] = await Promise.all([
      realpath(absoluteSourceRoot),
      realpath(sourceRootItem),
      stat(sourceRootItem),
    ]);

    if (!targetStats.isFile()) {
      return {
        kind: "invalid-target",
        normalizedSourceRoot,
        message: "path must target a regular file",
      };
    }

    if (!isInsideRealPath(sourceRootRealPath, targetRealPath)) {
      return {
        kind: "invalid-target",
        normalizedSourceRoot,
        message: "path must stay inside the selected sourceRoot",
      };
    }

    return {
      kind: "ready",
      normalizedSourceRoot,
      normalizedPath,
      sourceRootRealPath,
      targetRealPath,
    };
  } catch (error) {
    if (error instanceof Error && error.code === "ENOENT") {
      return {
        kind: "missing",
        normalizedSourceRoot,
        message: "file not found",
      };
    }

    if (error instanceof Error && error.code === "ELOOP") {
      return {
        kind: "invalid-target",
        normalizedSourceRoot,
        message: "path resolution failed",
      };
    }

    throw error;
  }
}

export { resolveInventorySourceRoot, resolveFileContentTarget };

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

function normalizeSourceRootLabel(sourceRoot) {
  const trimmed = String(sourceRoot ?? "").trim();
  const normalized = trimmed === "" ? "src" : path.normalize(trimmed).replaceAll("\\", "/");
  return normalized.replace(/\/+/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
}

function normalizeFileContentSourceRoot(sourceRoot) {
  const trimmed = String(sourceRoot ?? "").trim();
  if (trimmed === "") return "";
  if (path.isAbsolute(trimmed)) return "";
  if (trimmed.includes("\0")) return "";
  if (trimmed === ".") return "";
  if (trimmed === ".." || /(^|[\\/])\.\.(?:[\\/]|$)/.test(trimmed)) return "";

  const normalized = path
    .normalize(trimmed)
    .replaceAll("\\", "/")
    .replace(/\/+/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "");

  if (normalized === "" || normalized === ".") return "";
  return normalized;
}

export default defineConfig({
  cacheDir: ".vite-cache",
  plugins: [
    {
      name: "sibi-repo-inventory-endpoint",
      configureServer(server) {
        server.middlewares.use("/__sibi/repo-inventory", async (request, response) => {
          try {
            const requestUrl = new URL(request.url ?? "", "http://sibi.local");
            const rawSourceRoot = requestUrl.searchParams.get("sourceRoot") ?? "src";
            const sourceRootResolution = await resolveInventorySourceRoot(rawSourceRoot);

            if (!sourceRootResolution.isInsideAppRoot) {
              response.statusCode = 400;
              response.setHeader("content-type", "application/json");
              response.end(JSON.stringify({ error: "sourceRoot must stay inside the Sibi app root" }));
              return;
            }

            const inventory = await repoInventory(sourceRootResolution.absoluteSourceRoot, {
              sourceRootLabel: sourceRootResolution.normalizedSourceRoot,
            });

            response.statusCode = 200;
            response.setHeader("content-type", "application/json");
            response.end(JSON.stringify(inventory));
          } catch (error) {
            if (error instanceof Error && (error.message.includes("sourceRoot") || error.code === "ENOENT")) {
              response.statusCode = 400;
              response.setHeader("content-type", "application/json");
              response.end(
                JSON.stringify({
                  error:
                    error instanceof Error && error.message.includes("must stay inside the Sibi app root")
                      ? error.message
                      : `sourceRoot validation failed: ${error.message}`,
                }),
              );
              return;
            }

            response.statusCode = 500;
            response.setHeader("content-type", "application/json");
            response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
          }
        });
      },
    },
    {
      name: "sibi-file-content-endpoint",
      configureServer(server) {
        server.middlewares.use("/__sibi/file-content", async (request, response) => {
          try {
            const requestUrl = new URL(request.url ?? "", "http://sibi.local");
            const rawSourceRoot = requestUrl.searchParams.get("sourceRoot") ?? "src";
            const rawPath = requestUrl.searchParams.get("path");
            const target = await resolveFileContentTarget({
              sourceRoot: rawSourceRoot,
              rawPath,
            });

            if (target.kind === "invalid-source-root" || target.kind === "invalid-path") {
              response.statusCode = 400;
              response.setHeader("content-type", "application/json");
              response.end(JSON.stringify({ error: target.message }));
              return;
            }

            if (target.kind === "invalid-target") {
              response.statusCode = 400;
              response.setHeader("content-type", "application/json");
              response.end(JSON.stringify({ error: target.message }));
              return;
            }

            if (target.kind === "missing") {
              response.statusCode = 404;
              response.setHeader("content-type", "application/json");
              response.end(JSON.stringify({ error: "file not found" }));
              return;
            }

            const contents = await readFile(target.targetRealPath, "utf8");
            const payload = {
              sourceRoot: target.normalizedSourceRoot,
              path: target.normalizedPath,
              contents,
              lineCount: contents.split("\n").length,
              sizeBytes: Buffer.byteLength(contents, "utf8"),
            };

            response.statusCode = 200;
            response.setHeader("content-type", "application/json");
            response.end(JSON.stringify(payload));
          } catch (error) {
            console.error("sibi file-content endpoint failed", error);
            response.statusCode = 500;
            response.setHeader("content-type", "application/json");
            response.end(JSON.stringify({ error: "unexpected file-content error" }));
          }
        });
      },
    },
  ],
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

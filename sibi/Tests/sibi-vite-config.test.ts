import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import os from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sibiViteConfig, {
  ALLOWED_PIERRE_USE_CLIENT_REACT_FILES,
  getPierreReactDistFileId,
  isPierreModuleLevelDirectiveWarning,
} from "../vite.config.js";

const pierreDirectiveMessage =
  'Module level directives cause errors when bundled, "use client" in "node_modules/.pnpm/@pierre+trees@1.0.0/node_modules/@pierre/trees/dist/react/FileTree.js" was ignored.';

function getInventoryEndpointMiddleware() {
  const plugin = sibiViteConfig.plugins?.find((entry) => entry.name === "sibi-repo-inventory-endpoint");
  assert.equal(typeof plugin?.configureServer, "function", "expected repo inventory middleware plugin");

  let middleware = null;
  const app = {
    middlewares: {
      use(path, handler) {
        if (path === "/__sibi/repo-inventory") {
          middleware = handler;
        }
      },
    },
  };

  plugin.configureServer(app);

  assert.equal(typeof middleware, "function", "repo inventory middleware should be registered");
  return middleware;
}

async function callInventoryMiddleware(url) {
  const middleware = getInventoryEndpointMiddleware();
  const response = {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(payload) {
      if (payload != null) {
        this.body += String(payload);
      }
    },
  };

  const request = { url };
  await middleware(request, response);
  return response;
}

test("Sibi Vite @pierre warning contract allowlist only points at real React 'use client' bundles", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const pierreRoot = join(here, "..", "..", "node_modules", "@pierre");

  for (const fileId of ALLOWED_PIERRE_USE_CLIENT_REACT_FILES) {
    const match = fileId.match(/^@pierre\/(?<packageName>[^/]+)\/dist\/react\/(?<entry>.+\.js)$/);
    assert.ok(match?.groups, `Unexpected allowlist entry format: ${fileId}`);

    const filePath = join(pierreRoot, match.groups.packageName, "dist", "react", match.groups.entry);
    const contents = readFileSync(filePath, "utf8");
    assert.ok(
      contents.startsWith("'use client';"),
      `${fileId} must be a module-level 'use client' bundle (otherwise it should not be filtered)`,
    );
  }
});

test("Sibi Vite warning filter only suppresses the allow-listed @pierre module directives", () => {
  assert.equal(
    getPierreReactDistFileId({
      code: "MODULE_LEVEL_DIRECTIVE",
      id: "node_modules/.pnpm/@pierre+trees@1.0.0/node_modules/@pierre/trees/dist/react/FileTree.js",
      message: pierreDirectiveMessage,
    }),
    "@pierre/trees/dist/react/FileTree.js",
  );

  assert.equal(
    isPierreModuleLevelDirectiveWarning({
      code: "MODULE_LEVEL_DIRECTIVE",
      id: "node_modules/.pnpm/@pierre+trees@1.0.0/node_modules/@pierre/trees/dist/react/FileTree.js",
      message: pierreDirectiveMessage,
    }),
    true,
  );

  assert.equal(
    isPierreModuleLevelDirectiveWarning({
      code: "MODULE_LEVEL_DIRECTIVE",
      id: "node_modules/@pierre/trees/dist/react/SomeNewThing.js",
      message: pierreDirectiveMessage.replaceAll("FileTree.js", "SomeNewThing.js"),
    }),
    false,
    "unexpected @pierre directive warnings should remain visible",
  );

  assert.equal(
    isPierreModuleLevelDirectiveWarning({
      code: "MODULE_LEVEL_DIRECTIVE",
      id: "node_modules/some-package/dist/react/FileTree.js",
      message: pierreDirectiveMessage.replaceAll("@pierre/trees", "some-package"),
    }),
    false,
    "same Rollup directive warning from non-@pierre packages should remain visible",
  );

  assert.equal(
    isPierreModuleLevelDirectiveWarning({
      code: "CHUNK_SIZE",
      id: "node_modules/@pierre/trees/dist/react/FileTree.js",
      message: "Some chunks are larger than 500 kB after minification.",
    }),
    false,
    "chunk-size warnings must never be filtered",
  );
});

test("Sibi Vite onwarn forwards warnings outside the @pierre directive allowlist", () => {
  const onwarn = sibiViteConfig.build?.rollupOptions?.onwarn;
  assert.equal(typeof onwarn, "function");

  const forwardedWarnings: unknown[] = [];
  onwarn(
    {
      code: "CHUNK_SIZE",
      message: "Some chunks are larger than 500 kB after minification.",
    },
    (warning: unknown) => {
      forwardedWarnings.push(warning);
    },
  );

  assert.equal(forwardedWarnings.length, 1);

  onwarn(
    {
      code: "MODULE_LEVEL_DIRECTIVE",
      id: "node_modules/@pierre/diffs/dist/react/CodeView.js",
      message:
        'Module level directives cause errors when bundled, "use client" in "node_modules/@pierre/diffs/dist/react/CodeView.js" was ignored.',
    },
    (warning: unknown) => {
      forwardedWarnings.push(warning);
    },
  );

  assert.equal(forwardedWarnings.length, 1, "allow-listed @pierre use-client directive warnings should be filtered");

  onwarn(
    {
      code: "MODULE_LEVEL_DIRECTIVE",
      id: "node_modules/@pierre/diffs/dist/react/SomeNewThing.js",
      message:
        'Module level directives cause errors when bundled, "use client" in "node_modules/@pierre/diffs/dist/react/SomeNewThing.js" was ignored.',
    },
    (warning: unknown) => {
      forwardedWarnings.push(warning);
    },
  );

  assert.equal(
    forwardedWarnings.length,
    2,
    "unexpected @pierre directive warnings must be forwarded so we can tighten boundaries",
  );
});

test("Sibi Vite repo-inventory endpoint returns bounded src inventory JSON", async () => {
  const response = await callInventoryMiddleware("/__sibi/repo-inventory?sourceRoot=src");
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.sourceRoot, "src");
  assert.equal(Array.isArray(payload.files), true);
  assert.equal(payload.files.length > 0, true);
  assert.equal(payload.tree.fileCount, payload.files.length);
  assert.equal(typeof payload.generatedAt, "string");
});

test("Sibi Vite repo-inventory endpoint blocks out-of-root sourceRoots", async () => {
  const response = await callInventoryMiddleware("/__sibi/repo-inventory?sourceRoot=../../../../etc");
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 400);
  assert.equal(typeof payload.error, "string");
  assert.match(payload.error, /inside the Sibi app root/i);
});

test("Sibi Vite repo-inventory endpoint blocks symlink-based sourceRoot escape", async (t) => {
  const here = dirname(fileURLToPath(import.meta.url));
  const appRoot = join(here, "..");
  const outsideTarget = await mkdtemp(join(os.tmpdir(), "sibi-repo-inventory-outside-"));
  const linkName = `.repo-inventory-escape-${Date.now()}`;
  const symlinkPath = join(appRoot, linkName);
  const linkType = process.platform === "win32" ? "junction" : "dir";

  let skipReason = null;

  try {
    await symlink(outsideTarget, symlinkPath, linkType);
    const response = await callInventoryMiddleware(`/__sibi/repo-inventory?sourceRoot=${linkName}`);
    const payload = JSON.parse(response.body);

    assert.equal(response.statusCode, 400);
    assert.equal(typeof payload.error, "string");
    assert.match(payload.error, /inside the Sibi app root/i);
  } catch (error) {
    const code = error instanceof Error ? (error as NodeJS.ErrnoException).code : null;
    if (code === "ENOTSUP" || code === "EPERM" || code === "EEXIST" || code === "EINVAL" || code === "EOPNOTSUPP") {
      skipReason = code;
    } else {
      throw error;
    }
  } finally {
    await rm(symlinkPath, { force: true });
    await rm(outsideTarget, { force: true, recursive: true });
  }

  if (skipReason != null) {
    t.skip(`Symlink test skipped: filesystem does not support symlink creation in this environment (${skipReason})`);
  }
});

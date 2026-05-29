import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
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
const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

test("Sibi public Vercel build emits only the public entry under /sibi", () => {
  const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const mainEntry = readFileSync(join(repoRoot, "sibi/src/main.tsx"), "utf8");
  const publicEntry = readFileSync(join(repoRoot, "sibi/src/PublicSibiEntry.tsx"), "utf8");
  const sharedEarlyAccessApi = readFileSync(join(repoRoot, "apps/early-access/index.ts"), "utf8");
  const sharedEarlyAccessModal = readFileSync(join(repoRoot, "apps/early-access/EarlyAccessModal.tsx"), "utf8");

  assert.match(packageJson.scripts["sibi:build:public"], /VITE_SIBI_PUBLIC_ENTRY=true/);
  assert.match(packageJson.scripts["sibi:build:public"], /--config sibi\/vite\.public\.config\.js/);
  assert.match(packageJson.scripts["sibi:build:public"], /--base \/sibi\//);
  assert.match(packageJson.scripts["sibi:build:public"], /--outDir \.\.\/web\/sibi/);
  assert.equal(packageJson.scripts["vercel:build"], "pnpm run sibi:build:public");
  assert.match(mainEntry, /VITE_SIBI_PUBLIC_ENTRY/);
  assert.match(publicEntry, /CapturePrEntryScreen/);
  assert.match(publicEntry, /\.\.\/\.\.\/apps\/early-access\/index\.ts/);
  assert.doesNotMatch(publicEntry, /apps\/early-access\/EarlyAccessModal\.tsx/);
  assert.match(sharedEarlyAccessApi, /EarlyAccessModal/);
  assert.match(sharedEarlyAccessApi, /EarlyAccessModalCopy/);
  assert.match(sharedEarlyAccessApi, /EarlyAccessModalProps/);
  assert.match(sharedEarlyAccessApi, /requestEarlyAccessLead/);
  assert.match(sharedEarlyAccessApi, /EarlyAccessLeadInput/);
  assert.match(sharedEarlyAccessApi, /EarlyAccessResult/);
  assert.match(sharedEarlyAccessModal, /requestEarlyAccessLead/);
  assert.match(sharedEarlyAccessModal, /xHandle/);
  assert.match(sharedEarlyAccessModal, /sibarEarlyAccessModal/);
  assert.doesNotMatch(publicEntry, /workbench=1|OwnershipHarnessPanel|FileTreePanel/);
});

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

function getFileContentEndpointMiddleware() {
  const plugin = sibiViteConfig.plugins?.find((entry) => entry.name === "sibi-file-content-endpoint");
  assert.equal(typeof plugin?.configureServer, "function", "expected file-content middleware plugin");

  let middleware = null;
  const app = {
    middlewares: {
      use(path, handler) {
        if (path === "/__sibi/file-content") {
          middleware = handler;
        }
      },
    },
  };

  plugin.configureServer(app);

  assert.equal(typeof middleware, "function", "file-content middleware should be registered");
  return middleware;
}

function getRepoSearchEndpointMiddleware() {
  const plugin = sibiViteConfig.plugins?.find((entry) => entry.name === "sibi-repo-search-endpoint");
  assert.equal(typeof plugin?.configureServer, "function", "expected repo-search middleware plugin");

  let middleware = null;
  const app = {
    middlewares: {
      use(path, handler) {
        if (path === "/__sibi/repo-search") {
          middleware = handler;
        }
      },
    },
  };

  plugin.configureServer(app);

  assert.equal(typeof middleware, "function", "repo-search middleware should be registered");
  return middleware;
}

function getLanguageProposalEndpointMiddleware() {
  const plugin = sibiViteConfig.plugins?.find((entry) => entry.name === "sibi-language-proposal-endpoint");
  assert.equal(typeof plugin?.configureServer, "function", "expected language-proposal middleware plugin");

  let middleware = null;
  const app = {
    middlewares: {
      use(path, handler) {
        if (path === "/__sibi/language-proposal") {
          middleware = handler;
        }
      },
    },
  };

  plugin.configureServer(app);

  assert.equal(typeof middleware, "function", "language-proposal middleware should be registered");
  return middleware;
}

async function callEndpointMiddleware(middleware, url, body = "") {
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

  const request = { url, body };
  await middleware(request, response);
  return response;
}

async function callFileContentMiddleware(url) {
  const middleware = getFileContentEndpointMiddleware();
  return callEndpointMiddleware(middleware, url);
}

async function callInventoryMiddleware(url) {
  const middleware = getInventoryEndpointMiddleware();
  return callEndpointMiddleware(middleware, url);
}

async function callRepoSearchMiddleware(url) {
  const middleware = getRepoSearchEndpointMiddleware();
  return callEndpointMiddleware(middleware, url);
}

async function callLanguageProposalMiddleware(url, body = "") {
  const middleware = getLanguageProposalEndpointMiddleware();
  return callEndpointMiddleware(middleware, url, body);
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

test("Sibi Vite repo-inventory endpoint resolves the Sibi package from repo root", async () => {
  const response = await callInventoryMiddleware("/__sibi/repo-inventory?sourceRoot=sibi");
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.sourceRoot, "sibi");
  assert.equal(payload.files.some((file) => file.path === "sibi/src/App.tsx"), true);
  assert.equal(payload.tree.fileCount, payload.files.length);
});

test("Sibi Vite repo endpoints resolve configured external repo aliases without hardcoded paths", async () => {
  const originalAliases = process.env.SIBI_REPO_ALIASES;
  const externalRoot = await mkdtemp(join(os.tmpdir(), "sibi-external-repo-"));
  await mkdir(join(externalRoot, "src"), { recursive: true });
  await writeFile(
    join(externalRoot, "package.json"),
    JSON.stringify({ name: "external-proto", dependencies: { vite: "^7.0.0" } }, null, 2),
  );
  await writeFile(join(externalRoot, "src", "main.ts"), "export const externalRuntimeSignal = 'dynamic';\n");

  try {
    process.env.SIBI_REPO_ALIASES = `external-proto=${externalRoot}`;

    const inventoryResponse = await callInventoryMiddleware("/__sibi/repo-inventory?sourceRoot=external-proto");
    const inventory = JSON.parse(inventoryResponse.body);
    assert.equal(inventoryResponse.statusCode, 200);
    assert.equal(inventory.sourceRoot, "external-proto");
    assert.equal(inventory.files.some((file) => file.path === "external-proto/package.json"), true);
    assert.equal(inventory.files.some((file) => file.path === "external-proto/src/main.ts"), true);

    const contentResponse = await callFileContentMiddleware(
      "/__sibi/file-content?sourceRoot=external-proto&path=external-proto/src/main.ts",
    );
    const content = JSON.parse(contentResponse.body);
    assert.equal(contentResponse.statusCode, 200);
    assert.equal(content.path, "external-proto/src/main.ts");
    assert.match(content.contents, /externalRuntimeSignal/);

    const searchResponse = await callRepoSearchMiddleware(
      "/__sibi/repo-search?sourceRoot=external-proto&query=externalRuntimeSignal",
    );
    const search = JSON.parse(searchResponse.body);
    assert.equal(searchResponse.statusCode, 200);
    assert.deepEqual(search.results.map((result) => result.path), ["external-proto/src/main.ts"]);
  } finally {
    if (originalAliases == null) delete process.env.SIBI_REPO_ALIASES;
    else process.env.SIBI_REPO_ALIASES = originalAliases;
    await rm(externalRoot, { force: true, recursive: true });
  }
});

test("Sibi Vite repo-inventory endpoint blocks out-of-root sourceRoots", async () => {
  const response = await callInventoryMiddleware("/__sibi/repo-inventory?sourceRoot=../../../../etc");
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 400);
  assert.equal(typeof payload.error, "string");
  assert.match(payload.error, /sourceRoot/i);
});

test("Sibi Vite repo-inventory endpoint blocks absolute sourceRoots", async () => {
  const response = await callInventoryMiddleware("/__sibi/repo-inventory?sourceRoot=/etc");
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 400);
  assert.equal(typeof payload.error, "string");
  assert.match(payload.error, /sourceRoot/i);
});

test("Sibi Vite repo-inventory endpoint blocks symlink-based sourceRoot escape", async (t) => {
  const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
  const outsideTarget = await mkdtemp(join(os.tmpdir(), "sibi-repo-inventory-outside-"));
  const linkName = `.repo-inventory-escape-${Date.now()}`;
  const symlinkPath = join(repoRoot, linkName);
  const linkType = process.platform === "win32" ? "junction" : "dir";

  let skipReason = null;

  try {
    await symlink(outsideTarget, symlinkPath, linkType);
    const response = await callInventoryMiddleware(`/__sibi/repo-inventory?sourceRoot=${linkName}`);
    const payload = JSON.parse(response.body);

    assert.equal(response.statusCode, 400);
    assert.equal(typeof payload.error, "string");
    assert.match(payload.error, /inside the Sibi repo root|sourceRoot/i);
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

test("Sibi Vite file-content endpoint returns line-counted file data", async () => {
  const response = await callFileContentMiddleware(
    "/__sibi/file-content?sourceRoot=src&path=src/App.tsx",
  );
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.sourceRoot, "src");
  assert.equal(payload.path, "src/App.tsx");
  assert.equal(typeof payload.contents, "string");
  assert.equal(typeof payload.lineCount, "number");
  assert.equal(typeof payload.sizeBytes, "number");
  assert.equal(payload.lineCount >= 1, true);
});

test("Sibi Vite file-content endpoint resolves sourceRoot=sibi from repo root", async () => {
  const response = await callFileContentMiddleware(
    "/__sibi/file-content?sourceRoot=sibi&path=sibi/src/App.tsx",
  );
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.sourceRoot, "sibi");
  assert.equal(payload.path, "sibi/src/App.tsx");
  assert.equal(typeof payload.contents, "string");
  assert.match(payload.contents, /function App|const App|export default/);
});

test("Sibi Vite file-content endpoint blocks out-of-root path and sourceRoot", async () => {
  const outOfRoot = await callFileContentMiddleware("/__sibi/file-content?sourceRoot=src&path=../../vite.config.js");
  const outOfSource = await callFileContentMiddleware("/__sibi/file-content?sourceRoot=src&path=/etc/passwd");
  const absoluteSourceRoot = await callFileContentMiddleware("/__sibi/file-content?sourceRoot=/etc&path=passwd");
  const missing = await callFileContentMiddleware("/__sibi/file-content?sourceRoot=src&path=src/missing-file.ts");

  for (const response of [outOfRoot, outOfSource, absoluteSourceRoot]) {
    const payload = JSON.parse(response.body);
    assert.equal(response.statusCode, 400);
    assert.equal(typeof payload.error, "string");
    assert.match(payload.error, /path|sourceRoot|inside the Sibi repo root/i);
  }

  const missingPayload = JSON.parse(missing.body);
  assert.equal(missing.statusCode, 404);
  assert.equal(typeof missingPayload.error, "string");
  assert.match(missingPayload.error, /not found/i);
});

test("Sibi Vite file-content endpoint rejects sourceRoot traversal values", async () => {
  const response = await callFileContentMiddleware("/__sibi/file-content?sourceRoot=src/..&path=vite.config.js");
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 400);
  assert.equal(typeof payload.error, "string");
  assert.match(payload.error, /sourceRoot|inside the Sibi repo root/i);
});

test("Sibi Vite file-content endpoint rejects directory targets", async () => {
  const sourceRootPath = await callFileContentMiddleware("/__sibi/file-content?sourceRoot=src&path=src");
  const trailingSlashPath = await callFileContentMiddleware("/__sibi/file-content?sourceRoot=src&path=src/");
  const sourcePathPayload = JSON.parse(sourceRootPath.body);
  const trailingPathPayload = JSON.parse(trailingSlashPath.body);

  assert.equal(sourceRootPath.statusCode, 400);
  assert.equal(typeof sourcePathPayload.error, "string");
  assert.match(sourcePathPayload.error, /regular file/i);

  assert.equal(trailingSlashPath.statusCode, 400);
  assert.equal(typeof trailingPathPayload.error, "string");
  assert.match(trailingPathPayload.error, /regular file/i);
});

test("Sibi Vite file-content endpoint blocks symlink-based file escapes", async (t) => {
  const here = dirname(fileURLToPath(import.meta.url));
  const appRoot = join(here, "..");
  const srcRoot = join(appRoot, "src");
  const outsideTarget = await mkdtemp(join(os.tmpdir(), "sibi-file-content-outside-"));
  const outsideFile = join(outsideTarget, "outside.ts");
  const linkName = `.sibi-file-content-link-${Date.now()}.ts`;
  const symlinkPath = join(srcRoot, linkName);

  let skipReason = null;

  try {
    await mkdir(srcRoot, { recursive: true });
    await writeFile(outsideFile, "export const x = 1;\n");
    await symlink(outsideFile, symlinkPath, process.platform === "win32" ? "file" : "file");

    const response = await callFileContentMiddleware(`/__sibi/file-content?sourceRoot=src&path=${linkName}`);
    const payload = JSON.parse(response.body);

    assert.equal(response.statusCode, 400);
    assert.equal(typeof payload.error, "string");
    assert.match(payload.error, /inside the selected sourceRoot/i);
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

test("Sibi Vite repo-search endpoint returns deterministic bounded text results", async () => {
  const response = await callRepoSearchMiddleware("/__sibi/repo-search?sourceRoot=sibi&query=CapturePrEntryScreen");
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.sourceRoot, "sibi");
  assert.equal(payload.query, "CapturePrEntryScreen");
  assert.equal(Array.isArray(payload.results), true);
  assert.equal(payload.results.length > 0, true);
  assert.deepEqual(Object.keys(payload.results[0]), ["path", "line", "excerpt", "query"]);
  assert.equal(payload.results.every((result) => result.path.startsWith("sibi/")), true);
  assert.equal(payload.results.every((result) => result.query === "CapturePrEntryScreen"), true);
  assert.deepEqual(
    payload.results.map((result) => ({ path: result.path, line: result.line })),
    payload.results
      .map((result) => ({ path: result.path, line: result.line }))
      .toSorted((left, right) => (left.path === right.path ? left.line - right.line : left.path < right.path ? -1 : 1)),
  );
});

test("Sibi Vite repo-search endpoint blocks traversal and absolute sourceRoots", async () => {
  const traversal = await callRepoSearchMiddleware("/__sibi/repo-search?sourceRoot=src/..&query=App");
  const absolute = await callRepoSearchMiddleware("/__sibi/repo-search?sourceRoot=/etc&query=passwd");

  for (const response of [traversal, absolute]) {
    const payload = JSON.parse(response.body);
    assert.equal(response.statusCode, 400);
    assert.equal(typeof payload.error, "string");
    assert.match(payload.error, /sourceRoot/i);
  }
});

test("Sibi Vite repo-search endpoint blocks symlink-based sourceRoot escape", async (t) => {
  const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
  const outsideTarget = await mkdtemp(join(os.tmpdir(), "sibi-repo-search-outside-"));
  const outsideFile = join(outsideTarget, "outside.ts");
  const linkName = `.repo-search-escape-${Date.now()}`;
  const symlinkPath = join(repoRoot, linkName);

  let skipReason = null;

  try {
    await writeFile(outsideFile, "export const searchableOutsideSecret = 1;\n");
    await symlink(outsideTarget, symlinkPath, process.platform === "win32" ? "junction" : "dir");

    const response = await callRepoSearchMiddleware(
      `/__sibi/repo-search?sourceRoot=${linkName}&query=searchableOutsideSecret`,
    );
    const payload = JSON.parse(response.body);

    assert.equal(response.statusCode, 400);
    assert.equal(typeof payload.error, "string");
    assert.match(payload.error, /inside the Sibi repo root|sourceRoot/i);
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

test("Sibi Vite language-proposal endpoint blocks deterministically without Gemini config", async () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalGoogleKey = process.env.GOOGLE_API_KEY;
  const originalMock = process.env.SIBI_LANGUAGE_PROPOSAL_MOCK;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  delete process.env.SIBI_LANGUAGE_PROPOSAL_MOCK;

  try {
    const response = await callLanguageProposalMiddleware(
      "/__sibi/language-proposal?mock=1",
      JSON.stringify({
        selectedFilePath: "sibi/src/App.tsx",
        excerpts: [
          {
            evidenceId: "sibi/src/App.tsx:1-1:excerpt",
            filePath: "sibi/src/App.tsx",
            startLine: 1,
            endLine: 1,
            text: "SECRET_EXCERPT_TEXT_SHOULD_NOT_LEAK",
          },
        ],
        evidenceIds: ["sibi/src/App.tsx:1-1:excerpt"],
      }),
    );
    const payload = JSON.parse(response.body);

    assert.equal(response.statusCode, 503);
    assert.equal(payload.code, "blocked_llm_unavailable");
    assert.equal(payload.providerId, "gemini-first");
    assert.match(payload.reason, /API key/i);
    assert.equal(payload.runtimeTrace.providerId, "gemini-first");
    assert.equal(payload.runtimeTrace.model, "gemini-2.5-flash");
    assert.equal(payload.runtimeTrace.evidenceIdCount, 1);
    assert.match(payload.runtimeTrace.prompt, /Prompt omitted/);
    assert.doesNotMatch(payload.runtimeTrace.prompt, /SECRET_EXCERPT_TEXT_SHOULD_NOT_LEAK|excerpts/);
  } finally {
    if (originalGeminiKey == null) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
    if (originalGoogleKey == null) delete process.env.GOOGLE_API_KEY;
    else process.env.GOOGLE_API_KEY = originalGoogleKey;
    if (originalMock == null) delete process.env.SIBI_LANGUAGE_PROPOSAL_MOCK;
    else process.env.SIBI_LANGUAGE_PROPOSAL_MOCK = originalMock;
  }
});

test("Sibi Vite language-proposal endpoint sanitizes runtime trace on upstream Gemini failures", async () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalGoogleKey = process.env.GOOGLE_API_KEY;
  const originalMock = process.env.SIBI_LANGUAGE_PROPOSAL_MOCK;
  const originalFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test-key";
  delete process.env.GOOGLE_API_KEY;
  delete process.env.SIBI_LANGUAGE_PROPOSAL_MOCK;
  globalThis.fetch = async () =>
    ({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
    }) as Response;

  try {
    const response = await callLanguageProposalMiddleware(
      "/__sibi/language-proposal",
      JSON.stringify({
        selectedFilePath: "sibi/src/App.tsx",
        excerpts: [
          {
            evidenceId: "sibi/src/App.tsx:1-1:excerpt",
            filePath: "sibi/src/App.tsx",
            startLine: 1,
            endLine: 1,
            text: "UPSTREAM_SECRET_EXCERPT_SHOULD_NOT_LEAK",
          },
        ],
        evidenceIds: ["sibi/src/App.tsx:1-1:excerpt"],
      }),
    );
    const payload = JSON.parse(response.body);

    assert.equal(response.statusCode, 502);
    assert.equal(payload.code, "blocked_llm_unavailable");
    assert.equal(payload.runtimeTrace.providerId, "gemini-first");
    assert.equal(payload.runtimeTrace.model, "gemini-2.5-flash");
    assert.equal(payload.runtimeTrace.evidenceIdCount, 1);
    assert.match(payload.runtimeTrace.prompt, /Prompt omitted/);
    assert.doesNotMatch(payload.runtimeTrace.prompt, /UPSTREAM_SECRET_EXCERPT_SHOULD_NOT_LEAK|excerpts/);
    assert.equal("rawResponse" in payload.runtimeTrace, false);
  } finally {
    if (originalGeminiKey == null) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
    if (originalGoogleKey == null) delete process.env.GOOGLE_API_KEY;
    else process.env.GOOGLE_API_KEY = originalGoogleKey;
    if (originalMock == null) delete process.env.SIBI_LANGUAGE_PROPOSAL_MOCK;
    else process.env.SIBI_LANGUAGE_PROPOSAL_MOCK = originalMock;
    globalThis.fetch = originalFetch;
  }
});

test("Sibi Vite Gemini language-proposal contract does not request readiness output", async () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalGoogleKey = process.env.GOOGLE_API_KEY;
  const originalMock = process.env.SIBI_LANGUAGE_PROPOSAL_MOCK;
  const originalFetch = globalThis.fetch;
  let requestBody = null;
  process.env.GEMINI_API_KEY = "test-key";
  delete process.env.GOOGLE_API_KEY;
  delete process.env.SIBI_LANGUAGE_PROPOSAL_MOCK;
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body ?? "{}"));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    schema: "sibi-language-proposal.v1",
                    providerId: "gemini-first",
                    generatedAt: "2026-01-01T00:00:00.000Z",
                    selectedFilePath: "sibi/src/App.tsx",
                    boundaryCandidates: [],
                    reviewQueueCopy: [],
                    attemptPrompt: {
                      id: "prompt",
                      kind: "attempt_prompt",
                      text: "Use cited lines.",
                      confidence: "unverified",
                      citations: [
                        {
                          evidenceId: "sibi/src/App.tsx:1-1:excerpt",
                          filePath: "sibi/src/App.tsx",
                          startLine: 1,
                          endLine: 1,
                        },
                      ],
                    },
                    possibleGapLabels: [],
                    smallestRepairCopy: {
                      id: "repair",
                      kind: "smallest_repair",
                      text: "Read cited lines.",
                      confidence: "unverified",
                      citations: [
                        {
                          evidenceId: "sibi/src/App.tsx:1-1:excerpt",
                          filePath: "sibi/src/App.tsx",
                          startLine: 1,
                          endLine: 1,
                        },
                      ],
                    },
                  }),
                },
              ],
            },
          },
        ],
      }),
    };
  };

  try {
    const response = await callLanguageProposalMiddleware(
      "/__sibi/language-proposal",
      JSON.stringify({
        selectedFilePath: "sibi/src/App.tsx",
        excerpts: [
          {
            evidenceId: "sibi/src/App.tsx:1-1:excerpt",
            filePath: "sibi/src/App.tsx",
            startLine: 1,
            endLine: 1,
            text: "export default function App() {}",
          },
        ],
        evidenceIds: ["sibi/src/App.tsx:1-1:excerpt"],
      }),
    );
    const payload = JSON.parse(response.body);
    const responseSchema = requestBody?.generationConfig?.responseSchema;

    assert.equal(response.statusCode, 200);
    assert.equal(payload.providerId, "gemini-first");
    assert.equal("readiness" in payload, false);
    assert.equal("readiness" in responseSchema.properties, false);
    assert.equal(responseSchema.required.includes("readiness"), false);
    assert.equal(responseSchema.properties.boundaryCandidates.items.properties.kind.enum.includes("readiness"), false);
    assert.match(requestBody.contents[0].parts[0].text, /Do not include a top-level readiness field/);
  } finally {
    if (originalGeminiKey == null) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
    if (originalGoogleKey == null) delete process.env.GOOGLE_API_KEY;
    else process.env.GOOGLE_API_KEY = originalGoogleKey;
    if (originalMock == null) delete process.env.SIBI_LANGUAGE_PROPOSAL_MOCK;
    else process.env.SIBI_LANGUAGE_PROPOSAL_MOCK = originalMock;
    globalThis.fetch = originalFetch;
  }
});

test("Sibi Vite Gemini language-proposal canonicalizes citations and preserves claim text", async () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalGoogleKey = process.env.GOOGLE_API_KEY;
  const originalMock = process.env.SIBI_LANGUAGE_PROPOSAL_MOCK;
  const originalFetch = globalThis.fetch;
  let requestBody = null;
  const inventedEvidenceId = "sibi/src/App.tsx:1517-1517:excerpt";
  const validEvidenceId = "sibi/src/App.tsx:1-1:excerpt";
  const expectedBoundaryText = "This file is ready and owned.";
  const expectedAttemptText = "This boundary is ready?";
  const expectedRepairText = "Need ownership complete for this file.";

  process.env.GEMINI_API_KEY = "test-key";
  delete process.env.GOOGLE_API_KEY;
  delete process.env.SIBI_LANGUAGE_PROPOSAL_MOCK;
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body ?? "{}"));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    schema: "sibi-language-proposal.v1",
                    providerId: "gemini-first",
                    generatedAt: "2026-01-01T00:00:00.000Z",
                    selectedFilePath: "sibi/src/App.tsx",
                    boundaryCandidates: [
                      {
                        id: "boundary-boundary",
                        kind: "boundary_candidate",
                        text: "This file is ready and owned.",
                        confidence: "inferred",
                        citations: [
                          {
                            evidenceId: inventedEvidenceId,
                            filePath: "sibi/src/App.tsx",
                            startLine: 1,
                            endLine: 1,
                            symbol: "MissingSymbol",
                          },
                          {
                            evidenceId: validEvidenceId,
                            filePath: "sibi/src/App.tsx",
                            startLine: 1,
                            endLine: 1,
                            symbol: "App",
                          },
                        ],
                      },
                    ],
                    reviewQueueCopy: [],
                    attemptPrompt: {
                      id: "attempt",
                      kind: "attempt_prompt",
                      text: "This boundary is ready?",
                      confidence: "unverified",
                      citations: [
                        {
                          evidenceId: inventedEvidenceId,
                          filePath: "sibi/src/App.tsx",
                          startLine: 1517,
                          endLine: 1517,
                          symbol: "MissingSymbol",
                        },
                        {
                          evidenceId: validEvidenceId,
                          filePath: "sibi/src/App.tsx",
                          startLine: 1,
                          endLine: 1,
                          symbol: "App",
                        },
                      ],
                    },
                    possibleGapLabels: [],
                    smallestRepairCopy: {
                      id: "repair",
                      kind: "smallest_repair",
                      text: "Need ownership complete for this file.",
                      confidence: "inferred",
                      citations: [
                        {
                          evidenceId: inventedEvidenceId,
                          filePath: "sibi/src/App.tsx",
                          startLine: 1517,
                          endLine: 1517,
                          symbol: "MissingSymbol",
                        },
                        {
                          evidenceId: validEvidenceId,
                          filePath: "sibi/src/App.tsx",
                          startLine: 1,
                          endLine: 1,
                          symbol: "App",
                        },
                      ],
                    },
                  }),
                },
              ],
            },
          },
        ],
      }),
    };
  };

  try {
    const response = await callLanguageProposalMiddleware(
      "/__sibi/language-proposal",
      JSON.stringify({
        selectedFilePath: "sibi/src/App.tsx",
        excerpts: [
          {
            evidenceId: validEvidenceId,
            filePath: "sibi/src/App.tsx",
            startLine: 1,
            endLine: 1,
            text: "export default function App() {}",
          },
        ],
        evidenceIds: [inventedEvidenceId, validEvidenceId],
      }),
    );
    const payload = JSON.parse(response.body);
    const proposalPrompt = requestBody.contents[0].parts[0].text;
    const stepArchitecture = proposalPrompt.indexOf("repository architecture");
    const stepFileRole = proposalPrompt.indexOf("selected-file role");
    const stepFocusedBlock = proposalPrompt.indexOf("focused block/symbol/range");
    const stepRepair = proposalPrompt.indexOf("first repair/refactor");

    assert.equal(response.statusCode, 200);
    assert.match(proposalPrompt, /attemptPrompt\.text must be a question or short defense instruction/i);
    assert.match(
      proposalPrompt,
      /step-by-step ownership discovery|repository architecture|selected-file role|focused block\/symbol\/range|first repair\/refactor/i,
    );
    assert.match(
      proposalPrompt,
      /at least one citation from the selected file/i,
    );
    assert.doesNotMatch(
      proposalPrompt,
      /Considering this is (a )?(TypeScript|React) project/i,
    );
    assert.ok(stepArchitecture >= 0, "prompt includes architecture step");
    assert.ok(stepFileRole >= 0, "prompt includes selected-file role step");
    assert.ok(stepFocusedBlock >= 0, "prompt includes focused block step");
    assert.ok(stepRepair >= 0, "prompt includes repair/refactor gate step");
    assert.ok(
      stepArchitecture < stepFileRole && stepFileRole < stepFocusedBlock && stepFocusedBlock < stepRepair,
      "ownership questions should follow architecture -> file role -> focused block -> repair order",
    );
    assert.equal(payload.attemptPrompt.text, expectedAttemptText);
    assert.equal(payload.boundaryCandidates[0].text, expectedBoundaryText);
    assert.equal(payload.smallestRepairCopy.text, expectedRepairText);

    assert.equal(payload.attemptPrompt.citations.length, 1);
    assert.equal(payload.attemptPrompt.citations[0].evidenceId, validEvidenceId);
    assert.equal(payload.attemptPrompt.citations[0].filePath, "sibi/src/App.tsx");
    assert.equal(payload.attemptPrompt.citations[0].startLine, 1);
    assert.equal(payload.attemptPrompt.citations[0].endLine, 1);
    assert.equal("symbol" in payload.attemptPrompt.citations[0], false);

    assert.equal(payload.boundaryCandidates[0].citations.length, 1);
    assert.equal(payload.boundaryCandidates[0].citations[0].evidenceId, validEvidenceId);
    assert.equal(payload.smallestRepairCopy.citations.length, 1);
    assert.equal(payload.smallestRepairCopy.citations[0].evidenceId, validEvidenceId);
    assert.equal("symbol" in payload.boundaryCandidates[0].citations[0], false);
    assert.equal("symbol" in payload.smallestRepairCopy.citations[0], false);
    assert.ok(payload.attemptPrompt.text.includes("?"));
  } finally {
    if (originalGeminiKey == null) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
    if (originalGoogleKey == null) delete process.env.GOOGLE_API_KEY;
    else process.env.GOOGLE_API_KEY = originalGoogleKey;
    if (originalMock == null) delete process.env.SIBI_LANGUAGE_PROPOSAL_MOCK;
    else process.env.SIBI_LANGUAGE_PROPOSAL_MOCK = originalMock;
    globalThis.fetch = originalFetch;
  }
});

test("Sibi Vite language-proposal mock cites real evidence ids from the request", async () => {
  const originalMock = process.env.SIBI_LANGUAGE_PROPOSAL_MOCK;
  process.env.SIBI_LANGUAGE_PROPOSAL_MOCK = "1";
  const evidencePack = {
    selectedFilePath: "sibi/src/App.tsx",
    excerpts: [
      {
        evidenceId: "sibi/src/App.tsx:1-3:excerpt",
        filePath: "sibi/src/App.tsx",
        startLine: 1,
        endLine: 3,
        text: "export default function App() {}",
      },
    ],
    evidenceIds: ["sibi/src/App.tsx:1-3:excerpt"],
  };

  try {
    const response = await callLanguageProposalMiddleware(
      "/__sibi/language-proposal",
      JSON.stringify(evidencePack),
    );
    const payload = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(payload.schema, "sibi-language-proposal.v1");
    assert.equal(payload.providerId, "sibi-test-mock");
    assert.equal(payload.selectedFilePath, "sibi/src/App.tsx");
    assert.equal(payload.attemptPrompt.kind, "attempt_prompt");
    assert.equal(payload.attemptPrompt.citations[0].evidenceId, "sibi/src/App.tsx:1-3:excerpt");
    assert.equal("readiness" in payload, false);
  } finally {
    if (originalMock == null) delete process.env.SIBI_LANGUAGE_PROPOSAL_MOCK;
    else process.env.SIBI_LANGUAGE_PROPOSAL_MOCK = originalMock;
  }
});

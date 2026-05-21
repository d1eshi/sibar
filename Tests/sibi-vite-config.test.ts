import test from "node:test";
import assert from "node:assert/strict";
import sibiViteConfig, { isPierreModuleLevelDirectiveWarning } from "../sibi/vite.config.js";

const pierreDirectiveMessage =
  'Module level directives cause errors when bundled, "use client" in "node_modules/.pnpm/@pierre+trees@1.0.0/node_modules/@pierre/trees/dist/react/FileTree.js" was ignored.';

test("Sibi Vite warning filter only suppresses @pierre use-client module directives", () => {
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
    "unrelated @pierre warnings should remain visible",
  );
});

test("Sibi Vite onwarn forwards warnings outside the @pierre directive filter", () => {
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

  assert.equal(forwardedWarnings.length, 1, "@pierre use-client directive warnings should be filtered");
});

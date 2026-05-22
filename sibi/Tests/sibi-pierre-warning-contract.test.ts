import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { ALLOWED_PIERRE_USE_CLIENT_REACT_FILES } from "../vite.config.js";

test("Sibi build does not silently widen @pierre module-level directive warnings (contract is explicit + chunk warnings remain visible)", () => {
  const traceFile = join(os.tmpdir(), `sibi-pierre-warning-trace-${process.pid}.txt`);
  rmSync(traceFile, { force: true });

  const result = spawnSync("pnpm", ["-s", "sibi:build"], {
    env: {
      ...process.env,
      FORCE_COLOR: "0",
      SIBI_PIERRE_WARNING_TRACE_FILE: traceFile,
    },
    encoding: "utf8",
  });

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  assert.equal(result.status, 0, output);

  assert.match(
    output,
    /Some chunks are larger than 500 kB after minification/,
    "chunk-size warnings must not be hidden by the @pierre warning contract",
  );

  const observed = readFileSync(traceFile, "utf8")
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const uniqueObserved = [...new Set(observed)].sort();
  const allowedSorted = [...ALLOWED_PIERRE_USE_CLIENT_REACT_FILES].sort();

  assert.deepEqual(
    uniqueObserved,
    allowedSorted,
    "New @pierre directive warning sources require tightening the bundle boundary, not widening a warning filter",
  );
});

/**
 * Tests for the supply-chain guard.
 *
 * Verifies forbidden pattern detection and guard scan surface behavior.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
  checkDlxLine,
  checkFilePatterns,
  checkLockfileGuidance,
  checkPackageJsonScripts,
  FORBIDDEN_PATTERNS,
  BASELINE_DEV_DEPENDENCIES,
  BASELINE_DEPENDENCIES,
  REPO_ROOT,
  runGuard,
  SCAN_FILES,
  checkDemoFiles,
} from "../src/scripts/guard-supply-chain.ts";

function tempFile(content: string, ext = ".md"): string {
  const dir = mkdtempSync(join(tmpdir(), "sibar-guard-test-"));
  const file = join(dir, `test${ext}`);
  writeFileSync(file, content, "utf8");
  return file;
}

function cleanupTempFile(filePath: string): void {
  const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // best effort cleanup in tests
  }
}

// ---------------------------------------------------------------------------
// checkDlxLine tests
// ---------------------------------------------------------------------------

test("checkDlxLine rejects all dlx packages", () => {
  assert.equal(checkDlxLine("pnpm dlx prototype-tool@1.0.0 some-file.html"), true);
  assert.equal(checkDlxLine("Review with `pnpm dlx local-review-tool@1.0.0`"), true);
});

test("checkDlxLine rejects other dlx packages", () => {
  assert.equal(checkDlxLine("pnpm dlx some-other-tool"), true);
  assert.equal(checkDlxLine("pnpm dlx create-react-app"), true);
});

test("checkDlxLine is clean for lines without dlx", () => {
  assert.equal(checkDlxLine("pnpm run test"), false);
  assert.equal(checkDlxLine("just some text"), false);
});

// ---------------------------------------------------------------------------
// checkFilePatterns tests
// ---------------------------------------------------------------------------

test("checkFilePatterns detects npm command", () => {
  const file = tempFile("Run `npm run test` to verify.");
  const violations = checkFilePatterns(file);
  cleanupTempFile(file);
  assert.ok(violations.some((v) => v.pattern === "npm command"));
});

test("checkFilePatterns detects npm ci command", () => {
  const file = tempFile("Run `npm ci` when lockfile is needed.");
  const violations = checkFilePatterns(file);
  cleanupTempFile(file);
  assert.ok(violations.some((v) => v.pattern === "npm command"));
});

test("checkFilePatterns detects plain rm command", () => {
  const file = tempFile("Cleanup: rm ./tmp.");
  const violations = checkFilePatterns(file);
  cleanupTempFile(file);
  assert.ok(violations.some((v) => v.pattern === "destructive rm"));
});

test("checkFilePatterns detects rm -f command", () => {
  const file = tempFile("Cleanup: rm -f ./tmp-file.");
  const violations = checkFilePatterns(file);
  cleanupTempFile(file);
  assert.ok(violations.some((v) => v.pattern === "destructive rm"));
});

test("checkFilePatterns detects combined rm flag variants", () => {
  for (const command of ["rm -fr ./tmp", "rm -rfv ./tmp", "rm -rvf ./tmp"]) {
    const file = tempFile(`Cleanup: ${command}.`);
    const violations = checkFilePatterns(file);
    cleanupTempFile(file);
    assert.ok(
      violations.some((v) => v.pattern === "destructive rm"),
      `Expected destructive rm violation for ${command}`,
    );
  }
});

test("checkFilePatterns detects npx command", () => {
  const file = tempFile("Use `npx tsc --noEmit` to typecheck.");
  const violations = checkFilePatterns(file);
  cleanupTempFile(file);
  assert.ok(violations.some((v) => v.pattern === "npx command"));
});

test("checkFilePatterns detects package-lock.json reliance", () => {
  const file = tempFile("Run npm install to generate package-lock.json.");
  const violations = checkFilePatterns(file);
  cleanupTempFile(file);
  assert.ok(violations.some((v) => v.pattern === "package-lock reliance"));
});

test("checkFilePatterns detects package-lock shorthand", () => {
  const file = tempFile("Check the package-lock before committing.");
  const violations = checkFilePatterns(file);
  cleanupTempFile(file);
  assert.ok(violations.some((v) => v.pattern === "package-lock reliance"));
});

test("checkFilePatterns detects destructive rm -rf", () => {
  const file = tempFile("Clean up with rm -rf ./temp.");
  const violations = checkFilePatterns(file);
  cleanupTempFile(file);
  assert.ok(violations.some((v) => v.pattern === "destructive rm -rf"));
});

test("checkFilePatterns detects destructive rm -r", () => {
  const file = tempFile("Use rm -r to remove the directory.");
  const violations = checkFilePatterns(file);
  cleanupTempFile(file);
  assert.ok(violations.some((v) => v.pattern === "destructive rm -r"));
});

test("checkFilePatterns detects rmdir", () => {
  const file = tempFile("Clean up with rmdir ./build.");
  const violations = checkFilePatterns(file);
  cleanupTempFile(file);
  assert.ok(violations.some((v) => v.pattern === "destructive rmdir"));
});

test("checkFilePatterns detects remote CDN script", () => {
  const file = tempFile('<script src="https://cdn.example.com/lib.js"></script>', ".html");
  const violations = checkFilePatterns(file);
  cleanupTempFile(file);
  assert.ok(violations.some((v) => v.pattern === "remote CDN script"));
});

test("checkFilePatterns detects remote stylesheet", () => {
  const file = tempFile('<link rel="stylesheet" href="https://cdn.example.com/style.css">', ".html");
  const violations = checkFilePatterns(file);
  cleanupTempFile(file);
  assert.ok(violations.some((v) => v.pattern === "remote stylesheet"));
});

test("checkFilePatterns detects Google Fonts", () => {
  const file = tempFile("https://fonts.googleapis.com/css2?family=Roboto", ".html");
  const violations = checkFilePatterns(file);
  cleanupTempFile(file);
  assert.ok(violations.some((v) => v.pattern === "remote font"));
});

test("checkFilePatterns detects unpinned dlx", () => {
  const file = tempFile("Run pnpm dlx some-tool to do stuff.");
  const violations = checkFilePatterns(file);
  cleanupTempFile(file);
  assert.ok(violations.some((v) => v.pattern === "unpinned or unauthorized dlx"));
});

test("checkFilePatterns is clean for pnpm commands", () => {
  const file = tempFile("Run `pnpm run test` and `pnpm exec tsc --noEmit`.");
  const violations = checkFilePatterns(file);
  cleanupTempFile(file);
  assert.equal(violations.length, 0);
});

test("checkFilePatterns rejects pinned dlx", () => {
  const file = tempFile("Optional: pnpm dlx prototype-tool@1.0.0 prototype.html");
  const violations = checkFilePatterns(file);
  cleanupTempFile(file);
  assert.ok(violations.some((v) => v.pattern === "unpinned or unauthorized dlx"));
});

test("checkFilePatterns returns empty for a clean file", () => {
  const file = tempFile("This file has no violations.\\npnpm run build is fine.");
  const violations = checkFilePatterns(file);
  cleanupTempFile(file);
  assert.equal(violations.length, 0);
});

// ---------------------------------------------------------------------------
// Real repository checks (integration)
// ---------------------------------------------------------------------------

test("guard scan surface includes mission-relevant docs", () => {
  const surface = [
    "docs/specs/README.md",
    "docs/specs/selfhost/00_spec_audit_matrix.md",
    "docs/specs/selfhost/01_selfhost_boundary.md",
    "docs/specs/selfhost/02_evaluation_contract.md",
    "docs/specs/selfhost/03_product_improvement_loop.md",
    "docs/specs/selfhost/04_selfhost_gap_detection_benchmark.md",
    "docs/specs/selfhost/05_public_demo_prototype.md",
    "docs/iterations/README.md",
    "docs/iterations/01_typescript_runtime_port.md",
    "docs/iterations/03_swift_bridge_candidate_audit.md",
    "docs/triage/iteration-spec-adaptation.md",
    "docs/triage/standalone-swift-app-audit.md",
    "docs/triage/swift-bridge-candidate-audit.md",
    "docs/triage/source-triage.md",
  ];
  for (const path of surface) {
    assert.ok(SCAN_FILES.includes(path), `Missing from scan surface: ${path}`);
  }
});

test("guard demo scan passes with no violations", () => {
  const violations = checkDemoFiles();
  assert.equal(
    violations.length,
    0,
    `Demo files have violations: ${JSON.stringify(violations)}`,
  );
});

test("guard passes against scanned docs and specs", () => {
  const scannedFiles = SCAN_FILES;
  for (const relPath of scannedFiles) {
    const violations = checkFilePatterns(resolve(REPO_ROOT, relPath));
    assert.equal(
      violations.length,
      0,
      `Found violations in ${relPath}: ${JSON.stringify(violations)}`,
    );
  }
});

test("guard passes against current package.json scripts", () => {
  const violations = checkPackageJsonScripts();
  assert.equal(violations.length, 0, `Found package script violations: ${JSON.stringify(violations)}`);
});

test("pnpm-lock.yaml exists and package.json declares pnpm packageManager", () => {
  const violations = checkLockfileGuidance();
  assert.equal(violations.length, 0, `Lockfile guidance violations: ${JSON.stringify(violations)}`);
});

test("full guard run returns no violations", () => {
  const { violations, exitCode } = runGuard();
  assert.equal(exitCode, 0, `Guard failed with violations: ${JSON.stringify(violations, null, 2)}`);
  assert.equal(violations.length, 0);
});

// ---------------------------------------------------------------------------
// Package baseline checks
// ---------------------------------------------------------------------------

test("BASELINE_DEV_DEPENDENCIES contains expected packages", () => {
  assert.ok(BASELINE_DEV_DEPENDENCIES.has("@playwright/test"));
  assert.ok(BASELINE_DEV_DEPENDENCIES.has("@types/node"));
  assert.ok(BASELINE_DEV_DEPENDENCIES.has("@types/react"));
  assert.ok(BASELINE_DEV_DEPENDENCIES.has("@types/react-dom"));
  assert.ok(BASELINE_DEV_DEPENDENCIES.has("typescript"));
  assert.ok(BASELINE_DEV_DEPENDENCIES.has("vite"));
});

test("BASELINE_DEPENDENCIES contains expected packages", () => {
  assert.ok(BASELINE_DEPENDENCIES.has("@pierre/diffs"));
  assert.ok(BASELINE_DEPENDENCIES.has("@pierre/trees"));
  assert.ok(BASELINE_DEPENDENCIES.has("react"));
  assert.ok(BASELINE_DEPENDENCIES.has("react-dom"));
});

test("FORBIDDEN_PATTERNS covers all required categories", () => {
  const labels = FORBIDDEN_PATTERNS.map((p) => p.label);
  assert.ok(labels.includes("npm command"), "missing npm command pattern");
  assert.ok(labels.includes("npx command"), "missing npx pattern");
  assert.ok(labels.includes("package-lock reliance"), "missing package-lock pattern");
  assert.ok(labels.includes("destructive rm"), "missing plain rm pattern");
  assert.ok(labels.includes("destructive rm -rf"), "missing rm -rf pattern");
  assert.ok(labels.includes("destructive rm -r"), "missing rm -r pattern");
  assert.ok(labels.includes("destructive rmdir"), "missing rmdir pattern");
  assert.ok(labels.includes("remote CDN script"), "missing CDN script pattern");
  assert.ok(labels.includes("remote stylesheet"), "missing stylesheet pattern");
  assert.ok(labels.includes("remote font"), "missing Google Fonts pattern");
});

test("BASELINE_DEV_DEPENDENCIES contains expected packages", () => {
  assert.ok(BASELINE_DEV_DEPENDENCIES.has("@playwright/test"));
  assert.ok(BASELINE_DEV_DEPENDENCIES.has("@types/node"));
  assert.ok(BASELINE_DEV_DEPENDENCIES.has("@types/react"));
  assert.ok(BASELINE_DEV_DEPENDENCIES.has("@types/react-dom"));
  assert.ok(BASELINE_DEV_DEPENDENCIES.has("typescript"));
  assert.ok(BASELINE_DEV_DEPENDENCIES.has("vite"));
});

test("BASELINE_DEPENDENCIES contains expected packages", () => {
  assert.ok(BASELINE_DEPENDENCIES.has("@pierre/diffs"));
  assert.ok(BASELINE_DEPENDENCIES.has("@pierre/trees"));
  assert.ok(BASELINE_DEPENDENCIES.has("react"));
  assert.ok(BASELINE_DEPENDENCIES.has("react-dom"));
});

// ---------------------------------------------------------------------------
// FORBIDDEN_PATTERNS completeness check
// ---------------------------------------------------------------------------

test("FORBIDDEN_PATTERNS covers all required categories", () => {
  const labels = FORBIDDEN_PATTERNS.map((p) => p.label);
  assert.ok(labels.includes("npm command"), "missing npm command pattern");
  assert.ok(labels.includes("npx command"), "missing npx command pattern");
  assert.ok(labels.includes("package-lock reliance"), "missing package-lock pattern");
  assert.ok(labels.includes("destructive rm"), "missing plain rm pattern");
  assert.ok(labels.includes("destructive rm -rf"), "missing rm -rf pattern");
  assert.ok(labels.includes("destructive rm -r"), "missing rm -r pattern");
  assert.ok(labels.includes("destructive rmdir"), "missing rmdir pattern");
  assert.ok(labels.includes("remote CDN script"), "missing CDN script pattern");
  assert.ok(labels.includes("remote stylesheet"), "missing stylesheet pattern");
  assert.ok(labels.includes("remote font"), "missing Google Fonts pattern");
});

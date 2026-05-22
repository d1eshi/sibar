import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

import { assertArtifactAllowsPath } from "../../runtime-artifact-session.ts";
import { RuntimeError, type ArtifactSession, type EvidenceCitation } from "../../runtime-support.ts";
import type { BoundaryObservation, EvalCase } from "./types.ts";

export type MaterializedFixture = {
  root: string;
  cleanupRoot: string;
};

function isWithinRoot(candidatePath: string, root: string): boolean {
  const normalizedRoot = resolve(root);
  const normalizedCandidate = resolve(candidatePath);
  return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}/`);
}

function ensureFile(root: string, relativePath: string, content: string): void {
  const path = resolve(root, relativePath);
  if (!isWithinRoot(path, root)) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

export function materializeFixture(testCase: EvalCase): MaterializedFixture {
  const cleanupRoot = join(resolve("."), `.sibi-eval-tmp-${testCase.id}-${randomUUID()}`);
  const root = join(cleanupRoot, "artifact-root");
  mkdirSync(root, { recursive: true });
  const paths = new Set([
    ...testCase.artifact_boundary.included_paths,
    ...testCase.artifact_boundary.excluded_paths,
    ...testCase.required_evidence.map((entry) => entry.path),
    ...testCase.forbidden_evidence.map((entry) => entry.path),
  ]);

  for (const path of paths) {
    ensureFile(root, path, [
      `// ${testCase.id}`,
      "export function handleRequest(request: { command: string; payload?: unknown }) { return request.command; }",
      "export function readState() { return {}; }",
      "export function writeState(value: unknown) { return value; }",
      "export function generatePracticeChallenge() { return 'gap practice evidence'; }",
      "export function buildReadinessEvidenceIndex() { return 'evidence ids required'; }",
      "test('runtime expectation', () => assert.ok(true));",
    ].join("\n"));
  }
  return { root, cleanupRoot };
}

export function evidenceFor(testCase: EvalCase, root: string): EvidenceCitation[] {
  const source = testCase.required_evidence.length > 0
    ? testCase.required_evidence
    : [{ path: testCase.artifact_boundary.included_paths[0] ?? "engine/runtime.ts", range: "fixture", expectation: "fixture" }];
  return source.slice(0, 3).map((entry, index) => ({
    file_path: resolve(root, entry.path),
    start_line: index + 1,
    end_line: index + 1,
    excerpt: `${entry.range}: ${entry.expectation}`,
  }));
}

export function createBoundaryObservation(testCase: EvalCase, artifactSession: ArtifactSession): BoundaryObservation {
  const accepted_paths: string[] = [];
  const rejected_paths: string[] = [];
  const rejection_reasons: string[] = [];

  for (const entry of testCase.required_evidence) {
    accepted_paths.push(assertArtifactAllowsPath(entry.path, artifactSession));
  }
  for (const entry of testCase.forbidden_evidence) {
    try {
      assertArtifactAllowsPath(entry.path, artifactSession);
    } catch (error) {
      rejected_paths.push(entry.path);
      rejection_reasons.push(error instanceof RuntimeError ? normalizeReason(error.code) : "unknown_boundary_error");
    }
  }

  return { accepted_paths, rejected_paths, rejection_reasons };
}

function normalizeReason(code: string): string {
  if (code === "outside_artifact") return "outside_artifact_boundary";
  if (code === "excluded_artifact_path") return "excluded_path";
  return code;
}

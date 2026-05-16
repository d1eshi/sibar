import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  assessReadOnlyCommandMutation,
  createReadOnlyCommandEvidence,
  previewWorkspaceCommand,
  writeStudyArtifact,
  type ArtifactBoundary,
  type EvidenceRef,
} from "../src/runtime-deep-ownership.ts";

function makeBoundary(rootPath: string): ArtifactBoundary {
  return {
    root_path: rootPath,
    source_type: "repository",
    included_sources: ["src", "Tests", ".sibi/artifacts"],
    excluded_sources: ["node_modules/**", "dist/**"],
    evidence_roles: ["source_truth", "behavior_oracle", "implementation", "interface", "unknown"],
    entrypoints: ["src/runtime-deep-ownership.ts"],
    tests_as_oracles: ["Tests/deep-ownership-command-safety.test.ts"],
  };
}

function makeEvidenceRef(path: string): EvidenceRef {
  return {
    evidence_id: "EV-001",
    file_path: path,
    start_line: 1,
    end_line: 5,
    excerpt: "Command safety evidence excerpt",
    role: "implementation",
  };
}

describe("VAL-CMD-001: Read-only commands become evidence", () => {
  test("createReadOnlyCommandEvidence stores command metadata, exit status, and output refs", () => {
    const boundary = makeBoundary("/repo");
    const preview = previewWorkspaceCommand({
      id: "CMD-PREVIEW-READ-001",
      command: "pnpm test -- Tests/runtime-core.test.ts",
      cwd: "src",
      safety_level: "read_only",
      expected_outputs: ["test_report"],
      write_scope: "none",
      boundary,
      root_path: "/repo",
      created_at: "2026-05-16T08:00:00.000Z",
    });

    const evidence = createReadOnlyCommandEvidence({
      id: "CMD-EVIDENCE-READ-001",
      preview,
      exit_status: 0,
      stdout: "✔ tests passed\n2 passing",
      stderr: "",
      created_at: "2026-05-16T08:00:05.000Z",
    });

    assert.equal(evidence.command, "pnpm test -- Tests/runtime-core.test.ts");
    assert.equal(evidence.cwd, "src");
    assert.equal(evidence.timestamp, "2026-05-16T08:00:05.000Z");
    assert.equal(evidence.exit_status, 0);
    assert.equal(evidence.output_refs.length, 1);
    assert.equal(evidence.output_refs[0].stream, "stdout");
    assert.match(evidence.output_refs[0].content_hash, /^sha256:/);
    assert.equal(evidence.accepted_as_read_only_evidence, true);
  });
});

describe("VAL-CMD-006 / VAL-TRUST-002: Command previews and unsafe defaults", () => {
  test("pre-run preview exposes safety level, expected outputs, write scope, and blocks out-of-scope cwd", () => {
    const boundary = makeBoundary("/repo");
    const inScope = previewWorkspaceCommand({
      command: "rg \"readiness\" src",
      cwd: "src",
      safety_level: "read_only",
      expected_outputs: ["matches"],
      write_scope: "none",
      boundary,
      root_path: "/repo",
      created_at: "2026-05-16T08:10:00.000Z",
    });
    assert.equal(inScope.safety_level, "read_only");
    assert.deepEqual(inScope.expected_outputs, ["matches"]);
    assert.equal(inScope.write_scope, "none");
    assert.equal(inScope.blocked, false);

    const outOfScope = previewWorkspaceCommand({
      command: "rg \"secret\" ../private",
      cwd: "../private",
      safety_level: "read_only",
      expected_outputs: ["matches"],
      write_scope: "none",
      boundary,
      root_path: "/repo",
      created_at: "2026-05-16T08:10:05.000Z",
    });
    assert.equal(outOfScope.blocked, true);
    assert.equal(outOfScope.boundary_status, "out_of_scope");
    assert.match(outOfScope.blocked_reason ?? "", /traversal|escapes/i);
  });

  test("unsafe operations are blocked by default with explicit reasons", () => {
    const boundary = makeBoundary("/repo");

    const destructive = previewWorkspaceCommand({
      command: "git reset --hard HEAD~1",
      cwd: "src",
      safety_level: "destructive",
      expected_outputs: ["git_state"],
      write_scope: "product_workspace",
      boundary,
      root_path: "/repo",
      created_at: "2026-05-16T08:11:00.000Z",
    });
    assert.equal(destructive.blocked, true);
    assert.match(destructive.blocked_reason ?? "", /blocked by default/i);

    const dependencyInstall = previewWorkspaceCommand({
      command: "pnpm install",
      cwd: "src",
      safety_level: "read_only",
      expected_outputs: ["dependency_update"],
      write_scope: "none",
      boundary,
      root_path: "/repo",
      created_at: "2026-05-16T08:11:05.000Z",
    });
    assert.equal(dependencyInstall.blocked, true);
    assert.match(dependencyInstall.blocked_reason ?? "", /dependency installation/i);
  });
});

describe("VAL-CMD-004: Read-only commands do not mutate product files", () => {
  test("read-only mutation is marked as a safety violation and not accepted as evidence", () => {
    const boundary = makeBoundary("/repo");
    const preview = previewWorkspaceCommand({
      command: "rg \"runtime\" src",
      cwd: "src",
      safety_level: "read_only",
      expected_outputs: ["matches"],
      write_scope: "none",
      boundary,
      root_path: "/repo",
      created_at: "2026-05-16T08:20:00.000Z",
    });

    const mutation = assessReadOnlyCommandMutation(preview, ["src/runtime-deep-ownership.ts"]);
    assert.equal(mutation.violated, true);
    assert.equal(mutation.blocked, true);
    assert.deepEqual(mutation.mutated_paths, ["src/runtime-deep-ownership.ts"]);

    const evidence = createReadOnlyCommandEvidence({
      preview,
      exit_status: 0,
      stdout: "found 4 matches",
      stderr: "",
      mutation_assessment: mutation,
      created_at: "2026-05-16T08:20:05.000Z",
    });
    assert.equal(evidence.accepted_as_read_only_evidence, false);
    assert.match(evidence.safety_violation_reason ?? "", /mutated files/i);
  });
});

describe("VAL-CMD-002 / VAL-CMD-008: Study artifacts stay isolated and path-safe", () => {
  test("study artifacts are marked study-only, cite source evidence, and do not overlap product paths", () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "sibar-study-safety-"));
    const productSrc = join(workspaceRoot, "src");
    const studyDir = join(workspaceRoot, ".sibi", "artifacts");
    mkdirSync(productSrc, { recursive: true });
    mkdirSync(studyDir, { recursive: true });

    const productFile = join(productSrc, "runtime.ts");
    writeFileSync(productFile, "export const runtime = true;\n", "utf8");

    const writeResult = writeStudyArtifact({
      id: "STUDY-001",
      artifact_path: "scratch/trace.md",
      study_directory: studyDir,
      content: "trace notes",
      source_evidence: [makeEvidenceRef("src/runtime.ts")],
      product_paths: [productSrc],
      created_at: "2026-05-16T08:30:00.000Z",
    });

    assert.equal(writeResult.blocked, false);
    assert.ok(writeResult.record);
    assert.equal(writeResult.record?.study_only, true);
    assert.equal(writeResult.record?.study_directory, realpathSync(studyDir));
    assert.deepEqual(writeResult.record?.cited_evidence_ids, ["EV-001"]);
    assert.equal(readFileSync(writeResult.record!.canonical_path, "utf8"), "trace notes");
    assert.equal(readFileSync(productFile, "utf8"), "export const runtime = true;\n");
  });

  test("canonicalized study paths block traversal, absolute escapes, and symlink escapes", () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "sibar-study-escape-"));
    const studyDir = join(workspaceRoot, ".sibi", "artifacts");
    mkdirSync(studyDir, { recursive: true });

    const traversal = writeStudyArtifact({
      artifact_path: "../outside.md",
      study_directory: studyDir,
      content: "bad",
      source_evidence: [makeEvidenceRef("src/runtime.ts")],
      created_at: "2026-05-16T08:31:00.000Z",
    });
    assert.equal(traversal.blocked, true);
    assert.match(traversal.violation_reason ?? "", /traversal|escapes/i);

    const outsideFile = join(mkdtempSync(join(tmpdir(), "sibar-study-outside-")), "outside.md");
    writeFileSync(outsideFile, "outside", "utf8");
    const absoluteEscape = writeStudyArtifact({
      artifact_path: outsideFile,
      study_directory: studyDir,
      content: "bad",
      source_evidence: [makeEvidenceRef("src/runtime.ts")],
      created_at: "2026-05-16T08:31:05.000Z",
    });
    assert.equal(absoluteEscape.blocked, true);
    assert.match(absoluteEscape.violation_reason ?? "", /escapes/i);

    const outsideDir = mkdtempSync(join(tmpdir(), "sibar-study-symlink-target-"));
    const linkPath = join(studyDir, "symlink-out");
    symlinkSync(outsideDir, linkPath);
    const symlinkEscape = writeStudyArtifact({
      artifact_path: "symlink-out/escape.md",
      study_directory: studyDir,
      content: "bad",
      source_evidence: [makeEvidenceRef("src/runtime.ts")],
      created_at: "2026-05-16T08:31:10.000Z",
    });
    assert.equal(symlinkEscape.blocked, true);
    assert.match(symlinkEscape.violation_reason ?? "", /symlink|escapes/i);
  });
});

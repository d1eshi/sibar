import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
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
    tests_as_oracles: ["Tests/deep-ownership-command-evidence-safety-ids.test.ts"],
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

describe("read-only command evidence safety acceptance", () => {
  test("rejects non-read-only previews as read-only evidence", () => {
    const boundary = makeBoundary("/repo");
    const nonReadOnlyPreview = previewWorkspaceCommand({
      command: "node scripts/generate-study-artifact.js",
      cwd: "src",
      safety_level: "study_write",
      expected_outputs: ["study_artifact"],
      write_scope: "study_artifacts_only",
      boundary,
      root_path: "/repo",
      created_at: "2026-05-16T10:00:00.000Z",
      explicit_override: true,
    });
    assert.equal(nonReadOnlyPreview.blocked, false);

    const evidence = createReadOnlyCommandEvidence({
      preview: nonReadOnlyPreview,
      exit_status: 0,
      stdout: "created artifact",
      stderr: "",
      created_at: "2026-05-16T10:00:05.000Z",
    });

    assert.equal(evidence.accepted_as_read_only_evidence, false);
    assert.match(
      evidence.safety_violation_reason ?? "",
      /read-only command evidence requires preview\.safety_level='read_only'/i,
    );
  });

  test("rejects previews with write scopes even when not marked blocked", () => {
    const boundary = makeBoundary("/repo");
    const readOnlyPreview = previewWorkspaceCommand({
      command: "rg \"runtime\" src",
      cwd: "src",
      safety_level: "read_only",
      expected_outputs: ["matches"],
      write_scope: "none",
      boundary,
      root_path: "/repo",
      created_at: "2026-05-16T10:10:00.000Z",
      explicit_override: true,
    });

    const forgedWriteScopePreview = {
      ...readOnlyPreview,
      write_scope: "study_artifacts_only" as const,
      blocked: false,
      blocked_reason: null,
    };

    const evidence = createReadOnlyCommandEvidence({
      preview: forgedWriteScopePreview,
      exit_status: 0,
      stdout: "runtime-deep-ownership.ts:42",
      stderr: "",
      created_at: "2026-05-16T10:10:05.000Z",
    });

    assert.equal(evidence.accepted_as_read_only_evidence, false);
    assert.match(
      evidence.safety_violation_reason ?? "",
      /read-only command evidence requires preview\.write_scope='none'/i,
    );
  });
});

describe("default command and study artifact IDs", () => {
  test("previewWorkspaceCommand default ids are unique across repeated calls", () => {
    const boundary = makeBoundary("/repo");
    const first = previewWorkspaceCommand({
      command: "rg \"readiness\" src",
      cwd: "src",
      safety_level: "read_only",
      expected_outputs: ["matches"],
      write_scope: "none",
      boundary,
      root_path: "/repo",
      created_at: "2026-05-16T10:20:00.000Z",
      explicit_override: true,
    });
    const second = previewWorkspaceCommand({
      command: "rg \"readiness\" src",
      cwd: "src",
      safety_level: "read_only",
      expected_outputs: ["matches"],
      write_scope: "none",
      boundary,
      root_path: "/repo",
      created_at: "2026-05-16T10:20:00.000Z",
      explicit_override: true,
    });

    assert.notEqual(first.id, second.id);
    assert.match(first.id, /^CMD-PREVIEW-/);
    assert.match(second.id, /^CMD-PREVIEW-/);
  });

  test("createReadOnlyCommandEvidence default ids are unique across repeated calls", () => {
    const boundary = makeBoundary("/repo");
    const preview = previewWorkspaceCommand({
      command: "pnpm test -- Tests/runtime-core.test.ts",
      cwd: "src",
      safety_level: "read_only",
      expected_outputs: ["test_report"],
      write_scope: "none",
      boundary,
      root_path: "/repo",
      created_at: "2026-05-16T10:30:00.000Z",
      explicit_override: true,
    });

    const first = createReadOnlyCommandEvidence({
      preview,
      exit_status: 0,
      stdout: "ok",
      stderr: "",
      created_at: "2026-05-16T10:30:05.000Z",
    });
    const second = createReadOnlyCommandEvidence({
      preview,
      exit_status: 0,
      stdout: "ok",
      stderr: "",
      created_at: "2026-05-16T10:30:05.000Z",
    });

    assert.notEqual(first.id, second.id);
    assert.match(first.id, /^CMD-EVIDENCE-/);
    assert.match(second.id, /^CMD-EVIDENCE-/);
  });

  test("writeStudyArtifact default ids are unique across repeated calls", () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "sibar-study-ids-"));
    const studyDir = join(workspaceRoot, ".sibi", "artifacts");
    mkdirSync(studyDir, { recursive: true });

    const first = writeStudyArtifact({
      artifact_path: "notes/first.md",
      study_directory: studyDir,
      content: "first",
      source_evidence: [makeEvidenceRef("src/runtime-deep-ownership.ts")],
      created_at: "2026-05-16T10:40:00.000Z",
    });
    const second = writeStudyArtifact({
      artifact_path: "notes/second.md",
      study_directory: studyDir,
      content: "second",
      source_evidence: [makeEvidenceRef("src/runtime-deep-ownership.ts")],
      created_at: "2026-05-16T10:40:05.000Z",
    });

    assert.equal(first.blocked, false);
    assert.equal(second.blocked, false);
    assert.ok(first.record);
    assert.ok(second.record);
    assert.notEqual(first.record!.id, second.record!.id);
    assert.match(first.record!.id, /^STUDY-ARTIFACT-/);
    assert.match(second.record!.id, /^STUDY-ARTIFACT-/);
  });
});

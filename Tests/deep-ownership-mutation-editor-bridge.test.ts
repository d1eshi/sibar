import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createOpenInEditorCitationPayload,
  createProductMutationGate,
  projectWorkspaceSnapshot,
  type DeepOwnershipFixture,
  type DeepOwnershipLoop,
  type EvidenceRef,
} from "../engine/deep-ownership/index.ts";

const FIXTURE_PATH = "evals/deep-ownership-workspace/fixtures/sibi-pedagogy-loop.json";

function makeEvidenceRef(filePath = "src/runtime-deep-ownership.ts"): EvidenceRef {
  return {
    evidence_id: "EV-EDITOR-001",
    file_path: filePath,
    start_line: 12,
    end_line: 28,
    excerpt: "runtime deep ownership excerpt",
    role: "implementation",
  };
}

function loadFixture(): DeepOwnershipFixture {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as DeepOwnershipFixture;
}

function makePreAttemptLoop(): DeepOwnershipLoop {
  const fixture = loadFixture();
  return {
    id: fixture.loop_state.id,
    goal: fixture.goal,
    weak_goal_route: null,
    artifact_boundary: fixture.artifact_boundary,
    concept_slice: fixture.concept_slice,
    thinking_artifacts: fixture.thinking_artifacts,
    active_operation: fixture.active_operation,
    evidence_inventory: fixture.evidence_inventory,
    skip_records: fixture.skip_records,
    unknown_zones: fixture.unknown_zones,
    research_bridges: fixture.research_bridges ?? [],
    workspace_signals: fixture.workspace_signals ?? [],
    out_of_scope_evidence: fixture.out_of_scope_evidence ?? [],
    boundary_expansion_routes: fixture.boundary_expansion_routes ?? [],
    sample_attempt: fixture.sample_attempt,
    evidence_check: fixture.evidence_check,
    detected_gap: fixture.detected_gap,
    repair_action: fixture.repair_action,
    readiness_claim: fixture.readiness_claim,
    loop_entry: {
      ...fixture.loop_state,
      current_state: "AwaitingAttempt",
    },
  };
}

describe("VAL-CMD-003 / VAL-CMD-007: Product mutation guardrails", () => {
  test("mutation gate includes affected files, readiness, missing evidence, patch preview, and verification command", () => {
    const gate = createProductMutationGate({
      id: "MUT-GATE-TEST-001",
      proposed_change: "Update readiness gate handling in runtime snapshot projection.",
      affected_files: ["src/runtime-deep-ownership-snapshot.ts", "Tests/workspace-snapshot.test.ts"],
      required_readiness: "ready to modify runtime snapshot projection",
      current_readiness: {
        status: "ready",
        scope: "snapshot projection for bounded runtime slices",
      },
      missing_evidence: [],
      explicit_user_request: true,
      patch_preview: "diff --git a/src/runtime-deep-ownership-snapshot.ts ...",
      verification_command: "pnpm test -- Tests/workspace-snapshot.test.ts",
      created_at: "2026-05-16T12:00:00.000Z",
    });

    assert.deepEqual(gate.affected_files, [
      "src/runtime-deep-ownership-snapshot.ts",
      "Tests/workspace-snapshot.test.ts",
    ]);
    assert.equal(gate.current_readiness.status, "ready");
    assert.deepEqual(gate.missing_evidence, []);
    assert.equal(gate.patch_preview_available, true);
    assert.match(gate.patch_preview ?? "", /^diff --git/u);
    assert.equal(gate.verification_command, "pnpm test -- Tests/workspace-snapshot.test.ts");
    assert.equal(gate.allowed_action, "apply_with_guardrails");
    assert.equal(gate.blocked, false);
  });

  test("product mutation stays blocked until explicit user request or override exists", () => {
    const blockedGate = createProductMutationGate({
      proposed_change: "Modify attempt evaluator confidence thresholds.",
      affected_files: ["src/runtime-attempt-evaluation/evaluate-attempt.ts"],
      required_readiness: "ready to modify evidence-check evaluator",
      current_readiness: {
        status: "limited",
        scope: "trace only",
      },
      missing_evidence: ["Need counterexample from failing evaluator test output."],
      patch_preview: "diff --git a/src/runtime-attempt-evaluation/evaluate-attempt.ts ...",
      verification_command: "pnpm test -- Tests/attempt-evidence-check.test.ts",
      created_at: "2026-05-16T12:05:00.000Z",
    });

    assert.equal(blockedGate.explicit_user_request, false);
    assert.equal(blockedGate.explicit_override, false);
    assert.equal(blockedGate.allowed_action, "explicit_override_required");
    assert.equal(blockedGate.blocked, true);
    assert.match(blockedGate.blocked_reason ?? "", /explicit user request or override/i);
  });

  test("explicit override records intent and allows guarded apply even when readiness is incomplete", () => {
    const overrideGate = createProductMutationGate({
      proposed_change: "Hotfix runtime mutation gate rule for integration test.",
      affected_files: ["src/runtime-deep-ownership-mutation-editor.ts"],
      required_readiness: "ready to modify mutation guardrails",
      current_readiness: {
        status: "blocked",
        scope: "no readiness evidence yet",
      },
      missing_evidence: ["Missing behavior-oracle evidence from mutation fixture."],
      explicit_override: true,
      patch_preview_feasible: false,
      verification_command: "pnpm test -- Tests/deep-ownership-mutation-editor-bridge.test.ts",
      created_at: "2026-05-16T12:10:00.000Z",
    });

    assert.equal(overrideGate.explicit_override, true);
    assert.equal(overrideGate.allowed_action, "apply_with_guardrails");
    assert.equal(overrideGate.blocked, false);
  });
});

describe("VAL-EDITOR-001: Open-in-editor payloads are explicit and non-mutating", () => {
  test("payload includes repo root, path, line range, evidence role, hash fields, and citation label", () => {
    const payload = createOpenInEditorCitationPayload({
      repo_root: "/repo",
      evidence_ref: makeEvidenceRef(),
      source_hash: "sha256:source-hash-001",
      content_hash: "sha256:content-hash-001",
      citation_label: "runtime-deep-ownership.ts:12-28",
      created_at: "2026-05-16T12:20:00.000Z",
    });

    assert.equal(payload.repo_root, "/repo");
    assert.equal(payload.path, "src/runtime-deep-ownership.ts");
    assert.equal(payload.line_start, 12);
    assert.equal(payload.line_end, 28);
    assert.equal(payload.evidence_role, "implementation");
    assert.equal(payload.source_hash, "sha256:source-hash-001");
    assert.equal(payload.content_hash, "sha256:content-hash-001");
    assert.equal(payload.citation_label, "runtime-deep-ownership.ts:12-28");
    assert.equal(payload.editor_plugin_required, false);
    assert.equal(payload.mutates_files, false);
  });

  test("creating an editor payload does not mutate cited files", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "sibar-editor-payload-"));
    mkdirSync(join(repoRoot, "src"), { recursive: true });
    const sourceFile = join(repoRoot, "src", "runtime.ts");
    writeFileSync(sourceFile, "export const runtime = true;\n", { encoding: "utf8", flag: "wx" });
    const before = readFileSync(sourceFile, "utf8");

    const payload = createOpenInEditorCitationPayload({
      repo_root: repoRoot,
      evidence_ref: makeEvidenceRef("src/runtime.ts"),
      created_at: "2026-05-16T12:25:00.000Z",
    });
    const after = readFileSync(sourceFile, "utf8");

    assert.equal(payload.path, "src/runtime.ts");
    assert.equal(before, after);
  });

  test("payload generation rejects paths that escape repo root", () => {
    assert.throws(() => createOpenInEditorCitationPayload({
      repo_root: "/repo",
      evidence_ref: makeEvidenceRef("../private/secrets.ts"),
    }), /escapes repo root/i);
  });
});

describe("VAL-CROSS-007: Safety/editor features preserve the morning loop", () => {
  test("mutation and editor helper usage does not break pre-attempt hidden-solution gating", () => {
    const loop = makePreAttemptLoop();

    createProductMutationGate({
      proposed_change: "Preview mutation gate semantics in readiness rail.",
      affected_files: ["src/runtime-deep-ownership-mutation-editor.ts"],
      required_readiness: "ready to modify",
      current_readiness: {
        status: "limited",
        scope: "trace-only readiness",
      },
      missing_evidence: ["Need explicit behavior oracle evidence."],
      explicit_user_request: true,
      patch_preview: "diff --git a/src/runtime-deep-ownership-mutation-editor.ts ...",
      verification_command: "pnpm test -- Tests/deep-ownership-mutation-editor-bridge.test.ts",
    });

    createOpenInEditorCitationPayload({
      repo_root: loop.artifact_boundary.root_path,
      evidence_ref: makeEvidenceRef("src/runtime-deep-ownership-snapshot.ts"),
    });

    const snapshot = projectWorkspaceSnapshot(loop);
    assert.equal(snapshot.hidden_solution_gated, true);
    assert.equal(snapshot.attempt_result, null);
    assert.equal(snapshot.loop_state, "AwaitingAttempt");
  });
});

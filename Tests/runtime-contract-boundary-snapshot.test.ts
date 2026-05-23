import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  checkBoundaryEscape,
  isPathInBoundary,
  projectWorkspaceSnapshot,
  validateBoundaryEnforcement,
  type ArtifactBoundary,
  type DeepOwnershipFixture,
  type DeepOwnershipLoop,
} from "../engine/deep-ownership/index.ts";

const ROOT = resolve(process.cwd());
const FIXTURE_PATH = "evals/deep-ownership-workspace/fixtures/sibi-pedagogy-loop.json";

function loadFixture(): DeepOwnershipFixture {
  if (!existsSync(FIXTURE_PATH)) {
    throw new Error(`Fixture not found at ${FIXTURE_PATH}`);
  }
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as DeepOwnershipFixture;
}

function fixtureToLoop(fixture: DeepOwnershipFixture): DeepOwnershipLoop {
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
    sample_attempt: fixture.sample_attempt,
    evidence_check: fixture.evidence_check,
    detected_gap: fixture.detected_gap,
    repair_action: fixture.repair_action,
    readiness_claim: fixture.readiness_claim,
    loop_entry: fixture.loop_state,
  };
}

describe("Runtime contracts boundary hardening", () => {
  test("checkBoundaryEscape blocks raw parent traversal before normalization", () => {
    const boundary = loadFixture().artifact_boundary;
    const result = checkBoundaryEscape("allowed/../secret", ROOT, boundary);

    assert.equal(result.blocked, true, "raw traversal should be blocked");
    assert.ok(result.reason?.includes("parent-directory"), "reason should mention parent-directory traversal");
  });

  test("checkBoundaryEscape blocks absolute sibling-prefix root bypasses", () => {
    const boundary = loadFixture().artifact_boundary;
    const siblingPath = `${ROOT}-sibling/private/secrets.ts`;
    const result = checkBoundaryEscape(siblingPath, ROOT, boundary);

    assert.equal(result.blocked, true, "sibling-prefix root path should be blocked");
    assert.ok(result.reason?.includes("escapes declared root"), "reason should mention root escape");
  });

  test("isPathInBoundary rejects included-source sibling-prefix paths", () => {
    const boundary: ArtifactBoundary = {
      root_path: ROOT,
      source_type: "repository",
      included_sources: ["src/runtime-deep-ownership.ts"],
      excluded_sources: [],
      evidence_roles: ["implementation"],
      entrypoints: [],
      tests_as_oracles: [],
    };
    const siblingPath = resolve(ROOT, "src/runtime-deep-ownership.ts.backup");

    assert.equal(
      isPathInBoundary(siblingPath, boundary),
      false,
      "sibling-prefix file path should not match included source",
    );
  });

  test("validateBoundaryEnforcement flags sibling-prefix included source bypass attempts", () => {
    const fixture = loadFixture();
    const includedSource = fixture.artifact_boundary.included_sources[0];
    const bypassPath = `${includedSource}.backup`;
    const outsideEntry = {
      ...fixture.evidence_inventory[0],
      id: "EV-998",
      path: bypassPath,
      excerpt: "Synthetic out-of-bound sibling-prefix path",
    };

    const issues = validateBoundaryEnforcement(
      { ...fixture, evidence_inventory: [...fixture.evidence_inventory, outsideEntry] },
      ROOT,
    );

    assert.ok(
      issues.some((entry) => entry.field.includes("EV-998")),
      "sibling-prefix bypass evidence should be flagged as outside boundary",
    );
  });
});

describe("WorkspaceSnapshot pre-attempt gate hardening", () => {
  test("pre-attempt snapshot never emits attempt_result even when sample_attempt exists", () => {
    const fixture = loadFixture();
    const loop = fixtureToLoop(fixture);
    loop.loop_entry = {
      ...loop.loop_entry,
      current_state: "AwaitingAttempt",
      state_chain: [
        "GoalInput",
        "BoundaryConfirmed",
        "EvidenceInventoried",
        "ConceptSliceSelected",
        "ArtifactGenerated",
        "AwaitingAttempt",
      ],
    };
    loop.sample_attempt = fixture.sample_attempt;

    const snapshot = projectWorkspaceSnapshot(loop);
    const serialized = JSON.stringify(snapshot);

    assert.equal(snapshot.attempt_stored, false, "attempt_stored should remain false pre-attempt");
    assert.equal(snapshot.attempt_result, null, "attempt_result must be null pre-attempt");
    assert.ok(!serialized.includes("selected_evidence"), "selected_evidence should not be exposed in snapshot");
    assert.ok(
      !serialized.includes(fixture.sample_attempt.answer_text),
      "answer text should not be visible in pre-attempt snapshot",
    );
  });
});

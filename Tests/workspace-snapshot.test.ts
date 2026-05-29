import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  detectWeakGoal,
  routeWeakGoal,
  projectWorkspaceSnapshot,
  projectWorkspaceSnapshotFromFixture,
  type DeepOwnershipLoop,
  type DeepOwnershipFixture,
  type WorkspaceSnapshot,
  RECOGNIZED_OPERATION_KINDS,
} from "../engine/deep-ownership/index.ts";

// ── Helpers ───────────────────────────────────────────────────────────

const FIXTURE_PATH = "evals/deep-ownership-workspace/fixtures/sibi-pedagogy-loop.json";

function loadFixture(): DeepOwnershipFixture {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as DeepOwnershipFixture;
}

// ── VAL-LOOP-013: Weak Goals Require Operation Choice ─────────────────

describe("VAL-LOOP-013: Weak Goal Detection and Operation Choice", () => {
  test("detectWeakGoal identifies whole-repo teach/explain goals as weak", () => {
    assert.equal(detectWeakGoal("Teach me this repo"), true);
    assert.equal(detectWeakGoal("Teach me this repository"), true);
    assert.equal(detectWeakGoal("Understand this codebase"), true);
    assert.equal(detectWeakGoal("Explain this project"), true);
    assert.equal(detectWeakGoal("Learn this repo"), true);
    assert.equal(detectWeakGoal("Study the codebase"), true);
  });

  test("detectWeakGoal identifies make-me-mastery goals as weak", () => {
    assert.equal(detectWeakGoal("Make me an expert in this"), true);
    assert.equal(detectWeakGoal("Make me good at this codebase"), true);
    assert.equal(detectWeakGoal("Help me master this project"), true);
  });

  test("detectWeakGoal identifies vague single-word goals as weak", () => {
    assert.equal(detectWeakGoal("Help"), true);
    assert.equal(detectWeakGoal("Explain"), true);
    assert.equal(detectWeakGoal("Understand"), true);
  });

  test("detectWeakGoal does not flag concrete operation-scoped goals", () => {
    assert.equal(
      detectWeakGoal("Trace how detectLearningGapFromAnswer maps answer quality to gap fields"),
      false,
    );
    assert.equal(
      detectWeakGoal("Build a new evidence-check module that validates claim authority"),
      false,
    );
    assert.equal(
      detectWeakGoal("Debug the readiness report generation for missing evidence cases"),
      false,
    );
    assert.equal(
      detectWeakGoal("Modify the gap detection to handle vocabulary-only answers"),
      false,
    );
    assert.equal(
      detectWeakGoal("Derive the confidence bounds from the quality-to-severity mapping"),
      false,
    );
  });

  test("detectWeakGoal flags goal without operation verb", () => {
    assert.equal(detectWeakGoal("Sibi's pedagogy runtime"), true);
    assert.equal(detectWeakGoal("the gap detection module"), true);
  });

  test("routeWeakGoal returns a WeakGoalRoute with offered operations and requires_choice=true", () => {
    const route = routeWeakGoal("Teach me this repo");
    assert.equal(route.requires_choice, true);
    assert.equal(route.original_goal, "Teach me this repo");
    assert.equal(route.chosen_operation, null, "No operation chosen yet");
    assert.ok(Array.isArray(route.offered_operations), "offered_operations is an array");
    assert.ok(route.offered_operations.length >= 3, "At least 3 operations should be offered");
    for (const op of route.offered_operations) {
      assert.ok(RECOGNIZED_OPERATION_KINDS.includes(op), `Offered operation '${op}' is not a recognized kind`);
    }
  });

  test("routeWeakGoal offers concrete operation kinds", () => {
    const route = routeWeakGoal("Teach me this repo");
    // Must include at least: explain, trace, build (or similar concrete kinds)
    assert.ok(route.offered_operations.length > 0);
    // All offered operations must be concrete operation kinds from the recognized set
    const concreteKinds = new Set(route.offered_operations);
    assert.ok(concreteKinds.size >= 3, "Should offer at least 3 distinct operation kinds");
  });

  test("a loop with a weak goal has requires_choice=true in its snapshot", () => {
    const fixture = loadFixture();
    const loop = fixtureToLoop(fixture, "Teach me this repo");
    const snapshot = projectWorkspaceSnapshot(loop);
    assert.ok(snapshot.weak_goal_route, "Snapshot should have a weak_goal_route");
    assert.equal(snapshot.weak_goal_route.requires_choice, true);
    assert.equal(snapshot.weak_goal_route.chosen_operation, null);
  });

  test("a loop with a concrete goal has requires_choice=false in its snapshot", () => {
    const fixture = loadFixture();
    // Fixture goal is over 40 characters and specific — should not be weak
    assert.ok(fixture.goal.length >= 40, "Fixture goal should be long enough to be treated as concrete");
    const loop = fixtureToLoop(fixture, fixture.goal);
    // Fixture goal is concrete and long, so it should NOT produce a weak_goal_route
    // with requires_choice
    if (loop.weak_goal_route) {
      assert.equal(loop.weak_goal_route.requires_choice, false,
        "Concrete fixture goal should not require operation choice");
    }
    // Loop should be past GoalInput for a concrete goal
    assert.notEqual(loop.loop_entry.current_state, "GoalInput",
      "Concrete goal should progress past GoalInput");
  });

  test("readiness is not shown when weak goal is unresolved", () => {
    const fixture = loadFixture();
    // Simulate a loop at GoalInput with an unresolved weak goal
    const loop: DeepOwnershipLoop = {
      id: "TEST-LOOP-001",
      goal: "Teach me this repo",
      weak_goal_route: routeWeakGoal("Teach me this repo"),
      artifact_boundary: fixture.artifact_boundary,
      concept_slice: null,
      thinking_artifacts: [],
      active_operation: null,
      evidence_inventory: [],
      skip_records: fixture.skip_records,
      unknown_zones: fixture.unknown_zones,
      sample_attempt: null,
      evidence_check: null,
      detected_gap: null,
      repair_action: null,
      readiness_claim: {
        id: "RC-BLOCKED",
        concept_slice_id: "",
        operation_id: "",
        status: "unknown",
        scope: "No scope — goal not resolved",
        ready_to_explain: false,
        ready_to_trace: false,
        ready_to_derive: false,
        ready_to_predict: false,
        ready_to_build: false,
        ready_to_modify: false,
        ready_to_debug: false,
        ready_to_transfer: false,
        ready_to_teach: false,
        blocked_claims: [],
        supporting_evidence: [],
        blocking_gaps: [],
        confidence: "low",
        generated_at: new Date().toISOString(),
      },
      loop_entry: {
        id: "LOOP-TEST",
        current_state: "GoalInput",
        state_chain: ["GoalInput"],
        boundary_enforced: false,
        out_of_bound_accesses: 0,
      },
    };

    const snapshot = projectWorkspaceSnapshot(loop);
    assert.ok(snapshot.weak_goal_route, "Snapshot should have weak_goal_route");
    assert.equal(snapshot.weak_goal_route.requires_choice, true);
    assert.equal(snapshot.active_operation, null, "No active operation when goal is unresolved");
    assert.equal(snapshot.readiness.status, "unknown");
    assert.equal(snapshot.readiness.scope, "No scope — goal not resolved");
  });
});

// ── VAL-ARTIFACT-004: Hidden Solution Boundaries Are Preserved ────────

describe("VAL-ARTIFACT-004: Hidden Solution Projection", () => {
  test("projectWorkspaceSnapshot excludes hidden_solution_evidence from artifacts pre-attempt", () => {
    const fixture = loadFixture();

    // Verify the fixture has hidden solution evidence
    const codeSlice = fixture.thinking_artifacts.find((a) => a.kind === "code_slice");
    assert.ok(codeSlice, "Fixture must have a code_slice artifact");
    assert.ok(codeSlice.hidden_solution_evidence.length > 0, "Code slice must have hidden solution evidence");

    // Create a loop in pre-attempt state (AwaitingAttempt)
    const loop = fixtureToLoop(fixture, fixture.goal);
    loop.loop_entry.current_state = "AwaitingAttempt";
    loop.loop_entry.state_chain = [
      "GoalInput", "BoundaryConfirmed", "EvidenceInventoried",
      "ConceptSliceSelected", "ArtifactGenerated", "AwaitingAttempt",
    ];
    loop.sample_attempt = null; // No attempt yet

    // Project snapshot and verify hidden_solution_evidence is excluded
    const snapshot = projectWorkspaceSnapshot(loop);
    for (const artifact of snapshot.thinking_artifacts) {
      assert.equal(
        artifact.hidden_solution_evidence.length,
        0,
        `Artifact ${artifact.id}: hidden_solution_evidence should be empty in pre-attempt snapshot`,
      );
    }
  });

  test("projectWorkspaceSnapshot preserves source_evidence in projected artifacts", () => {
    const fixture = loadFixture();
    const loop = fixtureToLoop(fixture, fixture.goal);
    const snapshot = projectWorkspaceSnapshot(loop);

    for (const artifact of snapshot.thinking_artifacts) {
      assert.ok(
        artifact.source_evidence.length > 0,
        `Artifact ${artifact.id}: source_evidence should be preserved`,
      );
      for (const ref of artifact.source_evidence) {
        assert.ok(typeof ref.evidence_id === "string");
        assert.ok(typeof ref.file_path === "string");
        assert.ok(typeof ref.role === "string");
      }
    }
  });

  test("hidden_solution_gated is true pre-attempt", () => {
    const fixture = loadFixture();
    const loop = fixtureToLoop(fixture, fixture.goal);
    // Set to pre-attempt state
    loop.loop_entry.current_state = "AwaitingAttempt";
    loop.loop_entry.state_chain = [
      "GoalInput", "BoundaryConfirmed", "EvidenceInventoried",
      "ConceptSliceSelected", "ArtifactGenerated", "AwaitingAttempt",
    ];
    loop.sample_attempt = null;
    const snapshot = projectWorkspaceSnapshot(loop);

    assert.equal(snapshot.hidden_solution_gated, true, "Hidden solution should be gated pre-attempt");
    assert.equal(snapshot.has_hidden_solution_content, true, "Loop has hidden solution content");
    assert.equal(snapshot.attempt_stored, false, "No attempt stored pre-attempt");
  });

  test("hidden_solution_gated is false post-attempt", () => {
    const fixture = loadFixture();
    const loop = fixtureToLoop(fixture, fixture.goal);
    // Mark as post-attempt by having an attempt stored
    loop.sample_attempt = fixture.sample_attempt;
    loop.loop_entry.current_state = "AttemptStored";
    loop.loop_entry.state_chain = [
      "GoalInput", "BoundaryConfirmed", "EvidenceInventoried",
      "ConceptSliceSelected", "ArtifactGenerated", "AwaitingAttempt", "AttemptStored",
    ];

    const snapshot = projectWorkspaceSnapshot(loop);

    // Post-attempt, hidden solution is no longer gated
    assert.equal(snapshot.hidden_solution_gated, false, "Hidden solution should not be gated post-attempt");
    assert.equal(snapshot.attempt_stored, true);
  });

  test("WorkspaceSnapshot excludes hidden content from pre-attempt accessibility surface", () => {
    const fixture = loadFixture();
    const loop = fixtureToLoop(fixture, fixture.goal);
    // Set to pre-attempt state
    loop.loop_entry.current_state = "AwaitingAttempt";
    loop.loop_entry.state_chain = [
      "GoalInput", "BoundaryConfirmed", "EvidenceInventoried",
      "ConceptSliceSelected", "ArtifactGenerated", "AwaitingAttempt",
    ];
    loop.sample_attempt = null;

    const snapshot = projectWorkspaceSnapshot(loop);

    // Pre-attempt snapshot must not expose hidden solution content
    // through any of its visible fields
    const snapshotJSON = JSON.stringify(snapshot, null, 2);

    // The snapshot should not contain the hidden solution evidence excerpts
    // that exist in the original artifact's hidden_solution_evidence
    const hiddenEvidenceInFixture = fixture.thinking_artifacts.flatMap(
      (a) => a.hidden_solution_evidence,
    );

    for (const hiddenRef of hiddenEvidenceInFixture) {
      assert.ok(
        !snapshotJSON.includes(hiddenRef.excerpt),
        `Snapshot should not contain hidden evidence excerpt: "${hiddenRef.excerpt.substring(0, 40)}..."`,
      );
    }
  });

  test("projectWorkspaceSnapshotFromFixture produces same gating as projectWorkspaceSnapshot", () => {
    const fixture = loadFixture();
    const loop = fixtureToLoop(fixture, fixture.goal);

    const snapshotFromLoop = projectWorkspaceSnapshot(loop);
    const snapshotFromFixture = projectWorkspaceSnapshotFromFixture(fixture);

    // Both should produce same gating behavior
    assert.equal(snapshotFromLoop.hidden_solution_gated, snapshotFromFixture.hidden_solution_gated);
    assert.equal(
      snapshotFromLoop.thinking_artifacts.length,
      snapshotFromFixture.thinking_artifacts.length,
    );
  });

  test("hidden solution evidence refs have valid structure in fixture", () => {
    const fixture = loadFixture();
    for (const artifact of fixture.thinking_artifacts) {
      assert.ok(Array.isArray(artifact.hidden_solution_evidence));
      for (const ref of artifact.hidden_solution_evidence) {
        assert.ok(typeof ref.evidence_id === "string", "hidden ref missing evidence_id");
        assert.ok(typeof ref.file_path === "string", "hidden ref missing file_path");
        assert.ok(typeof ref.start_line === "number", "hidden ref missing start_line");
        assert.ok(typeof ref.end_line === "number", "hidden ref missing end_line");
        assert.ok(typeof ref.excerpt === "string", "hidden ref missing excerpt");
        assert.ok(typeof ref.role === "string", "hidden ref missing role");
      }
    }
  });
});

// ── VAL-CROSS-004: DeepOwnershipLoop and WorkspaceSnapshot Types ──────

describe("VAL-CROSS-004: DeepOwnershipLoop Type", () => {
  test("DeepOwnershipLoop can be constructed from fixture data", () => {
    const fixture = loadFixture();
    const loop = fixtureToLoop(fixture, fixture.goal);
    assert.ok(loop.id.startsWith("LOOP-"), "Loop ID should have LOOP- prefix");
    assert.equal(loop.goal, fixture.goal);
    assert.equal(loop.artifact_boundary.root_path, fixture.artifact_boundary.root_path);
    assert.equal(loop.concept_slice?.id, fixture.concept_slice.id);
    assert.equal(loop.thinking_artifacts.length, fixture.thinking_artifacts.length);
    assert.ok(loop.active_operation, "Active operation should exist");
    assert.equal(loop.evidence_inventory.length, fixture.evidence_inventory.length);
    assert.ok(loop.loop_entry, "Loop entry should exist");
  });

  test("DeepOwnershipLoop has all required runtime fields", () => {
    const fixture = loadFixture();
    const loop = fixtureToLoop(fixture, fixture.goal);

    // Check all fields exist
    assert.ok(typeof loop.id === "string");
    assert.ok(typeof loop.goal === "string");
    assert.ok(loop.weak_goal_route !== undefined, "weak_goal_route must exist (can be null)");
    assert.ok(loop.artifact_boundary !== undefined);
    assert.ok(loop.concept_slice !== undefined, "concept_slice must exist (can be null)");
    assert.ok(Array.isArray(loop.thinking_artifacts));
    assert.ok(loop.active_operation !== undefined, "active_operation must exist (can be null)");
    assert.ok(Array.isArray(loop.evidence_inventory));
    assert.ok(Array.isArray(loop.skip_records));
    assert.ok(Array.isArray(loop.unknown_zones));
    assert.ok(loop.sample_attempt !== undefined, "sample_attempt must exist (can be null)");
    assert.ok(loop.evidence_check !== undefined, "evidence_check must exist (can be null)");
    assert.ok(loop.detected_gap !== undefined, "detected_gap must exist (can be null)");
    assert.ok(loop.repair_action !== undefined, "repair_action must exist (can be null)");
    assert.ok(loop.readiness_claim !== undefined);
    assert.ok(loop.loop_entry !== undefined);
  });
});

describe("VAL-CROSS-004: WorkspaceSnapshot Type", () => {
  test("WorkspaceSnapshot has all projection fields", () => {
    const fixture = loadFixture();
    const loop = fixtureToLoop(fixture, fixture.goal);
    const snapshot = projectWorkspaceSnapshot(loop);

    // Required projection fields
    assert.ok(typeof snapshot.snapshot_id === "string");
    assert.ok(typeof snapshot.loop_id === "string");
    assert.ok(typeof snapshot.goal === "string");
    assert.ok(snapshot.weak_goal_route !== undefined);
    assert.ok(typeof snapshot.boundary_summary.root_path === "string");
    assert.ok(typeof snapshot.boundary_summary.included_count === "number");
    assert.ok(typeof snapshot.boundary_summary.excluded_count === "number");
    assert.ok(snapshot.concept_slice !== undefined);
    assert.ok(Array.isArray(snapshot.thinking_artifacts));
    assert.ok(snapshot.active_operation !== undefined);
    assert.ok(Array.isArray(snapshot.evidence_visible));
    assert.ok(Array.isArray(snapshot.unknown_zones));
    assert.ok(typeof snapshot.attempt_stored === "boolean");
    assert.ok(snapshot.attempt_result !== undefined);
    assert.ok(snapshot.evidence_check_result !== undefined);
    assert.ok(snapshot.detected_gap !== undefined);
    assert.ok(snapshot.repair_action !== undefined);
    assert.ok(typeof snapshot.readiness.status === "string");
    assert.ok(typeof snapshot.readiness.scope === "string");
    assert.ok(typeof snapshot.loop_state === "string");
    assert.ok(Array.isArray(snapshot.state_chain));
    assert.ok(typeof snapshot.has_hidden_solution_content === "boolean");
    assert.ok(typeof snapshot.hidden_solution_gated === "boolean");
  });

  test("WorkspaceSnapshot evidence_visible matches fixture inventory size", () => {
    const fixture = loadFixture();
    const loop = fixtureToLoop(fixture, fixture.goal);
    const snapshot = projectWorkspaceSnapshot(loop);

    assert.equal(
      snapshot.evidence_visible.length,
      fixture.evidence_inventory.length,
      "All evidence entries should be visible (evidence itself is not hidden)",
    );
  });

  test("WorkspaceSnapshot preserves unknown zones", () => {
    const fixture = loadFixture();
    const loop = fixtureToLoop(fixture, fixture.goal);
    const snapshot = projectWorkspaceSnapshot(loop);

    assert.equal(snapshot.unknown_zones.length, fixture.unknown_zones.length);
    for (let i = 0; i < snapshot.unknown_zones.length; i++) {
      assert.equal(snapshot.unknown_zones[i].id, fixture.unknown_zones[i].id);
      assert.equal(snapshot.unknown_zones[i].path, fixture.unknown_zones[i].path);
    }
  });

  test("WorkspaceSnapshot boundary_summary correctly summarizes boundary", () => {
    const fixture = loadFixture();
    const loop = fixtureToLoop(fixture, fixture.goal);
    const snapshot = projectWorkspaceSnapshot(loop);

    assert.equal(snapshot.boundary_summary.included_count, fixture.artifact_boundary.included_sources.length);
    assert.equal(snapshot.boundary_summary.excluded_count, fixture.artifact_boundary.excluded_sources.length);
    assert.ok(snapshot.boundary_summary.root_path.length > 0);
  });

  test("projectWorkspaceSnapshotFromFixture works with real fixture", () => {
    const fixture = loadFixture();
    const snapshot = projectWorkspaceSnapshotFromFixture(fixture);

    assert.ok(snapshot.snapshot_id, "Snapshot should have an ID");
    assert.equal(snapshot.goal, fixture.goal);
    assert.equal(snapshot.loop_state, fixture.loop_state.current_state);
    assert.equal(
      snapshot.state_chain.length,
      fixture.loop_state.state_chain.length,
    );
    assert.equal(snapshot.concept_slice?.id, fixture.concept_slice.id);
    assert.ok(snapshot.active_operation, "Active operation should be present");
  });

  test("UI can consume projection fields without duplicating readiness logic", () => {
    const fixture = loadFixture();
    const snapshot = projectWorkspaceSnapshotFromFixture(fixture);

    // Readiness is already computed; UI just displays it
    assert.ok(["ready", "limited", "blocked", "unknown"].includes(snapshot.readiness.status));
    assert.ok(snapshot.readiness.scope.length > 0);

    // Gap is already detected; UI doesn't decide what a gap is
    if (snapshot.detected_gap) {
      assert.ok(snapshot.detected_gap.kind.length > 0);
      assert.ok(typeof snapshot.detected_gap.blocks_readiness === "boolean");
    }

    // Evidence check result is pre-computed
    if (snapshot.evidence_check_result) {
      assert.ok(["confirmed", "partial", "gap", "contradiction", "insufficient_evidence"].includes(
        snapshot.evidence_check_result.result,
      ));
    }

    // Repair action is pre-computed
    if (snapshot.repair_action) {
      assert.ok(snapshot.repair_action.prompt.length > 0);
      assert.ok(RECOGNIZED_OPERATION_KINDS.includes(snapshot.repair_action.operation_kind));
    }

    // Hidden solution gating state is explicit
    assert.equal(typeof snapshot.hidden_solution_gated, "boolean");
    assert.equal(typeof snapshot.has_hidden_solution_content, "boolean");
  });
});

// ── VAL-CROSS-004: Fixture Compatibility ──────────────────────────────

describe("VAL-CROSS-004: Fixture-to-Loop Compatibility", () => {
  test("fixtureToLoop preserves all evidence inventory entries", () => {
    const fixture = loadFixture();
    const loop = fixtureToLoop(fixture, fixture.goal);

    assert.equal(loop.evidence_inventory.length, fixture.evidence_inventory.length);
    for (let i = 0; i < loop.evidence_inventory.length; i++) {
      assert.equal(loop.evidence_inventory[i].id, fixture.evidence_inventory[i].id);
      assert.equal(loop.evidence_inventory[i].path, fixture.evidence_inventory[i].path);
      assert.equal(loop.evidence_inventory[i].role, fixture.evidence_inventory[i].role);
    }
  });

  test("fixtureToLoop preserves all thinking artifacts", () => {
    const fixture = loadFixture();
    const loop = fixtureToLoop(fixture, fixture.goal);

    assert.equal(loop.thinking_artifacts.length, fixture.thinking_artifacts.length);
    for (let i = 0; i < loop.thinking_artifacts.length; i++) {
      assert.equal(loop.thinking_artifacts[i].id, fixture.thinking_artifacts[i].id);
      assert.equal(loop.thinking_artifacts[i].kind, fixture.thinking_artifacts[i].kind);
      assert.equal(loop.thinking_artifacts[i].user_operation.kind, fixture.thinking_artifacts[i].user_operation.kind);
    }
  });

  test("fixtureToLoop detects weak goals from the fixture's concrete goal as not weak", () => {
    const fixture = loadFixture();
    const loop = fixtureToLoop(fixture, fixture.goal);

    // Fixture goal is long and specific — should NOT be weak
    assert.equal(detectWeakGoal(fixture.goal), false, "Fixture concrete goal should not be detected as weak");
    // Therefore loop should not have requires_choice route
    assert.ok(
      loop.weak_goal_route === null || !loop.weak_goal_route.requires_choice,
      "Concrete fixture goal should not require operation choice",
    );
  });

  test("fixtureToLoop with weak goal creates requires_choice route", () => {
    const fixture = loadFixture();
    const weakGoal = "Teach me this repo";
    const loop = fixtureToLoop(fixture, weakGoal);

    assert.ok(loop.weak_goal_route, "Weak goal should produce a route");
    assert.equal(loop.weak_goal_route.requires_choice, true);
    assert.equal(loop.weak_goal_route.chosen_operation, null);
    assert.ok(loop.weak_goal_route.offered_operations.length >= 3);
  });
});

// ── VAL-CROSS-004: Projection Does Not Leak Pedagogy Decisions ────────

describe("Snapshot Projection: No Pedagogy Decisions in UI", () => {
  test("WorkspaceSnapshot readiness is a flat status—UI does not compute it", () => {
    const fixture = loadFixture();
    const snapshot = projectWorkspaceSnapshotFromFixture(fixture);

    // Readiness is a simple enum + scope string
    assert.ok(typeof snapshot.readiness.status === "string");
    assert.ok(typeof snapshot.readiness.scope === "string");
    assert.ok(Array.isArray(snapshot.readiness.blocked_claims));

    // Readiness projection uses only display fields (status, scope, blocked_claims)
    // No raw gap-detection internals leaked in the readiness structure itself
    const readinessKeys = Object.keys(snapshot.readiness);
    assert.deepEqual(readinessKeys.sort(), ["blocked_claims", "scope", "status"].sort(),
      "Readiness projection should only expose status, scope, and blocked_claims");
  });

  test("WorkspaceSnapshot evidence_check_result is a simple summary", () => {
    const fixture = loadFixture();
    const snapshot = projectWorkspaceSnapshotFromFixture(fixture);

    if (snapshot.evidence_check_result) {
      assert.ok(typeof snapshot.evidence_check_result.result === "string");
      assert.ok(typeof snapshot.evidence_check_result.summary === "string");
      // UI doesn't get raw claim arrays — those are runtime-internal
    }
  });

  test("WorkspaceSnapshot detected_gap is flat for display", () => {
    const fixture = loadFixture();
    const snapshot = projectWorkspaceSnapshotFromFixture(fixture);

    if (snapshot.detected_gap) {
      assert.ok(typeof snapshot.detected_gap.kind === "string");
      assert.ok(typeof snapshot.detected_gap.severity === "string");
      assert.ok(typeof snapshot.detected_gap.blocks_readiness === "boolean");
      // UI doesn't get raw evidence refs for gap — those stay in runtime
    }
  });

  test("WorkspaceSnapshot active_operation has concrete prompt for UI", () => {
    const fixture = loadFixture();
    const snapshot = projectWorkspaceSnapshotFromFixture(fixture);

    assert.ok(snapshot.active_operation, "Active operation should be present");
    assert.ok(typeof snapshot.active_operation.prompt === "string");
    assert.ok(snapshot.active_operation.prompt.length > 0);
    assert.ok(RECOGNIZED_OPERATION_KINDS.includes(snapshot.active_operation.kind));
  });
});

// ── Helper: create DeepOwnershipLoop from fixture ────────────────────

function fixtureToLoop(
  fixture: DeepOwnershipFixture,
  goal: string,
): DeepOwnershipLoop {
  return {
    id: fixture.loop_state.id,
    goal,
    weak_goal_route: detectWeakGoal(goal) ? routeWeakGoal(goal) : null,
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

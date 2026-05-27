import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  createResearchToConstructionBridge,
  evaluateSignalOwnershipStrength,
  routeOutOfBoundEvidenceToBoundaryExpansion,
  storeWorkspaceSignal,
  summarizeProgressiveInventory,
  validateResearchToConstructionBridge,
  type ArtifactBoundary,
  type ConceptSlice,
  type EvidenceInventoryEntry,
  type EvidenceRef,
} from "../engine/deep-ownership/index.ts";

function makeBoundary(): ArtifactBoundary {
  return {
    root_path: "/repo",
    source_type: "repository",
    included_sources: ["src/runtime-core.ts", "Tests/runtime-core.test.ts"],
    excluded_sources: ["node_modules/**", "dist/**"],
    evidence_roles: ["source_truth", "behavior_oracle", "implementation", "interface", "unknown"],
    entrypoints: ["src/runtime-core.ts"],
    tests_as_oracles: ["Tests/runtime-core.test.ts"],
  };
}

function makeConceptSlice(): ConceptSlice {
  return {
    id: "CS-INTEL-001",
    label: "Large repo progressive inventory and bounded slice",
    domain: "code",
    operation_target: "trace",
    prerequisite_concepts: ["inventory", "boundary", "unknown zones"],
    source_evidence: ["EV-001"],
    behavior_evidence: ["EV-002"],
    risk_evidence: [],
    expected_user_operations: ["trace", "explain"],
  };
}

function makeEvidenceRef(evidenceId: string, path: string): EvidenceRef {
  return {
    evidence_id: evidenceId,
    file_path: path,
    start_line: 1,
    end_line: 12,
    excerpt: `excerpt from ${path}`,
    role: "implementation",
  };
}

describe("VAL-INTEL-002: Large repos are progressive", () => {
  test("summarizeProgressiveInventory reports counts, skipped/unknown zones, and bounded concept slice", () => {
    const evidenceInventory: EvidenceInventoryEntry[] = Array.from({ length: 1200 }, (_, idx) => ({
      id: `EV-${String(idx + 1).padStart(3, "0")}`,
      path: `src/module-${idx + 1}.ts`,
      source_type: "source_truth",
      size_bytes: 1024 + idx,
      extension: ".ts",
      role: "implementation",
      content_hash: `sha256:${idx.toString(16).padStart(8, "0")}`,
      excerpt: `module ${idx + 1}`,
      status: "inspected",
    }));

    const summary = summarizeProgressiveInventory({
      artifact_boundary: makeBoundary(),
      evidence_inventory: evidenceInventory,
      skip_records: [
        { id: "SKIP-001", path: "node_modules/", reason: "dependency_directory", risk_if_ignored: "none" },
        { id: "SKIP-002", path: "dist/", reason: "build_output", risk_if_ignored: "none" },
      ],
      unknown_zones: [
        {
          id: "UZ-001",
          path: "src/legacy/",
          reason: "not yet inspected in this loop",
          risk_if_ignored: "might hide behavior edge-cases",
          when_to_open: "when modifying runtime compatibility paths",
        },
      ],
      concept_slice: makeConceptSlice(),
    });

    assert.equal(summary.inventory_count, 1200);
    assert.equal(summary.skipped_zone_count, 2);
    assert.equal(summary.unknown_zone_count, 1);
    assert.equal(summary.complete_repo_summary, false, "must not claim complete repo summary");
    assert.equal(summary.bounded_concept_slice.id, "CS-INTEL-001");
    assert.equal(summary.bounded_concept_slice.boundary_included_count, 2);
  });
});

describe("VAL-INTEL-003 / VAL-INTEL-006: Research artifacts connect to construction with bounded evidence", () => {
  test("createResearchToConstructionBridge stores separate research/implementation/test refs", () => {
    const bridge = createResearchToConstructionBridge({
      id: "RB-001",
      paper_claim: "Clipped policy ratios stabilize optimization updates.",
      equation: "L^CLIP(theta) = E[min(r_t(theta)A_t, clip(r_t(theta), 1-e, 1+e)A_t)]",
      implementation_site: "src/rl/ppo.ts::clippedObjective",
      test_or_experiment: "Tests/ppo-objective.test.ts::clipping prevents ratio explosion",
      user_operation: {
        id: "OP-INTEL-001",
        kind: "build",
        prompt: "Implement a minimal clipped objective and explain why clipping limits harmful updates.",
        artifact_ids: ["TA-PO-001"],
        required_evidence: ["EV-R-001", "EV-I-001", "EV-T-001"],
        allowed_hints: 2,
        blocked_shortcuts: [],
        success_criteria: ["implements clipping", "connects equation term to implementation behavior"],
      },
      research_evidence_refs: [makeEvidenceRef("EV-R-001", "papers/ppo.md")],
      implementation_evidence_refs: [makeEvidenceRef("EV-I-001", "src/rl/ppo.ts")],
      test_or_experiment_evidence_refs: [makeEvidenceRef("EV-T-001", "Tests/ppo-objective.test.ts")],
      created_at: "2026-05-16T00:00:00.000Z",
    });

    assert.equal(bridge.status, "grounded");
    assert.deepEqual(bridge.missing_sides, []);
    assert.equal(bridge.research_evidence_refs.length, 1);
    assert.equal(bridge.implementation_evidence_refs.length, 1);
    assert.equal(bridge.test_or_experiment_evidence_refs.length, 1);
  });

  test("missing bridge sides are explicit inferred/unknown markers, not silent equivalence claims", () => {
    const bridge = createResearchToConstructionBridge({
      id: "RB-002",
      paper_claim: "A math claim requires implementation linkage before readiness.",
      equation: "f(x) = x^2",
      implementation_site: "src/math/bridge.ts::square",
      test_or_experiment: "Tests/math-bridge.test.ts::square behavior",
      user_operation: {
        id: "OP-INTEL-002",
        kind: "trace",
        prompt: "Trace math claim to implementation behavior and test evidence.",
        artifact_ids: ["TA-PO-002"],
        required_evidence: ["EV-R-010"],
        allowed_hints: 1,
        blocked_shortcuts: [],
        success_criteria: ["identifies missing implementation side"],
      },
      research_evidence_refs: [makeEvidenceRef("EV-R-010", "papers/math-notes.md")],
      implementation_evidence_refs: [],
      test_or_experiment_evidence_refs: [],
      created_at: "2026-05-16T00:10:00.000Z",
    });

    assert.equal(bridge.status, "partial");
    assert.ok(bridge.missing_sides.includes("implementation"));
    assert.ok(bridge.missing_sides.includes("test_or_experiment"));

    const validIssues = validateResearchToConstructionBridge(bridge);
    assert.equal(validIssues.length, 0, "well-marked missing sides should validate");

    const tampered = { ...bridge, missing_sides: [] };
    const tamperedIssues = validateResearchToConstructionBridge(tampered);
    assert.ok(tamperedIssues.some((entry) => entry.field.includes("missing_sides")));
  });
});

describe("VAL-CMD-005: Workspace signals become bounded evidence", () => {
  test("storeWorkspaceSignal persists id, source, kind, payload, evidence role, and timestamp", () => {
    const signals = storeWorkspaceSignal([], {
      id: "SIG-001",
      source: "workspace-ui",
      kind: "code_range_selection",
      payload: { path: "src/runtime-core.ts", start_line: 10, end_line: 20 },
      evidence_role: "interface",
      created_at: "2026-05-16T00:20:00.000Z",
    });

    assert.equal(signals.length, 1);
    assert.equal(signals[0].id, "SIG-001");
    assert.equal(signals[0].source, "workspace-ui");
    assert.equal(signals[0].kind, "code_range_selection");
    assert.equal(signals[0].evidence_role, "interface");
    assert.equal(signals[0].created_at, "2026-05-16T00:20:00.000Z");
    assert.deepEqual(signals[0].payload, { path: "src/runtime-core.ts", start_line: 10, end_line: 20 });
  });

  test("passive signals cannot independently prove ownership readiness", () => {
    const signals = storeWorkspaceSignal([], {
      source: "benchmark-runner",
      kind: "benchmark_result",
      payload: { benchmark: "runtime-loop", delta_ms: -12.4 },
      evidence_role: "experiment",
      created_at: "2026-05-16T00:21:00.000Z",
    });

    const ownershipStrength = evaluateSignalOwnershipStrength(signals);
    assert.equal(ownershipStrength.can_prove_ownership, false);
    assert.match(ownershipStrength.reason, /cannot independently prove ownership/i);
  });
});

describe("VAL-TRUST-003: Boundary expansion is explicit", () => {
  test("out-of-bound but relevant evidence is recorded as out-of-scope and routed to boundary expansion", () => {
    const decision = routeOutOfBoundEvidenceToBoundaryExpansion({
      candidate_path: "../private/incident-log.md",
      relevance_reason: "Stack trace references symbols in this file.",
      related_operation_id: "OP-INTEL-003",
      root_path: "/repo",
      boundary: makeBoundary(),
      created_at: "2026-05-16T00:30:00.000Z",
      existing_out_of_scope_count: 0,
      existing_route_count: 0,
    });

    assert.equal(decision.blocked, true);
    assert.equal(decision.evidence_ref_used, false, "must not silently create out-of-bound evidence refs");
    assert.ok(decision.out_of_scope_record, "should record an out-of-scope evidence marker");
    assert.ok(decision.boundary_expansion_route, "should create a boundary expansion route");
    assert.equal(decision.boundary_expansion_route?.status, "proposed");
    assert.equal(decision.boundary_expansion_route?.requested_path, "../private/incident-log.md");
  });

  test("inside-root path outside included_sources creates a boundary expansion route", () => {
    const decision = routeOutOfBoundEvidenceToBoundaryExpansion({
      candidate_path: "src/non-included-module.ts",
      relevance_reason: "Referenced in stack trace but not in current included_sources boundary.",
      related_operation_id: "OP-INTEL-005",
      root_path: "/repo",
      boundary: makeBoundary(),
      created_at: "2026-05-16T00:31:00.000Z",
      existing_out_of_scope_count: 1,
      existing_route_count: 1,
    });

    assert.equal(decision.blocked, true, "non-included sources must be treated as out-of-bound");
    assert.ok(decision.out_of_scope_record);
    assert.ok(decision.boundary_expansion_route);
    assert.equal(decision.boundary_expansion_route?.requested_path, "src/non-included-module.ts");
  });

  test("inside-root sibling subtree outside included_sources creates a boundary expansion route", () => {
    const siblingBoundary: ArtifactBoundary = {
      ...makeBoundary(),
      included_sources: ["src/runtime/"],
    };

    const decision = routeOutOfBoundEvidenceToBoundaryExpansion({
      candidate_path: "src/experimental/runtime-prototype.ts",
      relevance_reason: "Potentially relevant sibling subtree not in included_sources.",
      related_operation_id: "OP-INTEL-006",
      root_path: "/repo",
      boundary: siblingBoundary,
      created_at: "2026-05-16T00:32:00.000Z",
      existing_out_of_scope_count: 2,
      existing_route_count: 2,
    });

    assert.equal(decision.blocked, true, "inside-root sibling subtree must route to boundary expansion");
    assert.ok(decision.out_of_scope_record);
    assert.ok(decision.boundary_expansion_route);
    assert.equal(decision.boundary_expansion_route?.requested_path, "src/experimental/runtime-prototype.ts");
  });

  test("included_sources path remains in scope and does not create an expansion route", () => {
    const decision = routeOutOfBoundEvidenceToBoundaryExpansion({
      candidate_path: "src/runtime-core.ts",
      relevance_reason: "Inside boundary and directly inspectable.",
      related_operation_id: "OP-INTEL-004",
      root_path: "/repo",
      boundary: makeBoundary(),
      created_at: "2026-05-16T00:31:00.000Z",
      existing_out_of_scope_count: 1,
      existing_route_count: 1,
    });

    assert.equal(decision.blocked, false);
    assert.equal(decision.out_of_scope_record, null);
    assert.equal(decision.boundary_expansion_route, null);
    assert.equal(decision.evidence_ref_used, false);
  });
});

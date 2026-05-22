import assert from "node:assert/strict";
import test from "node:test";

import { evaluateAttempt } from "../engine/runtime-attempt-evaluation.ts";
import { attemptToReadiness } from "../engine/runtime-pedagogy-loop.ts";
import { buildMissionSessionBridge } from "../engine/workspace/source-mission/bridge.ts";
import type {
  MissionPreview,
  ProposedSession,
  SourceIntakeResult,
  SourceSignal,
  SourceSlice,
} from "../engine/workspace/source-mission/contracts.ts";
import type { UserAttempt } from "../engine/runtime-deep-ownership.ts";

const sourceIntake: SourceIntakeResult = {
  schema: "SourceIntakeResult",
  version: "0.1.0",
  id: "INTAKE-001",
  source_id: "SOURCE-001",
  source_kind: "url",
  canonical_url: "https://example.com/source",
  title: "Source",
  raw_text_ref: "source/raw.txt",
  readable_text_ref: "source/readable.txt",
  extraction_status: "completed",
  diagnostics: [],
};

const sourceSignals: SourceSignal[] = [
  {
    schema: "SourceSignal",
    version: "0.1.0",
    id: "SIG-JAX",
    kind: "resource",
    label: "JAX tutorials",
    source_excerpt_ref: "source#sig-jax",
    confidence: "high",
    user_relevance: "explicit",
  },
  {
    schema: "SourceSignal",
    version: "0.1.0",
    id: "SIG-SCALING",
    kind: "claim",
    label: "scaling law derivation",
    source_excerpt_ref: "source#sig-scaling",
    confidence: "medium",
    user_relevance: "inferred",
  },
];

const sourceSlices: SourceSlice[] = [
  {
    slice_id: "SLICE-JAX",
    source_id: "SOURCE-001",
    label: "JAX foundations slice",
    excerpt_ref: "source#slice-jax",
    excerpt: "The source recommends starting with JAX tutorials before deeper systems work.",
    source_signal_ids: ["SIG-JAX"],
  },
  {
    slice_id: "SLICE-SCALING",
    source_id: "SOURCE-001",
    label: "scaling derivation slice",
    excerpt_ref: "source#slice-scaling",
    excerpt: "The source calls out a scaling law derivation as a claim to map carefully.",
    source_signal_ids: ["SIG-SCALING"],
  },
];

const proposedSession: ProposedSession = {
  id: "SES-001",
  track_id: "TRK-001",
  title: "Map source claims",
  source_slice_refs: ["SIG-JAX", "SIG-SCALING"],
  operation: "Map the source excerpts into a short explanation.",
  recommended_artifacts: ["technical note", "recall card"],
  status: "now",
};

const missionPreview: MissionPreview = {
  schema: "MissionPreview",
  version: "0.1.0",
  mission_title: "Source mission",
  mission_rationale: "A bounded source-driven mission.",
  user_goal: "Understand the source claims.",
  source_summary: "The source discusses JAX and scaling.",
  proposed_tracks: [
    {
      id: "TRK-001",
      title: "Foundations",
      rationale: "Read the bounded source first.",
      source_signal_ids: ["SIG-JAX", "SIG-SCALING"],
      status: "recommended",
    },
  ],
  first_sessions: [proposedSession],
  open_questions: [],
  confidence: "high",
};

function build(
  overrides: Partial<ProposedSession> = {},
  sourceOverrides: {
    source_signals?: SourceSignal[];
    source_slices?: SourceSlice[];
  } = {},
) {
  return buildMissionSessionBridge({
    mission_preview: {
      ...missionPreview,
      first_sessions: [{ ...proposedSession, ...overrides }],
    },
    proposed_session: { ...proposedSession, ...overrides },
    source_signals: sourceOverrides.source_signals ?? sourceSignals,
    source_slices: sourceOverrides.source_slices ?? sourceSlices,
    source_intake: sourceIntake,
    user_reason: "I need a bounded study session.",
  });
}

test("normalizes signal refs into session seed slices and signal ids", () => {
  const result = build();

  assert.equal(result.ok, true);
  assert.deepEqual(result.value.session_seed.source_signal_ids, ["SIG-JAX", "SIG-SCALING"]);
  assert.deepEqual(result.value.session_seed.source_slice_refs, ["SLICE-JAX", "SLICE-SCALING"]);
});

test("preserves explicit SourceSlice refs and derives their signal ids", () => {
  const result = build({ source_slice_refs: ["SLICE-SCALING"] });

  assert.equal(result.ok, true);
  assert.deepEqual(result.value.session_seed.source_slice_refs, ["SLICE-SCALING"]);
  assert.deepEqual(result.value.session_seed.source_signal_ids, ["SIG-SCALING"]);
});

test("blocks unknown refs without producing output", () => {
  const result = build({ source_slice_refs: ["SIG-JAX", "UNKNOWN-REF"] });

  assert.equal(result.ok, false);
  assert.equal(result.value, null);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "unknown_source_ref"), true);
});

test("blocks empty SourceSlice excerpt_ref without producing output", () => {
  const result = build(
    { source_slice_refs: ["SLICE-JAX"] },
    {
      source_slices: [
        {
          ...sourceSlices[0],
          excerpt_ref: "",
        },
      ],
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.value, null);
  assert.equal(
    result.diagnostics.some((diagnostic) => diagnostic.code === "invalid_source_slice_excerpt_ref"),
    true,
  );
});

test("blocks empty SourceSignal source_excerpt_ref without producing output", () => {
  const result = build(
    { source_slice_refs: ["SIG-JAX"] },
    {
      source_signals: [
        {
          ...sourceSignals[0],
          source_excerpt_ref: "",
        },
      ],
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.value, null);
  assert.equal(
    result.diagnostics.some((diagnostic) => diagnostic.code === "invalid_source_signal_excerpt_ref"),
    true,
  );
});

test("blocks missing SourceSlice excerpt without producing output", () => {
  const { excerpt: _excerpt, ...sliceWithoutExcerpt } = sourceSlices[0];
  const result = build(
    { source_slice_refs: ["SLICE-JAX"] },
    {
      source_slices: [sliceWithoutExcerpt as SourceSlice],
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.value, null);
  assert.equal(
    result.diagnostics.some((diagnostic) => diagnostic.code === "missing_source_slice_excerpt"),
    true,
  );
});

test("blocks empty SourceSlice excerpt without producing output", () => {
  const result = build(
    { source_slice_refs: ["SLICE-JAX"] },
    {
      source_slices: [
        {
          ...sourceSlices[0],
          excerpt: "   ",
        },
      ],
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.value, null);
  assert.equal(
    result.diagnostics.some((diagnostic) => diagnostic.code === "missing_source_slice_excerpt"),
    true,
  );
});

test("maps free-form operations to the closed UserOperationKind enum", () => {
  const cases = [
    ["Read and summarize this section", "explain"],
    ["Trace the map flow", "trace"],
    ["Derive and prove the claim", "derive"],
    ["Predict the behavior", "predict"],
    ["Implement build code probe", "build"],
    ["Modify and refactor the example", "modify"],
    ["Debug the failing path", "debug"],
    ["Transfer and apply the idea", "transfer"],
    ["Teach the topic back", "teach"],
  ] as const;

  for (const [operation, expected] of cases) {
    const result = build({ operation });
    assert.equal(result.ok, true);
    assert.equal(result.value.user_operation.kind, expected);
  }
});

test("blocks unsupported free-form operations", () => {
  const result = build({ operation: "Contemplate this source broadly." });

  assert.equal(result.ok, false);
  assert.equal(result.value, null);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "unsupported_operation"), true);
});

test("evidence ids are stable and all operation/artifact refs exist in inventory", () => {
  const first = build();
  const second = build();
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);

  const firstIds = first.value.evidence_inventory.map((entry) => entry.id);
  const secondIds = second.value.evidence_inventory.map((entry) => entry.id);
  assert.deepEqual(firstIds, secondIds);

  const inventoryIds = new Set(firstIds);
  for (const evidenceId of first.value.user_operation.required_evidence) {
    assert.equal(inventoryIds.has(evidenceId), true);
  }
  for (const artifact of first.value.thinking_artifacts) {
    assert.equal(artifact.source_evidence.length > 0, true);
    for (const ref of artifact.source_evidence) {
      assert.equal(inventoryIds.has(ref.evidence_id), true);
    }
    for (const evidenceId of artifact.user_operation.required_evidence) {
      assert.equal(inventoryIds.has(evidenceId), true);
    }
  }
});

test("pedagogy input starts without user-cited evidence", () => {
  const result = build();

  assert.equal(result.ok, true);
  assert.deepEqual(result.value.pedagogy_input.cited_evidence, []);
  assert.deepEqual(result.value.pedagogy_input.session_seed.required_evidence, result.value.session_seed.required_evidence);
});

test("evidence inventory excerpts come from source slice text instead of labels", () => {
  const result = build();
  assert.equal(result.ok, true);

  const excerpts = result.value.evidence_inventory.map((entry) => entry.excerpt);
  assert.deepEqual(excerpts.sort(), sourceSlices.map((slice) => slice.excerpt).sort());
  assert.equal(excerpts.includes("JAX foundations slice"), false);
  assert.equal(excerpts.includes("scaling derivation slice"), false);
});

test("happy path bridge output runs through attempt evaluation and readiness", () => {
  const result = build();
  assert.equal(result.ok, true);

  const output = result.value;
  const attempt: UserAttempt = {
    id: "ATTEMPT-001",
    operation_id: output.user_operation.id,
    answer_text: output.user_operation.success_criteria.join(". "),
    selected_evidence: output.evidence_inventory.map((entry) => entry.id),
    declared_confidence: "high",
    declared_unknowns: [],
    created_at: "2026-05-22T12:00:00.000Z",
  };

  const evalOutput = evaluateAttempt({
    attempt,
    operation: output.user_operation,
    artifact: output.thinking_artifacts[0],
    evidenceInventory: output.evidence_inventory,
  });

  const readiness = attemptToReadiness({
    loopId: output.session_seed.session_id,
    attempt,
    evalOutput,
    operation: output.user_operation,
    artifact: output.thinking_artifacts[0],
    conceptSlice: output.concept_slice,
    evidenceInventory: output.evidence_inventory,
  });

  assert.equal(evalOutput.evidenceCheck.result, "confirmed");
  assert.equal(readiness.evidenceStable, true);
});

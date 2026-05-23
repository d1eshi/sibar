import assert from "node:assert/strict";
import test from "node:test";

import { evaluateAttempt } from "../engine/pedagogy/core/attempt-evaluation.ts";
import type { UserAttempt } from "../engine/deep-ownership/index.ts";
import { attemptToReadiness } from "../engine/pedagogy/core/loop.ts";
import { buildMissionSessionBridge } from "../engine/workspace/source-mission/bridge.ts";
import {
  buildFrontierLabMissionSessionBridge,
  frontierLabMissionPreview,
  frontierLabSourceIntake,
  frontierLabSourceIntent,
  frontierLabSourceSignals,
  frontierLabSourceSlices,
} from "../engine/workspace/source-mission/frontier-lab-fixture.ts";
import { validateSourceMissionMVPFlow } from "../engine/workspace/source-mission/validate.ts";

const requiredSignalLabels = [
  "JAX tutorials",
  "Scaling Book",
  "~10M transformer in Colab with JAX, Flax, and Optax",
  "Chinchilla dense-vs-MoE derivation",
  "Pallas kernel faster than ragged_dot for F > D",
];

test("frontier lab fixture validates through the Source Mission MVP flow", () => {
  const result = validateSourceMissionMVPFlow({
    source_intent_input: frontierLabSourceIntent,
    source_intake_result: frontierLabSourceIntake,
    source_signals: frontierLabSourceSignals,
    mission_preview: frontierLabMissionPreview,
  });

  assert.equal(result.ok, true);
  assert.equal(result.value?.source_signals.length, 5);
});

test("fixture contains the five required frontier lab source signals", () => {
  const labels = new Set(frontierLabSourceSignals.map((signal) => signal.label));

  for (const label of requiredSignalLabels) {
    assert.equal(labels.has(label), true, `missing required source signal: ${label}`);
  }
});

test("mission preview keeps first sessions focused instead of exposing a large sidebar", () => {
  assert.equal(frontierLabMissionPreview.first_sessions.length <= 3, true);
  assert.deepEqual(
    frontierLabMissionPreview.first_sessions.map((session) => session.status),
    ["now", "next", "later"],
  );
  assert.equal(
    frontierLabMissionPreview.first_sessions[0].source_slice_refs.includes("SIG-FRONTIER-JAX-TUTORIALS"),
    true,
  );
  assert.equal(
    frontierLabMissionPreview.first_sessions[0].source_slice_refs.includes("SIG-FRONTIER-SCALING-BOOK"),
    true,
  );
});

test("each first session passes through the generic mission session bridge with real SourceSlices", () => {
  const sliceIds = new Set(frontierLabSourceSlices.map((slice) => slice.slice_id));

  for (const proposedSession of frontierLabMissionPreview.first_sessions) {
    const result = buildMissionSessionBridge({
      mission_preview: frontierLabMissionPreview,
      proposed_session: proposedSession,
      source_signals: frontierLabSourceSignals,
      source_slices: frontierLabSourceSlices,
      source_intake: frontierLabSourceIntake,
      user_reason: frontierLabSourceIntent.user_reason,
    });

    assert.equal(result.ok, true);
    assert.equal(result.value.evidence_inventory.length > 0, true);
    assert.equal(
      result.value.session_seed.source_slice_refs.every((sliceRef) => sliceIds.has(sliceRef)),
      true,
    );
    assert.equal(
      result.value.evidence_inventory.every((entry) =>
        frontierLabSourceSlices.some((slice) => slice.excerpt === entry.excerpt),
      ),
      true,
    );
  }
});

test("current frontier lab session bridge runs through attempt evaluation and readiness", () => {
  const output = buildFrontierLabMissionSessionBridge();
  const attempt: UserAttempt = {
    id: "ATTEMPT-FRONTIER-JAX-SCALING-001",
    operation_id: output.user_operation.id,
    answer_text: output.user_operation.success_criteria.join(". "),
    selected_evidence: output.evidence_inventory.map((entry) => entry.id),
    declared_confidence: "high",
    declared_unknowns: [],
    created_at: "2026-05-22T00:00:00.000Z",
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

test("fixture bridge output matches a direct generic buildMissionSessionBridge call", () => {
  const currentSession = frontierLabMissionPreview.first_sessions[0];
  const direct = buildMissionSessionBridge({
    mission_preview: frontierLabMissionPreview,
    proposed_session: currentSession,
    source_signals: frontierLabSourceSignals,
    source_slices: frontierLabSourceSlices,
    source_intake: frontierLabSourceIntake,
    user_reason: frontierLabSourceIntent.user_reason,
  });
  const fixture = buildFrontierLabMissionSessionBridge(currentSession.id);

  assert.equal(direct.ok, true);
  assert.deepEqual(fixture.session_seed, direct.value.session_seed);
  assert.deepEqual(fixture.evidence_inventory, direct.value.evidence_inventory);
  assert.equal(frontierLabSourceIntake.canonical_url?.includes("vladfeinberg.com"), true);
});

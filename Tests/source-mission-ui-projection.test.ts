import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildFrontierLabMissionUiProjection } from "../engine/runtime-source-mission-frontier-lab-ui-projection.ts";
import {
  buildMissionUiProjection,
  MISSION_EXECUTION_JOB_STATUSES,
} from "../engine/runtime-source-mission-ui-projection.ts";
import {
  frontierLabMissionPreview,
  frontierLabSourceIntake,
  frontierLabSourceIntent,
  frontierLabSourceSignals,
  frontierLabSourceSlices,
} from "../engine/runtime-source-mission-frontier-lab-fixture.ts";

function serializedProjectionText(value: unknown): string {
  return JSON.stringify(value).toLowerCase();
}

function allQueueSessions(projection: ReturnType<typeof buildFrontierLabMissionUiProjection>) {
  return [
    ...projection.focused_queue.visible_sessions,
    ...projection.focused_queue.deferred_sessions,
    ...projection.focused_queue.locked_sessions,
  ];
}

test("execution job status contract includes the complete lifecycle", () => {
  assert.deepEqual([...MISSION_EXECUTION_JOB_STATUSES], [
    "queued",
    "running",
    "validating",
    "completed",
    "blocked",
    "failed",
    "cancelled",
  ]);
});

test("frontier-lab projection has mission brief, source context, and at most three visible sessions", () => {
  const projection = buildFrontierLabMissionUiProjection();

  assert.equal(projection.execution_job.status, "completed");
  assert.equal(projection.execution_job.id.length > 0, true);
  assert.equal(Array.isArray(projection.blocked_state), true);
  assert.equal(projection.mission_brief.title, frontierLabMissionPreview.mission_title);
  assert.equal(projection.mission_brief.rationale, frontierLabMissionPreview.mission_rationale);
  assert.equal(projection.mission_brief.source_context.summary, frontierLabMissionPreview.source_summary);
  assert.equal(projection.mission_brief.source_context.user_reason, frontierLabSourceIntent.user_reason);
  assert.equal(projection.mission_brief.source_context.canonical_url, frontierLabSourceIntake.canonical_url);
  assert.equal(projection.focused_queue.queue_scope, "mission_curated");
  assert.equal(projection.focused_queue.visible_sessions.length <= 3, true);
});

test("focused queue uses bridge projection fields instead of raw ProposedSession operation payload", () => {
  const projection = buildFrontierLabMissionUiProjection();
  const sourceSliceIds = new Set(frontierLabSourceSlices.map((slice) => slice.slice_id));
  const sourceSignalIds = new Set(frontierLabSourceSignals.map((signal) => signal.id));

  for (const session of allQueueSessions(projection)) {
    assert.equal(Object.hasOwn(session, "operation"), false);
    assert.equal(Object.hasOwn(session, "recommended_artifacts"), false);
    assert.equal(session.operation_kind.length > 0, true);
    assert.equal(session.operation_label.length > 0, true);
    assert.equal(session.artifact_kinds.length >= 1, true);
    assert.equal(session.artifact_kinds.length <= 3, true);
    assert.equal(session.artifacts.length >= 1, true);
    assert.equal(session.artifacts.length <= 3, true);

    for (const artifact of session.artifacts) {
      assert.equal(artifact.id.length > 0, true);
      assert.equal(artifact.title.length > 0, true);
    }
    for (const sourceSliceRef of session.source_slice_refs) {
      assert.equal(sourceSliceIds.has(sourceSliceRef), true);
      assert.equal(sourceSignalIds.has(sourceSliceRef), false);
    }
    for (const sourceSignalId of session.source_signal_ids) {
      assert.equal(sourceSignalIds.has(sourceSignalId), true);
    }
    if (session.status !== "now") {
      assert.equal(session.reason.length > 0, true);
    }
  }
});

test("focused queue exposes active, next, and one later orientation session at most", () => {
  const projection = buildFrontierLabMissionUiProjection();
  const visibleStatuses = projection.focused_queue.visible_sessions.map((session) => session.status);

  assert.deepEqual(visibleStatuses, ["now", "next", "later"]);
  assert.equal(projection.focused_queue.visible_sessions.length <= 3, true);
});

test("product hierarchy is Mission -> Track -> Session -> Artifact without disallowed product strings", () => {
  const projection = buildFrontierLabMissionUiProjection();

  assert.equal(projection.mission_brief.mission_id.startsWith("MIS-"), true);
  assert.equal(projection.mission_brief.tracks.length > 0, true);
  assert.equal(projection.focused_queue.active_track.id, projection.active_session.track_id);
  assert.equal(
    projection.mission_brief.tracks.some((track) => track.session_ids.includes(projection.active_session.id)),
    true,
  );
  assert.equal(projection.active_session.artifacts.length > 0, true);

  const text = serializedProjectionText(projection);
  assert.equal(text.includes("workspace inside workspace"), false);
  assert.equal(text.includes("global mastery"), false);
});

test("mission-curated focused queue can show cross-track sessions while brief tracks retain hierarchy", () => {
  const projection = buildFrontierLabMissionUiProjection();
  const visibleTrackIds = new Set(projection.focused_queue.visible_sessions.map((session) => session.track_id));

  assert.equal(projection.focused_queue.queue_scope, "mission_curated");
  assert.equal(visibleTrackIds.has(projection.focused_queue.active_track.id), true);
  assert.equal(visibleTrackIds.size > 1, true);

  for (const track of projection.mission_brief.tracks) {
    const expectedSessionIds = frontierLabMissionPreview.first_sessions
      .filter((session) => session.track_id === track.id)
      .map((session) => session.id);

    assert.deepEqual(track.session_ids, expectedSessionIds);
  }
});

test("deferred and locked queue sessions carry explicit non-empty reasons", () => {
  const projection = buildMissionUiProjection({
    source_intent_input: frontierLabSourceIntent,
    source_intake_result: frontierLabSourceIntake,
    source_signals: frontierLabSourceSignals,
    source_slices: frontierLabSourceSlices,
    mission_preview: {
      ...frontierLabMissionPreview,
      first_sessions: [
        ...frontierLabMissionPreview.first_sessions,
        {
          id: "SES-FRONTIER-DEFERRED-004",
          track_id: "TRK-FRONTIER-DEFERRED-SYSTEMS",
          title: "Defer extra Pallas orientation",
          source_slice_refs: ["SLICE-FRONTIER-PALLAS-KERNEL"],
          operation: "Explain the deferred Pallas orientation target with cited source evidence.",
          recommended_artifacts: ["technical note"],
          status: "later",
          prerequisite_note: "Defer until the first later orientation has been reviewed.",
        },
        {
          id: "SES-FRONTIER-LOCKED-005",
          track_id: "TRK-FRONTIER-DEFERRED-SYSTEMS",
          title: "Lock kernel implementation until evidence is complete",
          source_slice_refs: ["SLICE-FRONTIER-PALLAS-KERNEL"],
          operation: "Trace the locked kernel implementation prerequisites with cited source evidence.",
          recommended_artifacts: ["technical note"],
          status: "locked",
        },
      ],
    },
  });

  assert.equal(projection.focused_queue.deferred_sessions.length > 0, true);
  assert.equal(projection.focused_queue.locked_sessions.length > 0, true);
  for (const session of [...projection.focused_queue.deferred_sessions, ...projection.focused_queue.locked_sessions]) {
    assert.notEqual(session.status, "now");
    assert.equal(session.reason.length > 0, true);
  }
});

test("queue reasons fall back when prerequisite notes are empty or whitespace", () => {
  const projection = buildMissionUiProjection({
    source_intent_input: frontierLabSourceIntent,
    source_intake_result: frontierLabSourceIntake,
    source_signals: frontierLabSourceSignals,
    source_slices: frontierLabSourceSlices,
    mission_preview: {
      ...frontierLabMissionPreview,
      first_sessions: [
        {
          ...frontierLabMissionPreview.first_sessions[0],
          prerequisite_note: "",
        },
        {
          ...frontierLabMissionPreview.first_sessions[1],
          prerequisite_note: "   ",
        },
        {
          ...frontierLabMissionPreview.first_sessions[2],
          prerequisite_note: "\n\t ",
        },
        {
          id: "SES-FRONTIER-LOCKED-WHITESPACE-006",
          track_id: "TRK-FRONTIER-DEFERRED-SYSTEMS",
          title: "Lock whitespace prerequisite note",
          source_slice_refs: ["SLICE-FRONTIER-PALLAS-KERNEL"],
          operation: "Trace the locked prerequisite note fallback with cited source evidence.",
          recommended_artifacts: ["technical note"],
          status: "locked",
          prerequisite_note: " ",
        },
      ],
    },
  });

  const sessionsByStatus = new Map(allQueueSessions(projection).map((session) => [session.status, session.reason]));

  assert.equal(sessionsByStatus.get("now"), "Active source-backed session");
  assert.equal(sessionsByStatus.get("next"), "Next focused session");
  assert.equal(sessionsByStatus.get("later"), "Deferred orientation target");
  assert.equal(sessionsByStatus.get("locked"), "Locked until prior evidence is complete");
});

test("generic Mission UI projection module does not import the frontier-lab fixture helper", () => {
  const source = readFileSync(new URL("../engine/runtime-source-mission-ui-projection.ts", import.meta.url), "utf8");

  assert.equal(source.includes("runtime-source-mission-frontier-lab-fixture"), false);
  assert.equal(source.includes("buildFrontierLabMissionUiProjection"), false);
});

test("active session uses bridge output with required evidence and one to three artifacts", () => {
  const projection = buildFrontierLabMissionUiProjection();
  const inventoryIds = new Set(projection.active_session.evidence_inventory.map((entry) => entry.id));

  assert.deepEqual(
    projection.active_session.required_evidence,
    projection.active_session.operation.required_evidence,
  );
  assert.equal(projection.active_session.required_evidence.length > 0, true);
  assert.equal(projection.active_session.artifacts.length >= 1, true);
  assert.equal(projection.active_session.artifacts.length <= 3, true);

  for (const evidenceId of projection.active_session.required_evidence) {
    assert.equal(inventoryIds.has(evidenceId), true);
  }
  for (const artifact of projection.active_session.artifacts) {
    assert.equal(artifact.evidence_refs.length > 0, true);
    assert.deepEqual(artifact.required_evidence, projection.active_session.required_evidence);
    for (const evidenceRef of artifact.evidence_refs) {
      assert.equal(inventoryIds.has(evidenceRef.evidence_id), true);
    }
  }
});

test("next actions are two or three", () => {
  const projection = buildFrontierLabMissionUiProjection();

  assert.equal(projection.next_actions.length >= 2, true);
  assert.equal(projection.next_actions.length <= 3, true);
});

test("reproducibility hash is stable across identical calls", () => {
  const first = buildFrontierLabMissionUiProjection();
  const second = buildFrontierLabMissionUiProjection();

  assert.equal(first.reproducibility_hash, second.reproducibility_hash);
  assert.equal(first.generated_at, second.generated_at);
});

test("selecting next session changes active session but keeps same mission and source map", () => {
  const current = buildFrontierLabMissionUiProjection();
  const nextSessionId = frontierLabMissionPreview.first_sessions[1].id;
  const next = buildFrontierLabMissionUiProjection(nextSessionId);

  assert.notEqual(current.active_session.id, next.active_session.id);
  assert.equal(next.active_session.id, nextSessionId);
  assert.deepEqual(current.mission_brief, next.mission_brief);
  assert.deepEqual(current.source_map, next.source_map);
});

test("generic builder projects the frontier-lab inputs without fixture-specific UI hardcoding", () => {
  const projection = buildMissionUiProjection({
    source_intent_input: frontierLabSourceIntent,
    source_intake_result: frontierLabSourceIntake,
    source_signals: frontierLabSourceSignals,
    source_slices: frontierLabSourceSlices,
    mission_preview: frontierLabMissionPreview,
  });

  assert.equal(projection.active_session.id, frontierLabMissionPreview.first_sessions[0].id);
  assert.equal(projection.source_map.role, "secondary_advanced");
  assert.equal(projection.source_map.signals.length, frontierLabSourceSignals.length);
  assert.equal(projection.source_map.slices.length, frontierLabSourceSlices.length);
  assert.equal(projection.active_session.readiness_scope.scope, "active_session_operation");
  assert.equal(serializedProjectionText(projection).includes("mission readiness"), false);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  validateMissionPreview,
  validateSourceIntakeResult,
  validateSourceIntentInput,
  validateSourceMissionMVPFlow,
  validateSourceSignals,
} from "../engine/runtime-source-mission-validate.ts";

function makeValidFrontierLabPayload() {
  const sourceIntent = {
    schema: "SourceIntentInput",
    version: "0.1.0",
    id: "INTENT-FRONI-LAB-001",
    created_at: "2026-05-21T12:00:00Z",
    source_input: {
      kind: "url",
      value: "https://www.frontierlab.org/jax-notes",
    },
    user_reason: "I want a bounded frontier lab study plan before I start.",
    optional_goal: "Understand scalable JAX systems and kernels.",
    optional_constraints: ["bounded", "source-driven"],
  };

  const sourceIntake = {
    schema: "SourceIntakeResult",
    version: "0.1.0",
    id: "INTAKE-FRONI-LAB-001",
    source_id: "SOURCE-FRONI-LAB-001",
    source_kind: "url",
    canonical_url: "https://www.frontierlab.org/jax-notes",
    title: "Frontier Lab notes",
    author: "Frontier Lab",
    published_at: "2026-05-21T11:40:00Z",
    fetched_at: "2026-05-21T12:00:10Z",
    raw_text_ref: "frontier-lab/source.txt",
    readable_text_ref: "frontier-lab/clean.txt",
    source_intent_id: "INTENT-FRONI-LAB-001",
    extraction_status: "completed",
    diagnostics: [
      {
        code: "ok.partial_summary",
        message: "Source intake completed with partial ambiguity.",
        severity: "info",
      },
    ],
  };

  const sourceSignals = [
    {
      schema: "SourceSignal",
      version: "0.1.0",
      id: "SIG-FRONI-001",
      kind: "resource",
      label: "JAX tutorials",
      source_excerpt_ref: "frontier-lab#segment-001",
      confidence: "high",
      user_relevance: "explicit",
    },
    {
      schema: "SourceSignal",
      version: "0.1.0",
      id: "SIG-FRONI-002",
      kind: "resource",
      label: "The JAX scaling book",
      source_excerpt_ref: "frontier-lab#segment-002",
      confidence: "high",
      user_relevance: "explicit",
    },
    {
      schema: "SourceSignal",
      version: "0.1.0",
      id: "SIG-FRONI-003",
      kind: "output",
      label: "A rough 10M parameter transformer in JAX, Flax, and Optax",
      source_excerpt_ref: "frontier-lab#segment-003",
      confidence: "medium",
      user_relevance: "inferred",
    },
    {
      schema: "SourceSignal",
      version: "0.1.0",
      id: "SIG-FRONI-004",
      kind: "claim",
      label: "Chinchilla dense-vs-MoE derivation",
      source_excerpt_ref: "frontier-lab#segment-004",
      confidence: "medium",
      user_relevance: "explicit",
    },
    {
      schema: "SourceSignal",
      version: "0.1.0",
      id: "SIG-FRONI-005",
      kind: "skill_area",
      label: "Pallas kernel work",
      source_excerpt_ref: "frontier-lab#segment-005",
      confidence: "low",
      user_relevance: "explicit",
    },
  ];

  const missionPreview = {
    schema: "MissionPreview",
    version: "0.1.0",
    mission_title: "Frontier Lab source-driven mission",
    mission_rationale: "A bounded path focused on first-readable claims and systems-level practice.",
    user_goal: "Build a practical, bounded understanding of frontier-scale JAX and scaling patterns.",
    source_summary: "Frontier lab article, JAX scaling references, and system-level work.",
    proposed_tracks: [
      {
        id: "TRK-FOUNDATION",
        title: "JAX foundations and scaling context",
        rationale: "Anchor the study on explicit source claims before implementation attempts.",
        source_signal_ids: ["SIG-FRONI-001", "SIG-FRONI-002"],
        status: "recommended",
      },
      {
        id: "TRK-IMPLEMENTATION",
        title: "Implementation and kernel path",
        rationale: "Practice a compact implementation route from sources and derive open questions.",
        source_signal_ids: ["SIG-FRONI-003", "SIG-FRONI-005"],
        status: "optional",
      },
    ],
    first_sessions: [
      {
        id: "SES-001",
        track_id: "TRK-FOUNDATION",
        title: "Read source and map claims",
        source_slice_refs: ["SIG-FRONI-001", "SIG-FRONI-002"],
        operation: "Map the source excerpts into a 1-page summary and one question.",
        recommended_artifacts: ["technical note", "recall card"],
        status: "now",
      },
      {
        id: "SES-002",
        track_id: "TRK-IMPLEMENTATION",
        title: "Build a minimal transformer pass",
        source_slice_refs: ["SIG-FRONI-003", "SIG-FRONI-005"],
        operation: "Implement one constrained mini-pipeline from the source slice.",
        recommended_artifacts: ["code probe", "transfer exercise"],
        status: "next",
      },
    ],
    open_questions: ["Which claim is most risky to implement first?"],
    confidence: "high",
  };

  return { sourceIntent, sourceIntake, sourceSignals, missionPreview };
}

test("valid frontier-lab payload validates through the MVP chain", () => {
  const payload = makeValidFrontierLabPayload();
  const flow = validateSourceMissionMVPFlow({
    source_intent_input: payload.sourceIntent,
    source_intake_result: payload.sourceIntake,
    source_signals: payload.sourceSignals,
    mission_preview: payload.missionPreview,
  });

  assert.equal(flow.ok, true);
  assert.equal(flow.value !== null, true);
  assert.equal(flow.value?.source_signals.length, 5);
  assert.equal(flow.value?.mission_preview.proposed_tracks.length, 2);
  assert.equal(flow.value?.mission_preview.first_sessions.length, 2);
});

test("missing user_reason fails", () => {
  const payload = makeValidFrontierLabPayload();
  const missingReason = {
    ...payload.sourceIntent,
    user_reason: "",
  };

  const result = validateSourceIntentInput(missingReason);
  assert.equal(result.ok, false);
  assert.equal(result.issues.some((issue) => issue.code === "source_intent_input_user_reason"), true);
});

test("SourceSignal confidence must be categorical", () => {
  const payload = makeValidFrontierLabPayload();
  const invalidSignals = [
    {
      ...payload.sourceSignals[0],
      confidence: "n/a",
    },
    ...payload.sourceSignals.slice(1),
  ];

  const result = validateSourceSignals(invalidSignals);
  assert.equal(result.ok, false);
  assert.equal(result.issues.some((issue) => issue.code === "source_signal_confidence"), true);
});

test("MissionPreview confidence must be categorical", () => {
  const payload = makeValidFrontierLabPayload();
  const invalidMissionPreview = {
    ...payload.missionPreview,
    confidence: "n/a",
  };

  const result = validateMissionPreview(invalidMissionPreview, payload.sourceSignals);
  assert.equal(result.ok, false);
  assert.equal(result.issues.some((issue) => issue.code === "mission_preview_confidence"), true);
});

test("SourceIntakeResult must use canonical source fields", () => {
  const payload = makeValidFrontierLabPayload();
  const invalidIntake = {
    ...payload.sourceIntake,
    raw_text_ref: "",
    readable_text_ref: "",
  };

  const result = validateSourceIntakeResult(invalidIntake);
  assert.equal(result.ok, false);
  assert.equal(
    result.issues.some((issue) =>
      issue.code === "source_intake_raw_text_ref" || issue.code === "source_intake_readable_text_ref"),
    true,
  );
});

test("SourceSignal cannot be implicit session without source signal references", () => {
  const payload = makeValidFrontierLabPayload();
  const invalidMissionPreview = {
    ...payload.missionPreview,
    proposed_tracks: [
      {
        ...payload.missionPreview.proposed_tracks[0],
        source_signal_ids: ["SIG-MISSING"],
      },
      ...payload.missionPreview.proposed_tracks.slice(1),
    ],
    first_sessions: [
      {
        ...payload.missionPreview.first_sessions[0],
        source_slice_refs: ["SIG-MISSING-TWO"],
      },
      ...payload.missionPreview.first_sessions.slice(1),
    ],
  };

  const result = validateMissionPreview(invalidMissionPreview, payload.sourceSignals);
  assert.equal(result.ok, false);
  const codes = result.issues.map((issue) => issue.code);
  assert.equal(codes.includes("mission_preview_unknown_signal_reference"), true);
});

test("unknown track id in first_sessions fails", () => {
  const payload = makeValidFrontierLabPayload();
  const invalidMissionPreview = {
    ...payload.missionPreview,
    first_sessions: [
      {
        ...payload.missionPreview.first_sessions[0],
        track_id: "TRK-UNKNOWN",
      },
      ...payload.missionPreview.first_sessions.slice(1),
    ],
  };

  const result = validateMissionPreview(invalidMissionPreview, payload.sourceSignals);
  assert.equal(result.ok, false);
  assert.equal(result.issues.some((issue) => issue.code === "mission_preview_unknown_track_reference"), true);
});

test("first_sessions above 5 fails", () => {
  const payload = makeValidFrontierLabPayload();
  const invalidMissionPreview = {
    ...payload.missionPreview,
    first_sessions: [
      ...payload.missionPreview.first_sessions,
      {
        id: "SES-003",
        track_id: "TRK-FOUNDATION",
        title: "Second foundation session",
        source_slice_refs: ["SIG-FRONI-001"],
        operation: "Add a second bounded reading checkpoint from the same source.",
        recommended_artifacts: ["brief note"],
        status: "later",
      },
      {
        id: "SES-004",
        track_id: "TRK-FOUNDATION",
        title: "Third foundation session",
        source_slice_refs: ["SIG-FRONI-002"],
        operation: "Add a follow-up checkpoint with one open question.",
        recommended_artifacts: ["recall card"],
        status: "later",
      },
      {
        id: "SES-005",
        track_id: "TRK-FOUNDATION",
        title: "Fourth foundation session",
        source_slice_refs: ["SIG-FRONI-003"],
        operation: "Consolidate a claim with a compact question map.",
        recommended_artifacts: ["comparison chart"],
        status: "later",
      },
      {
        id: "SES-006",
        track_id: "TRK-FOUNDATION",
        title: "Fifth foundation session",
        source_slice_refs: ["SIG-FRONI-004"],
        operation: "Map remaining claims into a compact practice action.",
        recommended_artifacts: ["practice script"],
        status: "later",
      },
    ],
  };

  const result = validateMissionPreview(invalidMissionPreview, payload.sourceSignals);
  assert.equal(result.ok, false);
  assert.equal(result.issues.some((issue) => issue.code === "mission_preview_first_sessions_max"), true);
});

test("bad URL source input fails", () => {
  const payload = makeValidFrontierLabPayload();
  const invalidIntent = {
    ...payload.sourceIntent,
    source_input: {
      kind: "url",
      value: "notaurl",
    },
  };

  const result = validateSourceIntentInput(invalidIntent);
  assert.equal(result.ok, false);
  assert.equal(
    result.issues.some((issue) =>
      issue.code === "source_intent_input.source_input_url_invalid"
      || issue.code === "source_intent_input_url_invalid"),
    true,
  );
});

test("blocked SourceIntakeResult requires an error diagnostic", () => {
  const payload = makeValidFrontierLabPayload();
  const invalidIntake = {
    ...payload.sourceIntake,
    extraction_status: "blocked",
    diagnostics: [
      {
        code: "http.fetch_timeout",
        message: "Timeout while fetching source.",
        severity: "warning",
      },
    ],
  };

  const signalsResult = validateSourceSignals(payload.sourceSignals);
  assert.equal(signalsResult.ok, true);
  const intakeResult = validateSourceIntakeResult(invalidIntake);
  assert.equal(intakeResult.ok, false);
  assert.equal(
    intakeResult.issues.some((issue) => issue.code === "source_intake_status_requires_error_diagnostic"),
    true,
  );
});

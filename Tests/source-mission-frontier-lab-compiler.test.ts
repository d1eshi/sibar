import assert from "node:assert/strict";
import test from "node:test";

import type { SourceIntentInput } from "../src/runtime-source-mission-contracts.ts";
import { SOURCE_MISSION_SCHEMA_VERSION } from "../src/runtime-source-mission-contracts.ts";
import {
  compileFrontierLabMissionFromIntent,
} from "../src/runtime-source-mission-frontier-lab-compiler.ts";
import {
  FRONTIER_LAB_BLOG_URL,
  frontierLabMissionPreview,
  frontierLabSourceIntent,
  frontierLabSourceSignals,
  frontierLabSourceSlices,
} from "../src/runtime-source-mission-frontier-lab-fixture.ts";
import { buildFrontierLabMissionUiProjection } from "../src/runtime-source-mission-frontier-lab-ui-projection.ts";
import { validateSourceMissionMVPFlow } from "../src/runtime-source-mission-validate.ts";

function makeIntent(overrides: Partial<SourceIntentInput> = {}): SourceIntentInput {
  return {
    ...frontierLabSourceIntent,
    id: "INTENT-FRONTIER-LAB-BLOG-COMPILER-TEST",
    created_at: "2026-05-22T12:00:00.000Z",
    user_reason: "Use this source to build a small custom frontier-lab preparation queue.",
    optional_goal: "Keep the first pass bounded to source-backed JAX and scaling foundations.",
    optional_constraints: ["preserve source evidence", "avoid broad curriculum expansion"],
    ...overrides,
  };
}

function assertFailureHasNoResultFields(result: ReturnType<typeof compileFrontierLabMissionFromIntent>): void {
  assert.equal(result.ok, false);
  assert.equal(Object.hasOwn(result, "source_intent_input"), false);
  assert.equal(Object.hasOwn(result, "source_intake_result"), false);
  assert.equal(Object.hasOwn(result, "source_signals"), false);
  assert.equal(Object.hasOwn(result, "source_slices"), false);
  assert.equal(Object.hasOwn(result, "mission_preview"), false);
  assert.equal(Object.hasOwn(result, "ui_projection"), false);
}

test("canonical frontier-lab URL compiles and validates as an MVP flow", () => {
  const intent = makeIntent();
  const result = compileFrontierLabMissionFromIntent(intent);

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.diagnostics.map((diagnostic) => diagnostic.code).join(", "));

  assert.equal(result.source_intent_input.id, intent.id);
  assert.equal(result.source_intent_input.created_at, intent.created_at);
  assert.equal(result.source_intent_input.user_reason, intent.user_reason);
  assert.equal(result.source_intent_input.optional_goal, intent.optional_goal);
  assert.deepEqual(result.source_intent_input.optional_constraints, intent.optional_constraints);
  assert.equal(result.source_intent_input.source_input.value, FRONTIER_LAB_BLOG_URL);
  assert.equal(result.source_intake_result.source_intent_id, intent.id);
  assert.equal(result.source_intake_result.canonical_url, FRONTIER_LAB_BLOG_URL);

  const validation = validateSourceMissionMVPFlow({
    source_intent_input: result.source_intent_input,
    source_intake_result: result.source_intake_result,
    source_signals: result.source_signals,
    mission_preview: result.mission_preview,
  });

  assert.equal(validation.ok, true);
});

test("frontier-lab URL variants compile and canonicalize to the supported blog URL", () => {
  const variantUrl = `${FRONTIER_LAB_BLOG_URL}/?utm_source=test#practical-next-steps`;
  const result = compileFrontierLabMissionFromIntent(makeIntent({
    source_input: {
      kind: "url",
      value: variantUrl,
    },
  }));

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.diagnostics.map((diagnostic) => diagnostic.code).join(", "));

  assert.equal(result.source_intent_input.source_input.value, FRONTIER_LAB_BLOG_URL);
  assert.equal(result.source_intake_result.canonical_url, FRONTIER_LAB_BLOG_URL);
});

test("custom user reason reaches the compiled UI projection source context", () => {
  const userReason = "I want a compact plan from this exact blog before choosing implementation work.";
  const result = compileFrontierLabMissionFromIntent(makeIntent({ user_reason: userReason }));

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.diagnostics.map((diagnostic) => diagnostic.code).join(", "));

  assert.equal(result.ui_projection?.mission_brief.source_context.user_reason, userReason);
});

test("unsupported URL returns diagnostics without result fields", () => {
  const result = compileFrontierLabMissionFromIntent(makeIntent({
    source_input: {
      kind: "url",
      value: "https://example.com/unsupported-frontier-lab-source",
    },
  }));

  assertFailureHasNoResultFields(result);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "frontier_lab.unsupported_url"), true);
});

test("non-url intent returns diagnostics without result fields", () => {
  const result = compileFrontierLabMissionFromIntent(makeIntent({
    source_input: {
      kind: "pasted_text",
      value: "How to land a job at a frontier lab",
    },
  }));

  assertFailureHasNoResultFields(result);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "frontier_lab.unsupported_source_kind"), true);
});

test("supported URL with invalid intent fields is blocked by compiler validation", () => {
  const result = compileFrontierLabMissionFromIntent(makeIntent({
    user_reason: "",
  }));

  assertFailureHasNoResultFields(result);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "source_intent_input_user_reason"), true);
});

test("compiled output does not share mutable references with frontier-lab fixture exports", () => {
  const result = compileFrontierLabMissionFromIntent(makeIntent());

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.diagnostics.map((diagnostic) => diagnostic.code).join(", "));

  result.source_signals[0].label = "Mutated signal label";
  result.source_slices[0].excerpt = "Mutated slice excerpt";
  result.mission_preview.first_sessions[0].title = "Mutated session title";

  assert.equal(frontierLabSourceSignals[0].label, "JAX tutorials");
  assert.equal(
    frontierLabSourceSlices[0].excerpt,
    "The Practical Next Steps section points readers first to JAX tutorials and the Scaling Book before deeper implementation work.",
  );
  assert.equal(frontierLabMissionPreview.first_sessions[0].title, "Map the JAX and Scaling Book starting points");
});

test("frontier-lab UI projection helper remains compatible with active session selection", () => {
  const current = buildFrontierLabMissionUiProjection();
  const nextSessionId = frontierLabMissionPreview.first_sessions[1].id;
  const next = buildFrontierLabMissionUiProjection(nextSessionId);

  assert.equal(current.active_session.id, frontierLabMissionPreview.first_sessions[0].id);
  assert.equal(next.active_session.id, nextSessionId);
  assert.deepEqual(current.mission_brief, next.mission_brief);
  assert.deepEqual(current.source_map, next.source_map);
});

test("URL helper-compatible intent values use the current Source Mission schema version", () => {
  const result = compileFrontierLabMissionFromIntent(makeIntent({
    version: SOURCE_MISSION_SCHEMA_VERSION,
  }));

  assert.equal(result.ok, true);
});

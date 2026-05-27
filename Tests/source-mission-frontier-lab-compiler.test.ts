import assert from "node:assert/strict";
import test from "node:test";

import type { SourceIntentInput } from "../engine/workspace/source-mission/contracts.ts";
import { SOURCE_MISSION_SCHEMA_VERSION } from "../engine/workspace/source-mission/contracts.ts";
import {
  compileFrontierLabMissionFromIntent,
  compileFrontierLabMissionFromSource,
} from "../engine/workspace/source-mission/frontier-lab-compiler.ts";
import {
  FRONTIER_LAB_BLOG_URL,
  frontierLabMissionPreview,
  frontierLabSourceIntent,
  frontierLabSourceSignals,
  frontierLabSourceSlices,
} from "../engine/workspace/source-mission/frontier-lab-fixture.ts";
import { buildFrontierLabMissionUiProjection } from "../engine/workspace/source-mission/frontier-lab-ui-projection.ts";
import { validateSourceMissionMVPFlow } from "../engine/workspace/source-mission/validate.ts";

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

const frontierLabPastedText = `
  Practical next steps for a frontier lab loop:
  start with the JAX tutorials and the Scaling Book.
  Then implement a small transformer with JAX, Flax, and Optax.
  Later derive Chinchilla dense-vs-MoE tradeoffs.
  Finally, write a Pallas kernel that can beat ragged_dot when F is greater than D.
`;

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

test("pasted frontier-lab text with explicit markers compiles without inventing a canonical URL", () => {
  const intent = makeIntent({
    source_input: {
      kind: "pasted_text",
      value: frontierLabPastedText,
    },
  });
  const result = compileFrontierLabMissionFromIntent(intent);

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.diagnostics.map((diagnostic) => diagnostic.code).join(", "));

  assert.equal(result.source_intent_input.source_input.kind, "pasted_text");
  assert.equal(result.source_intent_input.source_input.value, frontierLabPastedText);
  assert.equal(result.source_intake_result.source_kind, "pasted_text");
  assert.equal(result.source_intake_result.canonical_url, undefined);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "frontier_lab.static_text_adapter"), true);
  assert.equal(
    result.source_intake_result.diagnostics.some((diagnostic) => diagnostic.code === "fixture.static_text_markers"),
    true,
  );
});

test("selected frontier-lab text with explicit markers preserves selected_text source kind", () => {
  const result = compileFrontierLabMissionFromIntent(makeIntent({
    source_input: {
      kind: "selected_text",
      value: frontierLabPastedText,
    },
  }));

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.diagnostics.map((diagnostic) => diagnostic.code).join(", "));

  assert.equal(result.source_intent_input.source_input.kind, "selected_text");
  assert.equal(result.source_intake_result.source_kind, "selected_text");
  assert.equal(result.source_intake_result.canonical_url, undefined);
});

test("source helper infers URL and pasted frontier-lab text inputs", () => {
  const urlResult = compileFrontierLabMissionFromSource({
    source: `${FRONTIER_LAB_BLOG_URL}?utm_source=test`,
    user_reason: "Use this source to build a compact frontier-lab mission.",
  });
  const pastedResult = compileFrontierLabMissionFromSource({
    source: frontierLabPastedText,
    user_reason: "Use this pasted source to build a compact frontier-lab mission.",
  });

  assert.equal(urlResult.ok, true);
  assert.equal(pastedResult.ok, true);
  if (!urlResult.ok || !pastedResult.ok) throw new Error("Expected both source-helper inputs to compile.");

  assert.equal(urlResult.source_intent_input.source_input.kind, "url");
  assert.equal(urlResult.source_intent_input.source_input.value, FRONTIER_LAB_BLOG_URL);
  assert.equal(pastedResult.source_intent_input.source_input.kind, "pasted_text");
  assert.equal(pastedResult.source_intake_result.canonical_url, undefined);
});

test("pasted text without enough frontier-lab markers returns diagnostics without result fields", () => {
  const result = compileFrontierLabMissionFromIntent(makeIntent({
    source_input: {
      kind: "pasted_text",
      value: "How to land a job at a frontier lab",
    },
  }));

  assertFailureHasNoResultFields(result);
  assert.equal(
    result.diagnostics.some((diagnostic) => diagnostic.code === "frontier_lab.insufficient_source_markers"),
    true,
  );
});

test("file intent remains unsupported by the frontier-lab compiler", () => {
  const result = compileFrontierLabMissionFromIntent(makeIntent({
    source_input: {
      kind: "file",
      value: "frontier-lab.md",
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

import assert from "node:assert/strict";
import test from "node:test";

import { parseModelOutput, parseModelOutputStrict } from "../engine/pedagogoai/workspace-intent/parse-model-output.ts";
import {
  WORKSPACE_INTENT_FIXTURE,
  WORKSPACE_PLAN_FIXTURE,
} from "../engine/pedagogoai/workspace-intent/fixtures.ts";
import { generateWorkspacePlan as generateWorkspacePlanFromFixture } from "../engine/pedagogoai/workspace-intent/adapters/fixture.ts";
import { validateWorkspacePlan } from "../engine/pedagogoai/workspace-intent/validate.ts";
import { PedagogoAIWorkspaceIntent } from "../engine/pedagogoai/index.ts";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

test("fixture plan validates successfully", () => {
  const result = validateWorkspacePlan(WORKSPACE_PLAN_FIXTURE, WORKSPACE_INTENT_FIXTURE);
  assert.equal(result.ok, true, "fixture workspace plan must be valid");
  assert.equal(result.plan?.plan_id, WORKSPACE_PLAN_FIXTURE.plan_id);
  assert.equal(result.plan?.open_questions_for_user.length, WORKSPACE_PLAN_FIXTURE.open_questions_for_user.length);
  assert.equal(result.plan?.first_session.learning_node_ids[0], "NODE-001");
  assert.equal(result.plan?.title, WORKSPACE_INTENT_FIXTURE.workspace_title);
  assert.equal(result.warnings.length, 0);
});

test("compiler contract is exposed through the PedagogoAI workspace intent facade", () => {
  const result = PedagogoAIWorkspaceIntent.WorkspaceIntentCompiler.validateWorkspacePlan(
    WORKSPACE_PLAN_FIXTURE,
    WORKSPACE_INTENT_FIXTURE,
  );

  assert.equal(result.ok, true);
});

test("fixture adapter returns a valid and deterministic plan", () => {
  const first = generateWorkspacePlanFromFixture(WORKSPACE_INTENT_FIXTURE);
  const second = generateWorkspacePlanFromFixture(WORKSPACE_INTENT_FIXTURE);
  assert.deepEqual(first, second);
  assert.equal(first.source_bundle, WORKSPACE_INTENT_FIXTURE.source_bundle);
  assert.equal(first.source_bundle.bundle_id, WORKSPACE_INTENT_FIXTURE.source_bundle.bundle_id);
  const validated = validateWorkspacePlan(first, WORKSPACE_INTENT_FIXTURE);
  assert.equal(validated.ok, true);
});

test("parseModelOutput handles plain JSON and validates", () => {
  const raw = JSON.stringify(WORKSPACE_PLAN_FIXTURE);
  const parsed = parseModelOutput(raw);
  const validated = validateWorkspacePlan(parsed);
  assert.equal(validated.ok, true);
  assert.equal(validated.plan?.source_summary, WORKSPACE_PLAN_FIXTURE.source_summary);
  assert.equal(validated.plan?.open_questions_for_user.length, WORKSPACE_PLAN_FIXTURE.open_questions_for_user.length);
});

test("parseModelOutput handles fenced JSON in surrounding text", () => {
  const raw = [
    "Model plan below.",
    "```json",
    JSON.stringify(WORKSPACE_PLAN_FIXTURE),
    "```",
    "That's it.",
  ].join("\n");
  const parsed = parseModelOutputStrict(raw);
  assert.equal(parsed.plan_id, WORKSPACE_PLAN_FIXTURE.plan_id);
  assert.equal(parsed.first_session.session_id, "SES-001");
});

test("parseModelOutput rejects invalid JSON", () => {
  assert.throws(() => {
    parseModelOutput("there is no json in this text");
  }, /model_output_invalid_or_unclosed_json/);
});

test("validator rejects invented fields and missing required fields", () => {
  const withInvented = { ...WORKSPACE_PLAN_FIXTURE, invented_field: "boom" } as {
    [key: string]: unknown;
  };
  const inventedResult = validateWorkspacePlan(withInvented, WORKSPACE_INTENT_FIXTURE);
  assert.equal(inventedResult.ok, false);
  assert.ok(inventedResult.issues.some((issue) => issue.code === "schema_unknown_fields"));

  const missingFieldsPayload = clone(WORKSPACE_PLAN_FIXTURE) as {
    title?: string;
    first_session?: unknown;
    open_questions_for_user?: unknown;
  };
  delete missingFieldsPayload.title;
  delete missingFieldsPayload.first_session;
  delete missingFieldsPayload.open_questions_for_user;
  const missingResult = validateWorkspacePlan(missingFieldsPayload, WORKSPACE_INTENT_FIXTURE);
  assert.equal(missingResult.ok, false);
  assert.ok(missingResult.issues.some((issue) => issue.code === "schema_required_fields"));
  assert.ok(missingResult.issues.some((issue) => issue.code === "schema_first_session_required"));
  assert.ok(missingResult.issues.some((issue) => issue.code === "schema_open_questions_not_array"));
});

test("pedagogical invariants fail on invalid plan", () => {
  const invalid = clone(WORKSPACE_PLAN_FIXTURE);
  invalid.anti_overload_decision.bounded = false;
  invalid.goal = "I want global mastery of the repo";
  invalid.learning_nodes[0].source_refs = ["MISSING-REF"];
  invalid.first_session.learning_node_ids = ["UNKNOWN-NODE"];
  invalid.open_questions_for_user = [];

  const result = validateWorkspacePlan(invalid);
  assert.equal(result.ok, false);
  const codes = result.issues.map((issue) => issue.code);
  assert.ok(codes.includes("pedagogy_forbidden_mastery_claim"));
  assert.ok(codes.includes("pedagogy_unbounded"));
  assert.ok(codes.includes("pedagogy_unknown_questions"));
  assert.ok(codes.includes("pedagogy_missing_reference"));
});

test("first_session/open_questions_for_user are validated against contract", () => {
  const payload = clone(WORKSPACE_PLAN_FIXTURE);
  payload.first_session.learning_node_ids = ["UNKNOWN-NODE"];
  payload.open_questions_for_user = [];
  payload.unknowns = ["ownership boundary drift"];

  const result = validateWorkspacePlan(payload, WORKSPACE_INTENT_FIXTURE);
  assert.equal(result.ok, false);
  const codes = result.issues.map((issue) => issue.code);
  assert.ok(codes.includes("pedagogy_missing_reference"));
  assert.ok(codes.includes("pedagogy_unknown_questions"));
});

test("allows empty open_questions_for_user when there are no unknowns", () => {
  const payload = clone(WORKSPACE_PLAN_FIXTURE);
  const intent = clone(WORKSPACE_INTENT_FIXTURE);
  payload.unknowns = [];
  payload.open_questions_for_user = [];
  intent.unknowns = [];

  const result = validateWorkspacePlan(payload, intent);
  assert.equal(result.ok, true);
  assert.equal(result.plan?.open_questions_for_user.length, 0);
  assert.equal(result.issues.length, 0);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PedagogoAIContracts,
  PedagogoAIWorkspaceIntent,
} from "../src/pedagogoai/index.ts";

const root = process.cwd();

const sampleInput = {
  userAmbition: "Convertirme en AI researcher-builder",
  tryingToBuildOrUnderstand: "I want to follow this blog and build a JAX transformer + kernel path",
  sourceInput: "https://example.com/jax-transformer-playbook plus repo notes",
  whyItMatters: "I want evidence for frontier AI researcher preparation",
  alreadyKnow: "Python, basic ML, some PyTorch",
  notKnowYet: "JAX, Flax, scaling laws, kernels",
  desiredOutput: "repo, notes, benchmark, public writeup",
};

test("WorkspaceIntent builds the first-flow contracts in order", () => {
  const flow = PedagogoAIWorkspaceIntent.buildWorkspaceIntentFlow(sampleInput);

  assert.deepEqual(
    flow.contract_order,
    ["WorkspaceIntent", "SourceIntake", "WorkspacePlan", "SessionPlan", "EvidencePlan"],
  );
  assert.equal(flow.workspace_intent.schema, "WorkspaceIntent");
  assert.equal(flow.source_intake.schema, "SourceIntake");
  assert.equal(flow.workspace_plan.schema, "WorkspacePlan");
  assert.equal(flow.session_plan.schema, "SessionPlan");
  assert.equal(flow.evidence_plan.schema, "EvidencePlan");
  assert.equal(flow.validation.valid, true);
});

test("WorkspacePlan keeps global ambition distinct from the bounded workspace", () => {
  const intent = PedagogoAIContracts.buildWorkspaceIntent(sampleInput);
  const plan = PedagogoAIContracts.compileWorkspacePlanFromIntent(intent);
  const preview = PedagogoAIContracts.formatWorkspacePlanPreview(plan);

  assert.equal(intent.user_ambition, "Convertirme en AI researcher-builder");
  assert.equal(intent.workspace_title, "JAX Transformers");
  assert.notEqual(intent.user_ambition, intent.workspace_title);
  assert.equal(plan.user_ambition.statement, intent.user_ambition);
  assert.equal(plan.workspace.title, "JAX Transformers");
  assert.equal(preview.proposed_workspace, "JAX Transformers");
});

test("WorkspacePlan proposes outputs and a first prerequisite session for JAX Transformers", () => {
  const intent = PedagogoAIWorkspaceIntent.buildWorkspaceIntent(sampleInput);
  const plan = PedagogoAIWorkspaceIntent.compileWorkspacePlanFromIntent(intent);
  const firstSession = PedagogoAIWorkspaceIntent.selectFirstSessionPlan(plan);

  assert.deepEqual(plan.outputs, [
    "toy transformer in JAX",
    "shape/attention notes",
    "training/eval notebook",
    "benchmark artifact",
    "public writeup",
  ]);
  assert.equal(firstSession.title, "Session 01 - JAX arrays and autodiff");
  assert.equal(firstSession.node_id, "jax-arrays-autodiff");
  assert.equal(plan.nodes.some((node) => node.node_id === "single-head-attention-jax"), true);
  assert.equal(plan.evidence_plan.required_evidence.length, 5);
});

test("WorkspaceIntent validators reject missing source input and ambition/workspace conflation", () => {
  const emptySource = PedagogoAIWorkspaceIntent.buildWorkspaceIntent({
    ...sampleInput,
    sourceInput: "",
  });
  const emptySourceValidation = PedagogoAIWorkspaceIntent.validateWorkspaceIntent(emptySource);

  assert.equal(emptySourceValidation.valid, false);
  assert.ok(emptySourceValidation.issues.some((issue) => issue.field === "source_intake.raw_input"));

  const conflated = {
    ...PedagogoAIWorkspaceIntent.buildWorkspaceIntent(sampleInput),
    workspace_title: "Convertirme en AI researcher-builder",
  };
  const conflatedValidation = PedagogoAIWorkspaceIntent.validateWorkspaceIntent(conflated);

  assert.equal(conflatedValidation.valid, false);
  assert.ok(conflatedValidation.issues.some((issue) => /distinct/.test(issue.message)));
});

test("Workspace Intent spec links the first-flow transition to the deep ownership loop", () => {
  const workspaceIntentSpec = readFileSync(
    join(root, "docs/specs/deep-ownership-workspace/14_workspace_intent_flow.md"),
    "utf8",
  );
  const loopSpec = readFileSync(
    join(root, "docs/specs/deep-ownership-workspace/01_deep_ownership_loop.md"),
    "utf8",
  );

  assert.match(workspaceIntentSpec, /User Ambition[\s\S]*Workspace[\s\S]*Node[\s\S]*Session[\s\S]*Artifact \/ Evidence/);
  assert.match(workspaceIntentSpec, /WorkspaceIntent[\s\S]*SourceIntake[\s\S]*WorkspacePlan[\s\S]*SessionPlan[\s\S]*EvidencePlan/);
  assert.match(workspaceIntentSpec, /User fills WorkspaceIntent[\s\S]*LLM compiles WorkspacePlan[\s\S]*System selects first SessionPlan[\s\S]*UI opens session/);
  assert.doesNotMatch(workspaceIntentSpec, /RoadmapArtifact` is the source of truth/);
  assert.match(loopSpec, /14_workspace_intent_flow\.md/);
});

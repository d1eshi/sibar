import { rmSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  PedagogoAIContracts,
  PedagogoAIWorkspaceCompilerRunner,
} from "../engine/pedagogoai/index.ts";
import type { RustWorkspacePlan } from "../engine/pedagogoai/workspace-compiler-runner.ts";

const root = process.cwd();
const sampleInput = {
  userAmbition: "Entender de forma acotada el flujo de arranque del runtime.",
  workspaceTitle: "Runtime Compiler Playground",
  tryingToBuildOrUnderstand: "Entender cómo arranca la ejecución de una petición.",
  sourceInput: "src/runtime.ts",
  whyItMatters: "Quiero practicar sin inventar contexto.",
  alreadyKnow: "ts-node, cli commands",
  notKnowYet: "bootstrap flow, runtime boundaries",
  desiredOutput: "session plan and execution constraints",
};

function buildRustPlanFixture(rustIntent: { source_bundle: { evidence: { id: string }[] } }) {
  const evidenceId = rustIntent.source_bundle.evidence[0]?.id ?? "evidence-01";
  return {
    objective: "Entender el flujo inicial del runtime de forma acotada.",
    bounded_objective: true,
    nodes: [{
      id: "node-runtime-entry",
      title: "Inspeccionar punto de entrada del runtime",
      prerequisites: ["src/runtime.ts"],
      concepts: ["runtime", "entrypoint", "boundary"],
      source_links: [{ evidence_id: evidenceId }],
      artifact_requirement: {
        id: "artifact-runtime-entry",
        path: "src/runtime.ts",
        requires: "Entrada y contrato del runtime",
      },
      is_advanced: false,
    }],
    next_actions: [
      {
        label: "Revisar node runtime-entry",
        target_node_id: "node-runtime-entry",
        visible: true,
      },
      {
        label: "Producir artifact de entrada",
        target_node_id: "node-runtime-entry",
        visible: true,
      },
    ],
    artifact_requirements: [{
      id: "artifact-runtime-entry",
      path: "src/runtime.ts",
      requires: "Entrada y contrato del runtime",
    }],
    questions_if_blocked: [],
  };
}

function buildStandaloneRustPlanFixture(): RustWorkspacePlan {
  return buildRustPlanFixture({ source_bundle: { evidence: [{ id: "evidence-standalone" }] } });
}

function withFixturePlan(plan: unknown): string {
  const tmpDir = mkdtempSync(join(tmpdir(), "pedagogoai-workspace-compiler-"));
  const fixturePath = join(tmpDir, "rust_workspace_plan_fixture.json");
  writeFileSync(fixturePath, JSON.stringify(plan, null, 2));
  return tmpDir;
}

test("runRustWorkspaceCompiler bridges fixture adapter and returns mapped Pedagogo plan", () => {
  const workspaceIntent = PedagogoAIContracts.buildWorkspaceIntent(sampleInput);
  const rustIntent = PedagogoAIWorkspaceCompilerRunner.buildRustWorkspaceIntent(
    workspaceIntent,
    { sourcePaths: ["src/runtime.ts"] },
  );
  assert.equal(rustIntent.source_bundle.root_path, process.cwd());
  assert.equal(rustIntent.source_bundle.paths.includes("src/runtime.ts"), true);
  const rustPlanFixture = buildRustPlanFixture(rustIntent);
  const fixtureDir = withFixturePlan(rustPlanFixture);
  const fixturePath = join(fixtureDir, "rust_workspace_plan_fixture.json");

  try {
    const result = PedagogoAIWorkspaceCompilerRunner.runRustWorkspaceCompiler(workspaceIntent, {
      fixturePath,
    });
    assert.equal(result.runner.status, "completed");
    assert.equal(result.runner.adapter, "fixture");
    assert.equal(result.workspace_plan.compiled_by, "llm");
    assert.equal(result.validation.valid, true);
    assert.equal(result.preview.validation.valid, true);
    assert.equal(result.workspace_plan.user_ambition.statement, workspaceIntent.user_ambition);
    assert.equal(result.workspace_plan.workspace.intent, rustPlanFixture.objective);

    const rustWorkspaceIntent = result.rust_intent;
    assert.ok(typeof rustWorkspaceIntent.source_bundle.root_path === "string");
    assert.ok(rustWorkspaceIntent.source_bundle.evidence.length > 0);
    assert.ok(rustWorkspaceIntent.source_bundle.evidence.every((entry) => entry.id.length > 0));
    assert.equal(
      rustWorkspaceIntent.trying_to_build_or_understand,
      sampleInput.tryingToBuildOrUnderstand,
    );
    assert.equal(Object.hasOwn(result.workspace_plan.nodes[0], "workspace_id"), false);

    const workspacePlanValidation = PedagogoAIContracts.validateWorkspacePlan(result.workspace_plan);
    assert.equal(workspacePlanValidation.valid, true);
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test("runRustWorkspaceCompiler without fixture path returns failed auditable plan", () => {
  const workspaceIntent = PedagogoAIContracts.buildWorkspaceIntent(sampleInput);
  const missingFixtureResult = PedagogoAIWorkspaceCompilerRunner.runRustWorkspaceCompiler(workspaceIntent, {});
  assert.equal(missingFixtureResult.runner.status, "failed");
  assert.equal(missingFixtureResult.runner.adapter, "fixture");
  assert.equal(missingFixtureResult.runner.exit_code, undefined);
  assert.equal(missingFixtureResult.workspace_plan.compiled_by, "deterministic-builder");
  assert.equal(
    missingFixtureResult.workspace_plan.user_ambition.statement,
    workspaceIntent.user_ambition,
  );
  assert.equal(missingFixtureResult.validation.valid, true);
});

test("codex-exec adapter builds command metadata without execution by default", () => {
  const workspaceIntent = PedagogoAIContracts.buildWorkspaceIntent(sampleInput);
  const command = PedagogoAIWorkspaceCompilerRunner.buildRustWorkspaceCompilerCommand({
    adapter: "codex-exec",
    schemaPath: join(root, "tmp", "workspace-plan.schema.json"),
    codexBinary: "/usr/local/bin/codex",
  });

  assert.equal(command.adapter, "codex-exec");
  assert.equal(command.args.includes("--adapter"), true);
  assert.equal(command.args.includes("codex-exec"), true);
  assert.equal(command.args.includes("--schema"), true);
  assert.equal(command.args.includes("--codex-binary"), true);

  const blocked = PedagogoAIWorkspaceCompilerRunner.runRustWorkspaceCompiler(workspaceIntent, {
    adapter: "codex-exec",
    runCodex: false,
  });
  assert.equal(blocked.runner.status, "blocked");
  assert.equal(blocked.workspace_plan.compiled_by, "deterministic-builder");
});

test("parseRustWorkspacePlan accepts direct JSON, candidate_plan envelopes, and logged stdout", () => {
  const plan = buildStandaloneRustPlanFixture();
  const direct = PedagogoAIWorkspaceCompilerRunner.parseRustWorkspacePlan(JSON.stringify(plan));
  assert.equal(direct.objective, plan.objective);

  const enveloped = PedagogoAIWorkspaceCompilerRunner.parseRustWorkspacePlan(JSON.stringify({ candidate_plan: plan }));
  assert.equal(enveloped.objective, plan.objective);

  const noisy = PedagogoAIWorkspaceCompilerRunner.parseRustWorkspacePlan([
    "adapter log: preparing provider request",
    JSON.stringify({ candidate_plan: plan }),
    "adapter log: provider request finished",
  ].join("\n"));
  assert.equal(noisy.objective, plan.objective);
});

test("parseRustWorkspacePlan rejects malformed and invalid candidate output", () => {
  assert.throws(
    () => PedagogoAIWorkspaceCompilerRunner.parseRustWorkspacePlan("log\n{not-json\n"),
    /does not contain valid JSON/,
  );
  assert.throws(
    () => PedagogoAIWorkspaceCompilerRunner.parseRustWorkspacePlan(JSON.stringify({ candidate_plan: { objective: "thin" } })),
    /not a valid WorkspacePlan/,
  );
});

test("unknown workspace compiler adapter fails explicitly instead of falling back to fixture", () => {
  const workspaceIntent = PedagogoAIContracts.buildWorkspaceIntent(sampleInput);
  const result = PedagogoAIWorkspaceCompilerRunner.runRustWorkspaceCompiler(workspaceIntent, {
    adapter: "future-provider" as never,
    fixturePath: "evals/workspace-plan-adapters/fixtures/rust_workspace_plan_fixture.json",
  });

  assert.equal(result.runner.status, "failed");
  assert.equal(result.runner.adapter, "future-provider");
  assert.match(result.runner.blocked_reason ?? "", /Unknown workspace compiler adapter: future-provider/);
  assert.equal(result.rust_workspace_plan, null);
  assert.equal(result.workspace_plan.compiled_by, "deterministic-builder");
});

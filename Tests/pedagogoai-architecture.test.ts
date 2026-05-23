import test from "node:test";
import assert from "node:assert/strict";

import {
  PEDAGOGOAI_BOUNDARIES,
  PEDAGOGOAI_LAYER_NAME,
  PEDAGOGOAI_TRACKS,
  PedagogoAIGapRepair,
  PedagogoAIPolicies,
  PedagogoAIReadinessMastery,
  PedagogoAITracks,
  PedagogoAIWorkspaceIntent,
  boundariesForCapability,
} from "../engine/pedagogoai/index.ts";

test("PedagogoAI exposes a declarative architecture map for core learning capabilities", () => {
  assert.equal(PEDAGOGOAI_LAYER_NAME, "PedagogoAI");

  const capabilities = new Set(PEDAGOGOAI_BOUNDARIES.map((boundary) => boundary.capability));
  assert.deepEqual(
    [...capabilities].sort(),
    [
      "evidence-artifacts",
      "gap-repair",
      "pedagogical-policies",
      "readiness-mastery",
      "recall-review",
      "source-to-roadmap-session",
      "track-specialization",
      "workspace-intent",
      "workspace-contracts",
    ].sort(),
  );

  assert.equal(PEDAGOGOAI_TRACKS["explain-a-z"].role.includes("track"), true);
  assert.equal(PEDAGOGOAI_TRACKS["core-workspace"].entrypoint, "engine/pedagogoai/index.ts");
});

test("PedagogoAI facade reexports existing runtime pieces through stable subdomains", () => {
  assert.equal(typeof PedagogoAIPolicies.runPipeline, "function");
  assert.equal(typeof PedagogoAIGapRepair.createRepairAction, "function");
  assert.equal(typeof PedagogoAIReadinessMastery.createReadinessClaim, "function");
  assert.equal(typeof PedagogoAIWorkspaceIntent.buildWorkspaceIntent, "function");
  assert.equal(PedagogoAITracks.EXPLAIN_A_Z_TRACK.id, "explain-a-z");
  assert.equal(PedagogoAITracks.DEEP_OWNERSHIP_TRACK.id, "deep-ownership");

  const gapRepair = boundariesForCapability("gap-repair");
  assert.equal(gapRepair.length, 1);
  assert.ok(gapRepair[0].adapters.includes("engine/study/gap-detection.ts"));
  assert.ok(gapRepair[0].adapters.includes("engine/pedagogy/core/attempt-evaluation.ts"));
  assert.ok(gapRepair[0].adapters.includes("engine/pedagogy/core/loop.ts"));

  const workspaceIntent = boundariesForCapability("workspace-intent");
  assert.equal(workspaceIntent.length, 1);
  assert.equal(workspaceIntent[0].entrypoint, "engine/pedagogoai/workspace-intent.ts");
  assert.ok(workspaceIntent[0].adapters.includes("apps/sibar-research-workspace/scripts/workspace-intent-adapter.js"));
});

export type PedagogoAICapability =
  | "workspace-contracts"
  | "workspace-intent"
  | "pedagogical-policies"
  | "evidence-artifacts"
  | "readiness-mastery"
  | "gap-repair"
  | "recall-review"
  | "source-to-roadmap-session"
  | "track-specialization";

export type PedagogoAITrack = "core-workspace" | "deep-ownership" | "explain-a-z";

export type PedagogoAIModuleBoundary = {
  capability: PedagogoAICapability;
  entrypoint: string;
  owns: string[];
  adapters: string[];
  track: PedagogoAITrack;
};

export const PEDAGOGOAI_LAYER_NAME = "PedagogoAI";

export const PEDAGOGOAI_BOUNDARIES: PedagogoAIModuleBoundary[] = [
  {
    capability: "workspace-contracts",
    entrypoint: "src/pedagogoai/contracts.ts",
    owns: [
      "learning workspace session contracts",
      "runtime question/session summary contracts",
      "attempt submission and scoped readiness contract shapes",
    ],
    adapters: [
      "src/pedagogy/index.ts",
      "src/runtime-support.ts",
      "src/runtime-workspace-session-contracts.ts",
    ],
    track: "core-workspace",
  },
  {
    capability: "workspace-intent",
    entrypoint: "src/pedagogoai/workspace-intent.ts",
    owns: [
      "WorkspaceIntent user input contract",
      "SourceIntake source/playbook contract",
      "WorkspacePlan, SessionPlan, and EvidencePlan compile boundary",
      "deterministic create-workspace builders and validators",
    ],
    adapters: [
      "apps/sibar-research-workspace/scripts/workspace-intent-adapter.js",
    ],
    track: "core-workspace",
  },
  {
    capability: "pedagogical-policies",
    entrypoint: "src/pedagogoai/policies.ts",
    owns: [
      "pedagogical layers",
      "signal rubrics",
      "question depth and answer-style policies",
      "deterministic observation to verification pipeline",
    ],
    adapters: ["src/pedagogy/index.ts"],
    track: "core-workspace",
  },
  {
    capability: "evidence-artifacts",
    entrypoint: "src/pedagogoai/evidence-artifacts.ts",
    owns: [
      "evidence identity",
      "thinking artifact contracts",
      "artifact generation and citation validation",
      "workspace evidence previews",
    ],
    adapters: [
      "src/runtime-deep-ownership.ts",
      "src/runtime-artifact-generation.ts",
      "src/runtime-workspace-session-contracts.ts",
    ],
    track: "core-workspace",
  },
  {
    capability: "readiness-mastery",
    entrypoint: "src/pedagogoai/readiness-mastery.ts",
    owns: [
      "scoped readiness claims",
      "mastery and ownership memory projections",
      "attempt-to-readiness transitions",
      "readiness reports",
    ],
    adapters: [
      "src/runtime-readiness.ts",
      "src/runtime-pedagogy-loop.ts",
      "src/runtime-deep-ownership.ts",
    ],
    track: "core-workspace",
  },
  {
    capability: "gap-repair",
    entrypoint: "src/pedagogoai/gap-repair.ts",
    owns: [
      "learning gap detection",
      "ownership gap taxonomy",
      "repair actions",
      "prerequisite routing",
      "reevaluation prompts",
    ],
    adapters: [
      "src/runtime-gap-detection.ts",
      "src/runtime-attempt-evaluation.ts",
      "src/runtime-pedagogy-loop.ts",
    ],
    track: "core-workspace",
  },
  {
    capability: "recall-review",
    entrypoint: "src/pedagogoai/recall-review.ts",
    owns: [
      "understanding memory",
      "practice challenges",
      "review queues",
      "misconception memory",
    ],
    adapters: [
      "src/runtime-memory.ts",
      "src/runtime-practice.ts",
      "src/runtime-pedagogy-loop.ts",
    ],
    track: "core-workspace",
  },
  {
    capability: "source-to-roadmap-session",
    entrypoint: "src/pedagogoai/source-to-roadmap-session.ts",
    owns: [
      "source intake",
      "concept graph compilation",
      "autopsy step preparation",
      "live workspace session compilation",
    ],
    adapters: [
      "src/runtime-concept-graph.ts",
      "src/runtime-autopsy.ts",
      "src/runtime-workspace-session.ts",
      "src/runtime-workspace-session-logic.ts",
    ],
    track: "core-workspace",
  },
  {
    capability: "track-specialization",
    entrypoint: "src/pedagogoai/tracks/index.ts",
    owns: [
      "Deep Ownership track boundaries",
      "Explain A-Z track boundaries",
      "track-specific runtime bridges",
    ],
    adapters: [
      "src/pedagogoai/tracks/deep-ownership.ts",
      "src/pedagogoai/tracks/explain-a-z.ts",
    ],
    track: "core-workspace",
  },
];

export const PEDAGOGOAI_TRACKS: Record<PedagogoAITrack, {
  label: string;
  role: string;
  entrypoint: string;
}> = {
  "core-workspace": {
    label: "Learning/Research Workspace Core",
    role: "Owns generic learning contracts, pedagogy policy, evidence, memory, readiness, repair, and source-to-session compilation.",
    entrypoint: "src/pedagogoai/index.ts",
  },
  "deep-ownership": {
    label: "Deep Ownership",
    role: "Specializes the core for evidence-backed construction, bounded mutation, validation, and scoped ownership claims.",
    entrypoint: "src/pedagogoai/tracks/deep-ownership.ts",
  },
  "explain-a-z": {
    label: "Explain A-Z",
    role: "Specializes the core for whole-project explanation sessions; it is a track, not the center of PedagogoAI.",
    entrypoint: "src/pedagogoai/tracks/explain-a-z.ts",
  },
};

export function boundariesForCapability(capability: PedagogoAICapability): PedagogoAIModuleBoundary[] {
  return PEDAGOGOAI_BOUNDARIES.filter((boundary) => boundary.capability === capability);
}

export function boundariesForTrack(track: PedagogoAITrack): PedagogoAIModuleBoundary[] {
  return PEDAGOGOAI_BOUNDARIES.filter((boundary) => boundary.track === track);
}

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
    entrypoint: "engine/pedagogoai/contracts.ts",
    owns: [
      "learning workspace session contracts",
      "runtime question/session summary contracts",
      "attempt submission and scoped readiness contract shapes",
    ],
    adapters: [
      "engine/pedagogy/index.ts",
      "engine/runtime/contracts.ts",
      "engine/workspace/session/contracts.ts",
    ],
    track: "core-workspace",
  },
  {
    capability: "workspace-intent",
    entrypoint: "engine/pedagogoai/workspace-intent.ts",
    owns: [
      "WorkspaceIntent user input contract",
      "SourceIntake source/playbook contract",
      "WorkspacePlan, SessionPlan, and EvidencePlan compile boundary",
      "deterministic create-workspace builders and validators",
    ],
    adapters: [],
    track: "core-workspace",
  },
  {
    capability: "pedagogical-policies",
    entrypoint: "engine/pedagogoai/policies.ts",
    owns: [
      "pedagogical layers",
      "signal rubrics",
      "question depth and answer-style policies",
      "deterministic observation to verification pipeline",
    ],
    adapters: ["engine/pedagogy/index.ts"],
    track: "core-workspace",
  },
  {
    capability: "evidence-artifacts",
    entrypoint: "engine/pedagogoai/evidence-artifacts.ts",
    owns: [
      "evidence identity",
      "thinking artifact contracts",
      "artifact generation and citation validation",
      "workspace evidence previews",
    ],
    adapters: [
      "engine/deep-ownership/index.ts",
      "engine/artifacts/generation.ts",
      "engine/workspace/session/contracts.ts",
    ],
    track: "core-workspace",
  },
  {
    capability: "readiness-mastery",
    entrypoint: "engine/pedagogoai/readiness-mastery.ts",
    owns: [
      "scoped readiness claims",
      "mastery and ownership memory projections",
      "attempt-to-readiness transitions",
      "readiness reports",
    ],
    adapters: [
      "engine/study/readiness.ts",
      "engine/pedagogy-core/index.ts",
      "engine/deep-ownership/index.ts",
    ],
    track: "core-workspace",
  },
  {
    capability: "gap-repair",
    entrypoint: "engine/pedagogoai/gap-repair.ts",
    owns: [
      "learning gap detection",
      "ownership gap taxonomy",
      "repair actions",
      "prerequisite routing",
      "reevaluation prompts",
    ],
    adapters: [
      "engine/study/gap-detection.ts",
      "engine/pedagogy-core/index.ts",
    ],
    track: "core-workspace",
  },
  {
    capability: "recall-review",
    entrypoint: "engine/pedagogoai/recall-review.ts",
    owns: [
      "understanding memory",
      "practice challenges",
      "review queues",
      "misconception memory",
    ],
    adapters: [
      "engine/memory/understanding-memory.ts",
      "engine/study/practice.ts",
      "engine/pedagogy-core/index.ts",
    ],
    track: "core-workspace",
  },
  {
    capability: "source-to-roadmap-session",
    entrypoint: "engine/pedagogoai/source-to-roadmap-session.ts",
    owns: [
      "source intake",
      "concept graph compilation",
      "autopsy step preparation",
      "live workspace session compilation",
    ],
    adapters: [
      "engine/study/concept-graph.ts",
      "engine/study/autopsy.ts",
      "engine/workspace/session/session.ts",
      "engine/workspace/session/logic.ts",
    ],
    track: "core-workspace",
  },
  {
    capability: "track-specialization",
    entrypoint: "engine/pedagogoai/tracks/index.ts",
    owns: [
      "Deep Ownership track boundaries",
      "Explain A-Z track boundaries",
      "track-specific runtime bridges",
    ],
    adapters: [
      "engine/pedagogoai/tracks/deep-ownership.ts",
      "engine/pedagogoai/tracks/explain-a-z.ts",
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
    entrypoint: "engine/pedagogoai/index.ts",
  },
  "deep-ownership": {
    label: "Deep Ownership",
    role: "Specializes the core for evidence-backed construction, bounded mutation, validation, and scoped ownership claims.",
    entrypoint: "engine/pedagogoai/tracks/deep-ownership.ts",
  },
  "explain-a-z": {
    label: "Explain A-Z",
    role: "Specializes the core for whole-project explanation sessions; it is a track, not the center of PedagogoAI.",
    entrypoint: "engine/pedagogoai/tracks/explain-a-z.ts",
  },
};

export function boundariesForCapability(capability: PedagogoAICapability): PedagogoAIModuleBoundary[] {
  return PEDAGOGOAI_BOUNDARIES.filter((boundary) => boundary.capability === capability);
}

export function boundariesForTrack(track: PedagogoAITrack): PedagogoAIModuleBoundary[] {
  return PEDAGOGOAI_BOUNDARIES.filter((boundary) => boundary.track === track);
}

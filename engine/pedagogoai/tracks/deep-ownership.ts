export const DEEP_OWNERSHIP_TRACK = {
  id: "deep-ownership",
  label: "Deep Ownership",
  role: "Evidence-backed construction track for bounded mutations, validation, and scoped ownership.",
  coreCapabilities: [
    "evidence-artifacts",
    "readiness-mastery",
    "gap-repair",
    "recall-review",
    "source-to-roadmap-session",
  ],
} as const;

export * from "../../runtime-deep-ownership.ts";
export * from "../../runtime-deep-ownership-command-safety.ts";
export * from "../../runtime-deep-ownership-intelligence.ts";
export * from "../../runtime-deep-ownership-mutation-editor.ts";
export * from "../../runtime-deep-ownership-snapshot.ts";
export * from "../../runtime-pedagogy-loop.ts";

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

export * from "../../deep-ownership/index.ts";
export * from "../../deep-ownership/command-safety.ts";
export * from "../../deep-ownership/intelligence.ts";
export * from "../../deep-ownership/mutation-editor.ts";
export * from "../../deep-ownership/snapshot.ts";
export * from "../../pedagogy-core/index.ts";

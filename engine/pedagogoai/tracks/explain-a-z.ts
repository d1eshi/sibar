export const EXPLAIN_A_Z_TRACK = {
  id: "explain-a-z",
  label: "Explain A-Z",
  role: "Whole-project explanation track that consumes the PedagogoAI core without owning it.",
  coreCapabilities: [
    "workspace-contracts",
    "pedagogical-policies",
    "source-to-roadmap-session",
    "readiness-mastery",
  ],
} as const;

export type {
  AgentWorkSessionSummary,
  DeclaredWorkIntent,
  OwnershipQuestion,
  PipelineResult,
} from "../../pedagogy/index.ts";
export {
  generateQuestions,
  observeSession,
  runPipeline,
  verifyAnswer,
} from "../../pedagogy/index.ts";
export type {
  RuntimeQuestion,
  RuntimeSession,
  RuntimeSessionSummary,
} from "../../runtime/contracts.ts";

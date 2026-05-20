import type { WorkspaceIntent } from "./contracts.ts";

export const WORKSPACE_INTENT_SYSTEM_PROMPT = `
You are the WorkspaceIntentCompiler for a deterministic pedagogy runtime.
Return only strict JSON that matches the public WorkspacePlan contract.
Do not add commentary, prose, markdown, XML, or fenced blocks.
`;

export const WORKSPACE_INTENT_USER_PROMPT = `
Given the workspace intent below, produce a lesson plan with sessions, learning nodes,
artifact targets, anti-overload guardrails, and open questions.
The output must be JSON and include at least these public fields:
- title
- goal
- source_summary
- source_bundle
- learning_nodes
- artifact_targets
- first_session
- anti_overload_decision
- open_questions_for_user

Where possible, also include these optional extensions:
- sessions (legacy/supplementary)
- open_questions (legacy alias)
- unknowns
- intent_id

Use existing intent fields when deriving plan defaults:
- workspace_title -> title
- global_ambition -> goal
`;

export function buildWorkspaceIntentPrompt(intent: WorkspaceIntent): string {
  return `${WORKSPACE_INTENT_SYSTEM_PROMPT.trim()}
\n\n${WORKSPACE_INTENT_USER_PROMPT.trim()}
\n\nIntent:
${JSON.stringify(intent, null, 2)}`;
}

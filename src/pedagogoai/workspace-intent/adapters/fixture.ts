import type { WorkspaceIntent, WorkspacePlan } from "../contracts.ts";
import { WORKSPACE_INTENT_FIXTURE, WORKSPACE_PLAN_FIXTURE } from "../fixtures.ts";
import { validateWorkspacePlan } from "../validate.ts";

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((entry) => entry.trim()).filter((entry) => entry.length > 0))).sort();
}

function mergePlanForIntent(intent: WorkspaceIntent): WorkspacePlan {
  const unknowns = uniqueSorted(intent.unknowns);
  const openQuestions = unknowns.length === 0
    ? WORKSPACE_PLAN_FIXTURE.open_questions_for_user
    : unknowns.map((entry, index) => {
      const source = WORKSPACE_PLAN_FIXTURE.open_questions_for_user[
        index % WORKSPACE_PLAN_FIXTURE.open_questions_for_user.length
      ]!;
      return {
        question_id: source.question_id,
        prompt: `Which evidence answers: ${entry}?`,
        target_unknowns: [entry],
        source_refs: source.source_refs,
      };
    });

  return {
    ...WORKSPACE_PLAN_FIXTURE,
    intent_id: intent.intent_id,
    plan_id: `PLAN-${intent.intent_id}`,
    title: intent.workspace_title ?? intent.title ?? WORKSPACE_PLAN_FIXTURE.title,
    goal: intent.global_ambition ?? intent.goal ?? WORKSPACE_PLAN_FIXTURE.goal,
    source_summary: intent.source_summary ?? WORKSPACE_PLAN_FIXTURE.source_summary,
    unknowns,
    open_questions: [],
    open_questions_for_user: openQuestions,
    source_bundle: intent.source_bundle,
    first_session: WORKSPACE_PLAN_FIXTURE.first_session,
  };
}

export function generateWorkspacePlan(input: WorkspaceIntent): WorkspacePlan {
  const plan = mergePlanForIntent(input);
  const validation = validateWorkspacePlan(plan, input);
  if (!validation.ok) {
    const messages = validation.issues.map((issue) => `${issue.code}: ${issue.message}`).join("; ");
    throw new Error(`fixture_workspace_plan_invalid: ${messages}`);
  }
  return {
    ...validation.plan!,
    source_bundle: input.source_bundle,
  };
}

export const WORKSPACE_PLAN_FIXTURE_ADAPTER_OUTPUT: WorkspacePlan = WORKSPACE_PLAN_FIXTURE;

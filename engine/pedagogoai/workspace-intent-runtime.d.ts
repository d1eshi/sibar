import type {
  EvidencePlan,
  SessionPlan,
  SourceIntake,
  SourceIntakeInput,
  WorkspaceIntent,
  WorkspaceIntentFlow,
  WorkspaceIntentInput,
  WorkspaceIntentSchema,
  WorkspaceIntentValidationResult,
  WorkspacePlan,
  WorkspacePlanPreview,
} from "./workspace-intent-types.ts";

export const WORKSPACE_INTENT_CONTRACT_VERSION: string;
export const WORKSPACE_INTENT_GENERATED_AT: string;
export const WORKSPACE_INTENT_CONTRACT_ORDER: readonly WorkspaceIntentSchema[];
export const DEFAULT_WORKSPACE_INTENT_INPUT: Required<WorkspaceIntentInput>;

export function splitList(value: string | string[] | null | undefined): string[];
export function buildSourceIntake(input?: SourceIntakeInput | string): SourceIntake;
export function buildWorkspaceIntent(input?: WorkspaceIntentInput): WorkspaceIntent;
export function compileWorkspacePlanFromIntent(intent: WorkspaceIntent): WorkspacePlan;
export function selectFirstSessionPlan(plan: WorkspacePlan): SessionPlan;
export function buildEvidencePlan(intent: WorkspaceIntent, workspaceId?: string, outputs?: string[]): EvidencePlan;
export function buildWorkspaceIntentFlow(input?: WorkspaceIntentInput): WorkspaceIntentFlow;
export function formatWorkspacePlanPreview(plan: WorkspacePlan): WorkspacePlanPreview;
export function validateSourceIntake(source: unknown): WorkspaceIntentValidationResult;
export function validateWorkspaceIntent(intent: unknown): WorkspaceIntentValidationResult;
export function validateSessionPlan(session: unknown): WorkspaceIntentValidationResult;
export function validateEvidencePlan(plan: unknown): WorkspaceIntentValidationResult;
export function validateWorkspacePlan(plan: unknown): WorkspaceIntentValidationResult;

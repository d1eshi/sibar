import type {
  DeepOwnershipFixture,
  DeepOwnershipLoop,
  LoopState,
  WeakGoalRoute,
  WorkspaceSnapshot,
} from "./runtime-deep-ownership-loop-types.ts";
import type { ThinkingArtifact } from "./runtime-deep-ownership-evidence-types.ts";

const WEAK_GOAL_PATTERNS: RegExp[] = [
  /^(understand|teach|learn|explain|study|master)\s+(this|the)\s+(repo|repository|project|codebase)[.]?$/i,
  /^teach me/i,
  /^make me (good|better|an expert)/i,
  /^help me (understand|learn|master|figure out)/i,
  /^(help|explain|understand|teach|learn|study|master)$/i,
];

const WEAK_GOAL_MIN_LENGTH = 10;
const OPERATION_VERB_PATTERN = /\b(trace|derive|predict|build|modify|debug|transfer|teach|explain)\b/i;

/**
 * Detect whether a goal is too weak to start a loop without first resolving
 * to a concrete operation. Returns true when the goal is vague, missing an
 * operation verb, or uses whole-repo teach/explain language.
 *
 * Long (40+ char), specific goals that avoid weak patterns are treated as
 * concrete even when they don't contain a recognized operation verb.
 */
export function detectWeakGoal(goal: string): boolean {
  const trimmed = goal.trim();

  if (trimmed.length < WEAK_GOAL_MIN_LENGTH) return true;

  for (const pattern of WEAK_GOAL_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  if (trimmed.length >= 40) return false;

  if (!OPERATION_VERB_PATTERN.test(trimmed)) return true;

  return false;
}

/**
 * Route a weak goal to an operation-choice flow, offering concrete
 * operation kinds the user can select from before the loop starts.
 */
export function routeWeakGoal(goal: string): WeakGoalRoute {
  return {
    original_goal: goal,
    offered_operations: [
      "trace",
      "explain",
      "build",
      "modify",
      "predict",
      "derive",
      "debug",
      "transfer",
      "teach",
    ],
    chosen_operation: null,
    requires_choice: true,
  };
}

function isLoopPreAttempt(state: LoopState): boolean {
  const preAttemptStates: LoopState[] = [
    "GoalInput",
    "BoundaryProposal",
    "BoundaryConfirmed",
    "EvidenceInventoried",
    "ConceptSliceSelected",
    "ArtifactGenerated",
    "AwaitingAttempt",
  ];
  return preAttemptStates.includes(state);
}

/**
 * Project a DeepOwnershipLoop into a WorkspaceSnapshot suitable for UI
 * consumption. Pre-attempt, hidden solution content is excluded from
 * thinking artifacts. The snapshot flattens runtime pedagogy state into
 * display-ready fields without leaking internal decision logic.
 */
export function projectWorkspaceSnapshot(loop: DeepOwnershipLoop): WorkspaceSnapshot {
  const preAttempt = isLoopPreAttempt(loop.loop_entry.current_state);

  const projectedArtifacts: ThinkingArtifact[] = loop.thinking_artifacts.map((artifact) => {
    if (preAttempt) {
      return { ...artifact, hidden_solution_evidence: [] };
    }
    return artifact;
  });

  const hasHidden = loop.thinking_artifacts.some(
    (artifact) => artifact.hidden_solution_evidence.length > 0,
  );

  const attemptResult = !preAttempt && loop.sample_attempt
    ? {
        answer_text: loop.sample_attempt.answer_text,
        declared_confidence: loop.sample_attempt.declared_confidence,
        declared_unknowns: loop.sample_attempt.declared_unknowns,
      }
    : null;

  return {
    snapshot_id: `SNAP-${loop.id}`,
    loop_id: loop.id,
    goal: loop.goal,
    weak_goal_route: loop.weak_goal_route,
    boundary_summary: {
      root_path: loop.artifact_boundary.root_path,
      included_count: loop.artifact_boundary.included_sources.length,
      excluded_count: loop.artifact_boundary.excluded_sources.length,
    },
    concept_slice: loop.concept_slice,
    thinking_artifacts: projectedArtifacts,
    active_operation: loop.active_operation,
    evidence_visible: loop.evidence_inventory,
    unknown_zones: loop.unknown_zones,
    workspace_signals: loop.workspace_signals ?? [],
    out_of_scope_evidence: loop.out_of_scope_evidence ?? [],
    boundary_expansion_routes: loop.boundary_expansion_routes ?? [],
    attempt_stored: !preAttempt && loop.sample_attempt !== null,
    attempt_result: attemptResult,
    evidence_check_result: loop.evidence_check
      ? {
          result: loop.evidence_check.result,
          summary: `Evidence check ${loop.evidence_check.result}: ${loop.evidence_check.observed_claims.length} observed, ${loop.evidence_check.missing_claims.length} missing`,
        }
      : null,
    detected_gap: loop.detected_gap
      ? {
          kind: loop.detected_gap.kind,
          severity: loop.detected_gap.severity,
          blocks_readiness: loop.detected_gap.blocks_readiness,
        }
      : null,
    repair_action: loop.repair_action
      ? {
          operation_kind: loop.repair_action.operation_kind,
          prompt: loop.repair_action.prompt,
        }
      : null,
    readiness: {
      status: loop.readiness_claim.status,
      scope: loop.readiness_claim.scope,
      blocked_claims: loop.readiness_claim.blocked_claims,
    },
    loop_state: loop.loop_entry.current_state,
    state_chain: loop.loop_entry.state_chain,
    has_hidden_solution_content: hasHidden,
    hidden_solution_gated: preAttempt && hasHidden,
  };
}

/**
 * Convenience: project a WorkspaceSnapshot directly from the serialized
 * fixture without constructing an intermediate DeepOwnershipLoop.
 */
export function projectWorkspaceSnapshotFromFixture(
  fixture: DeepOwnershipFixture,
): WorkspaceSnapshot {
  const loop: DeepOwnershipLoop = {
    id: fixture.loop_state.id,
    goal: fixture.goal,
    weak_goal_route: detectWeakGoal(fixture.goal)
      ? routeWeakGoal(fixture.goal)
      : null,
    artifact_boundary: fixture.artifact_boundary,
    concept_slice: fixture.concept_slice,
    thinking_artifacts: fixture.thinking_artifacts,
    active_operation: fixture.active_operation,
    evidence_inventory: fixture.evidence_inventory,
    skip_records: fixture.skip_records,
    unknown_zones: fixture.unknown_zones,
    research_bridges: fixture.research_bridges ?? [],
    workspace_signals: fixture.workspace_signals ?? [],
    out_of_scope_evidence: fixture.out_of_scope_evidence ?? [],
    boundary_expansion_routes: fixture.boundary_expansion_routes ?? [],
    sample_attempt: fixture.sample_attempt,
    evidence_check: fixture.evidence_check,
    detected_gap: fixture.detected_gap,
    repair_action: fixture.repair_action,
    readiness_claim: fixture.readiness_claim,
    loop_entry: fixture.loop_state,
  };

  return projectWorkspaceSnapshot(loop);
}

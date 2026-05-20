import type {
  ArtifactTarget,
  Decision,
  LearningNode,
  OpenQuestion,
  SessionPlan,
  SourceBundle,
  SourceRef,
  ValidationIssue,
  WorkspaceIntent,
  WorkspacePlan,
  WorkspacePlanValidationResult,
} from "./contracts.ts";

type RecordInput = Record<string, unknown>;

const SOURCE_BUNDLE_ALLOWED_KEYS = new Set(["bundle_id", "title", "source_summary", "source_refs"]);
const SOURCE_REF_ALLOWED_KEYS = new Set(["ref_id", "path", "role", "summary"]);
const LEARNING_NODE_ALLOWED_KEYS = new Set([
  "node_id",
  "title",
  "objective",
  "source_refs",
  "depends_on",
  "expected_outcome",
]);
const ARTIFACT_TARGET_ALLOWED_KEYS = new Set([
  "artifact_id",
  "node_id",
  "title",
  "artifact_type",
  "source_refs",
  "description",
]);
const SESSION_ALLOWED_KEYS = new Set([
  "session_id",
  "title",
  "learning_node_ids",
  "artifact_target_ids",
  "sequence_position",
]);
const OPEN_QUESTION_ALLOWED_KEYS = new Set(["question_id", "prompt", "target_unknowns", "source_refs"]);
const DECISION_ALLOWED_KEYS = new Set([
  "decision",
  "bounded",
  "rationale",
  "max_session_nodes",
  "max_total_artifacts",
]);
const PLAN_ALLOWED_KEYS = new Set([
  "plan_id",
  "title",
  "goal",
  "source_summary",
  "source_bundle",
  "learning_nodes",
  "artifact_targets",
  "first_session",
  "anti_overload_decision",
  "open_questions_for_user",
  "unknowns",
  "intent_id",
  "sessions",
  "open_questions",
]);

const ARTIFACT_TYPES = new Set(["notes", "exercise", "artifact", "code", "test"]);
const DECISIONS = new Set(["proceed", "defer", "split"]);
const SOURCE_ROLES = new Set(["source_truth", "intent", "oracle", "example", "notes"]);

const WHOLE_REPO_PATTERN = [
  /\bwhole\s+repo\b/i,
  /\bwhole\s+codebase\b/i,
  /\bglobal\s+mastery\b/i,
  /\bcomplete\s+mastery\b/i,
  /\bunderstand(s|ed)?\s+(the|this)\s+(repo|repository|codebase|project)\b/i,
  /\bmastery\s+of\s+(the|this)\s+(repo|repository|codebase|project)\b/i,
] as const;

function normalized(value: unknown): string {
  return String(value ?? "").trim();
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && normalized(value).length > 0;
}

function asRecord(value: unknown): RecordInput | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RecordInput) : null;
}

function addIssue(issues: ValidationIssue[], code: string, message: string, field?: string, value?: string): void {
  issues.push({ code, message, field, value });
}

function addWarning(
  warnings: ValidationIssue[],
  code: string,
  message: string,
  field?: string,
  value?: string,
): void {
  warnings.push({ code, message, field, value });
}

function hasForbiddenClaim(value: unknown): boolean {
  const text = normalized(value);
  if (!text) return false;
  return WHOLE_REPO_PATTERN.some((pattern) => pattern.test(text));
}

function checkTextForForbiddenClaims(
  value: unknown,
  context: string,
  issues: ValidationIssue[],
): void {
  if (hasForbiddenClaim(value)) {
    addIssue(
      issues,
      "pedagogy_forbidden_mastery_claim",
      "Disallowed whole-repo/global mastery claim in workspace plan.",
      context,
      normalized(value),
    );
  }
}

function ensureExtraKeys(
  payload: RecordInput,
  allowed: Set<string>,
  context: string,
  issues: ValidationIssue[],
): void {
  const extras = Object.keys(payload).filter((key) => !allowed.has(key));
  if (extras.length > 0) {
    addIssue(
      issues,
      "schema_unknown_fields",
      `Unexpected fields in ${context}: ${extras.join(", ")}`,
      context,
    );
  }
}

function toUniqueTrimmedStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const normalizedValues = value
    .map((entry) => (typeof entry === "string" ? normalized(entry) : ""))
    .filter((entry) => entry.length > 0);
  return Array.from(new Set(normalizedValues));
}

function parseSourceRefs(
  payload: unknown,
  context: string,
  issues: ValidationIssue[],
  allowEmpty = false,
): string[] {
  if (!Array.isArray(payload)) {
    addIssue(issues, "schema_source_refs_not_array", `${context} must be an array.`, context);
    return [];
  }
  const refs = payload
    .map((entry) => (typeof entry === "string" ? normalized(entry) : ""))
    .filter((entry) => entry.length > 0);
  if (payload.some((entry) => typeof entry !== "string" || !isNonEmptyString(entry))) {
    addIssue(issues, "schema_source_refs_invalid", `${context} entries must be non-empty strings.`, context);
  }
  if (!allowEmpty && refs.length === 0) {
    addIssue(issues, "schema_source_refs_empty", `${context} must be non-empty.`, context);
  }
  return refs;
}

function parseDependsOn(payload: unknown, context: string, issues: ValidationIssue[]): string[] {
  if (!Array.isArray(payload)) {
    addIssue(issues, "schema_depends_on_not_array", `${context}.depends_on must be an array.`, context);
    return [];
  }
  if (payload.some((entry) => typeof entry !== "string")) {
    addIssue(issues, "schema_depends_on_invalid", `${context}.depends_on entries must be strings.`, context);
  }
  return payload.map((entry) => (typeof entry === "string" ? normalized(entry) : "")).filter((entry) => entry.length > 0);
}

function validateSourceBundle(value: unknown, issues: ValidationIssue[]): SourceBundle | null {
  const payload = asRecord(value);
  if (!payload) {
    addIssue(issues, "schema_source_bundle_not_object", "source_bundle must be an object.");
    return null;
  }
  ensureExtraKeys(payload, SOURCE_BUNDLE_ALLOWED_KEYS, "source_bundle", issues);

  const bundleId = normalized(payload.bundle_id);
  const title = normalized(payload.title);
  const summary = normalized(payload.source_summary);
  if (!bundleId || !title || !summary) {
    addIssue(issues, "schema_source_bundle_required_fields", "source_bundle requires bundle_id, title and source_summary.");
  }

  checkTextForForbiddenClaims(payload.title, "source_bundle.title", issues);
  checkTextForForbiddenClaims(payload.source_summary, "source_bundle.source_summary", issues);

  const rawRefs = payload.source_refs;
  if (!Array.isArray(rawRefs)) {
    addIssue(issues, "schema_source_refs_not_array", "source_bundle.source_refs must be an array.", "source_bundle.source_refs");
    return null;
  }
  if (rawRefs.length === 0) {
    addIssue(issues, "schema_source_bundle_empty_refs", "source_bundle.source_refs must be non-empty.");
  }

  const refs: SourceRef[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < rawRefs.length; index += 1) {
    const context = `source_bundle.source_refs[${index}]`;
    const rawRefObj = asRecord(rawRefs[index]);
    if (!rawRefObj) {
      addIssue(issues, "schema_source_ref_not_object", `${context} must be an object.`, context);
      continue;
    }
    ensureExtraKeys(rawRefObj, SOURCE_REF_ALLOWED_KEYS, context, issues);
    const refId = normalized(rawRefObj.ref_id);
    const path = normalized(rawRefObj.path);
    const role = normalized(rawRefObj.role);

    if (!refId || !path || !SOURCE_ROLES.has(role)) {
      addIssue(issues, "schema_source_ref_required_fields", `${context} requires ref_id, path and role.`);
    }
    if (refId.length > 0 && seen.has(refId)) {
      addIssue(issues, "schema_source_ref_duplicate", `${context}.ref_id is duplicated: ${refId}`, context, refId);
    }
    seen.add(refId);
    const summary = isNonEmptyString(rawRefObj.summary) ? normalized(rawRefObj.summary) : undefined;

    refs.push({
      ref_id: refId,
      path,
      role: role as SourceRef["role"],
      ...(summary ? { summary } : {}),
    });

    checkTextForForbiddenClaims(refId, `${context}.ref_id`, issues);
    checkTextForForbiddenClaims(path, `${context}.path`, issues);
  }

  if (!bundleId || !title || !summary || refs.length === 0) return null;
  return { bundle_id: bundleId, title, source_summary: summary, source_refs: refs };
}

function validateLearningNodes(rawNodes: unknown, issues: ValidationIssue[]): LearningNode[] {
  const nodes: LearningNode[] = [];
  if (!Array.isArray(rawNodes)) {
    addIssue(issues, "schema_learning_nodes_not_array", "learning_nodes must be an array.");
    return nodes;
  }
  if (rawNodes.length === 0) {
    addIssue(issues, "pedagogy_learning_nodes_empty", "learning_nodes must be non-empty.");
  }
  for (let index = 0; index < rawNodes.length; index += 1) {
    const context = `learning_nodes[${index}]`;
    const raw = asRecord(rawNodes[index]);
    if (!raw) {
      addIssue(issues, "schema_learning_node_not_object", `${context} must be an object.`);
      continue;
    }
    ensureExtraKeys(raw, LEARNING_NODE_ALLOWED_KEYS, context, issues);
    const nodeId = normalized(raw.node_id);
    const title = normalized(raw.title);
    const objective = normalized(raw.objective);
    const expectedOutcome = normalized(raw.expected_outcome);
    const sourceRefs = parseSourceRefs(raw.source_refs, `${context}.source_refs`, issues, false);
    const dependsOn = parseDependsOn(raw.depends_on, context, issues);

    if (!nodeId || !title || !objective || !expectedOutcome) {
      addIssue(
        issues,
        "schema_learning_node_required_fields",
        `${context} requires node_id, title, objective and expected_outcome.`,
      );
    }

    if (!Array.isArray(raw.depends_on)) {
      addIssue(issues, "schema_learning_node_depends_on", `${context}.depends_on must be an array.`, context);
    }

    checkTextForForbiddenClaims(title, `${context}.title`, issues);
    checkTextForForbiddenClaims(objective, `${context}.objective`, issues);
    checkTextForForbiddenClaims(expectedOutcome, `${context}.expected_outcome`, issues);

    nodes.push({
      node_id: nodeId,
      title,
      objective,
      source_refs: sourceRefs,
      depends_on: dependsOn,
      expected_outcome: expectedOutcome,
    });
  }
  return nodes;
}

function validateArtifactTargets(rawTargets: unknown, issues: ValidationIssue[]): ArtifactTarget[] {
  const targets: ArtifactTarget[] = [];
  if (!Array.isArray(rawTargets)) {
    addIssue(issues, "schema_artifact_targets_not_array", "artifact_targets must be an array.");
    return targets;
  }
  if (rawTargets.length === 0) {
    addIssue(issues, "pedagogy_artifact_targets_empty", "artifact_targets must be non-empty.");
  }
  for (let index = 0; index < rawTargets.length; index += 1) {
    const context = `artifact_targets[${index}]`;
    const raw = asRecord(rawTargets[index]);
    if (!raw) {
      addIssue(issues, "schema_artifact_target_not_object", `${context} must be an object.`);
      continue;
    }
    ensureExtraKeys(raw, ARTIFACT_TARGET_ALLOWED_KEYS, context, issues);
    const artifactId = normalized(raw.artifact_id);
    const nodeId = normalized(raw.node_id);
    const title = normalized(raw.title);
    const artifactType = normalized(raw.artifact_type);
    const sourceRefs = parseSourceRefs(raw.source_refs, `${context}.source_refs`, issues, false);
    const description = isNonEmptyString(raw.description) ? normalized(raw.description) : undefined;

    if (!artifactId || !nodeId || !title || !ARTIFACT_TYPES.has(artifactType)) {
      addIssue(
        issues,
        "schema_artifact_target_required_fields",
        `${context} requires artifact_id, node_id, title and artifact_type.`,
      );
    }
    checkTextForForbiddenClaims(title, `${context}.title`, issues);
    if (description) checkTextForForbiddenClaims(description, `${context}.description`, issues);

    targets.push({
      artifact_id: artifactId,
      node_id: nodeId,
      title,
      artifact_type: artifactType as ArtifactTarget["artifact_type"],
      source_refs: sourceRefs,
      ...(description ? { description } : {}),
    });
  }
  return targets;
}

function validateSession(rawSession: unknown, context: string, issues: ValidationIssue[]): SessionPlan | null {
  const raw = asRecord(rawSession);
  if (!raw) {
    addIssue(issues, "schema_session_not_object", `${context} must be an object.`);
    return null;
  }
  ensureExtraKeys(raw, SESSION_ALLOWED_KEYS, context, issues);
  const sessionId = normalized(raw.session_id);
  const title = normalized(raw.title);
  const learningNodeIds = parseSourceRefs(raw.learning_node_ids, `${context}.learning_node_ids`, issues, true);
  const artifactTargetIds = parseSourceRefs(raw.artifact_target_ids, `${context}.artifact_target_ids`, issues, true);
  const sequencePosition = Number(raw.sequence_position);

  if (!sessionId || !title) {
    addIssue(issues, "schema_session_required_fields", `${context} requires session_id and title.`);
  }
  if (!Number.isInteger(sequencePosition) || sequencePosition < 0) {
    addIssue(
      issues,
      "schema_session_sequence_position",
      `${context}.sequence_position must be a non-negative integer.`,
      `${context}.sequence_position`,
    );
  }
  if (!Array.isArray(raw.learning_node_ids)) {
    addIssue(issues, "schema_session_learning_node_ids", `${context}.learning_node_ids must be an array.`);
  }
  if (!Array.isArray(raw.artifact_target_ids)) {
    addIssue(issues, "schema_session_artifact_target_ids", `${context}.artifact_target_ids must be an array.`);
  }

  checkTextForForbiddenClaims(title, `${context}.title`, issues);
  return {
    session_id: sessionId,
    title,
    learning_node_ids: learningNodeIds,
    artifact_target_ids: artifactTargetIds,
    sequence_position: Number.isInteger(sequencePosition) ? sequencePosition : 0,
  };
}

function validateSessions(rawSessions: unknown, issues: ValidationIssue[]): SessionPlan[] {
  const sessions: SessionPlan[] = [];
  if (rawSessions === undefined) return sessions;
  if (!Array.isArray(rawSessions)) {
    addIssue(issues, "schema_sessions_not_array", "sessions must be an array.");
    return sessions;
  }
  for (let index = 0; index < rawSessions.length; index += 1) {
    const validated = validateSession(rawSessions[index], `sessions[${index}]`, issues);
    if (validated) sessions.push(validated);
  }
  return sessions;
}

function validateOpenQuestions(rawQuestions: unknown, issues: ValidationIssue[], context: string): OpenQuestion[] {
  const questions: OpenQuestion[] = [];
  if (!Array.isArray(rawQuestions)) {
    addIssue(issues, "schema_open_questions_not_array", `${context} must be an array.`);
    return questions;
  }
  for (let index = 0; index < rawQuestions.length; index += 1) {
    const questionContext = `${context}[${index}]`;
    const raw = asRecord(rawQuestions[index]);
    if (!raw) {
      addIssue(issues, "schema_open_question_not_object", `${questionContext} must be an object.`);
      continue;
    }
    ensureExtraKeys(raw, OPEN_QUESTION_ALLOWED_KEYS, questionContext, issues);
    const questionId = normalized(raw.question_id);
    const prompt = normalized(raw.prompt);
    const targetUnknowns = toUniqueTrimmedStrings(raw.target_unknowns);
    const sourceRefs = parseSourceRefs(raw.source_refs, `${questionContext}.source_refs`, issues, false);
    if (!questionId || !prompt) {
      addIssue(issues, "schema_open_question_required_fields", `${questionContext} requires question_id and prompt.`);
    }
    if (!Array.isArray(raw.target_unknowns) || targetUnknowns.length === 0) {
      addIssue(
        issues,
        "schema_open_question_target_unknowns",
        `${questionContext}.target_unknowns must be a non-empty array when provided.`,
      );
    }
    if (!Array.isArray(raw.source_refs) || sourceRefs.length === 0) {
      addIssue(issues, "schema_open_question_source_refs", `${questionContext}.source_refs must be a non-empty array.`);
    }
    checkTextForForbiddenClaims(prompt, `${questionContext}.prompt`, issues);
    questions.push({
      question_id: questionId,
      prompt,
      target_unknowns: targetUnknowns,
      source_refs: sourceRefs,
    });
  }
  return questions;
}

function validateDecision(rawDecision: unknown, issues: ValidationIssue[], warnings: ValidationIssue[]): Decision | null {
  const payload = asRecord(rawDecision);
  if (!payload) {
    addIssue(issues, "schema_decision_not_object", "anti_overload_decision must be an object.");
    return null;
  }
  ensureExtraKeys(payload, DECISION_ALLOWED_KEYS, "anti_overload_decision", issues);
  const decision = normalized(payload.decision);
  const bounded = payload.bounded === true;
  const rationale = normalized(payload.rationale);
  const maxSessionNodes = payload.max_session_nodes;
  const maxTotalArtifacts = payload.max_total_artifacts;

  if (!DECISIONS.has(decision)) {
    addIssue(issues, "schema_decision_value", "anti_overload_decision.decision must be proceed, defer or split.");
  }
  if (!bounded) {
    addIssue(issues, "pedagogy_unbounded", "anti_overload_decision must be bounded.");
  }
  if (!rationale) {
    addIssue(issues, "schema_decision_rationale", "anti_overload_decision.rationale must be non-empty.");
  }
  if (payload.max_session_nodes !== undefined && (typeof maxSessionNodes !== "number" || !Number.isInteger(maxSessionNodes))) {
    addIssue(
      issues,
      "schema_decision_limits",
      "anti_overload_decision.max_session_nodes must be an integer.",
      "anti_overload_decision.max_session_nodes",
    );
  }
  if (typeof maxSessionNodes === "number" && maxSessionNodes < 1) {
    addIssue(issues, "schema_decision_limits", "anti_overload_decision.max_session_nodes must be >= 1.");
  }
  if (typeof maxSessionNodes === "number" && Number.isInteger(maxSessionNodes) && maxSessionNodes > 8) {
    addWarning(
      warnings,
      "pedagogy_load_warning",
      "max_session_nodes above 8 may overload learner capacity.",
      "anti_overload_decision.max_session_nodes",
      normalized(maxSessionNodes),
    );
  }
  if (payload.max_total_artifacts !== undefined && (typeof maxTotalArtifacts !== "number" || !Number.isInteger(maxTotalArtifacts))) {
    addIssue(
      issues,
      "schema_decision_limits",
      "anti_overload_decision.max_total_artifacts must be an integer.",
      "anti_overload_decision.max_total_artifacts",
    );
  }
  if (typeof maxTotalArtifacts === "number" && maxTotalArtifacts < 0) {
    addIssue(issues, "schema_decision_limits", "anti_overload_decision.max_total_artifacts must be >= 0.");
  }
  checkTextForForbiddenClaims(rationale, "anti_overload_decision.rationale", issues);
  return {
    decision: decision as Decision["decision"],
    bounded,
    rationale,
    ...(Number.isInteger(maxSessionNodes) && maxSessionNodes > 0 ? { max_session_nodes: maxSessionNodes } : {}),
    ...(Number.isInteger(maxTotalArtifacts) && maxTotalArtifacts >= 0 ? { max_total_artifacts: maxTotalArtifacts } : {}),
  };
}

function validateReferences(
  plan: WorkspacePlan,
  issues: ValidationIssue[],
): void {
  const sourceRefIds = new Set(plan.source_bundle.source_refs.map((entry) => entry.ref_id));
  const nodeIds = new Set(plan.learning_nodes.map((node) => node.node_id));
  const artifactIds = new Set(plan.artifact_targets.map((target) => target.artifact_id));

  const checkRefs = (context: string, refs: string[], available: Set<string>): void => {
    const missing = refs.filter((ref) => !available.has(ref));
    for (const missingRef of missing) {
      addIssue(issues, "pedagogy_missing_reference", `Invalid reference ${missingRef} in ${context}`, context);
    }
  };

  for (const node of plan.learning_nodes) {
    if (node.depends_on.length > 0) {
      checkRefs(`${node.node_id}.depends_on`, node.depends_on, nodeIds);
    }
    checkRefs(`learning_nodes.${node.node_id}.source_refs`, node.source_refs, sourceRefIds);
  }

  for (const target of plan.artifact_targets) {
    if (!nodeIds.has(target.node_id)) {
      addIssue(
        issues,
        "pedagogy_artifact_target_node_ref",
        `artifact_target '${target.artifact_id}' references unknown node '${target.node_id}'.`,
        `artifact_targets.${target.artifact_id}.node_id`,
      );
    }
    checkRefs(`artifact_targets.${target.artifact_id}.source_refs`, target.source_refs, sourceRefIds);
  }

  if (!plan.first_session.session_id || !plan.first_session.title) {
    addIssue(issues, "schema_first_session_required_fields", "first_session requires session_id and title.");
  }
  if (!plan.first_session.learning_node_ids.length) {
    addIssue(
      issues,
      "pedagogy_first_session_empty",
      "first_session must reference at least one learning node.",
      "first_session.learning_node_ids",
    );
  }
  checkRefs("first_session.learning_node_ids", plan.first_session.learning_node_ids, nodeIds);
  checkRefs("first_session.artifact_target_ids", plan.first_session.artifact_target_ids, artifactIds);

  for (const question of plan.open_questions_for_user) {
    checkRefs(`open_questions_for_user.${question.question_id}.source_refs`, question.source_refs, sourceRefIds);
  }

  for (const session of plan.sessions ?? []) {
    checkRefs(`sessions.${session.session_id}.learning_node_ids`, session.learning_node_ids, nodeIds);
    checkRefs(`sessions.${session.session_id}.artifact_target_ids`, session.artifact_target_ids, artifactIds);
  }
}

function validateUnknownCoverage(
  plan: WorkspacePlan,
  intent: WorkspaceIntent | undefined,
  issues: ValidationIssue[],
): void {
  const unknownsFromIntent = intent?.unknowns ?? plan.unknowns ?? [];
  const unknowns = toUniqueTrimmedStrings(unknownsFromIntent);
  if (unknowns.length === 0) return;

  if (plan.open_questions_for_user.length === 0) {
    addIssue(issues, "pedagogy_unknown_questions", "open_questions_for_user are required when unknowns are present.");
    return;
  }

  const coverage = plan.open_questions_for_user.flatMap((question) => ({
    prompt: normalized(question.prompt).toLowerCase(),
    targetUnknowns: question.target_unknowns.map((entry) => entry.toLowerCase()),
  }));
  for (const unknown of unknowns.map((entry) => entry.toLowerCase().trim())) {
    const covered = coverage.some(
      (question) => question.targetUnknowns.includes(unknown) || question.prompt.includes(unknown),
    );
    if (!covered) {
      addIssue(
        issues,
        "pedagogy_unknown_not_covered",
        `No open question covers unknown '${unknown}'.`,
        "open_questions_for_user",
      );
    }
  }
}

function addPlanMismatchWarnings(intent: WorkspaceIntent, plan: WorkspacePlan, warnings: ValidationIssue[]): void {
  if (isNonEmptyString(intent.intent_id) && plan.intent_id !== intent.intent_id) {
    addWarning(
      warnings,
      "pedagogy_intent_id_mismatch",
      "Generated plan intent_id does not match provided intent_id.",
      "intent_id",
    );
  }
}

export function validateWorkspacePlan(planValue: unknown, intent?: WorkspaceIntent): WorkspacePlanValidationResult {
  const issues: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const raw = asRecord(planValue);
  if (!raw) {
    addIssue(issues, "schema_not_object", "Workspace plan must be an object.");
    return { ok: false, issues, warnings, plan: null };
  }

  ensureExtraKeys(raw, PLAN_ALLOWED_KEYS, "workspace plan", issues);

  const planId = normalized(raw.plan_id);
  const title = normalized(raw.title);
  const goal = normalized(raw.goal);
  const sourceSummary = normalized(raw.source_summary);
  const unknowns = toUniqueTrimmedStrings(raw.unknowns);
  const intentId = isNonEmptyString(raw.intent_id) ? normalized(raw.intent_id) : undefined;
  if (!planId || !title || !goal || !sourceSummary) {
    addIssue(issues, "schema_required_fields", "plan_id, title, goal and source_summary are required and non-empty.");
  }

  const sourceBundle = validateSourceBundle(raw.source_bundle, issues);
  const learningNodes = validateLearningNodes(raw.learning_nodes, issues);
  const artifactTargets = validateArtifactTargets(raw.artifact_targets, issues);
  const firstSession = validateSession(raw.first_session, "first_session", issues);
  const antiOverloadDecision = validateDecision(raw.anti_overload_decision, issues, warnings);
  const openQuestions = validateOpenQuestions(raw.open_questions_for_user, issues, "open_questions_for_user");

  if (openQuestions.length === 0 && Array.isArray(raw.open_questions)) {
    addWarning(
      warnings,
      "legacy_open_questions_ignored",
      "open_questions_for_user was not provided; legacy open_questions values were ignored.",
    );
  }
  const sessions = validateSessions(raw.sessions, issues);

  checkTextForForbiddenClaims(title, "title", issues);
  checkTextForForbiddenClaims(goal, "goal", issues);
  checkTextForForbiddenClaims(sourceSummary, "source_summary", issues);

  const validatedPlan: WorkspacePlan = {
    plan_id: planId,
    title,
    goal,
    source_summary: sourceSummary,
    source_bundle: sourceBundle ?? { bundle_id: "", title: "", source_summary: "", source_refs: [] },
    learning_nodes: learningNodes,
    artifact_targets: artifactTargets,
    first_session: firstSession ?? {
      session_id: "",
      title: "",
      learning_node_ids: [],
      artifact_target_ids: [],
      sequence_position: 0,
    },
    anti_overload_decision: antiOverloadDecision ?? {
      decision: "proceed",
      bounded: false,
      rationale: "",
    },
    open_questions_for_user: openQuestions,
    unknowns,
    ...(intentId ? { intent_id: intentId } : {}),
    ...(sessions.length > 0 ? { sessions } : {}),
    ...(Array.isArray(raw.open_questions) ? { open_questions: raw.open_questions } : {}),
  };

  if (!antiOverloadDecision) {
    addIssue(issues, "schema_anti_overload_decision", "anti_overload_decision is required.");
  }
  if (!firstSession) {
    addIssue(issues, "schema_first_session_required", "first_session is required.");
  }
  if (sourceBundle && learningNodes.length > 0 && artifactTargets.length > 0) {
    validateReferences(validatedPlan, issues);
  }
  validateUnknownCoverage(validatedPlan, intent, issues);

  if (intent) {
    addPlanMismatchWarnings(intent, validatedPlan, warnings);
  }

  if (validatedPlan.title && !intent?.workspace_title && !intent?.title) {
    addWarning(warnings, "pedagogy_contract_mismatch", "intent workspace title is not available for derivation checks.");
  }
  if (intent?.global_ambition && intent.global_ambition !== validatedPlan.goal) {
    addWarning(warnings, "pedagogy_goal_mismatch", "goal differs from intent.global_ambition.");
  }
  if (intent?.workspace_title && intent.workspace_title !== validatedPlan.title) {
    addWarning(warnings, "pedagogy_title_mismatch", "title differs from intent.workspace_title.");
  }

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    plan: issues.length === 0 ? validatedPlan : null,
  };
}

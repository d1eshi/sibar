export const WORKSPACE_INTENT_CONTRACT_VERSION = "1.0.0";
export const WORKSPACE_INTENT_GENERATED_AT = "2026-05-20T00:00:00.000Z";
export const WORKSPACE_INTENT_CONTRACT_ORDER = [
  "WorkspaceIntent",
  "SourceIntake",
  "WorkspacePlan",
  "SessionPlan",
  "EvidencePlan",
];

export const DEFAULT_WORKSPACE_INTENT_INPUT = {
  userAmbition: "Convertirme en AI researcher-builder",
  workspaceTitle: "",
  tryingToBuildOrUnderstand: "I want to follow this blog and build a JAX transformer + kernel path",
  sourceInput: "URL / pasted text / paper / repo",
  whyItMatters: "I want evidence for frontier AI researcher preparation",
  alreadyKnow: "Python, basic ML, some PyTorch",
  notKnowYet: "JAX, Flax, scaling laws, kernels",
  desiredOutput: "repo, notes, benchmark, public writeup",
  createdAt: WORKSPACE_INTENT_GENERATED_AT,
};

const SOURCE_TYPES = ["url", "pasted_text", "paper", "repo", "mixed", "unknown"];
const GENERATED_BY = "deterministic-builder";

function normalizeString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeText(value) {
  return normalizeString(value).toLowerCase().replace(/\s+/g, " ");
}

function slug(value, fallback = "workspace") {
  const normalized = normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function dedupe(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const text = normalizeString(value);
    const key = normalizeText(text);
    if (!text || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}

export function splitList(value) {
  if (Array.isArray(value)) return dedupe(value);
  return dedupe(normalizeString(value).split(/[\n,;]+/g));
}

function detectSourceType(rawInput) {
  const raw = normalizeString(rawInput);
  const lower = normalizeText(raw);
  if (!raw) return "unknown";
  const hasUrl = /^https?:\/\//i.test(raw) || /https?:\/\//i.test(raw);
  const hasRepo = /github\.com|gitlab\.com|\.git\b|repo\b|repository\b/.test(lower);
  const hasPaper = /arxiv\.org|\.pdf\b|paper\b|doi\b/.test(lower);
  if ([hasUrl, hasRepo, hasPaper].filter(Boolean).length > 1) return "mixed";
  if (hasRepo) return "repo";
  if (hasPaper) return "paper";
  if (hasUrl) return "url";
  return "pasted_text";
}

function extractSignals(text) {
  const lower = normalizeText(text);
  const signalMap = [
    ["jax", "JAX"],
    ["flax", "Flax"],
    ["transformer", "transformer"],
    ["attention", "attention"],
    ["kernel", "kernel path"],
    ["pallas", "Pallas"],
    ["triton", "Triton"],
    ["scaling", "scaling laws"],
    ["benchmark", "benchmark"],
    ["repo", "repo"],
    ["writeup", "public writeup"],
  ];
  return signalMap.filter(([term]) => lower.includes(term)).map(([, label]) => label);
}

function inferWorkspaceTitle(input) {
  const explicit = normalizeString(input.workspaceTitle);
  if (explicit) return explicit;
  const context = normalizeText([
    input.tryingToBuildOrUnderstand,
    input.sourceInput,
    splitList(input.notKnowYet).join(" "),
  ].join(" "));
  if (context.includes("jax") && context.includes("transformer")) return "JAX Transformers";
  if (context.includes("transformer")) return "Transformers";
  if (context.includes("neural") || context.includes("micrograd")) return "Neural Nets from Scratch";
  if (context.includes("scaling")) return "Scaling Laws";
  if (context.includes("kernel")) return "Systems / Kernels";
  return "Focused Research Workspace";
}

function inferWorkspaceOutputs(intent) {
  const context = normalizeText([
    intent.trying_to_build_or_understand,
    intent.desired_outputs.join(" "),
    intent.unknowns.join(" "),
  ].join(" "));
  const outputs = [];

  if ((context.includes("repo") || context.includes("transformer")) && context.includes("jax")) {
    outputs.push("toy transformer in JAX");
  } else if (context.includes("repo")) {
    outputs.push("repo artifact");
  }

  if (context.includes("notes") || context.includes("attention") || context.includes("shape")) {
    outputs.push("shape/attention notes");
  }

  if (context.includes("transformer") || context.includes("training") || context.includes("notebook") || context.includes("eval")) {
    outputs.push("training/eval notebook");
  }

  if (context.includes("benchmark") || context.includes("kernel")) {
    outputs.push("benchmark artifact");
  }

  if (context.includes("public") || context.includes("writeup")) {
    outputs.push("public writeup");
  }

  if (!outputs.length) {
    outputs.push(...intent.desired_outputs.map((output) => `${output} artifact`));
  }

  return dedupe(outputs);
}

function evidenceKindForOutput(output) {
  const lower = normalizeText(output);
  if (lower.includes("repo") || lower.includes("jax")) return "repo";
  if (lower.includes("note") || lower.includes("shape")) return "notes";
  if (lower.includes("notebook") || lower.includes("training") || lower.includes("eval")) return "notebook";
  if (lower.includes("benchmark")) return "benchmark";
  if (lower.includes("writeup") || lower.includes("public")) return "writeup";
  return "source";
}

export function buildSourceIntake(input = {}) {
  const sourceInput = typeof input === "string" ? { rawInput: input } : input;
  const rawInput = normalizeString(sourceInput.rawInput);
  const sourceType = SOURCE_TYPES.includes(sourceInput.sourceType)
    ? sourceInput.sourceType
    : detectSourceType(rawInput);
  const sourceId = `source-${slug(rawInput || sourceType, "input")}`;
  const urlMatch = rawInput.match(/https?:\/\/[^\s]+/i);

  return {
    schema: "SourceIntake",
    version: WORKSPACE_INTENT_CONTRACT_VERSION,
    source_intake_id: sourceId,
    source_type: sourceType,
    title: normalizeString(sourceInput.title, sourceType === "unknown" ? "Source / playbook" : "Source intake"),
    raw_input: rawInput,
    url: urlMatch ? urlMatch[0] : null,
    extracted_signals: extractSignals(rawInput),
    captured_at: normalizeString(sourceInput.capturedAt, WORKSPACE_INTENT_GENERATED_AT),
  };
}

export function buildWorkspaceIntent(input = {}) {
  const merged = { ...DEFAULT_WORKSPACE_INTENT_INPUT, ...input };
  const workspaceTitle = inferWorkspaceTitle(merged);
  const sourceIntake = buildSourceIntake({
    rawInput: merged.sourceInput,
    capturedAt: merged.createdAt,
  });

  return {
    schema: "WorkspaceIntent",
    version: WORKSPACE_INTENT_CONTRACT_VERSION,
    intent_id: `intent-${slug(workspaceTitle)}`,
    user_ambition: normalizeString(merged.userAmbition, DEFAULT_WORKSPACE_INTENT_INPUT.userAmbition),
    workspace_title: workspaceTitle,
    trying_to_build_or_understand: normalizeString(merged.tryingToBuildOrUnderstand),
    source_intake: sourceIntake,
    why_this_matters: normalizeString(merged.whyItMatters),
    knowns: splitList(merged.alreadyKnow),
    unknowns: splitList(merged.notKnowYet),
    desired_outputs: splitList(merged.desiredOutput),
    created_at: normalizeString(merged.createdAt, WORKSPACE_INTENT_GENERATED_AT),
  };
}

function buildJaxTransformerNodes(workspaceId, outputs) {
  const sourceResource = {
    kind: "source",
    title: "Workspace source/playbook",
    source: "WorkspaceIntent SourceIntake",
    action: "Read the source slice, then write a reconstruction before hints.",
  };

  return [
    {
      schema: "WorkspaceNodePlan",
      node_id: "jax-arrays-autodiff",
      title: "JAX arrays and autodiff",
      focus: "Establish JAX array semantics, transformations, and gradient mechanics before attention code.",
      operation_target: "build",
      prerequisite_node_ids: [],
      session_ids: ["session-01"],
      evidence_outputs: ["shape/attention notes", "training/eval notebook"],
      mini_nodes: [
        {
          id: "array-semantics",
          title: "Array semantics",
          goal: "Explain how JAX arrays and shapes move through one tiny function.",
          reader_prompt: "Write one shape trace for a batched array operation and mark the transformation boundary.",
          resources: [sourceResource],
        },
        {
          id: "autodiff-transform",
          title: "Autodiff transform",
          goal: "Build one `grad` example and explain the traced computation.",
          reader_prompt: "Implement a scalar loss, run grad, and describe which value is differentiated.",
          resources: [sourceResource],
        },
      ],
    },
    {
      schema: "WorkspaceNodePlan",
      node_id: "single-head-attention-jax",
      title: "Single-head attention in JAX",
      focus: "Implement query/key/value projection, score scaling, masking, and weighted value mixing.",
      operation_target: "build",
      prerequisite_node_ids: ["jax-arrays-autodiff"],
      session_ids: ["session-02"],
      evidence_outputs: outputs.filter((output) => /transformer|attention|notes|repo/i.test(output)),
      mini_nodes: [
        {
          id: "qkv-shapes",
          title: "QKV shapes",
          goal: "Track tensor dimensions through query, key, and value projections.",
          reader_prompt: "Create a 2-token QKV shape table and state each matrix multiplication.",
          resources: [sourceResource],
        },
        {
          id: "attention-weights",
          title: "Attention weights",
          goal: "Compute scaled dot-product weights for a tiny sequence.",
          reader_prompt: "Manually calculate one score row, apply softmax, and multiply values.",
          resources: [sourceResource],
        },
      ],
    },
    {
      schema: "WorkspaceNodePlan",
      node_id: "tiny-transformer-training",
      title: "Tiny transformer training/eval",
      focus: "Train and evaluate a small transformer with a reproducible notebook and clear failure notes.",
      operation_target: "benchmark",
      prerequisite_node_ids: ["single-head-attention-jax"],
      session_ids: ["session-03"],
      evidence_outputs: outputs.filter((output) => /notebook|benchmark|writeup/i.test(output)),
      mini_nodes: [
        {
          id: "training-loop",
          title: "Training loop",
          goal: "Run a small training step with observable loss and fixed shapes.",
          reader_prompt: "Write a minimal train/eval notebook cell and record the expected outputs.",
          resources: [sourceResource],
        },
      ],
    },
    {
      schema: "WorkspaceNodePlan",
      node_id: "kernel-benchmark-path",
      title: "Kernel and benchmark path",
      focus: "Define one profiling hypothesis and benchmark artifact before claiming systems understanding.",
      operation_target: "benchmark",
      prerequisite_node_ids: ["single-head-attention-jax"],
      session_ids: ["session-04"],
      evidence_outputs: outputs.filter((output) => /benchmark|writeup/i.test(output)),
      mini_nodes: [
        {
          id: "benchmark-protocol",
          title: "Benchmark protocol",
          goal: "Compare one attention operation with a clear measurement boundary.",
          reader_prompt: "State the benchmark input, metric, warmup, and failure condition.",
          resources: [sourceResource],
        },
      ],
    },
  ].map((node) => ({
    ...node,
    workspace_id: workspaceId,
  }));
}

export function buildEvidencePlan(intent, workspaceId = `workspace-${slug(intent.workspace_title)}`, outputs = inferWorkspaceOutputs(intent)) {
  const requiredEvidence = outputs.map((output, index) => ({
    id: `evidence-${String(index + 1).padStart(2, "0")}-${slug(output, "output")}`,
    label: output,
    artifact_kind: evidenceKindForOutput(output),
    acceptance_criteria: [
      "Produced inside the declared workspace boundary.",
      "Linked to at least one session or node.",
      "Specific enough to support a later readiness claim.",
    ],
  }));

  return {
    schema: "EvidencePlan",
    version: WORKSPACE_INTENT_CONTRACT_VERSION,
    evidence_plan_id: `evidence-plan-${slug(intent.workspace_title)}`,
    workspace_id: workspaceId,
    intent_id: intent.intent_id,
    required_evidence: requiredEvidence,
    minimum_evidence_count: Math.min(3, requiredEvidence.length),
    readiness_checks: [
      "Can explain the first implementation artifact without notes.",
      "Can trace shape and attention evidence to the source/playbook.",
      "Can name what remains unknown before publishing confidence.",
    ],
  };
}

function buildFirstSession(intent, workspaceId, firstNode) {
  return {
    schema: "SessionPlan",
    version: WORKSPACE_INTENT_CONTRACT_VERSION,
    session_id: "session-01",
    workspace_id: workspaceId,
    node_id: firstNode.node_id,
    title: "Session 01 - JAX arrays and autodiff",
    focus: "Build the smallest JAX array/autodiff proof before starting attention.",
    operation_target: "build",
    outputs: [
      "shape trace for one JAX array operation",
      "autodiff note for one scalar loss",
      "session evidence entry for the workspace plan",
    ],
    required_evidence: [
      "shape/attention notes",
      "training/eval notebook",
    ],
    success_criteria: [
      `Session stays inside workspace ${intent.workspace_title}.`,
      "User can reconstruct one shape trace before requesting hints.",
      "Evidence can seed the next attention implementation session.",
    ],
  };
}

export function compileWorkspacePlanFromIntent(intent) {
  const outputs = inferWorkspaceOutputs(intent);
  const workspaceId = `workspace-${slug(intent.workspace_title)}`;
  const nodes = buildJaxTransformerNodes(workspaceId, outputs);
  const sessionPlan = buildFirstSession(intent, workspaceId, nodes[0]);
  const evidencePlan = buildEvidencePlan(intent, workspaceId, outputs);

  return {
    schema: "WorkspacePlan",
    version: WORKSPACE_INTENT_CONTRACT_VERSION,
    plan_id: `workspace-plan-${slug(intent.workspace_title)}`,
    intent_id: intent.intent_id,
    user_ambition: {
      statement: intent.user_ambition,
    },
    workspace: {
      workspace_id: workspaceId,
      title: intent.workspace_title,
      intent: intent.trying_to_build_or_understand,
    },
    source_intake: intent.source_intake,
    outputs,
    nodes,
    session_plan: sessionPlan,
    evidence_plan: evidencePlan,
    generated_at: intent.created_at || WORKSPACE_INTENT_GENERATED_AT,
    compiled_by: GENERATED_BY,
  };
}

export function selectFirstSessionPlan(plan) {
  return plan?.session_plan || null;
}

function issue(field, message) {
  return { field, message, severity: "error" };
}

function warning(field, message) {
  return { field, message, severity: "warning" };
}

function result(issues) {
  const errors = issues.filter((entry) => entry.severity === "error");
  return {
    valid: errors.length === 0,
    issues,
    summary: errors.length === 0 ? "valid" : `${errors.length} error(s)`,
  };
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

export function validateSourceIntake(source) {
  const issues = [];
  if (!isObject(source)) {
    return result([issue("source_intake", "SourceIntake must be an object.")]);
  }
  if (source.schema !== "SourceIntake") {
    issues.push(issue("source_intake.schema", "schema must be SourceIntake."));
  }
  if (!SOURCE_TYPES.includes(source.source_type)) {
    issues.push(issue("source_intake.source_type", "source_type is not recognized."));
  }
  if (!normalizeString(source.raw_input)) {
    issues.push(issue("source_intake.raw_input", "Source/playbook input is required."));
  }
  if (source.source_type === "unknown") {
    issues.push(issue("source_intake.source_type", "source_type cannot remain unknown after intake."));
  }
  if (!hasNonEmptyArray(source.extracted_signals)) {
    issues.push(warning("source_intake.extracted_signals", "No source signals were detected."));
  }
  return result(issues);
}

export function validateWorkspaceIntent(intent) {
  const issues = [];
  if (!isObject(intent)) {
    return result([issue("workspace_intent", "WorkspaceIntent must be an object.")]);
  }
  if (intent.schema !== "WorkspaceIntent") {
    issues.push(issue("workspace_intent.schema", "schema must be WorkspaceIntent."));
  }
  if (!normalizeString(intent.user_ambition)) {
    issues.push(issue("workspace_intent.user_ambition", "User ambition is required."));
  }
  if (!normalizeString(intent.workspace_title)) {
    issues.push(issue("workspace_intent.workspace_title", "Workspace title is required."));
  }
  if (normalizeText(intent.user_ambition) === normalizeText(intent.workspace_title)) {
    issues.push(issue("workspace_intent.workspace_title", "User Ambition and Workspace must remain distinct."));
  }
  if (!normalizeString(intent.trying_to_build_or_understand)) {
    issues.push(issue("workspace_intent.trying_to_build_or_understand", "Trying-to-build/understand text is required."));
  }
  if (!normalizeString(intent.why_this_matters)) {
    issues.push(warning("workspace_intent.why_this_matters", "Motivation is empty."));
  }
  if (!hasNonEmptyArray(intent.knowns)) {
    issues.push(warning("workspace_intent.knowns", "Known background is empty."));
  }
  if (!hasNonEmptyArray(intent.unknowns)) {
    issues.push(warning("workspace_intent.unknowns", "Unknowns are empty."));
  }
  if (!hasNonEmptyArray(intent.desired_outputs)) {
    issues.push(issue("workspace_intent.desired_outputs", "At least one desired output is required."));
  }

  issues.push(...validateSourceIntake(intent.source_intake).issues);
  return result(issues);
}

export function validateSessionPlan(session) {
  const issues = [];
  if (!isObject(session)) {
    return result([issue("session_plan", "SessionPlan must be an object.")]);
  }
  if (session.schema !== "SessionPlan") {
    issues.push(issue("session_plan.schema", "schema must be SessionPlan."));
  }
  for (const field of ["session_id", "workspace_id", "node_id", "title", "focus"]) {
    if (!normalizeString(session[field])) {
      issues.push(issue(`session_plan.${field}`, `${field} is required.`));
    }
  }
  if (!hasNonEmptyArray(session.outputs)) {
    issues.push(issue("session_plan.outputs", "Session outputs are required."));
  }
  if (!hasNonEmptyArray(session.required_evidence)) {
    issues.push(issue("session_plan.required_evidence", "Session required_evidence is required."));
  }
  return result(issues);
}

export function validateEvidencePlan(plan) {
  const issues = [];
  if (!isObject(plan)) {
    return result([issue("evidence_plan", "EvidencePlan must be an object.")]);
  }
  if (plan.schema !== "EvidencePlan") {
    issues.push(issue("evidence_plan.schema", "schema must be EvidencePlan."));
  }
  if (!normalizeString(plan.workspace_id)) {
    issues.push(issue("evidence_plan.workspace_id", "workspace_id is required."));
  }
  if (!normalizeString(plan.intent_id)) {
    issues.push(issue("evidence_plan.intent_id", "intent_id is required."));
  }
  if (!hasNonEmptyArray(plan.required_evidence)) {
    issues.push(issue("evidence_plan.required_evidence", "At least one evidence output is required."));
  }
  return result(issues);
}

export function validateWorkspacePlan(plan) {
  const issues = [];
  if (!isObject(plan)) {
    return result([issue("workspace_plan", "WorkspacePlan must be an object.")]);
  }
  if (plan.schema !== "WorkspacePlan") {
    issues.push(issue("workspace_plan.schema", "schema must be WorkspacePlan."));
  }
  if (!normalizeString(plan.user_ambition?.statement)) {
    issues.push(issue("workspace_plan.user_ambition.statement", "User ambition statement is required."));
  }
  if (!normalizeString(plan.workspace?.title)) {
    issues.push(issue("workspace_plan.workspace.title", "Workspace title is required."));
  }
  if (normalizeText(plan.user_ambition?.statement) === normalizeText(plan.workspace?.title)) {
    issues.push(issue("workspace_plan.workspace.title", "User Ambition and Workspace must remain distinct."));
  }
  if (!hasNonEmptyArray(plan.outputs)) {
    issues.push(issue("workspace_plan.outputs", "Workspace outputs are required."));
  }
  if (!hasNonEmptyArray(plan.nodes)) {
    issues.push(issue("workspace_plan.nodes", "Workspace nodes are required."));
  }

  const sessionValidation = validateSessionPlan(plan.session_plan);
  issues.push(...sessionValidation.issues.map((entry) => ({ ...entry, field: `workspace_plan.${entry.field}` })));

  const evidenceValidation = validateEvidencePlan(plan.evidence_plan);
  issues.push(...evidenceValidation.issues.map((entry) => ({ ...entry, field: `workspace_plan.${entry.field}` })));

  if (hasNonEmptyArray(plan.nodes) && plan.session_plan?.node_id) {
    const nodeIds = new Set(plan.nodes.map((node) => node.node_id));
    if (!nodeIds.has(plan.session_plan.node_id)) {
      issues.push(issue("workspace_plan.session_plan.node_id", "First session must point at a planned workspace node."));
    }
  }

  return result(issues);
}

export function formatWorkspacePlanPreview(plan) {
  return {
    proposed_workspace: plan?.workspace?.title || "Workspace",
    outputs: Array.isArray(plan?.outputs) ? [...plan.outputs] : [],
    first_session: plan?.session_plan?.title || "Session 01",
    validation: validateWorkspacePlan(plan),
  };
}

export function buildWorkspaceIntentFlow(input = {}) {
  const workspaceIntent = buildWorkspaceIntent(input);
  const workspacePlan = compileWorkspacePlanFromIntent(workspaceIntent);
  const validation = validateWorkspacePlan(workspacePlan);
  return {
    contract_order: WORKSPACE_INTENT_CONTRACT_ORDER,
    workspace_intent: workspaceIntent,
    source_intake: workspaceIntent.source_intake,
    workspace_plan: workspacePlan,
    session_plan: workspacePlan.session_plan,
    evidence_plan: workspacePlan.evidence_plan,
    validation,
  };
}

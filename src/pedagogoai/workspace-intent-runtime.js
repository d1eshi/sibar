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
  tryingToBuildOrUnderstand: "I want to follow this topic and build a reproducible artifact with notes and checks",
  sourceInput: "URL / pasted text / paper / repo",
  whyItMatters: "I want evidence for frontier AI researcher preparation",
  alreadyKnow: "Python, basic ML, some PyTorch",
  notKnowYet: "Core concepts and reproducible workflows",
  desiredOutput: "repo, notes, benchmark, public writeup",
  createdAt: WORKSPACE_INTENT_GENERATED_AT,
};

const SOURCE_TYPES = ["url", "pasted_text", "paper", "repo", "mixed", "unknown"];
const GENERATED_BY = "deterministic-builder";
const FALLBACK_WORKSPACE_TITLE = "Focused Research Workspace";

const WORKSPACE_TOPIC_RULES = [
  {
    key: "embeddings",
    title: "Embeddings",
    aliases: ["embedding", "embeddings", "vector", "vectorization", "semantic search"],
    primaryOutput: "embeddings artifact",
    notesOutput: "embeddings notes",
    validationOutput: "embeddings notebook",
  },
  {
    key: "transformer",
    title: "Transformers",
    aliases: ["transformer", "attention", "self-attention"],
    primaryOutput: "transformer implementation",
    notesOutput: "shape/attention notes",
    validationOutput: "training/eval notebook",
    hasJaxOutput: "toy transformer in JAX",
  },
  {
    key: "kernel",
    title: "Systems / Kernels",
    aliases: ["kernel", "pallas", "triton", "xla", "vmap", "jit", "cuda", "profiling"],
    primaryOutput: "kernel benchmark",
    notesOutput: "kernel notes",
    validationOutput: "benchmark artifact",
  },
  {
    key: "scaling",
    title: "Scaling Laws",
    aliases: ["scaling", "scaling laws"],
    primaryOutput: "scaling analysis",
    notesOutput: "scaling notes",
    validationOutput: "benchmark artifact",
  },
  {
    key: "neural",
    title: "Neural Nets from Scratch",
    aliases: ["neural", "micrograd", "backprop"],
    primaryOutput: "neural implementation",
    notesOutput: "backprop notes",
    validationOutput: "training/eval notebook",
  },
];

const EVIDENCE_KIND_MATCHERS = [
  { match: /\b(benchmark)\b/, kind: "benchmark" },
  { match: /\b(repo|artifact|implementation|prototype|code|model|embedding|transformer|kernel)\b/, kind: "repo" },
  { match: /\b(note|notes)\b/, kind: "notes" },
  { match: /\b(notebook|training|eval|benchmark|experiment|experimenting)\b/, kind: "notebook" },
  { match: /\b(writeup|public|blog|report|article)\b/, kind: "writeup" },
];

function containsAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function inferWorkspaceTopic(context) {
  const hasJax = containsAny(context, ["jax", "flax", "pallas", "triton"]);

  for (const rule of WORKSPACE_TOPIC_RULES) {
    if (containsAny(context, rule.aliases)) {
      if (rule.key === "transformer" && hasJax) {
        return {
          ...rule,
          title: "JAX Transformers",
          primaryOutput: rule.hasJaxOutput || rule.primaryOutput,
        };
      }
      return rule;
    }
  }

  return {
    key: "fallback",
    title: FALLBACK_WORKSPACE_TITLE,
    aliases: [],
    primaryOutput: "research artifact",
    notesOutput: "learning notes",
    validationOutput: "training/eval notebook",
  };
}

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
    ["embedding", "embeddings"],
    ["vector", "embeddings"],
    ["semantic", "semantic embeddings"],
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
  return inferWorkspaceTopic(context).title || FALLBACK_WORKSPACE_TITLE;
}

function inferWorkspaceOutputs(intent) {
  const context = normalizeText([
    intent.trying_to_build_or_understand,
    intent.desired_outputs.join(" "),
    intent.unknowns.join(" "),
  ].join(" "));
  const topic = inferWorkspaceTopic(context);
  const outputs = [];
  outputs.push(...intent.desired_outputs.map((output) => `${output}`));
  outputs.push(topic.primaryOutput);
  if (!context.includes("notes")) {
    outputs.push(topic.notesOutput);
  }
  if (context.includes("benchmark") || context.includes("scaling") || context.includes("kernel")) {
    outputs.push(topic.validationOutput);
  }
  if (context.includes("training") || context.includes("eval") || context.includes("notebook")) {
    outputs.push(topic.validationOutput);
  }
  if (context.includes("public") || context.includes("writeup")) {
    outputs.push("public writeup");
  }
  if (!outputs.length) {
    outputs.push("research artifact");
  }

  return dedupe(outputs);
}

function evidenceKindForOutput(output) {
  const lower = normalizeText(output);
  for (const matcher of EVIDENCE_KIND_MATCHERS) {
    if (matcher.match.test(lower)) {
      return matcher.kind;
    }
  }
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

function categorizeOutputs(outputs, matcher) {
  return outputs.filter((output) => matcher.test(normalizeText(output)));
}

function fallbackOutputs(outputs, fallback = []) {
  return outputs.length > 0 ? outputs : fallback;
}

function buildWorkspaceNodes(workspaceId, outputs, topic) {
  const topicSlug = slug(topic.title, "workspace");
  const sourceResource = {
    kind: "source",
    title: "Workspace source/playbook",
    source: "WorkspaceIntent SourceIntake",
    action: "Read the source slice, then write a reconstruction before hints.",
  };
  const lowerOutputs = outputs.map((value) => normalizeText(value));
  const foundationOutputs = dedupe(
    fallbackOutputs(
      categorizeOutputs(outputs, /\b(note|notes|concept|overview|theory|definition|understand)\b/),
      outputs.slice(0, 2),
    ),
  );
  const implementationOutputs = dedupe(
    fallbackOutputs(
      categorizeOutputs(outputs, /\b(implementation|artifact|repo|code|transformer|embedding|kernel|neural|model)\b/),
      outputs.slice(0, 2),
    ),
  );
  const validationOutputs = dedupe(
    fallbackOutputs(
      categorizeOutputs(outputs, /\b(notebook|training|eval|benchmark|experiment|metric)\b/),
      outputs.slice(-2),
    ),
  );
  const publishOutputs = dedupe(
    fallbackOutputs(
      categorizeOutputs(outputs, /\b(public|writeup|report|blog|article)\b/),
      outputs.length ? outputs.slice(-1) : [topic.primaryOutput],
    ),
  );

  const hasBenchmarkIntent = /\b(benchmark|eval|training|kernel|scaling)\b/.test(lowerOutputs.join(" "));

  return [
    {
      schema: "WorkspaceNodePlan",
      node_id: `${topicSlug}-foundations`,
      title: `${topic.title} foundations`,
      focus: `Frame the core concepts and constraints for ${topic.title.toLowerCase()} before implementation.`,
      operation_target: "build",
      prerequisite_node_ids: [],
      session_ids: ["session-01"],
      evidence_outputs: foundationOutputs,
      mini_nodes: [
        {
          id: "topic-scope-map",
          title: "Topic scope map",
          goal: `Define scope, assumptions, and one measurable artifact for ${topic.title.toLowerCase()}.`,
          reader_prompt: "Write one-page scope map with risks, constraints, and success criteria.",
          resources: [sourceResource],
        },
        {
          id: "starter-check",
          title: "Starter check",
          goal: `Create one concrete sanity check tied to ${topic.title.toLowerCase()}.`,
          reader_prompt: "Choose one metric and define what success and failure look like.",
          resources: [sourceResource],
        },
      ],
    },
    {
      schema: "WorkspaceNodePlan",
      node_id: `${topicSlug}-implementation`,
      title: `${topic.title} implementation`,
      focus: `Implement a minimal prototype for ${topic.title.toLowerCase()} that can be inspected step by step.`,
      operation_target: "build",
      prerequisite_node_ids: [`${topicSlug}-foundations`],
      session_ids: ["session-02"],
      evidence_outputs: implementationOutputs,
      mini_nodes: [
        {
          id: "core-loop",
          title: "Core loop",
          goal: `Design the core operation flow for ${topic.title.toLowerCase()}.`,
          reader_prompt: "Write one pseudocode pass from input to output and mark the state transitions.",
          resources: [sourceResource],
        },
        {
          id: "artifact-check",
          title: "Artifact check",
          goal: `Add one verification step that catches the most likely regression for ${topic.title.toLowerCase()}.`,
          reader_prompt: "List one assertion or check and the failure condition it catches.",
          resources: [sourceResource],
        },
      ],
    },
    {
      schema: "WorkspaceNodePlan",
      node_id: `${topicSlug}-validation`,
      title: `${topic.title} validation`,
      focus: `Validate the prototype with one reproducible evaluation for ${topic.title.toLowerCase()}.`,
      operation_target: hasBenchmarkIntent ? "benchmark" : "build",
      prerequisite_node_ids: [`${topicSlug}-implementation`],
      session_ids: ["session-03"],
      evidence_outputs: validationOutputs,
      mini_nodes: [
        {
          id: "metric-first",
          title: "Metric-first benchmark",
          goal: `Run one constrained comparison and record one clear metric for ${topic.title.toLowerCase()}.`,
          reader_prompt: "Define input, metric, baseline, and what indicates success or failure.",
          resources: [sourceResource],
        },
      ],
    },
    {
      schema: "WorkspaceNodePlan",
      node_id: `${topicSlug}-publishing`,
      title: `${topic.title} synthesis`,
      focus: `Summarize what is known, what is still unknown, and what to publish next for ${topic.title.toLowerCase()}.`,
      operation_target: publishOutputs.some((output) => /writeup|public|blog|report|article/.test(normalizeText(output))) ? "publish" : "explain",
      prerequisite_node_ids: [`${topicSlug}-implementation`, `${topicSlug}-validation`],
      session_ids: ["session-04"],
      evidence_outputs: publishOutputs,
      mini_nodes: [
        {
          id: "readiness-summary",
          title: "Readiness summary",
          goal: `Create one short artifact that explains outcomes and the next concrete step for ${topic.title.toLowerCase()}.`,
          reader_prompt: "Write a short summary with evidence references and one open question.",
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
      "Can explain the first session artifact without prompting.",
      "Can trace evidence back to source/playbook signals.",
      "Can name what remains unknown before publishing confidence.",
    ],
  };
}

function buildFirstSession(intent, workspaceId, firstNode) {
  const firstSessionOutputs = dedupe([
    `Initial ${normalizeText(firstNode.title).replace(/[-_]/g, " ")}`,
    ...firstNode.evidence_outputs.slice(0, 2),
  ]);
  const firstSessionEvidence = firstNode.evidence_outputs.length
    ? firstNode.evidence_outputs
    : ["workspace kickoff artifact"];

  return {
    schema: "SessionPlan",
    version: WORKSPACE_INTENT_CONTRACT_VERSION,
    session_id: "session-01",
    workspace_id: workspaceId,
    node_id: firstNode.node_id,
    title: `Session 01 - ${firstNode.title}`,
    focus: firstNode.focus,
    operation_target: "build",
    outputs: firstSessionOutputs,
    required_evidence: firstSessionEvidence,
    success_criteria: [
      `Session stays inside workspace ${intent.workspace_title}.`,
      "User can describe one concrete failure mode before moving to the next session.",
      "Session evidence can be reused in the next planned node.",
    ],
  };
}

export function compileWorkspacePlanFromIntent(intent) {
  const outputs = inferWorkspaceOutputs(intent);
  const workspaceId = `workspace-${slug(intent.workspace_title)}`;
  const topic = inferWorkspaceTopic(
    normalizeText([
      intent.trying_to_build_or_understand,
      intent.unknowns.join(" "),
      intent.desired_outputs.join(" "),
    ].join(" ")),
  );
  const nodes = buildWorkspaceNodes(workspaceId, outputs, topic);
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

import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import {
  buildWorkspaceIntent,
  compileWorkspacePlanFromIntent,
  formatWorkspacePlanPreview,
  validateWorkspacePlan,
} from "./workspace-intent.ts";
import type {
  EvidenceRequirement,
  SessionPlan,
  WorkspaceIntent,
  WorkspaceIntentInput,
  WorkspaceIntentValidationResult,
  WorkspacePlan,
  WorkspacePlanNode,
  WorkspacePlanPreview,
} from "./workspace-intent-types.ts";

export type WorkspaceCompilerRunnerAdapter = "fixture" | "codex-exec";

export type RustEvidenceRef = {
  id: string;
  path: string;
  line_range: {
    line_start: number;
    line_end: number;
  };
  excerpt: string;
  content_hash?: string;
};

export type RustSourceBundle = {
  paths: string[];
  evidence: RustEvidenceRef[];
  content_hash?: string;
  root_path?: string;
};

export type RustWorkspaceIntent = {
  user_intent: string;
  schema?: string;
  intent_id?: string;
  workspace_title?: string;
  trying_to_build_or_understand?: string;
  user_ambition?: string;
  source_bundle: RustSourceBundle;
  existing_state?: unknown;
};

export type RustSourceLink = {
  evidence_id: string;
  rationale?: string;
};

export type RustWorkspaceNode = {
  id: string;
  title?: string | null;
  prerequisites: string[];
  concepts: string[];
  source_links: RustSourceLink[];
  artifact_requirement: {
    id: string;
    path: string;
    requires: string;
    optional?: boolean;
    confidence?: string | null;
  };
  is_advanced: boolean;
  locked?: {
    reason: string;
  } | null;
};

export type RustNextAction = {
  label: string;
  target_node_id?: string | null;
  visible: boolean;
};

export type RustWorkspaceArtifactRequirement = {
  id: string;
  path: string;
  requires: string;
  optional?: boolean;
  confidence?: string | null;
};

export type RustUIProjection = {
  title: string;
  summary: string;
  badges?: string[];
};

export type RustWorkspacePlan = {
  objective: string;
  bounded_objective: boolean;
  nodes: RustWorkspaceNode[];
  next_actions: RustNextAction[];
  artifact_requirements: RustWorkspaceArtifactRequirement[];
  questions_if_blocked: string[];
  ui_projection?: RustUIProjection;
};

export type RustWorkspaceCompilerOptions = {
  adapter?: WorkspaceCompilerRunnerAdapter;
  fixturePath?: string;
  schemaPath?: string;
  codexBinary?: string;
  runCodex?: boolean;
  timeoutMs?: number;
  rustBinary?: string;
  workingDirectory?: string;
  sourcePaths?: string[];
  rootPath?: string;
};

export type RustWorkspaceRunnerArgs = {
  binary: string;
  args: string[];
  adapter: WorkspaceCompilerRunnerAdapter;
  command: string;
};

export type WorkspaceCompilerRunnerResult = {
  runner: {
    status: "completed" | "failed" | "blocked";
    adapter: WorkspaceCompilerRunnerAdapter;
    command: string;
    args: string[];
    exit_code?: number | null;
    blocked_reason?: string;
  };
  rust_intent: RustWorkspaceIntent;
  rust_workspace_plan: RustWorkspacePlan | null;
  workspace_intent: WorkspaceIntent;
  workspace_plan: WorkspacePlan;
  preview: WorkspacePlanPreview;
  validation: WorkspaceIntentValidationResult;
};

const DEFAULT_RUST_BINARY = "cargo";
const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_WORKDIR = process.cwd();

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((entry) => {
    const key = entry.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .replace(/-+/g, "-")
    .slice(0, 32) || "entry";
}

function normalizePath(value: string): string {
  return value.trim().replace(/\\/g, "/");
}

function normalizeIntentFromInput(
  input: WorkspaceIntent | WorkspaceIntentInput,
): WorkspaceIntent {
  if ((input as WorkspaceIntent).schema === "WorkspaceIntent") {
    return input as WorkspaceIntent;
  }
  return buildWorkspaceIntent(input as WorkspaceIntentInput);
}

function inferSourcePaths(intent: WorkspaceIntent): string[] {
  const tokens = (intent.source_intake.raw_input ?? "")
    .split(/[\n,;]+/g)
    .map(normalizePath)
    .filter((entry) => {
      const hasScheme = /^https?:\/\//i.test(entry);
      return Boolean(entry) && !hasScheme && !entry.startsWith("data:");
    })
    .map((entry) => resolve(entry))
    .filter((entry) => existsSync(entry));
  return dedupe(tokens.length > 0 ? tokens : [resolve(DEFAULT_WORKDIR)]);
}

function resolveRootPath(candidatePaths: string[], explicitRoot?: string): string {
  if (explicitRoot) return resolve(explicitRoot);
  return resolve(DEFAULT_WORKDIR);
}

function buildRustEvidence(sourcePaths: string[]): RustEvidenceRef[] {
  if (sourcePaths.length === 0) {
    return [{
      id: "evidence-root",
      path: ".",
      line_range: { line_start: 1, line_end: 1 },
      excerpt: "Generated fallback evidence for PedagogoAI intent.",
    }];
  }

  return sourcePaths.map((entry, index) => ({
    id: `evidence-${String(index + 1).padStart(2, "0")}-${slug(entry)}`,
    path: entry,
    line_range: { line_start: 1, line_end: 10 },
    excerpt: `Evidence scaffolded from ${entry}.`,
  }));
}

export function buildRustWorkspaceIntent(
  input: WorkspaceIntent | WorkspaceIntentInput,
  overrides?: {
    sourcePaths?: string[];
    rootPath?: string;
  },
): RustWorkspaceIntent {
  const intent = normalizeIntentFromInput(input);
  const pathOverrides = (overrides?.sourcePaths ?? [])
    .map(normalizePath)
    .filter(Boolean)
    .map((entry) => resolve(entry));
  const inferredPaths = inferSourcePaths(intent);
  const sourcePaths = dedupe(pathOverrides.length > 0 ? pathOverrides : inferredPaths);
  const rootPath = resolveRootPath(sourcePaths, overrides?.rootPath);
  const paths = sourcePaths.map((entry) => {
    const relativePath = normalizePath(relative(rootPath, entry));
    return relativePath || ".";
  });
  const evidence = buildRustEvidence(paths);

  return {
    user_intent:
      intent.trying_to_build_or_understand
      || intent.user_ambition
      || "Workspace plan generation.",
    schema: "WorkspaceIntent",
    intent_id: intent.intent_id,
    workspace_title: intent.workspace_title,
    trying_to_build_or_understand: intent.trying_to_build_or_understand,
    user_ambition: intent.user_ambition,
    source_bundle: {
      paths: dedupe(paths),
      evidence,
      root_path: rootPath,
    },
    existing_state: null,
  };
}

export function buildRustWorkspaceCompilerCommand(
  options: RustWorkspaceCompilerOptions = {},
): RustWorkspaceRunnerArgs {
  const adapter = options.adapter === "codex-exec" ? "codex-exec" : "fixture";
  const binary = options.rustBinary?.trim() || DEFAULT_RUST_BINARY;
  const args = [
    "run",
    "--quiet",
    "-p",
    "sibi-workspace-compiler",
    "--",
    "--adapter",
    adapter,
  ];

  if (adapter === "fixture") {
    if (!options.fixturePath) {
      throw new Error("fixture adapter requires --fixture path.");
    }
    args.push("--fixture", resolve(options.fixturePath));
  } else {
    if (options.schemaPath) args.push("--schema", resolve(options.schemaPath));
    if (options.codexBinary?.trim()) args.push("--codex-binary", options.codexBinary.trim());
  }

  return {
    binary,
    args,
    adapter,
    command: `${binary} ${args.join(" ")}`,
  };
}

function isRustWorkspacePlan(value: unknown): value is RustWorkspacePlan {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.objective === "string"
    && typeof candidate.bounded_objective === "boolean"
    && Array.isArray(candidate.nodes)
    && Array.isArray(candidate.next_actions)
    && Array.isArray(candidate.artifact_requirements)
    && Array.isArray(candidate.questions_if_blocked)
  );
}

export function parseRustWorkspacePlan(rawOutput: string): RustWorkspacePlan {
  const parsed = JSON.parse(rawOutput) as Record<string, unknown>;
  const candidate = parsed?.candidate_plan ?? parsed;
  if (!isRustWorkspacePlan(candidate)) {
    throw new Error("Rust workspace compiler output is not a valid WorkspacePlan.");
  }
  return candidate;
}

function inferArtifactKindFromNode(node: RustWorkspaceNode): EvidenceRequirement["artifact_kind"] {
  const source = `${node.title ?? ""} ${node.prerequisites.join(" ")} ${node.concepts.join(" ")} ${node.artifact_requirement.requires}`.toLowerCase();
  if (source.includes("benchmark")) return "benchmark";
  if (source.includes("notebook")) return "notebook";
  if (source.includes("note")) return "notes";
  if (source.includes("repo") || source.includes("code")) return "repo";
  if (source.includes("writeup") || source.includes("publish")) return "writeup";
  return "source";
}

function inferOperationFromNode(node: RustWorkspaceNode): WorkspacePlanNode["operation_target"] {
  const context = `${node.title ?? ""} ${node.concepts.join(" ")} ${node.artifact_requirement.requires}`.toLowerCase();
  if (/(explain|understand)/.test(context)) return "explain";
  if (/(benchmark|measure|profile)/.test(context)) return "benchmark";
  if (/(publish|writeup)/.test(context)) return "publish";
  if (/(build|implement|create|generate|patch|compile|code)/.test(context)) return "build";
  return "read";
}

function mapRustNodeToPedagogoNode(node: RustWorkspaceNode): WorkspacePlanNode {
  const evidenceOutputs = dedupe(node.source_links.map((link) => link.evidence_id));
  return {
    schema: "WorkspaceNodePlan",
    node_id: node.id,
    title: node.title?.trim() || node.id,
    focus: `Integrar ${node.title || node.id} desde evidencia del compilador Rust.`,
    operation_target: inferOperationFromNode(node),
    prerequisite_node_ids: dedupe(node.prerequisites),
    session_ids: ["session-01"],
    evidence_outputs: evidenceOutputs.length > 0 ? evidenceOutputs : ["source-evidence"],
    mini_nodes: [
      {
        id: `${node.id}-mini-01`,
        title: "Ruta de evidencia",
        goal: `Vincular evidencia del nodo ${node.id} con una evidencia accionable.`,
        reader_prompt: "Lee la evidencia y define la siguiente acción mínima del workspace.",
        resources: dedupe(node.source_links.map((link) => link.evidence_id)).map((evidenceId) => ({
          kind: "source",
          title: evidenceId,
          source: `Evidence ${evidenceId}`,
          action: "Use this evidence for workspace execution.",
        })),
      },
    ],
  };
}

function buildEvidencePlanFromRust(
  workspaceIntent: WorkspaceIntent,
  rustPlan: RustWorkspacePlan,
  workspaceId: string,
) {
  const evidenceById = new Map<string, string | undefined>();
  for (const node of rustPlan.nodes) {
    for (const source of node.source_links) {
      if (!evidenceById.has(source.evidence_id)) {
        evidenceById.set(source.evidence_id, source.rationale?.trim());
      }
    }
  }

  const fallback = compileWorkspacePlanFromIntent(workspaceIntent).evidence_plan;
  const requiredEvidence: EvidenceRequirement[] = Array.from(evidenceById.entries()).map(([id, rationale]) => {
    const existing = fallback.required_evidence.find((entry) => entry.id === id);
    if (existing) return existing;
    const artifactKind = inferArtifactKindFromNode(
      rustPlan.nodes.find((node) => node.source_links.some((source) => source.evidence_id === id))
      || rustPlan.nodes[0],
    );
    return {
      id,
      label: rationale || `Runner evidence: ${id}`,
      artifact_kind: artifactKind,
      acceptance_criteria: [
        "La evidencia se usa para acotar el primer nodo del plan.",
        "La evidencia debe ser trazable desde el workspace.",
      ],
    };
  });

  return {
    ...fallback,
    workspace_id: workspaceId,
    required_evidence: requiredEvidence.length > 0 ? requiredEvidence : fallback.required_evidence,
    minimum_evidence_count: Math.min(
      3,
      requiredEvidence.length || fallback.required_evidence.length,
    ),
  };
}

function buildSessionPlanFromRust(
  basePlan: WorkspacePlan,
  rustPlan: RustWorkspacePlan,
): SessionPlan {
  const first = rustPlan.nodes[0];
  if (!first) return basePlan.session_plan;
  const evidenceOutputs = dedupe(first.source_links.map((source) => source.evidence_id));
  return {
    schema: "SessionPlan",
    version: basePlan.version,
    session_id: basePlan.session_plan.session_id,
    workspace_id: basePlan.workspace.workspace_id,
    node_id: first.id,
    title: first.title?.trim() || `Session for ${first.id}`,
    focus: first.title?.trim() || first.id,
    operation_target: inferOperationFromNode(first),
    outputs: evidenceOutputs.length > 0 ? evidenceOutputs : basePlan.session_plan.outputs,
    required_evidence: evidenceOutputs.length > 0 ? evidenceOutputs : basePlan.session_plan.required_evidence,
    success_criteria: [
      "La sesión inicial opera sobre evidencia citada por el compilador.",
      "La ejecución queda acotada al objetivo compilado.",
    ],
  };
}

export function rustWorkspacePlanToPedagogoPlan(
  workspaceIntent: WorkspaceIntent,
  rustPlan: RustWorkspacePlan,
): WorkspacePlan {
  const basePlan = compileWorkspacePlanFromIntent(workspaceIntent);
  if (rustPlan.nodes.length === 0) {
    return {
      ...basePlan,
      compiled_by: "llm",
    };
  }

  const workspaceId = `workspace-${slug(workspaceIntent.workspace_title)}`;
  const nodes = rustPlan.nodes.map((node) => mapRustNodeToPedagogoNode(node));
  const evidencePlan = buildEvidencePlanFromRust(workspaceIntent, rustPlan, workspaceId);
  const sessionPlan = buildSessionPlanFromRust(basePlan, rustPlan);
  const nodeEvidenceIds = dedupe(
    rustPlan.nodes.flatMap((node) => node.source_links.map((source) => source.evidence_id)),
  );

  return {
    ...basePlan,
    workspace: {
      ...basePlan.workspace,
      intent: rustPlan.objective || basePlan.workspace.intent,
    },
    outputs: nodeEvidenceIds.length > 0 ? nodeEvidenceIds : basePlan.outputs,
    nodes,
    session_plan: sessionPlan,
    evidence_plan: evidencePlan,
    compiled_by: "llm",
  };
}

export function runRustWorkspaceCompiler(
  input: WorkspaceIntent | WorkspaceIntentInput,
  options: RustWorkspaceCompilerOptions = {},
): WorkspaceCompilerRunnerResult {
  const workspaceIntent = normalizeIntentFromInput(input);
  const rustIntent = buildRustWorkspaceIntent(workspaceIntent, {
    sourcePaths: options.sourcePaths,
    rootPath: options.rootPath,
  });
  const fallbackWorkspacePlan = compileWorkspacePlanFromIntent(workspaceIntent);
  const fallbackValidation = validateWorkspacePlan(fallbackWorkspacePlan);
  const fallbackPreview = formatWorkspacePlanPreview(fallbackWorkspacePlan);
  let commandArgs: RustWorkspaceRunnerArgs;

  try {
    commandArgs = buildRustWorkspaceCompilerCommand({
      adapter: options.adapter,
      fixturePath: options.fixturePath,
      schemaPath: options.schemaPath,
      codexBinary: options.codexBinary,
      rustBinary: options.rustBinary,
    });

    if (commandArgs.adapter === "codex-exec" && options.runCodex !== true) {
      return {
        runner: {
          status: "blocked",
          adapter: commandArgs.adapter,
          command: commandArgs.command,
          args: commandArgs.args,
          blocked_reason: "codex-exec execution is disabled by default in this test slice.",
        },
        rust_intent: rustIntent,
        rust_workspace_plan: null,
        workspace_intent: workspaceIntent,
        workspace_plan: {
          ...fallbackWorkspacePlan,
        },
        preview: fallbackPreview,
        validation: fallbackValidation,
      };
    }

    const commandResult = spawnSync(commandArgs.binary, commandArgs.args, {
      input: JSON.stringify(rustIntent),
      cwd: options.workingDirectory ?? DEFAULT_WORKDIR,
      encoding: "utf8",
      timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });

    if (commandResult.error) {
      return {
        runner: {
          status: "failed",
          adapter: commandArgs.adapter,
          command: commandArgs.command,
          args: commandArgs.args,
          exit_code: commandResult.status ?? null,
          blocked_reason: commandResult.error.message,
        },
        rust_intent: rustIntent,
        rust_workspace_plan: null,
        workspace_intent: workspaceIntent,
        workspace_plan: fallbackWorkspacePlan,
        preview: fallbackPreview,
        validation: fallbackValidation,
      };
    }

    if (commandResult.status !== 0) {
      return {
        runner: {
          status: "failed",
          adapter: commandArgs.adapter,
          command: commandArgs.command,
          args: commandArgs.args,
          exit_code: commandResult.status,
          blocked_reason:
            commandResult.stderr?.toString().trim() || "Rust workspace compiler exited non-zero.",
        },
        rust_intent: rustIntent,
        rust_workspace_plan: null,
        workspace_intent: workspaceIntent,
        workspace_plan: fallbackWorkspacePlan,
        preview: fallbackPreview,
        validation: fallbackValidation,
      };
    }

    const output = commandResult.stdout?.toString() ?? "";
    const rustWorkspacePlan = parseRustWorkspacePlan(output);
    const workspacePlan = rustWorkspacePlanToPedagogoPlan(workspaceIntent, rustWorkspacePlan);
    return {
      runner: {
        status: "completed",
        adapter: commandArgs.adapter,
        command: commandArgs.command,
        args: commandArgs.args,
        exit_code: commandResult.status ?? null,
      },
      rust_intent: rustIntent,
      rust_workspace_plan: rustWorkspacePlan,
      workspace_intent: workspaceIntent,
      workspace_plan: workspacePlan,
      preview: formatWorkspacePlanPreview(workspacePlan),
      validation: validateWorkspacePlan(workspacePlan),
    };
  } catch (error) {
    const adapter = options.adapter === "codex-exec" ? "codex-exec" : "fixture";
    const binary = options.rustBinary?.trim() || DEFAULT_RUST_BINARY;
    const args = [
      "run",
      "--quiet",
      "-p",
      "sibi-workspace-compiler",
      "--",
      "--adapter",
      adapter,
    ];
    if (adapter === "fixture") {
      args.push("--fixture", options.fixturePath || "<missing fixturePath>");
    } else {
      if (options.schemaPath) args.push("--schema", options.schemaPath);
      if (options.codexBinary?.trim()) args.push("--codex-binary", options.codexBinary.trim());
    }
    return {
      runner: {
        status: "failed",
        adapter,
        command: `${binary} ${args.join(" ")}`,
        args,
        blocked_reason: error instanceof Error ? error.message : "Unknown runner error.",
      },
      rust_intent: rustIntent,
      rust_workspace_plan: null,
      workspace_intent: workspaceIntent,
      workspace_plan: fallbackWorkspacePlan,
      preview: fallbackPreview,
      validation: fallbackValidation,
    };
  }
}

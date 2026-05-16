import { createHash } from "node:crypto";

import { checkBoundaryEscape } from "./runtime-deep-ownership-boundary.ts";
import type { ArtifactBoundary } from "./runtime-deep-ownership-evidence-types.ts";
import type {
  ReadOnlyCommandEvidenceRecord,
  ReadOnlyCommandMutationAssessment,
  WorkspaceCommandPreview,
  WorkspaceCommandSafetyLevel,
  WorkspaceCommandWriteScope,
} from "./runtime-deep-ownership-intelligence-types.ts";

export type WorkspaceCommandPreviewInput = {
  id?: string;
  command: string;
  cwd: string;
  safety_level: WorkspaceCommandSafetyLevel;
  expected_outputs: string[];
  write_scope: WorkspaceCommandWriteScope;
  boundary: ArtifactBoundary;
  root_path: string;
  write_targets?: string[];
  requires_confirmation?: boolean;
  explicit_override?: boolean;
  created_at?: string;
};

export type ReadOnlyCommandEvidenceInput = {
  id?: string;
  preview: WorkspaceCommandPreview;
  exit_status: number;
  stdout: string;
  stderr: string;
  evidence_role?: ReadOnlyCommandEvidenceRecord["evidence_role"];
  mutation_assessment?: ReadOnlyCommandMutationAssessment;
  created_at?: string;
};

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function summarizeOutput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const firstLine = trimmed.split(/\r?\n/u)[0];
  return firstLine.slice(0, 240);
}

function commandIsBlockedByDefault(command: string): string | null {
  const patterns: Array<{ pattern: RegExp; reason: string }> = [
    { pattern: /\bgit\s+reset(\s+--hard)?\b/i, reason: "Git reset operations are blocked by default." },
    { pattern: /\bgit\s+rebase\b/i, reason: "Git rebase operations are blocked by default." },
    { pattern: /\bgit\s+push(\s+--force)?\b/i, reason: "Git push operations are blocked by default." },
    { pattern: /\brm\s+-rf\b/i, reason: "Destructive file deletion is blocked by default." },
    { pattern: /\brm\s+-r\b/i, reason: "Recursive file deletion is blocked by default." },
    { pattern: /\bpnpm\s+(add|install)\b/i, reason: "Dependency installation is blocked by default." },
    { pattern: /\bnpm\s+install\b/i, reason: "Dependency installation is blocked by default." },
    { pattern: /\byarn\s+add\b/i, reason: "Dependency installation is blocked by default." },
    { pattern: /\bpip3?\s+install\b/i, reason: "Dependency installation is blocked by default." },
  ];

  for (const entry of patterns) {
    if (entry.pattern.test(command)) {
      return entry.reason;
    }
  }
  return null;
}

function nextId(prefix: string, count: number): string {
  return `${prefix}-${String(count + 1).padStart(3, "0")}`;
}

export function previewWorkspaceCommand(input: WorkspaceCommandPreviewInput): WorkspaceCommandPreview {
  let blockedReason: string | null = null;
  let boundaryStatus: WorkspaceCommandPreview["boundary_status"] = "in_scope";

  const cwdBoundaryCheck = checkBoundaryEscape(input.cwd, input.root_path, input.boundary);
  if (cwdBoundaryCheck.blocked) {
    blockedReason = cwdBoundaryCheck.reason ?? "Command cwd is outside declared boundaries.";
    boundaryStatus = "out_of_scope";
  }

  if (!blockedReason && Array.isArray(input.write_targets)) {
    for (const candidate of input.write_targets) {
      const candidateCheck = checkBoundaryEscape(candidate, input.root_path, input.boundary);
      if (candidateCheck.blocked) {
        blockedReason = candidateCheck.reason ?? `Write target '${candidate}' is out of scope.`;
        boundaryStatus = "out_of_scope";
        break;
      }
    }
  }

  if (!blockedReason && input.safety_level === "read_only" && input.write_scope !== "none") {
    blockedReason = "Read-only command previews must declare write_scope='none'.";
  }

  if (!blockedReason && !input.explicit_override) {
    if (input.safety_level === "destructive") {
      blockedReason = "Destructive operations are blocked by default.";
    } else if (input.safety_level === "product_write") {
      blockedReason = "Product writes require explicit user request or override.";
    } else {
      blockedReason = commandIsBlockedByDefault(input.command);
    }
  }

  return {
    id: input.id ?? "CMD-PREVIEW-001",
    command: input.command,
    cwd: input.cwd,
    safety_level: input.safety_level,
    expected_outputs: input.expected_outputs,
    write_scope: input.write_scope,
    requires_confirmation: input.requires_confirmation ?? input.safety_level !== "read_only",
    boundary_status: boundaryStatus,
    blocked: blockedReason !== null,
    blocked_reason: blockedReason,
    created_at: input.created_at ?? new Date().toISOString(),
  };
}

export function assessReadOnlyCommandMutation(
  preview: WorkspaceCommandPreview,
  changedPaths: string[],
): ReadOnlyCommandMutationAssessment {
  const mutatedPaths = Array.from(new Set(changedPaths.filter((entry) => String(entry).trim().length > 0)));
  if (preview.safety_level !== "read_only" || mutatedPaths.length === 0) {
    return { violated: false, blocked: false, mutated_paths: [], reason: null };
  }

  return {
    violated: true,
    blocked: true,
    mutated_paths: mutatedPaths,
    reason: `Read-only command '${preview.command}' mutated files: ${mutatedPaths.join(", ")}`,
  };
}

export function createReadOnlyCommandEvidence(input: ReadOnlyCommandEvidenceInput): ReadOnlyCommandEvidenceRecord {
  const outputRefs = [
    { stream: "stdout" as const, value: input.stdout },
    { stream: "stderr" as const, value: input.stderr },
  ]
    .filter((entry) => entry.value.trim().length > 0)
    .map((entry, index) => ({
      id: nextId("CMD-OUT", index),
      stream: entry.stream,
      excerpt: summarizeOutput(entry.value),
      byte_length: Buffer.byteLength(entry.value, "utf8"),
      content_hash: `sha256:${hashText(entry.value)}`,
    }));

  const violationReason = input.preview.blocked_reason
    ?? input.mutation_assessment?.reason
    ?? null;

  return {
    id: input.id ?? "CMD-EVIDENCE-001",
    command: input.preview.command,
    cwd: input.preview.cwd,
    timestamp: input.created_at ?? new Date().toISOString(),
    exit_status: input.exit_status,
    stdout_summary: summarizeOutput(input.stdout),
    stderr_summary: summarizeOutput(input.stderr),
    output_refs: outputRefs,
    evidence_role: input.evidence_role ?? "behavior_oracle",
    accepted_as_read_only_evidence: violationReason === null,
    safety_violation_reason: violationReason,
  };
}

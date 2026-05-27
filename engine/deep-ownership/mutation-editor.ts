import { basename, isAbsolute, relative, resolve } from "node:path";

import type { EvidenceRef } from "../pedagogy/core/evidence-types.ts";
import type {
  MutationAllowedAction,
  OpenInEditorCitationPayload,
  ProductMutationGate,
} from "./intelligence-types.ts";

export type ProductMutationGateInput = {
  id?: string;
  proposed_change: string;
  affected_files: string[];
  required_readiness: string;
  current_readiness: ProductMutationGate["current_readiness"];
  missing_evidence: string[];
  explicit_user_request?: boolean;
  explicit_override?: boolean;
  patch_preview?: string | null;
  patch_preview_feasible?: boolean;
  verification_command: string;
  created_at?: string;
};

export type OpenInEditorCitationPayloadInput = {
  repo_root: string;
  evidence_ref: EvidenceRef;
  source_hash?: string | null;
  content_hash?: string | null;
  citation_label?: string;
  created_at?: string;
};

function normalizeTextList(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((entry) => String(entry).trim())
        .filter((entry) => entry.length > 0),
    ),
  );
}

function normalizePreviewText(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveAllowedAction(input: {
  explicitUserRequest: boolean;
  explicitOverride: boolean;
  readinessReady: boolean;
  hasMissingEvidence: boolean;
  patchPreviewAvailable: boolean;
}): { allowedAction: MutationAllowedAction; blockedReason: string | null } {
  if (!input.explicitUserRequest && !input.explicitOverride) {
    return {
      allowedAction: "explicit_override_required",
      blockedReason: "Product mutation requires explicit user request or override.",
    };
  }

  if (input.explicitOverride) {
    return {
      allowedAction: "apply_with_guardrails",
      blockedReason: null,
    };
  }

  if (!input.readinessReady || input.hasMissingEvidence) {
    if (input.patchPreviewAvailable) {
      return {
        allowedAction: "preview_patch",
        blockedReason: "Readiness evidence is incomplete; preview only until repaired.",
      };
    }

    return {
      allowedAction: "blocked_until_repair",
      blockedReason: "Readiness evidence is incomplete and no patch preview is available.",
    };
  }

  return {
    allowedAction: "apply_with_guardrails",
    blockedReason: null,
  };
}

export function createProductMutationGate(input: ProductMutationGateInput): ProductMutationGate {
  const affectedFiles = normalizeTextList(input.affected_files);
  const missingEvidence = normalizeTextList(input.missing_evidence);
  const explicitUserRequest = Boolean(input.explicit_user_request);
  const explicitOverride = Boolean(input.explicit_override);
  const patchPreview = normalizePreviewText(input.patch_preview);
  const patchPreviewFeasible = input.patch_preview_feasible ?? patchPreview !== null;
  const patchPreviewAvailable = patchPreview !== null;
  const readinessReady = input.current_readiness.status === "ready";
  const hasMissingEvidence = missingEvidence.length > 0;
  const action = resolveAllowedAction({
    explicitUserRequest,
    explicitOverride,
    readinessReady,
    hasMissingEvidence,
    patchPreviewAvailable,
  });

  return {
    id: input.id ?? "MUT-GATE-001",
    proposed_change: input.proposed_change,
    affected_files: affectedFiles,
    required_readiness: input.required_readiness,
    current_readiness: input.current_readiness,
    missing_evidence: missingEvidence,
    explicit_user_request: explicitUserRequest,
    explicit_override: explicitOverride,
    patch_preview: patchPreview,
    patch_preview_feasible: patchPreviewFeasible,
    patch_preview_available: patchPreviewAvailable,
    verification_command: input.verification_command,
    allowed_action: action.allowedAction,
    blocked: action.allowedAction !== "apply_with_guardrails",
    blocked_reason: action.blockedReason,
    created_at: input.created_at ?? new Date().toISOString(),
  };
}

function normalizeCitationPath(repoRoot: string, filePath: string): string {
  const resolvedRoot = resolve(repoRoot);
  const resolvedPath = isAbsolute(filePath)
    ? resolve(filePath)
    : resolve(resolvedRoot, filePath);
  const rel = relative(resolvedRoot, resolvedPath);
  if (!rel || rel === ".") return "";
  const normalizedRel = rel.replaceAll("\\", "/");
  if (normalizedRel.startsWith("../") || normalizedRel === ".." || isAbsolute(normalizedRel)) {
    throw new Error("Citation path escapes repo root.");
  }
  return normalizedRel;
}

function defaultCitationLabel(path: string, startLine: number, endLine: number): string {
  return `${basename(path)}:${startLine}-${endLine}`;
}

export function createOpenInEditorCitationPayload(
  input: OpenInEditorCitationPayloadInput,
): OpenInEditorCitationPayload {
  const path = normalizeCitationPath(input.repo_root, input.evidence_ref.file_path);
  if (!path) {
    throw new Error("Citation path must target a file inside repo root.");
  }

  return {
    repo_root: resolve(input.repo_root),
    path,
    line_start: input.evidence_ref.start_line,
    line_end: input.evidence_ref.end_line,
    evidence_id: input.evidence_ref.evidence_id,
    evidence_role: input.evidence_ref.role,
    source_hash: input.source_hash ?? input.content_hash ?? null,
    content_hash: input.content_hash ?? input.source_hash ?? null,
    citation_label: input.citation_label
      ?? defaultCitationLabel(path, input.evidence_ref.start_line, input.evidence_ref.end_line),
    editor_plugin_required: false,
    mutates_files: false,
    created_at: input.created_at ?? new Date().toISOString(),
  };
}

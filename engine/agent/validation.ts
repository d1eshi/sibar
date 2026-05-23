import { readFileSync } from "node:fs";

import { assertArtifactAllowsPath } from "../artifacts/session.ts";
import {
  type ArtifactSession,
  type EvidenceCitation,
  type ModelSignalCandidate,
  type ModelSignalValidation,
  type RejectedModelSignal,
} from "../runtime/contracts.ts";

const ALLOWED_SIGNAL_TYPES = new Set([
  "concept",
  "flow",
  "risk",
  "gap_candidate",
  "misconception_candidate",
  "practice_candidate",
]);

const READINESS_DECISION_PATTERNS = [
  /\breadiness_claim\b/i,
  /\bnot\s+ready\b/i,
  /\bready\s+to\b/i,
  /\b(?:learner|student|user|candidate|they|he|she)\s+(?:is|are|seems|looks|appears|feels)?\s*(?:ready|not\s+ready)\b/i,
  /\bmastered\b/i,
  /\b(?:has|shows|demonstrates|achieved)\s+mastery\b/i,
  /\bmastery\s+(?:achieved|proven|confirmed)\b/i,
  /\bowns?\b.{0,80}\bend\s+to\s+end\b/i,
  /\bfinal\s+grade\b/i,
  /\btruth\s+is\b/i,
  /\bproven\s+true\b/i,
];

export type ModelSignalValidationResult = {
  acceptedSignals: ModelSignalCandidate[];
  rejectedSignals: RejectedModelSignal[];
  validations: ModelSignalValidation[];
};

function validateFilesRead(filesRead: string[], artifactSession: ArtifactSession): ModelSignalValidation[] {
  return filesRead.map((filePath, index) => {
    const errors: string[] = [];
    try {
      assertArtifactAllowsPath(filePath, artifactSession);
    } catch {
      errors.push("invalid_or_out_of_bound_file_read");
    }
    return {
      candidate_id: `files_read:${index}:${filePath}`,
      accepted: errors.length === 0,
      errors,
    };
  });
}

function parseCitationRange(value: unknown): { start_line: number; end_line: number } {
  if (typeof value === "object" && value !== null) {
    const citation = value as { start_line?: unknown; end_line?: unknown };
    const start = Number(citation.start_line);
    const end = Number(citation.end_line ?? citation.start_line);
    if (Number.isInteger(start) && Number.isInteger(end)) return { start_line: start, end_line: end };
  }

  const range = typeof value === "object" && value !== null
    ? String((value as { range?: unknown }).range ?? "")
    : "";
  const match = range.match(/(\d+)(?:\D+(\d+))?/);
  const start = match ? Number(match[1]) : 1;
  const end = match?.[2] ? Number(match[2]) : start;
  return { start_line: start, end_line: end };
}

export function normalizeCitation(rawCitation: unknown, artifactSession: ArtifactSession): EvidenceCitation {
  const citation = rawCitation as {
    file_path?: unknown;
    path?: unknown;
    excerpt?: unknown;
  };
  const rawPath = String(citation.file_path ?? citation.path ?? "").trim();
  const filePath = assertArtifactAllowsPath(rawPath, artifactSession);
  const { start_line, end_line } = parseCitationRange(rawCitation);
  if (start_line < 1 || end_line < start_line) {
    throw new Error("citation_range_invalid");
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  if (end_line > lines.length) {
    throw new Error("citation_range_outside_file");
  }
  const excerpt = String(citation.excerpt ?? lines.slice(start_line - 1, end_line).join(" ")).trim();
  if (!excerpt) {
    throw new Error("citation_excerpt_empty");
  }

  return { file_path: filePath, start_line, end_line, excerpt };
}

function validatesReadinessDecision(candidate: ModelSignalCandidate): boolean {
  const text = `${candidate.signal_type} ${candidate.claim} ${candidate.rationale}`;
  return READINESS_DECISION_PATTERNS.some((pattern) => pattern.test(text));
}

export function validateModelSignalCandidates(
  candidates: ModelSignalCandidate[],
  artifactSession: ArtifactSession,
  filesRead: string[],
): ModelSignalValidationResult {
  const acceptedSignals: ModelSignalCandidate[] = [];
  const rejectedSignals: RejectedModelSignal[] = [];
  const fileReadValidations = validateFilesRead(filesRead, artifactSession);
  const hasInvalidFileRead = fileReadValidations.some((validation) => !validation.accepted);
  const validations: ModelSignalValidation[] = [...fileReadValidations];

  for (const candidate of candidates) {
    const errors: string[] = [];
    if (!ALLOWED_SIGNAL_TYPES.has(candidate.signal_type)) {
      errors.push("unsupported_signal_type");
    }
    if (!candidate.claim.trim()) {
      errors.push("missing_claim");
    }
    if (candidate.citations.length === 0) {
      errors.push("missing_citation");
    }
    errors.push(...(candidate.validation_error_hints ?? []));
    if (validatesReadinessDecision(candidate)) {
      errors.push("model_readiness_or_truth_decision");
    }
    if (hasInvalidFileRead) {
      errors.push("model_files_read_boundary_violation");
    }
    if (
      candidate.proposed_layer !== undefined
      && (!Number.isInteger(candidate.proposed_layer) || candidate.proposed_layer < 1 || candidate.proposed_layer > 5)
    ) {
      errors.push("invalid_layer_signal");
    }

    if (errors.length === 0) {
      acceptedSignals.push(candidate);
    } else {
      rejectedSignals.push({ ...candidate, validation_errors: errors });
    }
    validations.push({ candidate_id: candidate.id, accepted: errors.length === 0, errors });
  }

  return { acceptedSignals, rejectedSignals, validations };
}

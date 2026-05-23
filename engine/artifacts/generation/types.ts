import type { EvidenceRef, EvidenceRole } from "../../runtime-deep-ownership.ts";

export type ArtifactClaim = {
  text: string;
  cited_evidence: string[];
  is_inferred: boolean;
  is_unknown: boolean;
};

export type CitationValidationResult = {
  valid: boolean;
  uncited_claims: string[];
  orphaned_refs: EvidenceRef[];
  issues: string[];
  summary: string;
};

export type AuthorityCheckResult = {
  authoritative_source: EvidenceRole;
  conflict: boolean;
  resolution: string;
};

export type GeneratedNode = {
  id: string;
  label: string;
  role: "input" | "process" | "data" | "output" | "unknown";
  evidence: string[];
  is_inferred: boolean;
  user_prompt: string;
};

export type GeneratedEdge = {
  from: string;
  to: string;
  relation: string;
  evidence: string[];
  is_inferred: boolean;
};

export interface ArtifactGenerationOptions {
  artifactIdPrefix?: string;
  createdAt?: string;
  deterministicClock?: (seed: unknown) => string;
}

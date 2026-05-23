import type {
  EvidenceInventoryEntry,
  EvidenceRef,
  ThinkingArtifact,
} from "../../runtime-deep-ownership.ts";
import type { CitationValidationResult } from "./types.ts";

type PayloadCitationCarrier = {
  evidence?: unknown;
  cited_evidence?: unknown;
  is_inferred?: unknown;
  is_unknown?: unknown;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function asObjectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object");
}

function claimEvidenceIds(payloadItem: PayloadCitationCarrier): string[] {
  const evidence = asStringArray(payloadItem.evidence);
  if (evidence.length > 0) return evidence;
  return asStringArray(payloadItem.cited_evidence);
}

function isMarkedInferredOrUnknown(payloadItem: PayloadCitationCarrier): boolean {
  return payloadItem.is_inferred === true || payloadItem.is_unknown === true;
}

function pushOrphanedPayloadRef(
  orphanedRefs: EvidenceRef[],
  evidenceId: string,
  context: string,
): void {
  orphanedRefs.push({
    evidence_id: evidenceId,
    file_path: `payload:${context}`,
    start_line: 0,
    end_line: 1,
    excerpt: `Payload citation in ${context}`,
    role: "unknown",
  });
}

function validatePayloadCitationCarrier(
  context: string,
  payloadItem: PayloadCitationCarrier,
  inventoryIds: Set<string>,
  uncitedClaims: string[],
  issues: string[],
  orphanedRefs: EvidenceRef[],
): void {
  const evidenceIds = claimEvidenceIds(payloadItem);
  const marked = isMarkedInferredOrUnknown(payloadItem);

  if (evidenceIds.length === 0 && !marked) {
    uncitedClaims.push(`Important payload ${context} has no citation`);
    issues.push(`Important payload ${context} is uncited and not marked inferred/unknown`);
    return;
  }

  for (const evidenceId of evidenceIds) {
    if (!inventoryIds.has(evidenceId)) {
      issues.push(`Payload ${context} cites missing evidence id ${evidenceId}`);
      pushOrphanedPayloadRef(orphanedRefs, evidenceId, context);
    }
  }
}

function validatePayloadLevelCitations(
  artifact: ThinkingArtifact,
  inventoryIds: Set<string>,
  uncitedClaims: string[],
  issues: string[],
  orphanedRefs: EvidenceRef[],
): void {
  const payload = artifact.payload;
  if (!payload || typeof payload !== "object") return;
  const payloadRecord = payload as Record<string, unknown>;

  const ranges = asObjectArray(payloadRecord.ranges);
  for (let i = 0; i < ranges.length; i++) {
    validatePayloadCitationCarrier(
      `range[${i}]`,
      ranges[i] as PayloadCitationCarrier,
      inventoryIds,
      uncitedClaims,
      issues,
      orphanedRefs,
    );
  }

  const nodes = asObjectArray(payloadRecord.nodes);
  for (let i = 0; i < nodes.length; i++) {
    validatePayloadCitationCarrier(
      `node[${i}]`,
      nodes[i] as PayloadCitationCarrier,
      inventoryIds,
      uncitedClaims,
      issues,
      orphanedRefs,
    );
  }

  const edges = asObjectArray(payloadRecord.edges);
  for (let i = 0; i < edges.length; i++) {
    validatePayloadCitationCarrier(
      `edge[${i}]`,
      edges[i] as PayloadCitationCarrier,
      inventoryIds,
      uncitedClaims,
      issues,
      orphanedRefs,
    );
  }

  const assertions = asObjectArray(payloadRecord.assertions);
  for (let i = 0; i < assertions.length; i++) {
    validatePayloadCitationCarrier(
      `assertion[${i}]`,
      assertions[i] as PayloadCitationCarrier,
      inventoryIds,
      uncitedClaims,
      issues,
      orphanedRefs,
    );
  }
}

export function validateArtifactCitations(
  artifact: ThinkingArtifact,
  evidenceInventory: EvidenceInventoryEntry[],
): CitationValidationResult {
  const issues: string[] = [];
  const uncitedClaims: string[] = [];
  const orphanedRefs: EvidenceRef[] = [];
  const inventoryIds = new Set(evidenceInventory.map((entry) => entry.id));

  if (!Array.isArray(artifact.source_evidence) || artifact.source_evidence.length === 0) {
    issues.push("Artifact has no source evidence — all claims are effectively uncited");
    uncitedClaims.push("Entire artifact lacks source evidence citations");
  }

  for (const ref of artifact.source_evidence) {
    if (!inventoryIds.has(ref.evidence_id)) {
      orphanedRefs.push(ref);
      issues.push(
        `Source evidence ref ${ref.evidence_id} (${ref.file_path}:${ref.start_line}) does not exist in evidence inventory`,
      );
    }
  }

  if (Array.isArray(artifact.hidden_solution_evidence)) {
    for (const ref of artifact.hidden_solution_evidence) {
      if (!inventoryIds.has(ref.evidence_id)) {
        issues.push(`Hidden solution evidence ref ${ref.evidence_id} does not exist in inventory`);
      }
    }
  }

  if (artifact.user_operation && Array.isArray(artifact.user_operation.required_evidence)) {
    for (const evidenceId of artifact.user_operation.required_evidence) {
      if (!inventoryIds.has(evidenceId)) {
        issues.push(
          `User operation requires evidence ${evidenceId} which does not exist in inventory`,
        );
      }
    }
  }

  if (!artifact.title || artifact.title.trim().length === 0) {
    issues.push("Artifact title is empty");
    uncitedClaims.push("Missing artifact title");
  }
  if (!artifact.purpose || artifact.purpose.trim().length === 0) {
    issues.push("Artifact purpose is empty");
    uncitedClaims.push("Missing artifact purpose");
  }
  if (!artifact.id || artifact.id.trim().length === 0) {
    issues.push("Artifact missing id");
  }
  if (!artifact.user_operation?.kind) {
    issues.push("Artifact missing user operation");
  }
  if (!Array.isArray(artifact.success_criteria) || artifact.success_criteria.length === 0) {
    issues.push("Artifact has no success criteria");
  }

  validatePayloadLevelCitations(artifact, inventoryIds, uncitedClaims, issues, orphanedRefs);

  const valid =
    issues.length === 0 &&
    uncitedClaims.length === 0 &&
    orphanedRefs.length === 0 &&
    artifact.source_evidence.length > 0;

  return {
    valid,
    uncited_claims: uncitedClaims,
    orphaned_refs: orphanedRefs,
    issues,
    summary: valid
      ? "All citations grounded in evidence inventory"
      : `Citation validation failed: ${issues.length} issue(s), ${uncitedClaims.length} uncited claim(s), ${orphanedRefs.length} orphaned ref(s)`,
  };
}

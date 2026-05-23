import type {
  ConceptSlice,
  EvidenceInventoryEntry,
  EvidenceRef,
} from "../../runtime-deep-ownership.ts";

export function findEvidenceById(
  inventory: EvidenceInventoryEntry[],
  id: string,
): EvidenceInventoryEntry | undefined {
  return inventory.find((entry) => entry.id === id);
}

export function evidenceRefFromEntry(
  entry: EvidenceInventoryEntry,
  startLine = 0,
  endLine?: number,
): EvidenceRef {
  return {
    evidence_id: entry.id,
    file_path: entry.path,
    start_line: startLine,
    end_line: endLine ?? (entry.line_count ?? 100),
    excerpt: entry.excerpt,
    role: entry.role,
  };
}

export function findPrimaryImplementation(
  inventory: EvidenceInventoryEntry[],
  conceptSlice: ConceptSlice,
): EvidenceInventoryEntry | null {
  for (const evId of conceptSlice.source_evidence) {
    const entry = findEvidenceById(inventory, evId);
    if (entry && (entry.role === "implementation" || entry.role === "source_truth")) {
      return entry;
    }
  }

  for (const evId of conceptSlice.source_evidence) {
    const entry = findEvidenceById(inventory, evId);
    if (entry) return entry;
  }

  return null;
}

export function findBehaviorOracles(
  inventory: EvidenceInventoryEntry[],
  conceptSlice: ConceptSlice,
): EvidenceInventoryEntry[] {
  const allEvidenceIds = new Set([
    ...conceptSlice.source_evidence,
    ...conceptSlice.behavior_evidence,
  ]);

  const results: EvidenceInventoryEntry[] = [];
  for (const evId of allEvidenceIds) {
    const entry = findEvidenceById(inventory, evId);
    if (entry?.role === "behavior_oracle") results.push(entry);
  }

  return results;
}

export function getConceptSliceEvidence(
  inventory: EvidenceInventoryEntry[],
  conceptSlice: ConceptSlice,
): EvidenceInventoryEntry[] {
  const allIds = new Set([
    ...conceptSlice.source_evidence,
    ...conceptSlice.behavior_evidence,
    ...conceptSlice.risk_evidence,
  ]);

  const results: EvidenceInventoryEntry[] = [];
  for (const evId of allIds) {
    const entry = findEvidenceById(inventory, evId);
    if (entry) results.push(entry);
  }

  return results;
}

export function formatEvidenceIdLabel(evidenceId: string): string {
  if (/^EV-/i.test(evidenceId)) return evidenceId;
  return `EV-${evidenceId}`;
}

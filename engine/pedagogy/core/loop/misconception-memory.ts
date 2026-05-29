import type { EvidenceRef, OwnershipGap } from "../loop-types.ts";
import type { MisconceptionMemory } from "./types.ts";
import { now, uniqueId } from "./shared.ts";

export function trackMisconception(input: {
  existingMisconceptions: MisconceptionMemory[];
  gap: OwnershipGap;
  conceptSliceId: string;
  conceptLabel: string;
  evidenceRefs: EvidenceRef[];
  repairActionId: string;
}): MisconceptionMemory[] {
  const updated = [...input.existingMisconceptions];
  const label = `${input.conceptLabel}: ${input.gap.kind}`;
  const existing = updated.find((m) =>
    m.label === label && m.concept_id === input.conceptSliceId,
  );

  if (existing) {
    existing.repeated_count += 1;
    existing.last_seen_at = now();
    existing.domains_seen = [
      ...new Set([...existing.domains_seen, input.conceptSliceId]),
    ];
    existing.evidence = [
      ...existing.evidence,
      ...input.evidenceRefs.filter(
        (ref) => !existing.evidence.some((e) => e.evidence_id === ref.evidence_id),
      ),
    ];
    existing.repair_history.push({
      repair_action_id: input.repairActionId,
      attempted_at: now(),
      outcome: "persisted",
    });

    if (existing.repeated_count >= 3 && existing.current_status === "active") {
      existing.current_status = "monitored";
    }
  } else {
    updated.push({
      id: uniqueId("MIS"),
      label,
      concept_id: input.conceptSliceId,
      first_seen_at: now(),
      repeated_count: 1,
      domains_seen: [input.conceptSliceId],
      evidence: input.evidenceRefs,
      repair_history: [{
        repair_action_id: input.repairActionId,
        attempted_at: now(),
        outcome: "persisted",
      }],
      current_status: "active",
      last_seen_at: now(),
    });
  }

  return updated;
}

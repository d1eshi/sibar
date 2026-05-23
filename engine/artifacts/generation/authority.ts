import type { EvidenceRef, EvidenceRole } from "../../runtime-deep-ownership.ts";
import type { AuthorityCheckResult } from "./types.ts";

/**
 * Higher number = higher authority.
 */
export const AUTHORITY_RANK: Record<EvidenceRole, number> = {
  source_truth: 10,
  implementation: 10,
  behavior_oracle: 8,
  counterexample: 7,
  experiment: 6,
  interface: 5,
  intent: 4,
  historical_rationale: 2,
  unknown: 0,
};

export function resolveEvidenceAuthority(
  roleA: EvidenceRole,
  roleB: EvidenceRole,
): AuthorityCheckResult {
  const rankA = AUTHORITY_RANK[roleA] ?? 0;
  const rankB = AUTHORITY_RANK[roleB] ?? 0;

  if (rankA === rankB && roleA === roleB) {
    return {
      authoritative_source: roleA,
      conflict: false,
      resolution: `Both sources agree (${roleA})`,
    };
  }

  if (rankA === rankB && roleA !== roleB) {
    return {
      authoritative_source: "unknown",
      conflict: true,
      resolution: `Conflicting evidence from equally-ranked roles: ${roleA} and ${roleB}. ` +
        `Both rank at ${rankA}. Resolution is unknown without further evidence.`,
    };
  }

  if (rankA > rankB) {
    return {
      authoritative_source: roleA,
      conflict: true,
      resolution: `${roleA} (rank ${rankA}) takes authority over ${roleB} (rank ${rankB}). ` +
        `Evidence from ${roleB} may be incorrect or outdated.`,
    };
  }

  return {
    authoritative_source: roleB,
    conflict: true,
    resolution: `${roleB} (rank ${rankB}) takes authority over ${roleA} (rank ${rankA}). ` +
      `Evidence from ${roleA} may be incorrect or outdated.`,
  };
}

export function detectEvidenceRoleConflicts(
  refs: EvidenceRef[],
): { hasConflict: boolean; conflicts: AuthorityCheckResult[] } {
  const conflicts: AuthorityCheckResult[] = [];
  for (let i = 0; i < refs.length; i++) {
    for (let j = i + 1; j < refs.length; j++) {
      if (refs[i].role !== refs[j].role) {
        const result = resolveEvidenceAuthority(refs[i].role, refs[j].role);
        if (result.conflict) conflicts.push(result);
      }
    }
  }
  return { hasConflict: conflicts.length > 0, conflicts };
}

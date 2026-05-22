import type { ArtifactClaim } from "./types.ts";

/**
 * A claim is uncited when it lacks evidence and is not explicitly
 * marked inferred/unknown.
 */
export function isClaimUncited(claim: ArtifactClaim): boolean {
  if (claim.is_inferred || claim.is_unknown) return false;
  return claim.cited_evidence.length === 0;
}

export function markInferred(claim: ArtifactClaim): ArtifactClaim {
  return { ...claim, is_inferred: true };
}

export function markUnknown(claim: ArtifactClaim): ArtifactClaim {
  return { ...claim, is_unknown: true };
}

import type { DeepOwnershipFixture, ThinkingArtifact } from "../../deep-ownership/index.ts";
import type { ArtifactGenerationOptions } from "./types.ts";
import { generateCodeSliceArtifact } from "./code-slice.ts";
import { generateFlowDiagramArtifact } from "./flow-diagram.ts";

/**
 * Generate deterministic artifacts for the active concept slice.
 */
export function generateDeterministicArtifacts(
  fixture: DeepOwnershipFixture,
  options: ArtifactGenerationOptions = {},
): ThinkingArtifact[] {
  const codeSlice = generateCodeSliceArtifact(
    fixture.evidence_inventory,
    fixture.concept_slice,
    options,
  );

  const flowDiagram = generateFlowDiagramArtifact(
    fixture.evidence_inventory,
    fixture.concept_slice,
    options,
  );

  return [codeSlice, flowDiagram];
}

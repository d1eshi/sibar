import { compileFrontierLabMissionFromIntent } from "./runtime-source-mission-frontier-lab-compiler.ts";
import { frontierLabSourceIntent } from "./runtime-source-mission-frontier-lab-fixture.ts";
import { buildMissionUiProjection } from "./runtime-source-mission-ui-projection.ts";
import type { MissionUiProjection } from "./runtime-source-mission-ui-projection.ts";

export function buildFrontierLabMissionUiProjection(activeSessionId?: string): MissionUiProjection {
  const compiled = compileFrontierLabMissionFromIntent(frontierLabSourceIntent);
  if (!compiled.ok) {
    throw new Error(`Frontier lab mission compiler failed: ${compiled.diagnostics.map((entry) => entry.code).join(", ")}`);
  }

  return buildMissionUiProjection({
    source_intent_input: compiled.source_intent_input,
    source_intake_result: compiled.source_intake_result,
    source_signals: compiled.source_signals,
    source_slices: compiled.source_slices,
    mission_preview: compiled.mission_preview,
    active_session_id: activeSessionId,
  });
}

import {
  frontierLabMissionPreview,
  frontierLabSourceIntake,
  frontierLabSourceIntent,
  frontierLabSourceSignals,
  frontierLabSourceSlices,
} from "./runtime-source-mission-frontier-lab-fixture.ts";
import { buildMissionUiProjection } from "./runtime-source-mission-ui-projection.ts";
import type { MissionUiProjection } from "./runtime-source-mission-ui-projection.ts";

export function buildFrontierLabMissionUiProjection(activeSessionId?: string): MissionUiProjection {
  return buildMissionUiProjection({
    source_intent_input: frontierLabSourceIntent,
    source_intake_result: frontierLabSourceIntake,
    source_signals: frontierLabSourceSignals,
    source_slices: frontierLabSourceSlices,
    mission_preview: frontierLabMissionPreview,
    active_session_id: activeSessionId,
  });
}

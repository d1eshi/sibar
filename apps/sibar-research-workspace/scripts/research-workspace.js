/**
 * research-workspace.js is the public façade and DOM entrypoint.
 *
 * Module ownership:
 * - workspace-data: constants, defaults, IDs, tokens.
 * - workspace-utils: normalization/formatting/serialization helpers.
 * - workspace-study-plans: plan and lock-reason builders for roadmap nodes.
 * - workspace-contract: compiler request/artifact validation/import/apply helpers.
 * - workspace-session: attempt/decision/action state helpers.
 * - workspace-render: rendering and event-wiring helpers for tree/reader/LM UI.
 * - workspace-app: DOM bootstrap and exported init function.
 */

import { initResearchWorkspace } from "./workspace-app.js";

export {
  ARC_ID,
  ATTEMPT_SIGNAL_MAP,
  CONTRACT_NAMESPACE,
  DEFAULT_ARTIFACTS,
  DEFAULT_EVIDENCE,
  DEFAULT_EVIDENCE_CHECKLIST,
  DEFAULT_ROADMAP,
  HINTS,
  MODE_SCOPE_LABELS,
  MISSION_ID,
  NODE_EVIDENCE_KEYWORDS,
  NODE_HINTS,
  NODE_PREREQUISITES,
  ROADMAP_CONTRACT_VERSION,
  ROADMAP_SIGNALS,
  STATUS,
  STATUS_CLASS,
  TRACKS,
  ANTI_OVERLOAD,
  ANTI_OVERLOAD as antiOverload,
} from "./workspace-data.js";
export {
  createInitialChecklist,
  dedupe,
  escapeHtml,
  formatAttempt,
  formatJson,
  normalizeId,
  normalizeText,
  roadmapDeltas,
  titleFromSource,
} from "./workspace-utils.js";
export {
  getNodeById,
  getNodeLockedReasons,
  getNodeTitleById,
  getTrackIdForNode,
  lockReasonForNode,
  buildNodeStudyPlan,
  NODE_EVIDENCE_KEYWORDS as nodeEvidenceKeywords,
} from "./workspace-study-plans.js";
export {
  buildDecisionFromRoadmap,
  buildRoadmapArtifactFromRequest,
  buildRoadmapCompilerRequest,
  applyRoadmapArtifact,
  compileCurrentStateArtifact,
  compileSourceToRoadmap,
  importRoadmapArtifact,
  importSampleRoadmapArtifact,
  validateRoadmapArtifact,
} from "./workspace-contract.js";
export {
  activeRoadmapNode,
  buildDecisionState,
  describeModeAction,
  evaluateAttemptForState,
  getActiveReaderResource,
  getStudyContext,
  makeModeAction,
  requestConceptHelpForState,
  createDefaultState,
} from "./workspace-session.js";
export {
  initRootElements,
  makeModeButtonList,
  renderChecklist,
  renderContractPanel,
  renderHistory,
  renderModeLog,
  renderNodeReader,
  renderRoadmap,
  renderSourceCard,
  renderTopBanner,
  renderItems,
  toNodeIdFromTreeNode,
  toggleTreeNode,
  wireMiniNodeSelection,
  wireRoadmapSelection,
} from "./workspace-render.js";
export { initResearchWorkspace };

export const LM_MODES = ["/map", "/read", "/explain", "/test", "/critic", "/repair", "/build", "/publish"];

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initResearchWorkspace({});
  });
}

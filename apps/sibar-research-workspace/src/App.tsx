import * as React from "react";
import styles from "./App.module.css";
import { OnboardingFlow } from "./flows/onboarding/OnboardingFlow";
import { WorkspaceShell } from "./flows/workspace/WorkspaceShell";
import { WorkspaceHome } from "./flows/workspace/WorkspaceHome";
import { MissionOverview } from "./flows/workspace/MissionOverview";
import { SessionWorkbench } from "./flows/workspace/SessionWorkbench";
import { StudyPathRail } from "./flows/workspace/StudyPathRail";
import stylesWorkspace from "./flows/workspace/workspace.module.css";
import {
  buildWorkspaceHomeProjectionFromMission,
  buildWorkspaceSessionFixtureFromMission,
  createInitialWorkspaceStateFromFixture,
  frontierLabMissionUiProjection,
  frontierLabWorkspaceSessionFixture,
  projectWorkspaceSession,
} from "./state/workspaceProjection";
import { workspaceSessionReducer } from "./state/workspaceReducer";
import {
  attemptToReadiness,
  createAttempt,
  evaluateAttempt,
} from "../../../engine/pedagogy-core/index.ts";
import type {
  ActiveSessionProjection,
  MissionUiProjection,
} from "../../../engine/workspace/source-mission/ui-projection.ts";
import type {
  EvidenceCheck,
  OwnershipGap,
  ReadinessClaim,
  RepairAction,
} from "../../../engine/pedagogy-core/index.ts";

type AttemptReadinessResult = {
  evidenceCheck: EvidenceCheck;
  readinessClaim: ReadinessClaim;
  gap: OwnershipGap | null;
  repairAction: RepairAction | null;
};

function listPreview(values: readonly string[], fallback: string): string {
  if (values.length === 0) {
    return fallback;
  }

  return values.slice(0, 3).join(", ");
}

function readinessPendingCopy(activeSession: ActiveSessionProjection) {
  const artifactScope =
    activeSession.artifacts.length > 0
      ? activeSession.artifacts.map((artifact) => `${artifact.title} (${artifact.kind})`)
      : activeSession.readiness_scope.required_artifacts;
  const evidenceScope =
    activeSession.operation.required_evidence.length > 0
      ? activeSession.operation.required_evidence
      : activeSession.readiness_scope.required_evidence;

  return {
    operation: `${activeSession.operation.kind}: ${activeSession.operation.prompt}`,
    artifacts: listPreview(artifactScope, "No required Artifact declared yet"),
    evidence: listPreview(evidenceScope, "No required Evidence declared yet"),
    pending:
      "Readiness pending: submit an Artifact/Evidence attempt for this Session operation before any readiness claim.",
  };
}

export default function App() {
  type AppFlowStep = "home" | "onboarding" | "overview" | "session";
  const [flowStep, setFlowStep] = React.useState<AppFlowStep>("home");
  const [activeMissionProjection, setActiveMissionProjection] =
    React.useState<MissionUiProjection>(frontierLabMissionUiProjection);
  const [activeSessionFixture, setActiveSessionFixture] = React.useState(
    frontierLabWorkspaceSessionFixture,
  );
  const [workspaceState, dispatchWorkspace] = React.useReducer(
    workspaceSessionReducer,
    createInitialWorkspaceStateFromFixture(frontierLabWorkspaceSessionFixture),
  );
  const activeHomeProjection = React.useMemo(
    () => buildWorkspaceHomeProjectionFromMission(activeMissionProjection),
    [activeMissionProjection],
  );
  const workspaceProjection = projectWorkspaceSession(
    workspaceState,
    activeSessionFixture,
  );
  const activeReadinessCopy = readinessPendingCopy(activeMissionProjection.active_session);
  const [attemptText, setAttemptText] = React.useState("");
  const [declaredConfidence, setDeclaredConfidence] =
    React.useState<"low" | "medium" | "high">("medium");
  const [declaredUnknowns, setDeclaredUnknowns] = React.useState("");
  const [attemptResult, setAttemptResult] =
    React.useState<AttemptReadinessResult | null>(null);

  React.useEffect(() => {
    setAttemptText("");
    setDeclaredConfidence("medium");
    setDeclaredUnknowns("");
    setAttemptResult(null);
  }, [activeMissionProjection.active_session.id]);

  function openFlowStep(nextStep: AppFlowStep) {
    setFlowStep(nextStep);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0 }));
  }

  function openCompiledMission(missionProjection: MissionUiProjection) {
    const nextSessionFixture = buildWorkspaceSessionFixtureFromMission(missionProjection);

    setActiveMissionProjection(missionProjection);
    setActiveSessionFixture(nextSessionFixture);
    dispatchWorkspace({
      type: "reset",
      state: createInitialWorkspaceStateFromFixture(nextSessionFixture),
    });
    openFlowStep("overview");
  }

  function submitArtifactEvidenceAttempt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const activeSession = activeMissionProjection.active_session;
    const artifact = activeSession.artifacts[0];
    if (!artifact) return;

    const selectedEvidence =
      activeSession.operation.required_evidence.length > 0
        ? activeSession.operation.required_evidence
        : activeSession.evidence_inventory.map((entry) => entry.id);
    const attempt = createAttempt({
      operation_id: activeSession.operation.id,
      answer_text: attemptText,
      selected_evidence: selectedEvidence,
      declared_confidence: declaredConfidence,
      declared_unknowns: declaredUnknowns
        .split("\n")
        .map((unknown) => unknown.trim())
        .filter(Boolean),
    });
    const evalOutput = evaluateAttempt({
      attempt,
      operation: activeSession.operation,
      artifact,
      evidenceInventory: activeSession.evidence_inventory,
    });
    const readiness = attemptToReadiness({
      loopId: `${activeSession.id}-ui-loop`,
      attempt,
      evalOutput,
      operation: activeSession.operation,
      artifact,
      conceptSlice: activeSession.concept_slice,
      evidenceInventory: activeSession.evidence_inventory,
    });

    setAttemptResult({
      evidenceCheck: readiness.evidenceCheck,
      readinessClaim: readiness.readinessClaim,
      gap: readiness.gap,
      repairAction: readiness.repairAction,
    });
  }

  return (
    <main className={styles.researchShell} data-component="research-workspace-root">
      <WorkspaceShell mode={flowStep}>
        {flowStep === "home" ? (
          <WorkspaceHome
            projection={activeHomeProjection}
            onNewWorkspace={() => openFlowStep("onboarding")}
            onOpenWorkspace={(workspace) => openFlowStep(workspace.openTarget)}
          />
        ) : flowStep === "onboarding" ? (
          <OnboardingFlow onOpenWorkspace={openCompiledMission} />
        ) : flowStep === "overview" ? (
          <MissionOverview
            mission={activeMissionProjection}
            projection={workspaceProjection}
            state={workspaceState}
            dispatch={dispatchWorkspace}
            onOpenSelectedNode={() => openFlowStep("session")}
          />
        ) : (
          <section
            className={stylesWorkspace.workspaceFrame}
            data-component="workspace-session"
          >
            <StudyPathRail
              projection={workspaceProjection}
              state={workspaceState}
              dispatch={dispatchWorkspace}
            />
            <SessionWorkbench
              projection={workspaceProjection}
              onSelectSource={(sourceId) =>
                dispatchWorkspace({ type: "select_source", sourceId })
              }
            />
            {workspaceState.isReadinessPanelVisible ? (
              <aside className={stylesWorkspace.readinessPanel}>
                <p className={stylesWorkspace.kicker}>Session guide</p>
                <h3>{activeMissionProjection.active_session.title}</h3>
                <p>{activeReadinessCopy.pending}</p>
                <ul>
                  <li>Operation scope: {activeReadinessCopy.operation}</li>
                  <li>Artifact scope: {activeReadinessCopy.artifacts}</li>
                  <li>Evidence scope: {activeReadinessCopy.evidence}</li>
                  <li>{workspaceProjection.recallStatus}</li>
                  <li>{workspaceProjection.readinessLabel}</li>
                </ul>
                <form
                  className={stylesWorkspace.attemptForm}
                  onSubmit={submitArtifactEvidenceAttempt}
                >
                  <label>
                    Artifact/Evidence attempt
                    <textarea
                      value={attemptText}
                      onChange={(event) => setAttemptText(event.target.value)}
                      placeholder="Explain this session operation using the required evidence."
                      rows={5}
                    />
                  </label>
                  <label>
                    Confidence
                    <select
                      value={declaredConfidence}
                      onChange={(event) =>
                        setDeclaredConfidence(event.target.value as "low" | "medium" | "high")
                      }
                    >
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                  <label>
                    Declared unknowns
                    <textarea
                      value={declaredUnknowns}
                      onChange={(event) => setDeclaredUnknowns(event.target.value)}
                      placeholder="Optional: one unknown per line"
                      rows={2}
                    />
                  </label>
                  <p>
                    Uses {activeMissionProjection.active_session.operation.required_evidence.length} required evidence
                    items for this active session operation.
                  </p>
                  <button
                    type="submit"
                    className={stylesWorkspace.attemptSubmit}
                    disabled={attemptText.trim().length === 0}
                  >
                    Check scoped readiness
                  </button>
                </form>
                {attemptResult ? (
                  <section className={stylesWorkspace.attemptResult} aria-label="Scoped attempt result">
                    <p className={stylesWorkspace.kicker}>Attempt-first result</p>
                    <dl>
                      <div>
                        <dt>Evidence check</dt>
                        <dd>{attemptResult.evidenceCheck.result}</dd>
                      </div>
                      <div>
                        <dt>Scoped readiness</dt>
                        <dd>
                          {attemptResult.readinessClaim.status} for {attemptResult.readinessClaim.scope}
                        </dd>
                      </div>
                      <div>
                        <dt>Gap or repair</dt>
                        <dd>
                          {attemptResult.gap
                            ? `${attemptResult.gap.kind}: ${attemptResult.repairAction?.prompt ?? "repair pending"}`
                            : "No blocking gap for this session operation."}
                        </dd>
                      </div>
                    </dl>
                  </section>
                ) : null}
                <button
                  type="button"
                  className={stylesWorkspace.panelToggle}
                  onClick={() => dispatchWorkspace({ type: "toggle_readiness_panel" })}
                >
                  Hide compact panel
                </button>
              </aside>
            ) : (
              <aside className={stylesWorkspace.readinessPanel}>
                <p className={stylesWorkspace.kicker}>Session guide</p>
                <button
                  type="button"
                  className={stylesWorkspace.panelShow}
                  onClick={() => dispatchWorkspace({ type: "toggle_readiness_panel" })}
                >
                  Show compact panel
                </button>
              </aside>
            )}
          </section>
        )}
      </WorkspaceShell>
    </main>
  );
}

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
import type { MissionUiProjection } from "../../../src/runtime-source-mission-ui-projection.ts";

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
                <p className={stylesWorkspace.kicker}>Guide / readiness</p>
                <h3>{workspaceProjection.selectedSource.title}</h3>
                <p>{workspaceProjection.sessionHint}</p>
                <ul>
                  <li>One concrete artifact from the current mini-node.</li>
                  <li>One evidence-backed conclusion.</li>
                  <li>{workspaceProjection.recallStatus}</li>
                  <li>{workspaceProjection.readinessLabel}</li>
                </ul>
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
                <p className={stylesWorkspace.kicker}>Guide / readiness</p>
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

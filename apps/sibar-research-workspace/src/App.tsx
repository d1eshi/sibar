import * as React from "react";
import styles from "./App.module.css";
import { OnboardingFlow } from "./flows/onboarding/OnboardingFlow";
import { WorkspaceShell } from "./flows/workspace/WorkspaceShell";
import { SessionWorkbench } from "./flows/workspace/SessionWorkbench";
import { StudyPathRail } from "./flows/workspace/StudyPathRail";
import stylesWorkspace from "./flows/workspace/workspace.module.css";
import {
  createInitialWorkspaceStateFromFixture,
  firstWorkspaceSessionFixture,
  projectWorkspaceSession,
} from "./state/workspaceProjection";
import { workspaceSessionReducer } from "./state/workspaceReducer";

export default function App() {
  const [flowStep, setFlowStep] = React.useState<"onboarding" | "session">(
    "onboarding",
  );
  const [workspaceState, dispatchWorkspace] = React.useReducer(
    workspaceSessionReducer,
    createInitialWorkspaceStateFromFixture(firstWorkspaceSessionFixture),
  );
  const workspaceProjection = projectWorkspaceSession(
    workspaceState,
    firstWorkspaceSessionFixture,
  );

  return (
    <main className={styles.researchShell} data-component="research-workspace-root">
      <WorkspaceShell mode={flowStep}>
        {flowStep === "onboarding" ? (
          <OnboardingFlow onOpenFirstSession={() => setFlowStep("session")} />
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
              state={workspaceState}
              dispatch={dispatchWorkspace}
            />
            {workspaceState.isReadinessPanelVisible ? (
              <aside className={stylesWorkspace.readinessPanel}>
                <h3>{workspaceProjection.selectedSource.title}</h3>
                <p>{workspaceProjection.sessionHint}</p>
                <ul>
                  <li>One concrete artifact from the current mini-node.</li>
                  <li>One evidence-backed conclusion.</li>
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

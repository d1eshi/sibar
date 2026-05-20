import * as React from "react";
import shellStyles from "../../App.module.css";

type WorkspaceShellMode = "onboarding" | "session";

interface WorkspaceShellProps {
  mode: WorkspaceShellMode;
  children: React.ReactNode;
}

function titleForMode(mode: WorkspaceShellMode): string {
  return mode === "session" ? "Active session" : "New workspace";
}

export function WorkspaceShell({ mode, children }: WorkspaceShellProps) {
  return (
    <section className={shellStyles.nativeWindow} data-component="workspace-shell">
      <header className={shellStyles.topbar} aria-label="Workspace shell top bar">
        <div className={shellStyles.windowCluster} aria-hidden="true">
          <span className={`${shellStyles.windowDot} ${shellStyles.red}`} />
          <span className={`${shellStyles.windowDot} ${shellStyles.amber}`} />
          <span className={`${shellStyles.windowDot} ${shellStyles.green}`} />
        </div>
        <div className={shellStyles.brandMark} aria-label="Sibar">
          <span className={shellStyles.brandSymbol}>S</span>
          <strong>Sibar</strong>
        </div>
        <p className={shellStyles.topbarDocument}>
          <span>Create Workspace</span>
          <span aria-hidden="true">/</span>
          <span>{titleForMode(mode)}</span>
        </p>
        <span className={shellStyles.topbarSpacer} />
        <button className={shellStyles.iconButton} type="button" aria-label="Search">
          S
        </button>
        <button className={shellStyles.iconButton} type="button" aria-label="Show notes">
          N
        </button>
        <div className={shellStyles.topbarDiscussion}>
          <span aria-hidden="true">*</span>
          <span>Local workspace</span>
        </div>
      </header>
      <section className={shellStyles.shellSurface}>{children}</section>
    </section>
  );
}

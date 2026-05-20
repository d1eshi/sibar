import * as React from "react";
import shellStyles from "../../App.module.css";

type WorkspaceShellMode = "onboarding" | "overview" | "session";

interface WorkspaceShellProps {
  mode: WorkspaceShellMode;
  children: React.ReactNode;
}

export function WorkspaceShell({ mode, children }: WorkspaceShellProps) {
  return (
    <section
      className={shellStyles.nativeWindow}
      data-component="workspace-shell"
      data-workspace-mode={mode}
    >
      <section className={shellStyles.shellSurface}>{children}</section>
    </section>
  );
}

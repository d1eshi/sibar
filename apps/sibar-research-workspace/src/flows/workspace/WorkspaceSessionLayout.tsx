import type * as React from "react";
import styles from "./workspace.module.css";

interface WorkspaceSessionLayoutProps {
  leftRail: React.ReactNode;
  mainSurface: React.ReactNode;
  supportSlot?: React.ReactNode;
}

export function WorkspaceSessionLayout({
  leftRail,
  mainSurface,
  supportSlot,
}: WorkspaceSessionLayoutProps) {
  return (
    <section
      className={styles.workspaceFrame}
      data-component="workspace-session"
      data-has-support-slot={supportSlot ? "true" : "false"}
    >
      {leftRail}
      {mainSurface}
      {supportSlot}
    </section>
  );
}

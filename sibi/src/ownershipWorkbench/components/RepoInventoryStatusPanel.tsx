import * as React from "react";
import type { RepoInventoryStatus } from "../repoInventoryTypes.ts";

interface RepoInventoryStatusPanelProps {
  status: RepoInventoryStatus;
}

function formatByteSize(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function roleSummary(status: RepoInventoryStatus): string {
  if (status.kind !== "ready") return "";
  const counts = status.inventory.files.reduce(
    (acc, file) => {
      acc[file.role] = (acc[file.role] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return ["source", "test", "doc", "config", "unknown"]
    .map((role) => `${role}:${counts[role] ?? 0}`)
    .join(" · ");
}

export function RepoInventoryStatusPanel({ status }: RepoInventoryStatusPanelProps): React.ReactElement {
  if (status.kind === "loading") {
    return (
      <section className="inventoryStatusPanel ownershipSection" aria-label="Repo inventory status">
        <h2>Repo inventory</h2>
        <p>Loading deterministic inventory for local source root...</p>
      </section>
    );
  }

  if (status.kind === "unavailable") {
    return (
      <section className="inventoryStatusPanel ownershipSection" aria-label="Repo inventory status">
        <h2>Repo inventory</h2>
        <p className="unavailableReason">Unavailable: {status.reason}</p>
      </section>
    );
  }

  const { inventory } = status;
  return (
    <section className="inventoryStatusPanel ownershipSection" aria-label="Repo inventory status">
      <h2>Repo inventory</h2>
      <dl className="labFacts compact inventoryFacts">
        <dt>sourceRoot</dt>
        <dd>{inventory.sourceRoot}</dd>
        <dt>files</dt>
        <dd>{inventory.files.length}</dd>
        <dt>tree bytes</dt>
        <dd>{formatByteSize(inventory.tree.totalSizeBytes)}</dd>
        <dt>roles</dt>
        <dd>{roleSummary(status)}</dd>
      </dl>
      <p className="selectionSummary">Generated at {inventory.generatedAt}</p>
    </section>
  );
}

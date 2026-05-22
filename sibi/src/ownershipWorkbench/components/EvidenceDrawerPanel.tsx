import type { EvidenceByConfidence } from "../types";
import * as React from "react";

interface EvidenceDrawerPanelProps {
  evidenceGroups: EvidenceByConfidence;
}

export function EvidenceDrawerPanel({ evidenceGroups }: EvidenceDrawerPanelProps): React.ReactElement {
  return (
    <section className="panel evidencePanel">
      <header className="panelHeader">
        <p className="panelSub">Evidence drawer</p>
        <h1>Observed, inferred, unverified, conflict</h1>
      </header>
      <div className="evidenceGrid">
        {(Object.entries(evidenceGroups) as Array<[keyof EvidenceByConfidence, EvidenceByConfidence[keyof EvidenceByConfidence]]>).map(
          ([label, rows]) => (
            <section className="evidenceGroup" key={label}>
              <h2>
                <span className={`evidenceBadge ${label}`}>{label}</span>
              </h2>
              {rows.length > 0 ? (
                <ul>
                  {rows.map((entry) => (
                    <li key={entry.id}>
                      <strong>{entry.title}</strong>
                      <span className="evidenceLocation">{entry.location}</span>
                      <p>{entry.detail}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty">No {label} evidence in fixture.</p>
              )}
            </section>
          ),
        )}
      </div>
    </section>
  );
}

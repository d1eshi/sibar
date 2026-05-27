import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildMissionMilestoneReports } from "../engine/workspace/milestones/reporting.ts";

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

test("VAL-CROSS-008 milestone reports map features, assertions, files, commands, evidence, and unresolved work", () => {
  const dir = mkdtempSync(join(tmpdir(), "sibi-milestone-report-"));
  mkdirSync(join(dir, "handoffs"), { recursive: true });
  mkdirSync(join(dir, "validation", "ui-milestone", "user-testing"), { recursive: true });
  mkdirSync(join(dir, "evidence", "ui-milestone", "flow"), { recursive: true });
  writeFileSync(join(dir, "evidence", "ui-milestone", "flow", "feat-ui-before.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff]));

  writeJson(join(dir, "features.json"), {
    features: [
      { id: "feat-ui", milestone: "ui-milestone", status: "completed", fulfills: ["VAL-UI-001", "VAL-CROSS-008"] },
      { id: "feat-runtime", milestone: "ui-milestone", status: "completed", fulfills: ["VAL-PED-001"] },
      { id: "feat-open", milestone: "ui-milestone", status: "pending", fulfills: ["VAL-OPEN"] },
    ],
  });
  writeJson(join(dir, "validation-state.json"), {
    assertions: {
      "VAL-UI-001": { status: "passed", validatedAtMilestone: "ui-milestone", validatedAt: "2026-05-17T00:00:00.000Z" },
      "VAL-CROSS-008": { status: "pending" },
      "VAL-PED-001": { status: "passed", validatedAtMilestone: "other-milestone", validatedAt: "2026-05-17T00:00:00.000Z" },
    },
  });
  writeJson(join(dir, "handoffs", "feat-ui.json"), {
    featureId: "feat-ui",
    changedFiles: ["web/workspace.html", "web/scripts/ui.js"],
    handoff: {
      whatWasLeftUndone: "",
      verification: {
        commandsRun: [
          { command: "pnpm run typecheck", exitCode: 0, observation: "No TypeScript errors." },
          { command: "agent-browser screenshot ui.png", exitCode: 0, observation: "Captured UI screenshot." },
        ],
        interactiveChecks: [{ action: "Clicked Submit", observed: "Gap and readiness appeared." }],
      },
      discoveredIssues: [],
    },
  });
  writeJson(join(dir, "handoffs", "feat-runtime.json"), {
    featureId: "feat-runtime",
    changedFiles: ["src/runtime.ts"],
    handoff: {
      whatWasLeftUndone: "Follow-up validator has not run yet.",
      verification: { commandsRun: [{ command: "pnpm test", exitCode: 0, observation: "Tests passed." }] },
      discoveredIssues: [{ severity: "suggestion", description: "Consider richer evidence." }],
    },
  });
  writeJson(join(dir, "validation", "ui-milestone", "user-testing", "synthesis.json"), {
    passedAssertions: ["VAL-UI-001", "VAL-PED-001"],
    suggestedGuidanceUpdates: [{ target: "skill", suggestion: "Decide whether screenshots are required for every UI rerun." }],
  });

  const report = buildMissionMilestoneReports(dir, "2026-05-17T00:00:00.000Z");
  const milestone = report.milestones.find((entry) => entry.milestone === "ui-milestone");
  assert.ok(milestone);
  assert.deepEqual(milestone.satisfied_assertion_ids, ["VAL-UI-001"]);
  const uiReport = milestone.feature_reports.find((entry) => entry.feature_id === "feat-ui");
  assert.ok(uiReport);
  assert.deepEqual(uiReport.declared_assertion_ids, ["VAL-UI-001", "VAL-CROSS-008"]);
  assert.deepEqual(uiReport.proven_assertion_ids, ["VAL-UI-001"]);
  assert.deepEqual(uiReport.assertion_statuses.map((entry) => [entry.assertion_id, entry.status]), [
    ["VAL-UI-001", "passed"],
    ["VAL-CROSS-008", "pending"],
  ]);
  assert.deepEqual(milestone.feature_reports.find((entry) => entry.feature_id === "feat-ui")?.changed_files, [
    "web/scripts/ui.js",
    "web/workspace.html",
  ]);
  assert.ok(milestone.commands.some((entry) => entry.command === "pnpm run typecheck"));
  assert.ok(milestone.browser_manual_evidence.some((entry) => entry.includes("Clicked Submit")));
  assert.ok(milestone.screenshot_paths.includes("evidence/ui-milestone/flow/feat-ui-before.png"));
  assert.deepEqual(uiReport.screenshot_paths, ["evidence/ui-milestone/flow/feat-ui-before.png"]);
  assert.ok(milestone.unresolved_work.some((entry) => entry.includes("feat-runtime")));
  assert.ok(milestone.unresolved_work.some((entry) => entry.includes("feat-open")));
  assert.ok(milestone.open_decisions.some((entry) => entry.includes("screenshots are required")));
});

test("VAL-CROSS-008 current-style mission reports are retrievable for completed milestones", () => {
  const dir = mkdtempSync(join(tmpdir(), "sibi-current-style-report-"));
  mkdirSync(join(dir, "handoffs"), { recursive: true });
  mkdirSync(join(dir, "validation", "morning-prototype", "scrutiny"), { recursive: true });
  mkdirSync(join(dir, "evidence", "morning-prototype", "browser"), { recursive: true });
  writeFileSync(join(dir, "evidence", "morning-prototype", "browser", "dow-static-workspace-shell-screenshot.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  writeJson(join(dir, "features.json"), {
    features: [
      {
        id: "dow-static-workspace-shell",
        milestone: "morning-prototype",
        status: "completed",
        fulfills: ["VAL-UI-001"],
      },
    ],
  });
  writeJson(join(dir, "validation-state.json"), {
    assertions: {
      "VAL-UI-001": { status: "passed", validatedAtMilestone: "morning-prototype", validatedAt: "2026-05-17T00:00:00.000Z" },
    },
  });
  writeJson(join(dir, "handoffs", "dow-static-workspace-shell.json"), {
    featureId: "dow-static-workspace-shell",
    handoff: {
      verification: {
        commandsRun: [{ command: "pnpm run typecheck", exitCode: 0, observation: "No TypeScript errors." }],
        interactiveChecks: [{ action: "Opened Workspace", observed: "Browser evidence rail was visible." }],
      },
      discoveredIssues: [],
    },
  });
  writeJson(join(dir, "validation", "morning-prototype", "scrutiny", "synthesis.json"), {
    blockingIssues: [],
  });

  const report = buildMissionMilestoneReports(dir, "2026-05-17T00:00:00.000Z");
  const morning = report.milestones.find((entry) => entry.milestone === "morning-prototype");
  assert.ok(morning);
  assert.ok(morning.feature_reports.some((entry) => entry.feature_id === "dow-static-workspace-shell"));
  assert.ok(morning.satisfied_assertion_ids.includes("VAL-UI-001"));
  assert.ok(morning.commands.some((entry) => entry.command.includes("pnpm run typecheck")));
  assert.ok(morning.browser_manual_evidence.length > 0);
  assert.ok(morning.screenshot_paths.some((path) => path.endsWith(".png")));
  assert.ok(morning.validation_report_paths.some((path) => path.includes("validation/morning-prototype")));
});

test("milestone reports attribute screenshots by exact feature filename convention without substring collisions", () => {
  const dir = mkdtempSync(join(tmpdir(), "sibi-screenshot-attribution-"));
  mkdirSync(join(dir, "handoffs"), { recursive: true });
  mkdirSync(join(dir, "evidence", "mission-reporting", "browser"), { recursive: true });
  writeFileSync(join(dir, "evidence", "mission-reporting", "browser", "feature-a-before.png"), Buffer.from([0x89, 0x50]));
  writeFileSync(join(dir, "evidence", "mission-reporting", "browser", "feature-audit-before.png"), Buffer.from([0x89, 0x50]));

  writeJson(join(dir, "features.json"), {
    features: [
      { id: "feature-a", milestone: "mission-reporting", status: "completed", fulfills: [] },
      { id: "feature-audit", milestone: "mission-reporting", status: "completed", fulfills: [] },
    ],
  });
  writeJson(join(dir, "handoffs", "feature-a.json"), { featureId: "feature-a", handoff: { verification: { commandsRun: [] } } });
  writeJson(join(dir, "handoffs", "feature-audit.json"), { featureId: "feature-audit", handoff: { verification: { commandsRun: [] } } });

  const report = buildMissionMilestoneReports(dir, "2026-05-17T00:00:00.000Z");
  const milestone = report.milestones.find((entry) => entry.milestone === "mission-reporting");
  assert.ok(milestone);
  assert.deepEqual(milestone.feature_reports.find((entry) => entry.feature_id === "feature-a")?.screenshot_paths, [
    "evidence/mission-reporting/browser/feature-a-before.png",
  ]);
  assert.deepEqual(milestone.feature_reports.find((entry) => entry.feature_id === "feature-audit")?.screenshot_paths, [
    "evidence/mission-reporting/browser/feature-audit-before.png",
  ]);
});

test("milestone reports use explicit evidence manifest screenshot ownership when present", () => {
  const dir = mkdtempSync(join(tmpdir(), "sibi-screenshot-manifest-"));
  mkdirSync(join(dir, "handoffs"), { recursive: true });
  mkdirSync(join(dir, "evidence", "mission-reporting", "browser"), { recursive: true });
  writeFileSync(join(dir, "evidence", "mission-reporting", "browser", "before.png"), Buffer.from([0x89, 0x50]));

  writeJson(join(dir, "features.json"), {
    features: [{ id: "feature-with-manifest", milestone: "mission-reporting", status: "completed", fulfills: [] }],
  });
  writeJson(join(dir, "handoffs", "feature-with-manifest.json"), {
    featureId: "feature-with-manifest",
    handoff: { verification: { commandsRun: [] } },
  });
  writeJson(join(dir, "evidence", "manifest.json"), {
    screenshots: [{ feature_id: "feature-with-manifest", path: "evidence/mission-reporting/browser/before.png" }],
  });

  const report = buildMissionMilestoneReports(dir, "2026-05-17T00:00:00.000Z");
  const milestone = report.milestones.find((entry) => entry.milestone === "mission-reporting");
  assert.ok(milestone);
  assert.deepEqual(milestone.feature_reports[0].screenshot_paths, ["evidence/mission-reporting/browser/before.png"]);
});

test("milestone reports normalize primitive milestone values and reject invalid metadata", () => {
  const dir = mkdtempSync(join(tmpdir(), "sibi-milestone-normalize-"));
  mkdirSync(join(dir, "handoffs"), { recursive: true });
  writeJson(join(dir, "features.json"), {
    features: [{ id: "numeric-feature", milestone: 7, status: "completed", fulfills: [] }],
  });
  writeJson(join(dir, "handoffs", "numeric-feature.json"), { featureId: "numeric-feature", handoff: { verification: { commandsRun: [] } } });

  const report = buildMissionMilestoneReports(dir, "2026-05-17T00:00:00.000Z");
  assert.ok(report.milestones.some((entry) => entry.milestone === "7" && entry.feature_reports[0].feature_id === "numeric-feature"));

  writeJson(join(dir, "features.json"), {
    features: [{ id: "bad-feature", milestone: { name: "bad" }, status: "completed", fulfills: [] }],
  });
  assert.throws(() => buildMissionMilestoneReports(dir), /Invalid milestone value for feature bad-feature/);
});

test("milestone reports expose declared and proven assertion semantics when validation state is absent", () => {
  const dir = mkdtempSync(join(tmpdir(), "sibi-assertion-semantics-"));
  mkdirSync(join(dir, "handoffs"), { recursive: true });
  writeJson(join(dir, "features.json"), {
    features: [{ id: "feature-assertions", milestone: "mission-reporting", status: "completed", fulfills: ["VAL-CROSS-008"] }],
  });
  writeJson(join(dir, "handoffs", "feature-assertions.json"), {
    featureId: "feature-assertions",
    handoff: { verification: { commandsRun: [] }, discoveredIssues: [] },
  });

  const report = buildMissionMilestoneReports(dir, "2026-05-17T00:00:00.000Z");
  const milestone = report.milestones.find((entry) => entry.milestone === "mission-reporting");
  assert.ok(milestone);
  assert.deepEqual(milestone.declared_assertion_ids, ["VAL-CROSS-008"]);
  assert.deepEqual(milestone.proven_assertion_ids, []);
  assert.deepEqual(milestone.satisfied_assertion_ids, []);
  assert.equal(milestone.validation_state_present, false);
  assert.equal(milestone.assertion_semantics, "declared_assertion_ids come from features[].fulfills; proven_assertion_ids/satisfied_assertion_ids require passed validation-state.json assertions.");
  assert.deepEqual(milestone.feature_reports[0].assertion_statuses, [{ assertion_id: "VAL-CROSS-008", status: "declared_unvalidated" }]);
});

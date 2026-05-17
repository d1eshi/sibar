import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildMissionMilestoneReports } from "../src/runtime-milestone-reporting.ts";

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

test("VAL-CROSS-008 milestone reports map features, assertions, files, commands, evidence, and unresolved work", () => {
  const dir = mkdtempSync(join(tmpdir(), "sibi-milestone-report-"));
  mkdirSync(join(dir, "handoffs"), { recursive: true });
  mkdirSync(join(dir, "validation", "ui-milestone", "user-testing"), { recursive: true });
  mkdirSync(join(dir, "evidence", "ui-milestone", "flow"), { recursive: true });
  writeFileSync(join(dir, "evidence", "ui-milestone", "flow", "VAL-UI-001-before.png"), "png");

  writeJson(join(dir, "features.json"), {
    features: [
      { id: "feat-ui", milestone: "ui-milestone", status: "completed", fulfills: ["VAL-UI-001", "VAL-CROSS-008"] },
      { id: "feat-runtime", milestone: "ui-milestone", status: "completed", fulfills: ["VAL-PED-001"] },
      { id: "feat-open", milestone: "ui-milestone", status: "pending", fulfills: ["VAL-OPEN"] },
    ],
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
  assert.deepEqual(milestone.satisfied_assertion_ids, ["VAL-CROSS-008", "VAL-PED-001", "VAL-UI-001"]);
  assert.deepEqual(milestone.feature_reports.find((entry) => entry.feature_id === "feat-ui")?.changed_files, [
    "web/scripts/ui.js",
    "web/workspace.html",
  ]);
  assert.ok(milestone.commands.some((entry) => entry.command === "pnpm run typecheck"));
  assert.ok(milestone.browser_manual_evidence.some((entry) => entry.includes("Clicked Submit")));
  assert.ok(milestone.screenshot_paths.includes("evidence/ui-milestone/flow/VAL-UI-001-before.png"));
  assert.ok(milestone.unresolved_work.some((entry) => entry.includes("feat-runtime")));
  assert.ok(milestone.unresolved_work.some((entry) => entry.includes("feat-open")));
  assert.ok(milestone.open_decisions.some((entry) => entry.includes("screenshots are required")));
});

test("VAL-CROSS-008 current mission reports are retrievable for completed milestones", () => {
  const report = buildMissionMilestoneReports("/Users/d1eshi/.factory/missions/b742080c-f488-4442-b610-88bb53767f2a", "2026-05-17T00:00:00.000Z");
  const morning = report.milestones.find((entry) => entry.milestone === "morning-prototype");
  assert.ok(morning);
  assert.ok(morning.feature_reports.some((entry) => entry.feature_id === "dow-static-workspace-shell"));
  assert.ok(morning.satisfied_assertion_ids.includes("VAL-UI-001"));
  assert.ok(morning.commands.some((entry) => entry.command.includes("pnpm run typecheck")));
  assert.ok(morning.browser_manual_evidence.length > 0);
  assert.ok(morning.screenshot_paths.some((path) => path.endsWith(".png")));
  assert.ok(morning.validation_report_paths.some((path) => path.includes("validation/morning-prototype")));
});

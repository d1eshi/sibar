import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";

type JsonRecord = Record<string, unknown>;

export type MilestoneFeatureReport = {
  feature_id: string;
  status: string;
  declared_assertion_ids: string[];
  proven_assertion_ids: string[];
  assertion_statuses: Array<{ assertion_id: string; status: string; validatedAtMilestone?: string; validatedAt?: string }>;
  assertions: string[];
  handoff_paths: string[];
  validation_report_paths: string[];
  changed_files: string[];
  commands: Array<{ command: string; exitCode: number | null; observation: string }>;
  browser_manual_evidence: string[];
  screenshot_paths: string[];
  unresolved_work: string[];
};

export type MilestoneHandoffReport = {
  milestone: string;
  generated_from: string;
  feature_reports: MilestoneFeatureReport[];
  declared_assertion_ids: string[];
  proven_assertion_ids: string[];
  satisfied_assertion_ids: string[];
  assertion_semantics: string;
  validation_state_present: boolean;
  commands: MilestoneFeatureReport["commands"];
  browser_manual_evidence: string[];
  screenshot_paths: string[];
  unresolved_work: string[];
  open_decisions: string[];
  validation_report_paths: string[];
};

export type MissionMilestoneReporting = {
  report_id: string;
  mission_dir: string;
  milestones: MilestoneHandoffReport[];
};

export function buildMissionMilestoneReports(missionDir: string, generatedAt = new Date().toISOString()): MissionMilestoneReporting {
  const features = readJson(join(missionDir, "features.json")).features as JsonRecord[];
  const validationState = readOptionalValidationState(missionDir);
  const handoffs = readJsonFiles(join(missionDir, "handoffs"));
  const validationPaths = listJsonFiles(join(missionDir, "validation"));
  const evidencePaths = listFiles(join(missionDir, "evidence"));
  const screenshotManifest = readEvidenceManifest(missionDir);
  const completedMilestones = [
    ...new Set(features.filter((feature) => feature.status === "completed").map((feature) => normalizeFeatureMilestone(feature))),
  ].sort();

  return {
    report_id: `milestone-handoff-${generatedAt}`,
    mission_dir: missionDir,
    milestones: completedMilestones.map((milestone) =>
      buildMilestoneReport(missionDir, milestone, features, validationState, handoffs, validationPaths, evidencePaths, screenshotManifest, generatedAt)
    ),
  };
}

function buildMilestoneReport(
  missionDir: string,
  milestone: string,
  features: JsonRecord[],
  validationState: JsonRecord,
  handoffs: Array<{ path: string; data: JsonRecord }>,
  validationPaths: string[],
  evidencePaths: string[],
  screenshotManifest: Map<string, Set<string>>,
  generatedAt: string,
): MilestoneHandoffReport {
  const milestoneFeatures = features.filter((feature) => normalizeFeatureMilestone(feature) === milestone);
  const reportPaths = validationPaths.filter((path) => path.includes(`/validation/${milestone}/`));
  const screenshotPaths = evidencePaths.filter((path) => path.includes(`/evidence/${milestone}/`) && /\.(png|jpe?g)$/i.test(path));
  const openDecisions = reportPaths.flatMap((path) => extractOpenDecisions(path, missionDir));
  const featureReports = milestoneFeatures.map((feature) =>
    buildFeatureReport(missionDir, feature, validationState, handoffs, reportPaths, screenshotPaths, screenshotManifest)
  );
  const completedReports = featureReports.filter((report) => report.status === "completed");
  const declaredAssertionIds = unique(completedReports.flatMap((report) => report.declared_assertion_ids));
  const provenAssertionIds = unique(completedReports.flatMap((report) => report.proven_assertion_ids));
  const unresolved = [
    ...featureReports.flatMap((report) => report.unresolved_work),
    ...milestoneFeatures
      .filter((feature) => feature.status !== "completed")
      .map((feature) => `${feature.id}: status is ${feature.status}; work is not completed.`),
  ];

  return {
    milestone,
    generated_from: generatedAt,
    feature_reports: featureReports,
    declared_assertion_ids: declaredAssertionIds,
    proven_assertion_ids: provenAssertionIds,
    satisfied_assertion_ids: provenAssertionIds,
    assertion_semantics:
      "declared_assertion_ids come from features[].fulfills; proven_assertion_ids/satisfied_assertion_ids require passed validation-state.json assertions.",
    validation_state_present: Object.keys(validationState).length > 0,
    commands: completedReports.flatMap((report) => report.commands),
    browser_manual_evidence: unique(completedReports.flatMap((report) => report.browser_manual_evidence)),
    screenshot_paths: screenshotPaths.map((path) => relative(missionDir, path)),
    unresolved_work: unresolved.length > 0 ? unresolved : ["No unresolved work recorded for completed milestone features."],
    open_decisions: openDecisions.length > 0 ? unique(openDecisions) : ["No open decisions recorded in validation reports."],
    validation_report_paths: reportPaths.map((path) => relative(missionDir, path)),
  };
}

function buildFeatureReport(
  missionDir: string,
  feature: JsonRecord,
  validationState: JsonRecord,
  handoffs: Array<{ path: string; data: JsonRecord }>,
  validationPaths: string[],
  screenshotPaths: string[],
  screenshotManifest: Map<string, Set<string>>,
): MilestoneFeatureReport {
  const featureId = String(feature.id);
  const declaredAssertions = Array.isArray(feature.fulfills) ? feature.fulfills.map(String) : [];
  const assertionStatuses = declaredAssertions.map((assertionId) => assertionStatus(assertionId, validationState));
  const provenAssertions = assertionStatuses
    .filter((entry) => entry.status === "passed" && (!entry.validatedAtMilestone || entry.validatedAtMilestone === normalizeFeatureMilestone(feature)))
    .map((entry) => entry.assertion_id);
  const featureHandoffs = handoffs.filter(({ data }) => data.featureId === featureId);
  const commands = featureHandoffs.flatMap(({ data }) => {
    const handoff = data.handoff as JsonRecord | undefined;
    const verification = handoff?.verification as JsonRecord | undefined;
    const commandsRun = Array.isArray(verification?.commandsRun) ? verification.commandsRun : [];
    return commandsRun.map((entry) => {
      const command = entry as JsonRecord;
      return {
        command: String(command.command ?? ""),
        exitCode: typeof command.exitCode === "number" ? command.exitCode : null,
        observation: String(command.observation ?? ""),
      };
    });
  });
  const manualEvidence = featureHandoffs.flatMap(({ data }) => {
    const handoff = data.handoff as JsonRecord | undefined;
    const verification = handoff?.verification as JsonRecord | undefined;
    const checks = Array.isArray(verification?.interactiveChecks) ? verification.interactiveChecks : [];
    return checks.map((entry) => {
      const check = entry as JsonRecord;
      return `${check.action ?? "manual check"} -> ${check.observed ?? "observation not recorded"}`;
    });
  });
  const browserCommands = commands
    .filter((entry) => /agent-browser|browser|screenshot|accessibility|dom/i.test(`${entry.command} ${entry.observation}`))
    .map((entry) => `${entry.command}: ${entry.observation}`);

  return {
    feature_id: featureId,
    status: String(feature.status ?? "unknown"),
    declared_assertion_ids: declaredAssertions,
    proven_assertion_ids: provenAssertions,
    assertion_statuses: assertionStatuses,
    assertions: declaredAssertions,
    handoff_paths: featureHandoffs.map(({ path }) => relative(missionDir, path)),
    validation_report_paths: validationPaths.filter((path) => fileIncludes(path, featureId)).map((path) => relative(missionDir, path)),
    changed_files: unique(featureHandoffs.flatMap(({ data }) => changedFilesForHandoff(data))),
    commands,
    browser_manual_evidence: unique([...manualEvidence, ...browserCommands]),
    screenshot_paths: screenshotPaths
      .filter((path) => screenshotBelongsToFeature(path, featureId, missionDir, screenshotManifest))
      .map((path) => relative(missionDir, path)),
    unresolved_work: featureHandoffs.flatMap(({ data }) => unresolvedForHandoff(featureId, data)),
  };
}

function changedFilesForHandoff(handoff: JsonRecord): string[] {
  if (Array.isArray(handoff.changedFiles)) return handoff.changedFiles.map(String);
  if (typeof handoff.repoPath !== "string" || typeof handoff.commitId !== "string") return [];
  try {
    return execFileSync("git", ["-C", handoff.repoPath, "show", "--name-only", "--pretty=", handoff.commitId], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).split("\n").map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function unresolvedForHandoff(featureId: string, data: JsonRecord): string[] {
  const handoff = data.handoff as JsonRecord | undefined;
  const left = String(handoff?.whatWasLeftUndone ?? "").trim();
  const issues = Array.isArray(handoff?.discoveredIssues) ? handoff.discoveredIssues : [];
  return [
    ...(left ? [`${featureId}: ${left}`] : []),
    ...issues.map((issue) => `${featureId}: ${JSON.stringify(issue)}`),
  ];
}

function extractOpenDecisions(path: string, missionDir: string): string[] {
  const data = readJson(path);
  const decisions = [
    ...(Array.isArray(data.suggestedGuidanceUpdates) ? data.suggestedGuidanceUpdates : []),
    ...(Array.isArray(data.blockingIssues) ? data.blockingIssues : []),
    ...(Array.isArray(data.rejectedObservations) ? data.rejectedObservations : []),
  ];
  return decisions.map((decision) => `${relative(missionDir, path)}: ${JSON.stringify(decision)}`);
}

function readOptionalValidationState(missionDir: string): JsonRecord {
  const path = join(missionDir, "validation-state.json");
  return existsSync(path) ? readJson(path) : {};
}

function normalizeFeatureMilestone(feature: JsonRecord): string {
  const value = feature.milestone;
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  throw new Error(`Invalid milestone value for feature ${String(feature.id ?? "(unknown)")}: expected non-empty string or finite number.`);
}

function assertionStatus(assertionId: string, validationState: JsonRecord): MilestoneFeatureReport["assertion_statuses"][number] {
  const assertions = validationState.assertions as JsonRecord | undefined;
  const record = assertions?.[assertionId] as JsonRecord | undefined;
  return {
    assertion_id: assertionId,
    status: String(record?.status ?? "declared_unvalidated"),
    ...(typeof record?.validatedAtMilestone === "string" ? { validatedAtMilestone: record.validatedAtMilestone } : {}),
    ...(typeof record?.validatedAt === "string" ? { validatedAt: record.validatedAt } : {}),
  };
}

function readJson(path: string): JsonRecord {
  return JSON.parse(readFileSync(path, "utf8")) as JsonRecord;
}

function readJsonFiles(dir: string): Array<{ path: string; data: JsonRecord }> {
  return listJsonFiles(dir).map((path) => ({ path, data: readJson(path) }));
}

function listJsonFiles(dir: string): string[] {
  return listFiles(dir).filter((path) => path.endsWith(".json"));
}

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

function fileIncludes(path: string, text: string): boolean {
  try {
    return readFileSync(path, "utf8").includes(text);
  } catch {
    return path.includes(text);
  }
}

function readEvidenceManifest(missionDir: string): Map<string, Set<string>> {
  const manifestPath = join(missionDir, "evidence", "manifest.json");
  const ownership = new Map<string, Set<string>>();
  if (!existsSync(manifestPath)) return ownership;
  const data = readJson(manifestPath);
  const screenshots = Array.isArray(data.screenshots) ? data.screenshots : [];
  for (const entry of screenshots) {
    const record = entry as JsonRecord;
    if (typeof record.feature_id !== "string" || typeof record.path !== "string") continue;
    const paths = ownership.get(record.feature_id) ?? new Set<string>();
    paths.add(normalizeRelativePath(record.path));
    ownership.set(record.feature_id, paths);
  }
  return ownership;
}

function screenshotBelongsToFeature(path: string, featureId: string, missionDir: string, manifest: Map<string, Set<string>>): boolean {
  const relativePath = normalizeRelativePath(relative(missionDir, path));
  const manifestPaths = manifest.get(featureId);
  if (manifestPaths?.has(relativePath)) return true;
  if (manifestPaths && manifestPaths.size > 0) return false;
  return basename(path).startsWith(`${featureId}-`);
}

function normalizeRelativePath(path: string): string {
  return path.split(sep).join("/");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

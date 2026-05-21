export const OWNERSHIP_REVIEW_VERSION = "0.1.0";

export type OwnershipReviewStatus = "blocked" | "limited" | "ready";

export type OwnershipArea =
  | "api"
  | "auth"
  | "config"
  | "data"
  | "dependencies"
  | "deletion"
  | "state"
  | "tests"
  | "ui"
  | "unknown";

export type OwnershipReviewInput = {
  diffText: string;
  goalContext?: string;
};

export type ChangedFileSummary = {
  path: string;
  additions: number;
  deletions: number;
  areas: OwnershipArea[];
  isTest: boolean;
};

export type OwnershipReviewMetrics = {
  filesChanged: number;
  additions: number;
  deletions: number;
  productionFiles: number;
  testFiles: number;
  riskyAreaCount: number;
};

export type OwnershipReview = {
  schema: "OwnershipReview";
  version: typeof OWNERSHIP_REVIEW_VERSION;
  status: OwnershipReviewStatus;
  summary: string;
  files: ChangedFileSummary[];
  areasTouched: string[];
  ownershipQuestions: string[];
  ownershipGaps: string[];
  testsEvidenceSuggested: string[];
  readPath: string[];
  signals: string[];
  metrics: OwnershipReviewMetrics;
};

type MutableFile = {
  path: string;
  additions: number;
  deletions: number;
  addedLines: string[];
  removedLines: string[];
};

const riskyAreas = new Set<OwnershipArea>(["api", "auth", "config", "data", "dependencies", "deletion", "state"]);

const areaLabels: Record<OwnershipArea, string> = {
  api: "API / contract",
  auth: "Auth / permissions",
  config: "Config / runtime",
  data: "Data / migrations",
  dependencies: "Dependencies",
  deletion: "Deletion / removal",
  state: "State / concurrency",
  tests: "Tests",
  ui: "UI",
  unknown: "Unclassified",
};

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function hasAny(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

function isTestPath(path: string): boolean {
  const lower = path.toLowerCase();
  return /(^|[/_.-])(test|tests|spec|__tests__)([/_.-]|$)/.test(lower)
    || /\.(test|spec)\.[cm]?[jt]sx?$/.test(lower);
}

function inferPathAreas(path: string): OwnershipArea[] {
  const lower = path.toLowerCase();
  const areas: OwnershipArea[] = [];
  if (isTestPath(lower)) areas.push("tests");
  if (hasAny(lower, ["auth", "session", "token", "permission", "role", "login", "oauth", "jwt"])) areas.push("auth");
  if (hasAny(lower, ["api", "route", "controller", "endpoint", "server", "handler"])) areas.push("api");
  if (hasAny(lower, ["migration", "schema", "model", "database", "db/", "sql", "prisma", "alembic"])) areas.push("data");
  if (hasAny(lower, ["package.json", "pnpm-lock", "package-lock", "requirements", "pyproject", "cargo.toml", "cargo.lock"])) areas.push("dependencies");
  if (hasAny(lower, ["config", "settings", ".env", "docker", ".yml", ".yaml", ".toml", "tsconfig", "vite.config"])) areas.push("config");
  if (/\.(tsx|jsx|css|scss)$/.test(lower) || hasAny(lower, ["component", "view", "page"])) areas.push("ui");
  return unique(areas);
}

function inferContentAreas(file: MutableFile): OwnershipArea[] {
  const text = `${file.addedLines.join("\n")}\n${file.removedLines.join("\n")}`.toLowerCase();
  const areas: OwnershipArea[] = [];
  if (hasAny(text, ["fetch(", "axios.", "@app.", "router.", "status_code", "response_model", "endpoint", "request", "response", "promise<"])) areas.push("api");
  if (hasAny(text, ["auth", "token", "jwt", "cookie", "csrf", "permission", "role", "secret", "password"])) areas.push("auth");
  if (hasAny(text, ["create table", "alter table", "drop table", "add column", "migration", "sqlalchemy", "prisma", "select ", "update ", "delete from"])) areas.push("data");
  if (hasAny(text, ["usestate", "usereducer", "setstate", "dispatch(", "optimistic", "rollback", "race", "lock", "transaction"])) areas.push("state");
  if (hasAny(text, ["delete", "remove", "drop ", "deprecated"]) || file.deletions > Math.max(file.additions * 2, 30)) areas.push("deletion");
  if (hasAny(text, ["describe(", "it(", "test(", "expect(", "assert.", "node:test", "vitest", "pytest"])) areas.push("tests");
  return unique(areas);
}

function parseDiffFiles(diffText: string): MutableFile[] {
  const files: MutableFile[] = [];
  let current: MutableFile | null = null;

  for (const rawLine of diffText.split(/\r?\n/)) {
    const gitMatch = rawLine.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (gitMatch) {
      current = { path: gitMatch[2] || gitMatch[1], additions: 0, deletions: 0, addedLines: [], removedLines: [] };
      files.push(current);
      continue;
    }

    const newFileMatch = rawLine.match(/^\+\+\+ b\/(.+)$/);
    if (newFileMatch && (!current || current.path === "/dev/null")) {
      current = { path: newFileMatch[1], additions: 0, deletions: 0, addedLines: [], removedLines: [] };
      files.push(current);
      continue;
    }

    if (!current) continue;
    if (rawLine.startsWith("+++") || rawLine.startsWith("---")) continue;

    if (rawLine.startsWith("+")) {
      current.additions += 1;
      current.addedLines.push(rawLine.slice(1));
    } else if (rawLine.startsWith("-")) {
      current.deletions += 1;
      current.removedLines.push(rawLine.slice(1));
    }
  }

  return files;
}

function inferFilesFromText(text: string): MutableFile[] {
  const pathMatches = text.match(/[A-Za-z0-9_.@/-]+\.(?:ts|tsx|js|jsx|py|rs|go|sql|css|json|md|yml|yaml|toml|swift|java|kt|rb|php)/g) ?? [];
  const paths = unique(pathMatches.map((path) => path.replace(/^a\//, "").replace(/^b\//, ""))).slice(0, 12);
  const additions = text.split(/\r?\n/).filter((line) => line.startsWith("+") && !line.startsWith("+++")).length;
  const deletions = text.split(/\r?\n/).filter((line) => line.startsWith("-") && !line.startsWith("---")).length;
  return paths.map((path, index) => ({
    path,
    additions: index === 0 ? additions : 0,
    deletions: index === 0 ? deletions : 0,
    addedLines: [text],
    removedLines: [],
  }));
}

function summarizeStatus(status: OwnershipReviewStatus, metrics: OwnershipReviewMetrics, areas: string[]): string {
  const size = `${metrics.filesChanged} file${metrics.filesChanged === 1 ? "" : "s"}, +${metrics.additions}/-${metrics.deletions}`;
  const areaText = areas.length > 0 ? areas.slice(0, 4).join(", ") : "unclassified change";
  if (status === "blocked") return `${size}. Ownership is blocked until critical gaps are explained and evidenced across ${areaText}.`;
  if (status === "limited") return `${size}. Ownership is limited: review the changed path and close the open evidence gaps around ${areaText}.`;
  return `${size}. Review looks merge-ready for ownership if the listed evidence has been run and checked.`;
}

function prioritizeReadPath(files: ChangedFileSummary[]): string[] {
  return [...files]
    .sort((a, b) => {
      const aRisk = a.areas.some((area) => riskyAreas.has(area)) ? 0 : 1;
      const bRisk = b.areas.some((area) => riskyAreas.has(area)) ? 0 : 1;
      if (aRisk !== bRisk) return aRisk - bRisk;
      if (a.isTest !== b.isTest) return a.isTest ? 1 : -1;
      return (b.additions + b.deletions) - (a.additions + a.deletions);
    })
    .slice(0, 7)
    .map((file) => {
      const label = file.areas.filter((area) => area !== "unknown").map((area) => areaLabels[area]).slice(0, 2).join(", ");
      return label ? `${file.path} - ${label}` : file.path;
    });
}

export function reviewOwnership(input: OwnershipReviewInput): OwnershipReview {
  const diffText = input.diffText.trim();
  const goalContext = input.goalContext?.trim() ?? "";
  const parsedFiles = parseDiffFiles(diffText);
  const sourceFiles = parsedFiles.length > 0 ? parsedFiles : inferFilesFromText(diffText);

  const files: ChangedFileSummary[] = sourceFiles.map((file) => {
    const areas = unique([...inferPathAreas(file.path), ...inferContentAreas(file)]);
    return {
      path: file.path,
      additions: file.additions,
      deletions: file.deletions,
      areas: areas.length > 0 ? areas : ["unknown"],
      isTest: isTestPath(file.path) || areas.includes("tests"),
    };
  });

  const metrics: OwnershipReviewMetrics = {
    filesChanged: files.length,
    additions: files.reduce((sum, file) => sum + file.additions, 0),
    deletions: files.reduce((sum, file) => sum + file.deletions, 0),
    productionFiles: files.filter((file) => !file.isTest).length,
    testFiles: files.filter((file) => file.isTest).length,
    riskyAreaCount: unique(files.flatMap((file) => file.areas)).filter((area) => riskyAreas.has(area)).length,
  };

  const areaSet = unique(files.flatMap((file) => file.areas));
  const hasTests = metrics.testFiles > 0 || areaSet.includes("tests");
  const hasCritical = areaSet.some((area) => area === "auth" || area === "data");
  const isLarge = metrics.filesChanged >= 8 || metrics.additions + metrics.deletions >= 350;
  const gaps: string[] = [];
  const signals: string[] = [];

  if (!diffText) gaps.push("No pasted diff or PR text was provided.");
  if (files.length === 0) gaps.push("No changed files were detected, so ownership cannot be traced to concrete code.");
  if (!goalContext) gaps.push("Goal/context is missing; compare the diff against intended behavior before merge.");
  if (metrics.productionFiles > 0 && !hasTests) gaps.push("No tests or executable evidence were detected for production changes.");
  if (areaSet.includes("api")) gaps.push("API or contract changes need caller impact, response shape, and compatibility evidence.");
  if (areaSet.includes("auth")) gaps.push("Auth or permission changes need explicit abuse cases and negative-path tests.");
  if (areaSet.includes("data")) gaps.push("Data or migration changes need rollback, compatibility, and existing-data evidence.");
  if (areaSet.includes("state")) gaps.push("State or concurrency changes need failure, retry, and stale-state evidence.");
  if (areaSet.includes("dependencies")) gaps.push("Dependency changes need lockfile/runtime compatibility and supply-chain review.");
  if (areaSet.includes("deletion")) gaps.push("Deleted behavior needs proof that callers, docs, and fallback paths were handled.");
  if (isLarge) gaps.push("The diff is large enough to split ownership review by subsystem before merge.");

  if (parsedFiles.length === 0 && diffText) signals.push("parsed as pasted PR or agent output without full diff headers");
  if (hasTests) signals.push("test evidence present");
  if (hasCritical) signals.push("critical ownership area touched");
  if (isLarge) signals.push("large change footprint");

  const status: OwnershipReviewStatus = !diffText || files.length === 0 || (hasCritical && !hasTests) || (isLarge && !hasTests)
    ? "blocked"
    : gaps.length > 0 || metrics.riskyAreaCount > 0
      ? "limited"
      : "ready";

  const questions = unique([
    goalContext ? "What user-visible or operational goal does this diff claim to satisfy?" : "What goal was the agent asked to satisfy, and where does the diff prove it?",
    areaSet.includes("api") ? "Which inputs, outputs, status codes, and callers changed?" : "What contract changed, even if no public API moved?",
    areaSet.includes("auth") ? "What permission boundary could this weaken, and how is the negative path tested?" : "Which failure mode would make this unsafe to merge?",
    areaSet.includes("data") ? "How does this behave on existing data, rollback, and partial deploys?" : "What existing behavior could regress outside the touched files?",
    hasTests ? "Which test or command proves the riskiest path?" : "What executable evidence is missing before you would own this merge?",
  ]).slice(0, 5);

  const evidence = unique([
    hasTests ? "Run the changed test files and the closest production test suite." : "Add or run at least one focused regression test for the changed production path.",
    areaSet.includes("api") ? "Exercise one happy path and one incompatible-client or bad-request path." : "Capture before/after behavior for the main changed path.",
    areaSet.includes("auth") ? "Add a negative permission/authentication test and inspect token/session handling." : "",
    areaSet.includes("data") ? "Validate migration or data changes against existing records and rollback assumptions." : "",
    areaSet.includes("state") ? "Test failed request, retry, and stale UI/state transitions." : "",
    areaSet.includes("dependencies") ? "Verify install/build output and review new transitive runtime surface." : "",
  ].filter(Boolean));

  const areasTouched = areaSet.map((area) => areaLabels[area]);

  return {
    schema: "OwnershipReview",
    version: OWNERSHIP_REVIEW_VERSION,
    status,
    summary: summarizeStatus(status, metrics, areasTouched),
    files,
    areasTouched,
    ownershipQuestions: questions,
    ownershipGaps: unique(gaps).slice(0, 8),
    testsEvidenceSuggested: evidence.slice(0, 6),
    readPath: prioritizeReadPath(files),
    signals: unique(signals),
    metrics,
  };
}

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SHARED_CORE_BOUNDARIES_VALIDATION_ID = "VAL-EVAL-014-shared-core-boundaries";
const DEFAULT_REPORT = "evals/shared-core-boundaries/reports/VAL-EVAL-014-shared-core-boundaries.json";
const EVAL_SPEC_PATH = "evals/shared-core-boundaries/eval-suite.json";
const SHARED_CORE_SPEC_PATH = "docs/specs/deep-ownership-workspace/04_shared_core_boundaries.md";
export const SHARED_CORE_BOUNDARIES_EVAL_GENERATED_AT = "2026-05-21T00:00:00.000Z";

type BoundaryCaseId =
  | "SCB-001-OWNERSHIP-CORE-IMPORTS"
  | "SCB-002-PEDAGOGY-CORE-IMPORTS"
  | "SCB-003-MEMORY-CORE-IMPORTS"
  | "SCB-004-SIBI-WORKSPACE-IMPORTS"
  | "SCB-005-SPEC-GLOBAL-GATES";

type BoundaryStatus = "passed" | "failed" | "skipped";

type ImportReference = {
  file: string;
  line: number;
  module_specifier: string;
  import_text: string;
};

export type SharedCoreBoundaryViolation = ImportReference & {
  reason: string;
};

export type SharedCoreSpecGateResult = {
  gate: string;
  declared: boolean;
  evidence: string[];
};

export type SharedCoreBoundaryCaseResult = {
  id: BoundaryCaseId;
  title: string;
  status: BoundaryStatus;
  checked_paths: string[];
  files_checked: number;
  violations: SharedCoreBoundaryViolation[];
  gates?: SharedCoreSpecGateResult[];
};

export type SharedCoreBoundariesReport = {
  report_id: string;
  generated_at: string;
  validation: typeof SHARED_CORE_BOUNDARIES_VALIDATION_ID;
  eval_spec_path: typeof EVAL_SPEC_PATH;
  no_llm: true;
  passed: boolean;
  aggregate: {
    total_cases: number;
    passed_cases: number;
    failed_cases: number;
    skipped_cases: number;
    files_checked: number;
    violations: number;
    declared_gates: number;
    expected_gates: number;
  };
  cases: SharedCoreBoundaryCaseResult[];
};

export type SharedCoreBoundariesEvalOptions = {
  rootDir?: string;
  reportPath?: string;
  generatedAt?: string;
  reportId?: string;
};

type ForbiddenImportRule = {
  reason: string;
  matches: (reference: ImportReference, absoluteFile: string, rootDir: string) => boolean;
};

const CORE_DIRS = [
  {
    id: "SCB-001-OWNERSHIP-CORE-IMPORTS" as const,
    title: "ownership-core stays free of host, surface, and adapter imports.",
    path: "engine/ownership-core",
  },
  {
    id: "SCB-002-PEDAGOGY-CORE-IMPORTS" as const,
    title: "pedagogy-core stays free of host, surface, and adapter imports.",
    path: "engine/pedagogy-core",
  },
  {
    id: "SCB-003-MEMORY-CORE-IMPORTS" as const,
    title: "memory-core stays free of host, surface, and adapter imports.",
    path: "engine/memory-core",
  },
];

const CORE_FORBIDDEN_IMPORTS: ForbiddenImportRule[] = [
  exactModules(["node:fs", "node:fs/promises", "fs", "fs/promises"], "filesystem imports belong to adapters"),
  exactModules(["node:child_process", "child_process"], "shell execution belongs to adapters"),
  exactModules(["node:worker_threads", "worker_threads"], "worker threads belong to adapters"),
  modulePattern(/^react(?:$|\/)|^react-dom(?:$|\/)|^lucide-react$/, "UI imports belong to surfaces"),
  modulePattern(/^vite(?:$|\/)|^@vitejs\//, "workspace UI build imports belong to surfaces"),
  repoPathPattern(/^sibi\//, "Sibi is a surface and must not be imported by shared core"),
  repoPathPattern(/^web\//, "web is a surface and must not be imported by shared core"),
  repoPathPattern(/^apps\/sibar-research-workspace\//, "workspace UI is a surface"),
  repoPathPattern(/^engine\/pedagogoai\/workspace-intent/, "WorkspaceIntent belongs outside shared core"),
  repoPathPattern(/^engine\/persistence\//, "persistence is adapter-owned"),
  repoPathPattern(/^engine\/memory\//, "understanding memory is a separate memory layer"),
  repoPathPattern(/^engine\/workspace\/session\//, "workspace sessions are adapter-owned"),
  repoPathPattern(/^engine\/deep-ownership\/study-artifacts/, "study artifact projection is adapter-owned"),
];

const SIBI_FORBIDDEN_IMPORTS: ForbiddenImportRule[] = [
  repoPathPattern(/^engine\/pedagogoai(?:\/|$)/, "Sibi must not import PedagogoAI workspace contracts or adapters"),
  repoPathPattern(/^apps\/sibar-research-workspace\//, "Sibi must not import the Sibar Workspace UI"),
  moduleTextPattern(/\bWorkspaceIntent\b/, "Sibi handoff must not import WorkspaceIntent"),
  modulePattern(/workspace-(?:intent-)?adapter/, "Sibi must not import workspace adapters"),
  repoPathPattern(/workspace-(?:intent-)?adapter/, "Sibi must not import workspace adapters"),
];

const SPEC_GATE_CHECKS = [
  {
    gate: "evidence-grounded",
    patterns: [/Evidence-grounded/i, /cited evidence/i, /unsupported state/i],
  },
  {
    gate: "attempt-first",
    patterns: [/Attempt-first/i, /passive reading/i, /model explanation/i],
  },
  {
    gate: "operation-scoped",
    patterns: [/Operation-scoped/i, /explain, trace,\s+derive,\s+predict,\s+implement,\s+test,\s+benchmark,\s+or modify/i],
  },
  {
    gate: "artifact-scoped",
    patterns: [/Artifact-scoped/i, /source slice/i, /diff, PR, or\s+repo area/i],
  },
  {
    gate: "no whole mission or repo ownership claim",
    patterns: [/No whole-mission or whole-repo ownership claim/i, /one session or review/i],
  },
  {
    gate: "closed gap taxonomy",
    patterns: [/Closed gap taxonomy/i, /new gap kinds require tests and eval coverage/i],
  },
  {
    gate: "repair return condition",
    patterns: [/Repair with return condition/i, /what original operation\s+it returns to/i],
  },
  {
    gate: "misconception memory",
    patterns: [/Misconception memory/i, /durable evidence/i, /overwritten/i],
  },
  {
    gate: "recall and transfer separation",
    patterns: [/Recall and transfer are separate/i, /local success does not imply retained or\s+transferable ownership/i],
  },
  {
    gate: "raw model output untrusted",
    patterns: [/Raw model output is untrusted/i, /schema-checked/i, /evidence-checked/i, /pedagogy-checked/i],
  },
];

function exactModules(moduleSpecifiers: string[], reason: string): ForbiddenImportRule {
  return {
    reason,
    matches: (reference) => moduleSpecifiers.includes(reference.module_specifier),
  };
}

function modulePattern(pattern: RegExp, reason: string): ForbiddenImportRule {
  return {
    reason,
    matches: (reference) => pattern.test(reference.module_specifier),
  };
}

function moduleTextPattern(pattern: RegExp, reason: string): ForbiddenImportRule {
  return {
    reason,
    matches: (reference) => pattern.test(reference.import_text),
  };
}

function repoPathPattern(pattern: RegExp, reason: string): ForbiddenImportRule {
  return {
    reason,
    matches: (reference, absoluteFile, rootDir) => {
      const repoPath = resolveImportToRepoPath(reference.module_specifier, absoluteFile, rootDir);
      return repoPath !== null && pattern.test(repoPath);
    },
  };
}

function getFlagValue(argv: string[], flag: string): string | undefined {
  const equalsPrefix = `--${flag}=`;
  const equalsValue = argv.find((entry) => entry.startsWith(equalsPrefix));
  if (equalsValue !== undefined) return equalsValue.slice(equalsPrefix.length);
  const spacedIndex = argv.findIndex((entry) => entry === `--${flag}`);
  if (spacedIndex !== -1 && spacedIndex + 1 < argv.length) return argv[spacedIndex + 1];
  return undefined;
}

function toRepoPath(rootDir: string, path: string): string {
  return relative(rootDir, resolve(path)).split("\\").join("/") || ".";
}

function resolveInsideRoot(rootDir: string, path: string): string {
  return isAbsolute(path) ? path : resolve(rootDir, path);
}

function isTsSource(path: string): boolean {
  return [".ts", ".tsx", ".mts", ".cts"].includes(extname(path)) && !path.endsWith(".d.ts");
}

function listTsFiles(rootDir: string, repoPath: string): string[] {
  const absolutePath = resolve(rootDir, repoPath);
  if (!existsSync(absolutePath)) return [];
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const child = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        visit(child);
      } else if (entry.isFile() && isTsSource(child)) {
        files.push(child);
      }
    }
  };
  visit(absolutePath);
  return files.sort();
}

function lineForOffset(text: string, offset: number): number {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (text.charCodeAt(index) === 10) line += 1;
  }
  return line;
}

function compactImportText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractImportReferences(rootDir: string, absoluteFile: string): ImportReference[] {
  const content = readFileSync(absoluteFile, "utf8");
  const references: ImportReference[] = [];
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/gs,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      const moduleSpecifier = match[1];
      if (!moduleSpecifier) continue;
      references.push({
        file: toRepoPath(rootDir, absoluteFile),
        line: lineForOffset(content, match.index ?? 0),
        module_specifier: moduleSpecifier,
        import_text: compactImportText(match[0]),
      });
    }
  }

  return references.sort((a, b) => a.line - b.line || a.module_specifier.localeCompare(b.module_specifier));
}

function resolveImportToRepoPath(moduleSpecifier: string, absoluteFile: string, rootDir: string): string | null {
  if (moduleSpecifier.startsWith(".")) {
    return toRepoPath(rootDir, resolve(dirname(absoluteFile), moduleSpecifier));
  }
  if (
    moduleSpecifier.startsWith("engine/")
    || moduleSpecifier.startsWith("sibi/")
    || moduleSpecifier.startsWith("apps/")
    || moduleSpecifier.startsWith("web/")
  ) {
    return moduleSpecifier;
  }
  return null;
}

function findViolations(
  rootDir: string,
  files: string[],
  rules: ForbiddenImportRule[],
): SharedCoreBoundaryViolation[] {
  const violations: SharedCoreBoundaryViolation[] = [];
  for (const absoluteFile of files) {
    for (const reference of extractImportReferences(rootDir, absoluteFile)) {
      for (const rule of rules) {
        if (rule.matches(reference, absoluteFile, rootDir)) {
          violations.push({
            ...reference,
            reason: rule.reason,
          });
        }
      }
    }
  }
  return violations;
}

function importBoundaryCase(
  rootDir: string,
  id: BoundaryCaseId,
  title: string,
  repoPath: string,
  rules: ForbiddenImportRule[],
): SharedCoreBoundaryCaseResult {
  const files = listTsFiles(rootDir, repoPath);
  const exists = existsSync(resolve(rootDir, repoPath));
  const violations = findViolations(rootDir, files, rules);
  return {
    id,
    title,
    status: !exists ? "skipped" : violations.length === 0 ? "passed" : "failed",
    checked_paths: [repoPath],
    files_checked: files.length,
    violations,
  };
}

function specGateCase(rootDir: string): SharedCoreBoundaryCaseResult {
  const specPath = resolve(rootDir, SHARED_CORE_SPEC_PATH);
  const content = existsSync(specPath) ? readFileSync(specPath, "utf8") : "";
  const gates = SPEC_GATE_CHECKS.map((check) => ({
    gate: check.gate,
    declared: check.patterns.every((pattern) => pattern.test(content)),
    evidence: check.patterns.map((pattern) => pattern.source),
  }));
  const missing = gates.filter((gate) => !gate.declared);

  return {
    id: "SCB-005-SPEC-GLOBAL-GATES",
    title: "shared core boundary spec declares all essential global gates.",
    status: missing.length === 0 ? "passed" : "failed",
    checked_paths: [SHARED_CORE_SPEC_PATH],
    files_checked: existsSync(specPath) ? 1 : 0,
    violations: missing.map((gate) => ({
      file: SHARED_CORE_SPEC_PATH,
      line: 1,
      module_specifier: gate.gate,
      import_text: gate.evidence.join(" && "),
      reason: "required shared core global gate is missing from the spec",
    })),
    gates,
  };
}

export function runSharedCoreBoundariesEval(
  options: SharedCoreBoundariesEvalOptions = {},
): SharedCoreBoundariesReport {
  const rootDir = resolve(options.rootDir ?? process.cwd());
  const cases: SharedCoreBoundaryCaseResult[] = [
    ...CORE_DIRS.map((entry) => importBoundaryCase(rootDir, entry.id, entry.title, entry.path, CORE_FORBIDDEN_IMPORTS)),
    importBoundaryCase(
      rootDir,
      "SCB-004-SIBI-WORKSPACE-IMPORTS",
      "sibi/src stays independent from WorkspaceIntent, PedagogoAI workspace adapters, and workspace UI.",
      "sibi/src",
      SIBI_FORBIDDEN_IMPORTS,
    ),
    specGateCase(rootDir),
  ];
  const generatedAt = options.generatedAt ?? SHARED_CORE_BOUNDARIES_EVAL_GENERATED_AT;
  const expectedGates = SPEC_GATE_CHECKS.length;
  const declaredGates = cases
    .flatMap((testCase) => testCase.gates ?? [])
    .filter((gate) => gate.declared).length;
  const aggregate = {
    total_cases: cases.length,
    passed_cases: cases.filter((testCase) => testCase.status === "passed").length,
    failed_cases: cases.filter((testCase) => testCase.status === "failed").length,
    skipped_cases: cases.filter((testCase) => testCase.status === "skipped").length,
    files_checked: cases.reduce((total, testCase) => total + testCase.files_checked, 0),
    violations: cases.reduce((total, testCase) => total + testCase.violations.length, 0),
    declared_gates: declaredGates,
    expected_gates: expectedGates,
  };
  const report: SharedCoreBoundariesReport = {
    report_id: options.reportId ?? `${SHARED_CORE_BOUNDARIES_VALIDATION_ID}-${generatedAt}`,
    generated_at: generatedAt,
    validation: SHARED_CORE_BOUNDARIES_VALIDATION_ID,
    eval_spec_path: EVAL_SPEC_PATH,
    no_llm: true,
    passed: aggregate.failed_cases === 0 && declaredGates === expectedGates,
    aggregate,
    cases,
  };

  const outputPath = resolveInsideRoot(rootDir, options.reportPath ?? DEFAULT_REPORT);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

function main(): void {
  const rootDir = getFlagValue(process.argv, "root") ?? process.cwd();
  const reportPath = getFlagValue(process.argv, "report");
  const report = runSharedCoreBoundariesEval({ rootDir, reportPath });
  process.stdout.write(JSON.stringify({
    passed: report.passed,
    aggregate: report.aggregate,
  }, null, 2));
  process.stdout.write("\n");
  if (!report.passed) {
    process.exitCode = 1;
  }
}

const currentModulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentModulePath) {
  main();
}

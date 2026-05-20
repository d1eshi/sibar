import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type EvalCatalogProblem = {
  path: string;
  message: string;
};

export type EvalSuiteEvaluationSummary = {
  validation: string;
  title: string;
  command: string;
  inputs: string[];
  reports: string[];
};

export type EvalSuiteArtifactSummary = {
  kind: string;
  path: string;
};

export type EvalSuiteSummary = {
  suiteId: string;
  title: string;
  purpose: string;
  manifestPath: string;
  protects: string[];
  artifacts: EvalSuiteArtifactSummary[];
  evaluations: EvalSuiteEvaluationSummary[];
};

export type EvalCatalogValidation = {
  valid: boolean;
  suites: EvalSuiteSummary[];
  problems: EvalCatalogProblem[];
};

type JsonRecord = Record<string, unknown>;

const DEFAULT_CATALOG_PATH = "evals/index.json";

function readJson(path: string): JsonRecord {
  return JSON.parse(readFileSync(path, "utf8")) as JsonRecord;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function stringArray(record: JsonRecord, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function recordArray(record: JsonRecord, key: string): JsonRecord[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord);
}

function pushProblem(problems: EvalCatalogProblem[], path: string, message: string): void {
  problems.push({ path, message });
}

function validatePathExists(problems: EvalCatalogProblem[], rootDir: string, path: string, field: string): void {
  if (isAbsolute(path)) {
    pushProblem(problems, path, `${field} must be repo-relative`);
    return;
  }
  const absolutePath = resolve(rootDir, path);
  const relativePath = relative(rootDir, absolutePath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    pushProblem(problems, path, `${field} must resolve inside the repo`);
    return;
  }
  if (!existsSync(absolutePath)) {
    pushProblem(problems, path, `${field} does not exist`);
  }
}

function validatePnpmCommand(
  problems: EvalCatalogProblem[],
  packageScripts: JsonRecord,
  command: string,
  context: string,
): void {
  const [runner, script] = command.split(/\s+/);
  if (runner !== "pnpm" || !script) {
    pushProblem(problems, context, `command must start with a pnpm script: ${command}`);
    return;
  }
  if (typeof packageScripts[script] !== "string") {
    pushProblem(problems, context, `package.json script is missing: ${script}`);
  }
}

export function validateEvalCatalog(options: { rootDir?: string; catalogPath?: string } = {}): EvalCatalogValidation {
  const rootDir = resolve(options.rootDir ?? process.cwd());
  const catalogPath = options.catalogPath ?? DEFAULT_CATALOG_PATH;
  const absoluteCatalogPath = resolve(rootDir, catalogPath);
  const problems: EvalCatalogProblem[] = [];
  const suites: EvalSuiteSummary[] = [];

  if (!existsSync(absoluteCatalogPath)) {
    return {
      valid: false,
      suites,
      problems: [{ path: catalogPath, message: "catalog does not exist" }],
    };
  }

  const catalog = readJson(absoluteCatalogPath);
  if (catalog.schema !== "SibarEvalCatalog") {
    pushProblem(problems, catalogPath, "schema must be SibarEvalCatalog");
  }
  if (catalog.version !== 1) {
    pushProblem(problems, catalogPath, "version must be 1");
  }

  const packageJson = readJson(resolve(rootDir, "package.json"));
  const packageScripts = isRecord(packageJson.scripts) ? packageJson.scripts : {};
  const suiteEntries = recordArray(catalog, "suites");

  if (suiteEntries.length === 0) {
    pushProblem(problems, catalogPath, "catalog must declare at least one suite");
  }

  for (const suiteEntry of suiteEntries) {
    const suiteId = stringValue(suiteEntry, "suite_id");
    const manifestPath = stringValue(suiteEntry, "manifest_path");
    if (!suiteId) {
      pushProblem(problems, catalogPath, "suite is missing suite_id");
    }
    if (!manifestPath) {
      pushProblem(problems, suiteId ?? catalogPath, "suite is missing manifest_path");
      continue;
    }
    if (!manifestPath.startsWith("evals/")) {
      pushProblem(problems, manifestPath, "suite manifest must live under evals/");
    }
    validatePathExists(problems, rootDir, manifestPath, "suite manifest_path");
    for (const docPath of stringArray(suiteEntry, "docs")) {
      validatePathExists(problems, rootDir, docPath, "suite docs path");
    }
    if (!existsSync(resolve(rootDir, manifestPath))) {
      continue;
    }

    const suite = readJson(resolve(rootDir, manifestPath));
    if (suite.schema !== "SibarEvalSuite") {
      pushProblem(problems, manifestPath, "schema must be SibarEvalSuite");
    }
    if (suite.version !== 1) {
      pushProblem(problems, manifestPath, "version must be 1");
    }
    if (suite.suite_id !== suiteId) {
      pushProblem(problems, manifestPath, `suite_id must match root catalog entry ${suiteId ?? ""}`);
    }

    const evaluations: EvalSuiteEvaluationSummary[] = [];
    for (const docPath of stringArray(suite, "docs")) {
      validatePathExists(problems, rootDir, docPath, "suite docs path");
    }
    const artifacts: EvalSuiteArtifactSummary[] = [];
    for (const artifact of recordArray(suite, "artifacts")) {
      const artifactKind = stringValue(artifact, "kind");
      const artifactPath = stringValue(artifact, "path");
      if (!artifactPath) {
        pushProblem(problems, manifestPath, "artifact is missing path");
        continue;
      }
      validatePathExists(problems, rootDir, artifactPath, "artifact path");
      if (artifactPath.startsWith("docs/")) {
        pushProblem(problems, artifactPath, "eval artifacts must not live under docs/");
      }
      artifacts.push({
        kind: artifactKind ?? "artifact",
        path: artifactPath,
      });
    }

    for (const evaluation of recordArray(suite, "evaluations")) {
      const validation = stringValue(evaluation, "validation");
      const title = stringValue(evaluation, "title");
      const command = stringValue(evaluation, "command");
      const implementation = stringValue(evaluation, "implementation");
      const context = `${manifestPath}:${validation ?? "evaluation"}`;

      if (!validation) {
        pushProblem(problems, manifestPath, "evaluation is missing validation");
      }
      if (!title) {
        pushProblem(problems, context, "evaluation is missing title");
      }
      if (!command) {
        pushProblem(problems, context, "evaluation is missing command");
      } else {
        validatePnpmCommand(problems, packageScripts, command, context);
      }
      if (!implementation) {
        pushProblem(problems, context, "evaluation is missing implementation");
      } else {
        validatePathExists(problems, rootDir, implementation, "evaluation implementation");
      }

      const inputs = stringArray(evaluation, "inputs");
      for (const inputPath of inputs) {
        validatePathExists(problems, rootDir, inputPath, "evaluation input");
        if (inputPath.startsWith("docs/")) {
          pushProblem(problems, inputPath, "eval inputs must not live under docs/");
        }
      }
      const reports = stringArray(evaluation, "reports");
      if (reports.length === 0) {
        pushProblem(problems, context, "evaluation must declare at least one report");
      }
      for (const reportPath of reports) {
        validatePathExists(problems, rootDir, reportPath, "evaluation report");
        if (reportPath.startsWith("docs/")) {
          pushProblem(problems, reportPath, "eval reports must not live under docs/");
        }
        if (existsSync(resolve(rootDir, reportPath))) {
          const report = readJson(resolve(rootDir, reportPath));
          const reportValidations = Array.isArray(report.validations)
            ? report.validations.filter((entry): entry is string => typeof entry === "string")
            : [];
          const reportMatchesValidation = report.validation === validation || reportValidations.includes(validation ?? "");
          if (validation && !reportMatchesValidation) {
            pushProblem(problems, reportPath, `report validation must be ${validation}`);
          }
        }
      }

      evaluations.push({
        validation: validation ?? "",
        title: title ?? "",
        command: command ?? "",
        inputs,
        reports,
      });
    }

    suites.push({
      suiteId: suiteId ?? "",
      title: stringValue(suite, "title") ?? stringValue(suiteEntry, "title") ?? "",
      purpose: stringValue(suite, "purpose") ?? stringValue(suiteEntry, "summary") ?? "",
      manifestPath,
      protects: stringArray(suite, "protects"),
      artifacts,
      evaluations,
    });
  }

  return {
    valid: problems.length === 0,
    suites,
    problems,
  };
}

function formatCatalog(validation: EvalCatalogValidation): string {
  const lines = ["Sibar eval catalog", ""];
  for (const suite of validation.suites) {
    lines.push(`${suite.suiteId}: ${suite.title}`);
    lines.push(`  manifest: ${suite.manifestPath}`);
    lines.push(`  purpose: ${suite.purpose}`);
    if (suite.protects.length > 0) {
      lines.push("  protects:");
      for (const item of suite.protects) {
        lines.push(`    - ${item}`);
      }
    }
    if (suite.artifacts.length > 0) {
      lines.push("  artifacts:");
      for (const artifact of suite.artifacts) {
        lines.push(`    - ${artifact.kind}: ${artifact.path}`);
      }
    }
    lines.push("  evals:");
    for (const evaluation of suite.evaluations) {
      lines.push(`    - ${evaluation.validation}: ${evaluation.command}`);
      for (const inputPath of evaluation.inputs) {
        lines.push(`      input: ${inputPath}`);
      }
      for (const reportPath of evaluation.reports) {
        lines.push(`      report: ${reportPath}`);
      }
    }
    lines.push("");
  }
  if (!validation.valid) {
    lines.push("Problems:");
    for (const problem of validation.problems) {
      lines.push(`  - ${problem.path}: ${problem.message}`);
    }
  }
  return lines.join("\n").trimEnd() + "\n";
}

function main(): void {
  const validation = validateEvalCatalog();
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(validation, null, 2)}\n`);
  } else {
    process.stdout.write(formatCatalog(validation));
  }
  if (!validation.valid) {
    process.exitCode = 1;
  }
}

const currentModulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentModulePath) {
  main();
}

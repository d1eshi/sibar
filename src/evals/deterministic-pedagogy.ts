import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

import { loadEvalDataset } from "./deterministic-pedagogy/dataset.ts";
import { runEvalCase } from "./deterministic-pedagogy/run-case.ts";
import type { DeterministicPedagogyEvalReport, RunOptions } from "./deterministic-pedagogy/types.ts";

export type { DeterministicPedagogyEvalReport };

const DEFAULT_INDEX = "docs/missions/sibi-v01-build-to-learn/evals/dataset/index.json";
const DEFAULT_REPORT = "docs/missions/sibi-v01-build-to-learn/evals/reports/VAL-EVAL-002-deterministic-pedagogy.json";
const DEFAULT_TEMP_PREFIX = ".sibi-eval-tmp-runtime-";

export function runDeterministicPedagogyEvals(options: RunOptions = {}): DeterministicPedagogyEvalReport {
  const previousRuntimeHome = process.env.SIBI_RUNTIME_HOME;
  const runtimeHome = options.runtimeHome ?? join(resolve("."), `${DEFAULT_TEMP_PREFIX}${randomUUID()}`);
  process.env.SIBI_RUNTIME_HOME = runtimeHome;

  try {
    const indexPath = resolve(options.indexPath ?? DEFAULT_INDEX);
    const { index, cases } = loadEvalDataset(indexPath);
    const results = cases.map(runEvalCase);
    const report: DeterministicPedagogyEvalReport = {
      report_id: `VAL-EVAL-002-${new Date().toISOString()}`,
      generated_at: new Date().toISOString(),
      dataset: { id: index.dataset_id, version: index.version, index_path: indexPath },
      validation: "VAL-EVAL-002",
      no_llm: true,
      aggregate: {
        total_cases: results.length,
        passed_cases: results.filter((result) => result.passed).length,
        failed_cases: results.filter((result) => !result.passed).length,
        total_mismatches: results.reduce((sum, result) => sum + result.mismatches.length, 0),
        gap_cases: results.filter((result) => result.observations.learning_gap).length,
        challenge_cases: results.filter((result) => result.observations.challenge).length,
        readiness_cases_with_evidence: results.filter((result) =>
          (result.observations.readiness?.evidence_ids.length ?? 0) > 0
        ).length,
      },
      cases: results,
    };

    const outputPath = resolve(options.reportPath ?? DEFAULT_REPORT);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    return report;
  } finally {
    rmSync(runtimeHome, { recursive: true, force: true });
    if (previousRuntimeHome === undefined) delete process.env.SIBI_RUNTIME_HOME;
    else process.env.SIBI_RUNTIME_HOME = previousRuntimeHome;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const indexArg = process.argv.find((arg) => arg.startsWith("--index="))?.slice("--index=".length);
  const reportArg = process.argv.find((arg) => arg.startsWith("--report="))?.slice("--report=".length);
  const driftMode = process.argv.includes("--allow-drift");
  const report = runDeterministicPedagogyEvals({ indexPath: indexArg, reportPath: reportArg });
  process.stdout.write(JSON.stringify(report.aggregate, null, 2));
  process.stdout.write("\n");
  if (!existsSync(resolve(reportArg ?? DEFAULT_REPORT)) || (!driftMode && report.aggregate.failed_cases > 0)) {
    process.exitCode = 1;
  }
}

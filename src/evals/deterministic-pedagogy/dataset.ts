import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { EvalCase, EvalDatasetIndex } from "./types.ts";

function readJSON<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function loadEvalDataset(indexPath: string): { index: EvalDatasetIndex; cases: EvalCase[] } {
  const resolvedIndex = resolve(indexPath);
  const index = readJSON<EvalDatasetIndex>(resolvedIndex);
  const baseDir = dirname(resolvedIndex);
  return {
    index,
    cases: index.cases.map((entry) => readJSON<EvalCase>(resolve(baseDir, entry.file))),
  };
}

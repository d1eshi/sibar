import type {
  CodeEvidence,
  EvidenceRef,
  RelationEvidenceCandidate,
  RelationEvidenceCategory,
  RelationEvidenceDowngrade,
  RelationGap,
  RelationGapReason,
  ReviewQueueItem,
} from "./types";

type ExtractCodeEvidenceArgs = {
  selectedFile: string;
  fileFixtures: Record<string, string>;
  evidenceRefs: EvidenceRef[];
  reviewQueue: ReviewQueueItem[];
};

const evidenceKindRank: Record<RelationEvidenceCandidate["evidenceKind"], number> = {
  observed: 3,
  inferred: 2,
  unverified: 1,
  conflict: 0,
};

const relationKindPriority: Array<RelationEvidenceCategory> = ["runtime-contract", "caller", "test", "doc"];

const symbolRegex =
  /^\s*(?:export\s+(?:async\s+)?)?(?:const|let|var|class|interface|type|enum|function)\s+([A-Za-z_$][\w$]*)/;

function relationKindFromPath(path: string): RelationEvidenceCategory {
  if (isTestPath(path)) return "test";
  if (isDocPath(path)) return "doc";
  return "caller";
}

function isTestPath(filePath: string): boolean {
  return /\.test\./.test(filePath) || /\.spec\./.test(filePath) || /\/__tests?\//.test(filePath);
}

function isDocPath(filePath: string): boolean {
  return /^docs?\//.test(filePath) || /\.md$/.test(filePath);
}

function normalizePathForEvidence(location: string): string {
  const separator = location.lastIndexOf(":");
  if (separator <= 0) return location.trim();
  return location.slice(0, separator).trim();
}

function makeRelationGapDowngrade(
  fromKind: RelationEvidenceCandidate["evidenceKind"],
  toKind: RelationEvidenceCandidate["evidenceKind"],
  reason: string,
): RelationEvidenceDowngrade {
  return {
    from: fromKind,
    to: toKind,
    reason,
  };
}

function maxEvidenceKind(values: RelationEvidenceCandidate["evidenceKind"][]): RelationEvidenceCandidate["evidenceKind"] {
  let selectedKind: RelationEvidenceCandidate["evidenceKind"] = "unverified";
  let selectedScore = -1;

  for (const value of values) {
    const score = evidenceKindRank[value];
    if (score > selectedScore) {
      selectedScore = score;
      selectedKind = value;
    }
  }

  return selectedKind;
}

function countByEvidenceKind(
  values: RelationEvidenceCandidate["evidenceKind"][],
): Record<RelationEvidenceCandidate["evidenceKind"], number> {
  return {
    observed: values.filter((kind) => kind === "observed").length,
    inferred: values.filter((kind) => kind === "inferred").length,
    unverified: values.filter((kind) => kind === "unverified").length,
    conflict: values.filter((kind) => kind === "conflict").length,
  };
}

function nearestCandidatesFromFixtures(
  selectedFile: string,
  fileFixtures: Record<string, string>,
): RelationEvidenceCandidate[] {
  const fileDirectory = selectedFile.includes("/") ? selectedFile.replace(/\/[^/]*$/, "") : "";
  const selectedBase = selectedFile.replace(/^.*\//, "").replace(/\.[^.]+$/, "");
  const basePrefixPattern = new RegExp(`(^|/)${escapeForRegex(selectedBase)}(\\.|-)`);

  const nearby: RelationEvidenceCandidate[] = [];
  for (const [path] of Object.entries(fileFixtures)) {
    if (path === selectedFile) continue;
    if (fileDirectory !== "" && path.startsWith(`${fileDirectory}/`) === false) continue;
    if (!basePrefixPattern.test(path) && !path.includes(selectedBase)) continue;
    if (isTestPath(path)) {
      nearby.push({
        id: `fixture-nearby-test-${path}`,
        kind: "test",
        path,
        label: "Nearby test from fixture",
        evidenceKind: "unverified",
        source: "fixture",
        sourceIds: [path],
      });
      continue;
    }

    if (isDocPath(path)) {
      nearby.push({
        id: `fixture-nearby-doc-${path}`,
        kind: "doc",
        path,
        label: "Nearby doc from fixture",
        evidenceKind: "unverified",
        source: "fixture",
        sourceIds: [path],
      });
      continue;
    }
  }

  return nearby;
}

function evidenceFromQueue(
  selectedFile: string,
  reviewQueue: ReviewQueueItem[],
): RelationEvidenceCandidate[] {
  return reviewQueue
    .filter((item) => item.filePath !== selectedFile)
    .map((item) => ({
      id: `queue-${item.id}`,
      kind: relationKindFromPath(item.filePath),
      path: item.filePath,
      label: item.orderReason ?? item.boundaryTitle,
      evidenceKind: item.touched ? "observed" : "inferred",
      source: "queue" as const,
      sourceIds: [item.id],
    }));
}

function evidenceFromRefs(selectedFile: string, evidenceRefs: EvidenceRef[]): RelationEvidenceCandidate[] {
  return evidenceRefs
    .map((ref) => {
      const path = normalizePathForEvidence(ref.location);
      if (!path || path === selectedFile) return null;
      return {
        id: `evidence-${ref.id}`,
        kind: relationKindFromPath(path),
        path,
        label: ref.title,
        evidenceKind: ref.confidence,
        source: "evidence" as const,
        sourceIds: [ref.id],
      };
    })
    .filter((entry): entry is RelationEvidenceCandidate => entry != null);
}

function evidenceForSelectedRuntime(selectedFile: string, evidenceRefs: EvidenceRef[]): RelationEvidenceCandidate[] {
  return evidenceRefs
    .map((ref) => {
      const path = normalizePathForEvidence(ref.location);
      if (path !== selectedFile) return null;
      return {
        id: `runtime-${ref.id}`,
        kind: "runtime-contract",
        path,
        label: ref.title,
        evidenceKind: ref.confidence,
        source: "evidence" as const,
        sourceIds: [ref.id],
      };
    })
    .filter((entry): entry is RelationEvidenceCandidate => entry != null);
}

function extractByCategory(
  lines: string[],
  category: RelationEvidenceCandidate["kind"],
): RelationEvidenceCandidate["evidenceKind"] {
  if (category === "caller" && lines.some((line) => /\bimport\b/.test(line))) {
    return "observed";
  }
  if (category === "test" && lines.some((line) => /\btest\(/.test(line))) {
    return "inferred";
  }
  if (category === "doc" && lines.some((line) => /\breadme\b/i.test(line))) {
    return "conflict";
  }
  if (category === "runtime-contract" && lines.some((line) => /runtime|contract|boundary|session|fetch|api/i.test(line))) {
    return "inferred";
  }
  return "unverified";
}

function getTextualLines(contents: string): Array<{ id: string; line: number; text: string; kind: "import" | "export" | "symbol" }> {
  return contents
    .split("\n")
    .flatMap((rawLine, index) => {
      const line = index + 1;
      const text = rawLine.trim();
      const entries: Array<{ id: string; line: number; text: string; kind: "import" | "export" | "symbol" }> = [];

      if (text.startsWith("import ")) {
        entries.push({ id: `import-${line}`, line, text: rawLine, kind: "import" });
      }

      if (/^\s*export\s+/.test(rawLine)) {
        entries.push({ id: `export-${line}`, line, text: rawLine, kind: "export" });
      }

      if (symbolRegex.test(rawLine)) {
        entries.push({ id: `symbol-${line}`, line, text: rawLine, kind: "symbol" });
      }

      return entries;
    });
}

function selectByKind(
  candidates: RelationEvidenceCandidate[],
): Record<RelationEvidenceCategory, RelationEvidenceCandidate[]> {
  const byKind: Record<RelationEvidenceCategory, RelationEvidenceCandidate[]> = {
    "runtime-contract": [],
    caller: [],
    test: [],
    doc: [],
  };
  for (const candidate of candidates) {
    byKind[candidate.kind].push(candidate);
  }
  return byKind;
}

function mergeCandidatesByPath(
  candidates: RelationEvidenceCandidate[],
): RelationEvidenceCandidate[] {
  const byKey = new Map<string, RelationEvidenceCandidate>();

  for (const candidate of candidates) {
    const key = `${candidate.kind}:${candidate.path}`;
    const previous = byKey.get(key);
    if (!previous) {
      byKey.set(key, candidate);
      continue;
    }
    if (previous.evidenceKind === "conflict" || candidate.evidenceKind === "conflict") {
      byKey.set(key, {
        ...(candidate.evidenceKind === "conflict" ? candidate : previous),
        evidenceKind: "conflict",
        sourceIds: [...new Set([...previous.sourceIds, ...candidate.sourceIds])],
      });
      continue;
    }
    if (evidenceKindRank[candidate.evidenceKind] > evidenceKindRank[previous.evidenceKind]) {
      byKey.set(key, candidate);
    }
  }

  return Array.from(byKey.values()).sort((a, b) =>
    a.path.localeCompare(b.path) || relationKindPriority.indexOf(a.kind) - relationKindPriority.indexOf(b.kind),
  );
}

function gapReasonSlug(gapType: RelationGapReason): string {
  return gapType.replace(/\s+/g, "-");
}

function fallbackGapReason(gapType: RelationGapReason, selectedFile: string): string {
  switch (gapType) {
    case "missing caller":
      return `Expected caller relation is not confirmed for ${selectedFile}.`;
    case "missing test path":
      return `Expected test path relation is not confirmed for ${selectedFile}.`;
    case "missing runtime contract":
      return `Expected runtime contract relation is not confirmed for ${selectedFile}.`;
  }
}

function makeFallbackGap(
  selectedFile: string,
  gapType: RelationGapReason,
  candidates: RelationEvidenceCandidate[],
): RelationGap {
  const topEvidenceKind = maxEvidenceKind(candidates.map((candidate) => candidate.evidenceKind));
  const sourceIds =
    candidates.length > 0
      ? [...new Set(candidates.flatMap((candidate) => candidate.sourceIds))]
      : [selectedFile, "fallback:might-require-evidence-trace"];
  const fallbackSource: RelationEvidenceCandidate["evidenceKind"] =
    candidates.length > 0 && candidates.some((candidate) => candidate.evidenceKind === "observed")
      ? "observed"
      : topEvidenceKind;

  const downgrade =
    candidates.length > 0 && fallbackSource !== "observed"
      ? makeRelationGapDowngrade(
          fallbackSource,
          "unverified",
          `No direct ${gapType} evidence is observed for ${selectedFile}; downgrading to question-grade signal.`,
        )
      : undefined;

  return {
    id: `${selectedFile}:gap:${gapReasonSlug(gapType)}`,
    type: gapType,
    sourceIds: sourceIds,
    evidenceKind: candidates.length > 0 ? "unverified" : "unverified",
    confidence: candidates.length > 0 ? "unverified" : "unverified",
    downgrade,
    candidateReason: fallbackGapReason(gapType, selectedFile),
  };
}

function hasSupportForKind(
  byKind: Record<RelationEvidenceCategory, RelationEvidenceCandidate[]>,
  kind: RelationEvidenceCategory,
): boolean {
  return byKind[kind].length > 0;
}

function isTestFile(filePath: string): boolean {
  return isTestPath(filePath);
}

function buildEvidenceKindCounts(
  textEntries: Array<{ id: string; line: number; text: string; kind: "import" | "export" | "symbol" }>,
  candidates: RelationEvidenceCandidate[],
): Record<RelationEvidenceCandidate["evidenceKind"], number> {
  const textEvidence = textEntries.map(() => "observed" as const);

  return countByEvidenceKind([...textEvidence, ...candidates.map((candidate) => candidate.evidenceKind)]);
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractCodeEvidence({
  selectedFile,
  fileFixtures,
  evidenceRefs,
  reviewQueue,
}: ExtractCodeEvidenceArgs): CodeEvidence {
  const source = fileFixtures[selectedFile] ?? "";
  const lineEntries = getTextualLines(source);

  const imports = lineEntries
    .filter((entry) => entry.kind === "import")
    .map((entry) => ({
      id: `line-${entry.id}`,
      kind: entry.kind,
      line: entry.line,
      text: entry.text,
      evidenceKind: "observed",
    }));
  const exports = lineEntries
    .filter((entry) => entry.kind === "export")
    .map((entry) => ({
      id: `line-${entry.id}`,
      kind: entry.kind,
      line: entry.line,
      text: entry.text,
      evidenceKind: "observed",
    }));
  const symbols = lineEntries
    .filter((entry) => entry.kind === "symbol")
    .map((entry) => ({
      id: `line-${entry.id}`,
      kind: entry.kind,
      line: entry.line,
      text: entry.text,
      evidenceKind: "observed",
    }));

  const queueCandidates = evidenceFromQueue(selectedFile, reviewQueue);
  const evidenceCandidates = evidenceFromRefs(selectedFile, evidenceRefs);
  const nearbyCandidates = nearestCandidatesFromFixtures(selectedFile, fileFixtures);
  const runtimeCandidates = evidenceForSelectedRuntime(selectedFile, evidenceRefs);

  const mergedCandidates = mergeCandidatesByPath([
    ...queueCandidates,
    ...evidenceCandidates,
    ...nearbyCandidates,
    ...runtimeCandidates,
  ]);

  // byKind is computed before missing-caller fallback injection because
  // all later logic for gaps only depends on the pre-gap candidate set.
  const byKind = selectByKind(mergedCandidates);

  const gaps: RelationGap[] = [];

  if (!isTestFile(selectedFile) && hasSupportForKind(byKind, "test") === false) {
    gaps.push(makeFallbackGap(selectedFile, "missing test path", mergedCandidates));
  }

  const expectsCaller =
    imports.length > 0 || exports.length > 0 || symbols.length > 0 || byKind["runtime-contract"].length > 0;
  if (expectsCaller && !hasSupportForKind(byKind, "caller")) {
    const missingCallerGap = makeFallbackGap(selectedFile, "missing caller", mergedCandidates);
    gaps.push(missingCallerGap);

    mergedCandidates.push({
      id: `${selectedFile}:candidate:${missingCallerGap.id}:missing-caller`,
      kind: "caller",
      path: "missing-caller",
      label: "Missing caller relation was not observed in direct evidence.",
      evidenceKind: "unverified",
      source: "fallback",
      sourceIds: [missingCallerGap.id, ...missingCallerGap.sourceIds],
      downgrade: missingCallerGap.downgrade,
    });
  }

  const runtimeSupportCandidates = byKind["runtime-contract"].length > 0;
  const shouldCheckRuntimeContract = !isTestFile(selectedFile);
  if (shouldCheckRuntimeContract && (imports.length > 0 || exports.length > 0 || symbols.length > 0) && !runtimeSupportCandidates) {
    const runtimeLines = [...imports, ...exports, ...symbols].map((entry) => entry.text.toLowerCase());
    const runtimeEvidenceKind = extractByCategory(runtimeLines, "runtime-contract");
    const missingRuntime: RelationGap = {
      id: `${selectedFile}:gap:missing-runtime-contract`,
      type: "missing runtime contract",
      sourceIds:
        runtimeCandidates.length > 0
          ? runtimeCandidates.flatMap((candidate) => candidate.sourceIds)
          : [selectedFile, "fallback:might-require-evidence-trace"],
      evidenceKind: "unverified",
      confidence: "unverified",
      candidateReason: "No runtime contract evidence is observed for selected code.",
      downgrade:
        runtimeEvidenceKind !== "observed"
          ? makeRelationGapDowngrade(runtimeEvidenceKind, "unverified", "Runtime contract relation is inferred from local signals; downgraded to question.")
          : undefined,
    };
    gaps.push(missingRuntime);
  }

  const relationCandidates = mergeCandidatesByPath(mergedCandidates);

  return {
    selectedFile,
    imports,
    exports,
    symbols,
    relationCandidates,
    relationGaps: gaps,
    evidenceKindCounts: buildEvidenceKindCounts(lineEntries, relationCandidates),
  };
}

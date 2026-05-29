import type {
  EvidencePackLike,
  FocusCandidate,
} from "../focus-question/index.ts";
import type { LargeFileHeuristicResult } from "./contracts.ts";

function normalizePath(path: string): string {
  return String(path ?? "")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
}

function splitLines(value: string): string[] {
  if (value.length === 0) return [];
  return value.replace(/\r/g, "").split("\n");
}

function countImportDomainSpread(lines: string[]): number {
  const domains = new Set<string>();
  for (const line of lines) {
    const importMatch = /from\s+["']([^"']+)["']/.exec(line);
    if (importMatch == null) continue;
    const source = importMatch[1] ?? "";
    if (source.startsWith(".") || source.startsWith("/")) continue;
    const domain = source.split("/")[0] ?? "";
    if (domain.length > 0) domains.add(domain);
  }
  return domains.size;
}

function countMatches(value: string, pattern: RegExp): number {
  const match = value.match(pattern);
  return match == null ? 0 : match.length;
}

export type AnalyzeLargeFileHeuristicsInput = {
  evidencePack: EvidencePackLike;
  focusCandidates: FocusCandidate[];
  fileContents: Record<string, string>;
};

export function analyzeLargeFileHeuristics(input: AnalyzeLargeFileHeuristicsInput): LargeFileHeuristicResult {
  const selectedFilePath = normalizePath(input.evidencePack.selectedFilePath);
  const fileText = input.fileContents[selectedFilePath] ?? "";
  const fileLines = splitLines(fileText);
  const selectedCandidates = input.focusCandidates.filter(
    (candidate) => normalizePath(candidate.filePath) === selectedFilePath,
  );

  const selectedExcerptCount = input.evidencePack.excerpts.filter(
    (excerpt) => normalizePath(excerpt.filePath) === selectedFilePath,
  ).length;
  const selectedSymbolCount = input.evidencePack.symbols.filter(
    (symbol) => normalizePath(symbol.filePath) === selectedFilePath,
  ).length;
  const evidenceCount = selectedExcerptCount + selectedSymbolCount;

  const candidateKinds = new Set<string>();
  let hookSignalCount = 0;
  let effectSignalCount = 0;
  let apiSignalCount = 0;

  for (const candidate of selectedCandidates) {
    candidateKinds.add(candidate.kind);
    const text = `${candidate.excerpt} ${candidate.symbol ?? ""} ${candidate.title}`.toLowerCase();
    hookSignalCount += countMatches(text, /\b(?:useState|useReducer|useRef|useContext|useMemo|useCallback|useEffect|useLayoutEffect|useDeferredValue)\b/g);
    effectSignalCount += countMatches(text, /\b(?:useEffect|cleanup|effect|side effect|cleanup effect)\b/g);
    apiSignalCount += countMatches(
      text,
      /\b(?:fetch|axios|http\.|client\.|request\(|queryClient|mutation|endpoint|api)\b/g,
    );
  }

  const importDomainSpread = countImportDomainSpread(fileLines);
  const lineCount = fileLines.length;
  const mixedKindCount = candidateKinds.size;

  const isLargeFile = lineCount > 400;
  const compositeScore = (
    (selectedCandidates.length >= 12 ? 2 : 0)
    + (evidenceCount >= 18 ? 2 : 0)
    + (hookSignalCount >= 4 ? 1 : 0)
    + (effectSignalCount >= 4 ? 1 : 0)
    + (apiSignalCount >= 4 ? 1 : 0)
    + (importDomainSpread >= 2 ? 1 : 0)
    + (mixedKindCount >= 4 ? 1 : 0)
  );
  const isComposite = isLargeFile || compositeScore >= 3;

  const maxQuestions = isLargeFile || isComposite ? 10 : 6;

  return {
    selectedFilePath,
    lineCount,
    isLargeFile,
    isComposite,
    focusCandidateCount: selectedCandidates.length,
    evidenceCount,
    hookSignalCount,
    effectSignalCount,
    apiSignalCount,
    importDomainSpread,
    mixedKindCount,
    maxQuestions,
  };
}

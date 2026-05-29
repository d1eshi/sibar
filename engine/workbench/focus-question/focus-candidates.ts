import type {
  BuildFocusCandidatesInput,
  EvidenceCitationLike,
  EvidenceSymbolLike,
  FocusCandidate,
  FocusCandidateDiagnostic,
  FocusCandidateKind,
  FocusCandidateResult,
  FocusCandidateSource,
} from "./contracts.ts";
import { FOCUS_CANDIDATES_SCHEMA } from "./contracts.ts";

const PREFERRED_MAX_FOCUS_LINES = 20;
const HARD_MAX_FOCUS_LINES = 80;

function normalizePath(path: string): string {
  return String(path ?? "").replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
}

function splitLines(contents: string): string[] {
  return contents.length === 0 ? [] : contents.split("\n");
}

export function stableFocusQuestionHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function lineSpan(startLine: number, endLine: number): number {
  return Math.max(0, endLine - startLine + 1);
}

function candidateLineSpan(candidate: FocusCandidate): number {
  return lineSpan(candidate.startLine, candidate.endLine);
}

function rangeLabel(startLine: number, endLine: number): string {
  return startLine === endLine ? `line ${startLine}` : `lines ${startLine}-${endLine}`;
}

function basename(path: string): string {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf("/");
  return index === -1 ? normalized : normalized.slice(index + 1);
}

function excerptFromContents(fileContents: Record<string, string>, filePath: string, startLine: number, endLine: number): string {
  const lines = splitLines(fileContents[filePath] ?? "");
  if (lines.length === 0) return "";
  return lines.slice(startLine - 1, endLine).join("\n");
}

function textTitle(text: string, fallback: string): string {
  const first = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return (first ?? fallback).slice(0, 96);
}

function symbolsInside(symbols: EvidenceSymbolLike[], filePath: string, startLine: number, endLine: number): EvidenceSymbolLike[] {
  return symbols.filter(
    (symbol) =>
      normalizePath(symbol.filePath) === filePath &&
      symbol.startLine >= startLine &&
      symbol.endLine <= endLine,
  );
}

function inferKind(filePath: string, text: string, symbols: EvidenceSymbolLike[]): FocusCandidateKind {
  const lowerPath = filePath.toLowerCase();
  const lowerText = text.toLowerCase();
  const primarySymbol = symbols[0];

  if (/(\btest\b|tests\/|__tests__|\.test\.|\.spec\.)/.test(lowerPath)) return "test";
  if (/^(docs\/|readme)|\.mdx?$/.test(lowerPath)) return "doc";
  if (/^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|interface|type)\b/m.test(text) && primarySymbol != null) {
    if (
      /\.(tsx|jsx)$/.test(lowerPath) &&
      primarySymbol.kind === "function" &&
      /^[A-Z]/.test(primarySymbol.name)
    ) {
      return "component";
    }
    return "function";
  }
  if (/\buse(?:state|reducer|ref|memo|callback|effect|context|transition|deferredvalue|syncexternalstore)\s*\(/i.test(text)) {
    return "hook_state";
  }
  if (/\b(fetch\w*|axios|request\w*|http\w*|client\w*|get|post|put|delete|patch)\s*\(/i.test(text)) return "api_call";
  if (/\b(route|router|handler|endpoint)\b/i.test(text)) return "route_handler";
  if (primarySymbol != null) {
    return "function";
  }
  if (/^\s*export\s+/m.test(text) || lowerText.includes(" export ")) return "export";
  return "unknown";
}

function sourceForEvidenceId(evidenceId: string): FocusCandidateSource {
  return evidenceId.includes(":repo-search:") ? "repo_search" : "cheap_scanner";
}

function candidateId(input: {
  filePath: string;
  startLine: number;
  endLine: number;
  kind: FocusCandidateKind;
  symbol?: string;
  excerpt: string;
}): string {
  const hash = stableFocusQuestionHash([
    input.filePath,
    input.startLine,
    input.endLine,
    input.kind,
    input.symbol ?? "",
    input.excerpt,
  ].join("|"));
  return `focus:${input.filePath}:${input.startLine}-${input.endLine}:${input.kind}:${hash}`;
}

function buildCandidate(input: {
  symbols: EvidenceSymbolLike[];
  fileContents: Record<string, string>;
  citation: EvidenceCitationLike;
  text: string;
  preferredEvidenceId: string;
  diagnostics: FocusCandidateDiagnostic[];
  defaultFocus: boolean;
}): FocusCandidate | null {
  const filePath = normalizePath(input.citation.filePath);
  const startLine = input.citation.startLine;
  const endLine = input.citation.endLine;
  const text = input.text.trimEnd() !== "" ? input.text : excerptFromContents(input.fileContents, filePath, startLine, endLine);
  const span = lineSpan(startLine, endLine);

  if (text.trim() === "") {
    input.diagnostics.push({
      code: "focus_candidate_missing_text",
      severity: "warning",
      message: `Focus candidate ${filePath}:${startLine}-${endLine} has no visible text.`,
      filePath,
      startLine,
      endLine,
    });
    return null;
  }

  if (span > HARD_MAX_FOCUS_LINES) return null;
  if (span > PREFERRED_MAX_FOCUS_LINES) {
    input.diagnostics.push({
      code: "focus_candidate_too_large",
      severity: "warning",
      message: `Focus candidate ${filePath}:${startLine}-${endLine} is ${span} lines and should be split before question generation.`,
      filePath,
      startLine,
      endLine,
    });
  }

  const symbols = symbolsInside(input.symbols, filePath, startLine, endLine);
  const symbol = input.citation.symbol ?? symbols[0]?.name;
  const kind = inferKind(filePath, text, symbols);
  const id = candidateId({ filePath, startLine, endLine, kind, symbol, excerpt: text });
  const evidenceIds = [input.preferredEvidenceId, ...symbols.map((entry) => entry.evidenceId)]
    .filter((value, index, values) => value !== "" && values.indexOf(value) === index);
  const signals = [
    `line_span:${span}`,
    `evidence:${input.preferredEvidenceId}`,
    ...(symbol == null ? [] : [`symbol:${symbol}`]),
    ...(kind === "hook_state" ? ["react_hook"] : []),
  ];

  return {
    schema: "sibi-ui-focus-candidate.v1",
    id,
    filePath,
    startLine,
    endLine,
    kind,
    symbol,
    title: symbol == null ? textTitle(text, `${basename(filePath)} ${rangeLabel(startLine, endLine)}`) : symbol,
    excerpt: text,
    deterministicSignals: signals,
    evidenceIds,
    citations: [
      {
        evidenceId: input.preferredEvidenceId,
        filePath,
        startLine,
        endLine,
        symbol,
      },
    ],
    confidence: "observed",
    source: sourceForEvidenceId(input.preferredEvidenceId),
    ui: {
      priority: span <= PREFERRED_MAX_FOCUS_LINES ? 1 : 3,
      displayRangeLabel: rangeLabel(startLine, endLine),
      reason: `Observed ${kind} focus from bounded evidence.`,
      isDefaultFocus: input.defaultFocus,
    },
  };
}

function sortCandidates(left: FocusCandidate, right: FocusCandidate): number {
  return (
    left.ui.priority - right.ui.priority ||
    left.filePath.localeCompare(right.filePath) ||
    left.startLine - right.startLine ||
    left.endLine - right.endLine ||
    left.id.localeCompare(right.id)
  );
}

function structuralRank(candidate: FocusCandidate): number {
  if (candidate.kind === "component") return 0;
  if (candidate.kind === "function") return 1;
  if (candidate.kind === "route_handler") return 2;
  if (candidate.kind === "hook_state") return 3;
  return 4;
}

function richerCandidateForHeaderAnchor(
  candidates: FocusCandidate[],
  exactCandidate: FocusCandidate,
): FocusCandidate | null {
  if (candidateLineSpan(exactCandidate) > 3) return null;

  const declarationLine = /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|interface|type)\b/.test(
    exactCandidate.excerpt,
  );
  if (!declarationLine && exactCandidate.kind !== "export") return null;

  const richer = candidates
    .filter(
      (candidate) =>
        candidate.id !== exactCandidate.id &&
        candidate.filePath === exactCandidate.filePath &&
        candidate.startLine >= exactCandidate.startLine &&
        candidate.startLine <= exactCandidate.endLine &&
        candidate.endLine > exactCandidate.endLine &&
        candidate.symbol != null &&
        structuralRank(candidate) < 4,
    )
    .sort(
      (left, right) =>
        structuralRank(left) - structuralRank(right) ||
        candidateLineSpan(right) - candidateLineSpan(left) ||
        left.id.localeCompare(right.id),
    );

  return richer[0] ?? null;
}

export function buildFocusCandidates({
  evidencePack,
  fileContents,
  maxCandidates = 32,
}: BuildFocusCandidatesInput): FocusCandidateResult {
  const candidates: FocusCandidate[] = [];
  const diagnostics: FocusCandidateDiagnostic[] = [];
  const selectedFilePath = normalizePath(evidencePack.selectedFilePath);
  const symbols = evidencePack.symbols ?? [];
  const seen = new Set<string>();
  const addCandidate = (candidate: FocusCandidate | null): void => {
    if (candidate == null) return;
    if (seen.has(candidate.id)) {
      diagnostics.push({
        code: "focus_candidate_duplicate",
        severity: "info",
        message: `Duplicate focus candidate ${candidate.id} was ignored.`,
        filePath: candidate.filePath,
        startLine: candidate.startLine,
        endLine: candidate.endLine,
      });
      return;
    }
    seen.add(candidate.id);
    candidates.push(candidate);
  };

  for (const [index, excerpt] of evidencePack.excerpts.entries()) {
    if (normalizePath(excerpt.filePath) !== selectedFilePath) continue;
    addCandidate(
      buildCandidate({
        symbols,
        fileContents,
        citation: excerpt,
        text: excerpt.text,
        preferredEvidenceId: excerpt.evidenceId,
        diagnostics,
        defaultFocus: index === 0,
      }),
    );
  }

  for (const symbol of symbols) {
    if (normalizePath(symbol.filePath) !== selectedFilePath) continue;
    addCandidate(
      buildCandidate({
        symbols,
        fileContents,
        citation: symbol,
        text: symbol.text,
        preferredEvidenceId: symbol.evidenceId,
        diagnostics,
        defaultFocus: false,
      }),
    );
  }

  return {
    schema: FOCUS_CANDIDATES_SCHEMA,
    selectedFilePath,
    candidates: candidates.sort(sortCandidates).slice(0, maxCandidates),
    diagnostics,
  };
}

export function findFocusCandidateForCitation(
  candidates: FocusCandidate[],
  citation: EvidenceCitationLike,
): FocusCandidate | null {
  const filePath = normalizePath(citation.filePath);
  const exactCandidate =
    candidates.find((candidate) =>
      candidate.citations.some(
        (candidateCitation) =>
          candidateCitation.evidenceId === citation.evidenceId &&
          normalizePath(candidateCitation.filePath) === filePath &&
          candidateCitation.startLine === citation.startLine &&
          candidateCitation.endLine === citation.endLine,
      ),
    ) ?? null;
  const richerHeaderCandidate = exactCandidate == null ? null : richerCandidateForHeaderAnchor(candidates, exactCandidate);

  return (
    richerHeaderCandidate ??
    exactCandidate ??
    candidates.find(
      (candidate) =>
        candidate.filePath === filePath &&
        candidate.startLine <= citation.startLine &&
        candidate.endLine >= citation.endLine,
    ) ??
    null
  );
}

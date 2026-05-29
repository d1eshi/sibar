import type { RepoInventory } from "./repoInventoryTypes.ts";
import type { EvidenceConfidence } from "./types.ts";

export const EVIDENCE_PACK_SCHEMA = "sibi-evidence-pack.v1";
export const LANGUAGE_PROPOSAL_SCHEMA = "sibi-language-proposal.v1";

export type EvidenceCitation = {
  evidenceId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  symbol?: string;
};

export type EvidenceExcerpt = EvidenceCitation & {
  text: string;
};

export type EvidenceTextSignal = EvidenceCitation & {
  text: string;
  confidence: EvidenceConfidence;
};

export type EvidenceSymbol = EvidenceCitation & {
  name: string;
  kind: "function" | "class" | "interface" | "type" | "const" | "let" | "var" | "enum";
  text: string;
  confidence: EvidenceConfidence;
};

export type EvidenceFileCandidate = {
  id: string;
  path: string;
  label: string;
  evidenceIds: string[];
  citations: EvidenceCitation[];
  confidence: EvidenceConfidence;
};

export type ProjectSignal = {
  id: string;
  label: string;
  value: string;
  evidenceIds: string[];
  citations: EvidenceCitation[];
  confidence: EvidenceConfidence;
};

export type RepoSearchEvidenceInput = {
  query: string;
  results: Array<{
    path: string;
    line: number;
    excerpt: string;
    query?: string;
  }>;
};

export type EvidencePack = {
  schema: typeof EVIDENCE_PACK_SCHEMA;
  selectedFilePath: string;
  userIntent: string;
  excerpts: EvidenceExcerpt[];
  imports: EvidenceTextSignal[];
  exports: EvidenceTextSignal[];
  symbols: EvidenceSymbol[];
  nearbyTests: EvidenceFileCandidate[];
  nearbyDocs: EvidenceFileCandidate[];
  callerCandidates: EvidenceFileCandidate[];
  searchResults: EvidenceFileCandidate[];
  projectSignals: ProjectSignal[];
  evidenceIds: string[];
};

export type LanguageProposalClaimKind =
  | "boundary_candidate"
  | "review_queue_copy"
  | "attempt_prompt"
  | "gap_label"
  | "smallest_repair"
  | "question"
  | "readiness";

export type LanguageProposalClaim = {
  id: string;
  kind: LanguageProposalClaimKind;
  text: string;
  confidence: EvidenceConfidence;
  citations: EvidenceCitation[];
};

export type LanguageProposal = {
  schema: typeof LANGUAGE_PROPOSAL_SCHEMA;
  providerId: string;
  generatedAt: string;
  selectedFilePath: string;
  boundaryCandidates: LanguageProposalClaim[];
  reviewQueueCopy: LanguageProposalClaim[];
  attemptPrompt: LanguageProposalClaim;
  possibleGapLabels: LanguageProposalClaim[];
  smallestRepairCopy: LanguageProposalClaim;
  questions?: LanguageProposalClaim[];
  readiness?: LanguageProposalClaim[];
  runtimeTrace?: LanguageProposalRuntimeTrace;
};

export type LanguageProposalRuntimeTrace = {
  providerId: string;
  model: string;
  prompt: string;
  evidenceIdCount: number;
  rawResponse?: unknown;
};

export type VerifiedLanguageProposalClaim = LanguageProposalClaim & {
  disposition: "accepted" | "downgraded_to_question" | "rejected";
  reasons: string[];
};

export type LanguageProposalVerification =
  | {
      kind: "accepted" | "accepted_with_questions" | "rejected";
      acceptedClaims: VerifiedLanguageProposalClaim[];
      questions: VerifiedLanguageProposalClaim[];
      rejectedClaims: VerifiedLanguageProposalClaim[];
      reasons: string[];
    }
  | {
      kind: "blocked_llm_unavailable";
      reason: string;
    };

export type BuildEvidencePackInput = {
  inventory: RepoInventory;
  selectedFilePath: string;
  userIntent: string;
  fileContents: Record<string, string>;
  repoSearches?: RepoSearchEvidenceInput[];
  excerptRange?: {
    startLine: number;
    endLine: number;
  };
};

export type LoadLanguageProposalStatusOptions = {
  endpoint?: string;
  evidencePack?: EvidencePack;
  signal?: AbortSignal;
};

export type LanguageProposalStatus =
  | {
      kind: "ready";
      proposal: LanguageProposal;
    }
  | {
      kind: "unavailable";
      reason: string;
      trace?: LanguageProposalRuntimeTrace;
    }
  | {
      kind: "loading";
    };

const DEFAULT_LANGUAGE_PROPOSAL_ENDPOINT = "/__sibi/language-proposal";
const MAX_SELECTED_FILE_SINGLE_LINE_SCAN = 120;
const symbolRegex =
  /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(function|class|interface|type|const|let|var|enum)\s+([A-Za-z_$][\w$]*)/;
const selectedFileSingleLineSignalRegex =
  /^\s*(?:import\b|export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|interface|type|const|let|var|enum)\b|^\s*return\b|\buse(?:State|Reducer|Ref|Memo|Callback|Effect|Context|Transition|DeferredValue|SyncExternalStore)\s*\(|^\s*[A-Za-z_$][\w$.[\]?]*\s*(?:=|\+=|-=|\*=|\/=|&&=|\|\|=|\?\?=)|^\s*[A-Za-z_$][\w$.-]*\s*=\{|\s+[A-Za-z_$][\w$.-]*=\{/;
const pythonFunctionRegex =
  /^\s*(?:async\s+)?def\s+([A-Za-z_][\w]*)\s*\([^)]*\)\s*(?:->\s*[^:]+)?\s*:/;
const pythonClassRegex =
  /^\s*class\s+([A-Za-z_][\w]*)\s*(?:\([^)]*\))?\s*:/;
const pythonImportRegex = /^\s*(from\s+[\w.]+\s+import\s+.+|import\s+.+)\s*$/;
const identifierRegex = /^[A-Za-z_$][\w$]*$/;
const ignoredReferenceIdentifierNames = new Set([
  "catch",
  "class",
  "const",
  "default",
  "do",
  "else",
  "export",
  "false",
  "for",
  "function",
  "if",
  "import",
  "let",
  "new",
  "null",
  "return",
  "switch",
  "true",
  "undefined",
  "var",
  "while",
]);

function normalizePath(path: string): string {
  return String(path ?? "").replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
}

function makeEvidenceId(filePath: string, startLine: number, endLine: number, label: string): string {
  return `${normalizePath(filePath)}:${startLine}-${endLine}:${label}`;
}

function splitLines(contents: string): string[] {
  return contents.length === 0 ? [] : contents.split("\n");
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}

function isEvidenceConfidence(value: unknown): value is EvidenceConfidence {
  return value === "observed" || value === "inferred" || value === "unverified" || value === "conflict";
}

function isTestPath(filePath: string): boolean {
  return /\.test\./.test(filePath) || /\.spec\./.test(filePath) || /\/__tests?\//.test(filePath);
}

function isDocPath(filePath: string): boolean {
  return /^docs?\//.test(filePath) || /\.mdx?$/.test(filePath);
}

function basenameWithoutExtension(filePath: string): string {
  const name = normalizePath(filePath).replace(/^.*\//, "");
  return name.replace(/\.[^.]+$/, "");
}

function commonDirectory(filePath: string): string {
  const normalized = normalizePath(filePath);
  const index = normalized.lastIndexOf("/");
  return index === -1 ? "" : normalized.slice(0, index);
}

function excerptText(contents: string, startLine: number, endLine: number): string {
  return splitLines(contents).slice(startLine - 1, endLine).join("\n");
}

function selectedFileExcerpt(filePath: string, contents: string, startLine: number, endLine: number): EvidenceExcerpt {
  return {
    evidenceId: makeEvidenceId(filePath, startLine, endLine, "excerpt"),
    filePath,
    startLine,
    endLine,
    text: excerptText(contents, startLine, endLine),
  };
}

function parseImportedIdentifierNames(rawLine: string): string[] {
  const text = rawLine.trim();
  if (!text.startsWith("import ")) return [];
  if (/^import\s+["'][^"']+["'];?\s*$/.test(text)) return [];

  const names: string[] = [];
  const addName = (value: string): void => {
    const name = value.trim().replace(/^type\s+/, "");
    if (identifierRegex.test(name) && !names.includes(name)) {
      names.push(name);
    }
  };

  const namedMatch = /\{([^}]*)\}/.exec(text);
  if (namedMatch != null) {
    for (const specifier of namedMatch[1]!.split(",")) {
      const cleaned = specifier.trim().replace(/^type\s+/, "");
      if (cleaned === "") continue;
      const aliasMatch = /\bas\s+([A-Za-z_$][\w$]*)$/.exec(cleaned);
      addName(aliasMatch?.[1] ?? cleaned);
    }
  }

  const beforeFrom = text.replace(/^import\s+/, "").split(/\s+from\s+/)[0]?.trim() ?? "";
  const defaultPart = beforeFrom.split(",")[0]?.trim().replace(/^type\s+/, "") ?? "";
  if (defaultPart !== "" && defaultPart !== beforeFrom && !defaultPart.startsWith("{") && !defaultPart.startsWith("*")) {
    addName(defaultPart);
  } else if (!beforeFrom.startsWith("{") && !beforeFrom.startsWith("*") && !beforeFrom.includes("{")) {
    addName(defaultPart);
  }

  const namespaceMatch = /\*\s+as\s+([A-Za-z_$][\w$]*)/.exec(text);
  if (namespaceMatch != null) {
    addName(namespaceMatch[1]!);
  }

  return names;
}

function uniqueIdentifierNames(values: string[]): string[] {
  return values.filter((value, index) => identifierRegex.test(value) && values.indexOf(value) === index);
}

function parsePythonIdentifierList(rawLine: string): string[] {
  const normalized = rawLine.trim();
  if (!pythonImportRegex.test(normalized)) return [];
  const importOnly = normalized.startsWith("import ") ? normalized.slice(6).trim() : normalized.replace(/^from\s+/, "").trim();
  const names: string[] = [];

  if (normalized.startsWith("from ")) {
    const [, importSection] = /^\s*from\s+([^\s]+)\s+import\s+(.+)$/i.exec(normalized) ?? [];
    if (importSection == null) return [];
    for (const part of importSection.split(",")) {
      const aliasMatch = /\bas\s+([A-Za-z_][\w]*)$/i.exec(part.trim());
      const item = (aliasMatch?.[1] ?? part).trim().replace(/[^A-Za-z0-9_]/g, " ").trim().split(/\s+/)[0] ?? "";
      if (item !== "" && identifierRegex.test(item)) {
        names.push(item);
      }
    }
    return names;
  }

  const firstPath = importOnly.split(",")[0]?.trim() ?? "";
  const lastSegment = firstPath.split(".").at(-1) ?? "";
  if (lastSegment !== "" && identifierRegex.test(lastSegment.replace(/[^A-Za-z0-9_]/g, ""))) {
    names.push(lastSegment.replace(/[^A-Za-z0-9_]/g, ""));
  }

  return names;
}

function parseVariableDeclarationNames(rawLine: string): string[] {
  const match = /^\s*(?:export\s+)?(const|let|var)\s+(.+?)(?:=|;|$)/.exec(rawLine);
  if (match == null) return [];

  const declaration = match[2]?.trim() ?? "";
  if (declaration === "") return [];

  if (declaration.startsWith("[")) {
    return uniqueIdentifierNames(
      declaration
        .replace(/[\[\]{}]/g, " ")
        .split(/[,\s]+/)
        .map((part) => part.trim())
        .filter((part) => part !== "" && part !== "..."),
    );
  }

  if (declaration.startsWith("{")) {
    return uniqueIdentifierNames(
      declaration
        .replace(/[{}]/g, " ")
        .split(",")
        .flatMap((part) => {
          const localName = part.split(":").at(-1)?.replace(/=.*/, "").replace(/^\s*\.\.\./, "").trim() ?? "";
          return localName.split(/\s+/);
        }),
    );
  }

  const name = /^([A-Za-z_$][\w$]*)/.exec(declaration)?.[1] ?? "";
  return uniqueIdentifierNames([name]);
}

function parseSelectedFileReferenceIdentifierNames(rawLine: string): string[] {
  if (!selectedFileSingleLineSignalRegex.test(rawLine)) return [];
  if (rawLine.trim().startsWith("import ")) return [];

  const names: string[] = [];
  const searchableLine = rawLine.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, "");
  for (const match of searchableLine.matchAll(/[A-Za-z_$][\w$]*/g)) {
    const name = match[0] ?? "";
    const previous = match.index == null || match.index === 0 ? "" : searchableLine[match.index - 1] ?? "";
    if (/[\w$.]/.test(previous)) continue;
    if (ignoredReferenceIdentifierNames.has(name)) continue;
    names.push(name);
  }

  return uniqueIdentifierNames(names);
}

function parseLineSignals(filePath: string, contents: string): {
  imports: EvidenceTextSignal[];
  exports: EvidenceTextSignal[];
  symbols: EvidenceSymbol[];
} {
  const imports: EvidenceTextSignal[] = [];
  const exports: EvidenceTextSignal[] = [];
  const symbols: EvidenceSymbol[] = [];
  const addSymbol = ({
    line,
    rawLine,
    name,
    kind,
  }: {
    line: number;
    rawLine: string;
    name: string;
    kind: EvidenceSymbol["kind"];
  }): void => {
    if (!identifierRegex.test(name)) return;
    if (symbols.some((symbol) => symbol.filePath === filePath && symbol.startLine === line && symbol.name === name)) return;
    symbols.push({
      evidenceId: makeEvidenceId(filePath, line, line, `symbol:${name}`),
      filePath,
      startLine: line,
      endLine: line,
      symbol: name,
      name,
      kind,
      text: rawLine,
      confidence: "observed",
    });
  };

  for (const [index, rawLine] of splitLines(contents).entries()) {
    const line = index + 1;
    const text = rawLine.trim();
    const pathLower = normalizePath(filePath).toLowerCase();
    if (text.startsWith("import ")) {
      imports.push({
        evidenceId: makeEvidenceId(filePath, line, line, "import"),
        filePath,
        startLine: line,
        endLine: line,
        text: rawLine,
        confidence: "observed",
      });

      for (const name of parseImportedIdentifierNames(rawLine)) {
        addSymbol({ line, rawLine, name, kind: "const" });
      }
    } else if (pathLower.endsWith(".py") && pythonImportRegex.test(text)) {
      imports.push({
        evidenceId: makeEvidenceId(filePath, line, line, "import"),
        filePath,
        startLine: line,
        endLine: line,
        text: rawLine,
        confidence: "observed",
      });
      for (const name of parsePythonIdentifierList(rawLine)) {
        addSymbol({ line, rawLine, name, kind: "const" });
      }
    }

    if (pathLower.endsWith(".py")) {
      const functionMatch = pythonFunctionRegex.exec(rawLine);
      if (functionMatch != null) {
        addSymbol({ line, rawLine, name: functionMatch[1] ?? "", kind: "function" });
      }

      const classMatch = pythonClassRegex.exec(rawLine);
      if (classMatch != null) {
        addSymbol({ line, rawLine, name: classMatch[1] ?? "", kind: "class" });
      }
    }

    if (/^\s*export\s+/.test(rawLine)) {
      exports.push({
        evidenceId: makeEvidenceId(filePath, line, line, "export"),
        filePath,
        startLine: line,
        endLine: line,
        text: rawLine,
        confidence: "observed",
      });
    }

    const match = symbolRegex.exec(rawLine);
    if (match != null) {
      const kind = match[1] as EvidenceSymbol["kind"];
      const name = match[2] ?? "";
      addSymbol({ line, rawLine, name, kind });
    }

    const variableKind = /^\s*(?:export\s+)?(const|let|var)\s+/.exec(rawLine)?.[1] as EvidenceSymbol["kind"] | undefined;
    if (variableKind != null) {
      for (const name of parseVariableDeclarationNames(rawLine)) {
        addSymbol({ line, rawLine, name, kind: variableKind });
      }
    }

    for (const name of parseSelectedFileReferenceIdentifierNames(rawLine)) {
      addSymbol({ line, rawLine, name, kind: "const" });
    }
  }

  return { imports, exports, symbols };
}

function collectImportBlockSpans(lines: string[]): Array<{ startLine: number; endLine: number }> {
  const spans: Array<{ startLine: number; endLine: number }> = [];
  let index = 0;

  while (index < lines.length) {
    const text = lines[index]?.trim() ?? "";
    if (!text.startsWith("import ")) {
      index += 1;
      continue;
    }

    const startLine = index + 1;
    let endLine = startLine;
    let previousLineEndedStatement = /;\s*$/.test(text) || /^import\s+["'][^"']+["'];?\s*$/.test(text);
    index += 1;

    while (index < lines.length) {
      const nextText = lines[index]?.trim() ?? "";
      if (nextText === "") break;
      if (previousLineEndedStatement && !nextText.startsWith("import ")) break;

      endLine = index + 1;
      previousLineEndedStatement = /;\s*$/.test(nextText) || /^import\s+["'][^"']+["'];?\s*$/.test(nextText);
      index += 1;
    }

    spans.push({ startLine, endLine });
  }

  return spans;
}

function collectSymbolBlockSpan(lines: string[], symbol: EvidenceSymbol): { startLine: number; endLine: number } {
  const startIndex = Math.max(0, symbol.startLine - 1);
  const maxIndex = Math.min(lines.length - 1, startIndex + 79);
  let braceBalance = 0;
  let sawBrace = false;
  let lastNonBlankLine = symbol.startLine;

  for (let index = startIndex; index <= maxIndex; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    if (trimmed !== "") {
      lastNonBlankLine = index + 1;
    }

    for (const char of line) {
      if (char === "{") {
        sawBrace = true;
        braceBalance += 1;
      } else if (char === "}") {
        braceBalance -= 1;
      }
    }

    if (sawBrace && braceBalance <= 0) {
      return { startLine: symbol.startLine, endLine: index + 1 };
    }

    if (!sawBrace && /;\s*$/.test(trimmed)) {
      return { startLine: symbol.startLine, endLine: index + 1 };
    }

    if (!sawBrace && index > startIndex && trimmed === "") {
      return { startLine: symbol.startLine, endLine: Math.max(symbol.startLine, lastNonBlankLine) };
    }
  }

  return { startLine: symbol.startLine, endLine: Math.max(symbol.startLine, lastNonBlankLine) };
}

function collectStateHookSpans(lines: string[]): Array<{ startLine: number; endLine: number }> {
  const hookLines = lines
    .map((line, index) => ({
      line: index + 1,
      matches: /\buse(?:State|Reducer|Ref|Memo|Callback|Effect|Context|Transition|DeferredValue|SyncExternalStore)\s*\(/.test(line),
    }))
    .filter((entry) => entry.matches)
    .map((entry) => entry.line);

  const spans: Array<{ startLine: number; endLine: number }> = [];
  for (const line of hookLines) {
    const previous = spans.at(-1);
    if (previous != null && line <= previous.endLine + 2) {
      previous.endLine = line;
    } else {
      spans.push({ startLine: line, endLine: line });
    }
  }

  return spans;
}

function collectSelectedFileSingleLineExcerptLines(lines: string[], symbols: EvidenceSymbol[]): number[] {
  const maxIndex = Math.min(lines.length, MAX_SELECTED_FILE_SINGLE_LINE_SCAN);
  const symbolAdjacentLines = new Set<number>();

  for (const symbol of symbols) {
    for (let line = symbol.startLine - 1; line <= symbol.endLine + 1; line += 1) {
      if (line >= 1 && line <= maxIndex) {
        symbolAdjacentLines.add(line);
      }
    }
  }

  const excerptLines: number[] = [];
  for (let index = 0; index < maxIndex; index += 1) {
    const line = index + 1;
    const text = lines[index]?.trim() ?? "";
    if (text === "") continue;
    if (selectedFileSingleLineSignalRegex.test(lines[index] ?? "") || symbolAdjacentLines.has(line)) {
      excerptLines.push(line);
    }
  }

  return excerptLines;
}

function collectSelectedFileExcerpts({
  filePath,
  contents,
  startLine,
  endLine,
  symbols,
}: {
  filePath: string;
  contents: string;
  startLine: number;
  endLine: number;
  symbols: EvidenceSymbol[];
}): EvidenceExcerpt[] {
  const lines = splitLines(contents);
  const lineCount = Math.max(1, lines.length);
  const excerpts: EvidenceExcerpt[] = [];
  const seenSpans = new Set<string>();

  const addSpan = (spanStartLine: number, spanEndLine: number): void => {
    const clampedStartLine = Math.max(1, Math.min(lineCount, spanStartLine));
    const clampedEndLine = Math.max(clampedStartLine, Math.min(lineCount, spanEndLine));
    const key = `${clampedStartLine}-${clampedEndLine}`;
    if (seenSpans.has(key)) return;
    seenSpans.add(key);
    excerpts.push(selectedFileExcerpt(filePath, contents, clampedStartLine, clampedEndLine));
  };

  addSpan(startLine, endLine);

  for (const span of collectImportBlockSpans(lines)) {
    addSpan(span.startLine, span.endLine);
  }

  for (const symbol of symbols) {
    const blockSpan = collectSymbolBlockSpan(lines, symbol);
    addSpan(blockSpan.startLine, blockSpan.endLine);
  }

  for (const span of collectStateHookSpans(lines)) {
    addSpan(span.startLine, span.endLine);
  }

  for (const line of collectSelectedFileSingleLineExcerptLines(lines, symbols)) {
    addSpan(line, line);
  }

  for (const symbol of symbols) {
    addSpan(symbol.startLine - 1, symbol.endLine + 1);
  }

  return excerpts;
}

function candidateFromPath(path: string, label: string, confidence: EvidenceConfidence): EvidenceFileCandidate {
  const filePath = normalizePath(path);
  const evidenceId = makeEvidenceId(filePath, 1, 1, "inventory");
  return {
    id: `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${path}`,
    path: filePath,
    label,
    evidenceIds: [evidenceId],
    citations: [
      {
        evidenceId,
        filePath,
        startLine: 1,
        endLine: 1,
      },
    ],
    confidence,
  };
}

function collectNearbyFiles(inventory: RepoInventory, selectedFilePath: string): {
  nearbyTests: EvidenceFileCandidate[];
  nearbyDocs: EvidenceFileCandidate[];
} {
  const selectedBase = basenameWithoutExtension(selectedFilePath);
  const selectedDirectory = commonDirectory(selectedFilePath);
  const nearbyTests: EvidenceFileCandidate[] = [];
  const nearbyDocs: EvidenceFileCandidate[] = [];

  for (const file of inventory.files) {
    const path = normalizePath(file.path);
    if (path === selectedFilePath) continue;
    const sharesDirectory = selectedDirectory !== "" && path.startsWith(`${selectedDirectory}/`);
    const sharesName = basenameWithoutExtension(path).includes(selectedBase) || selectedBase.includes(basenameWithoutExtension(path));

    if ((file.role === "test" || isTestPath(path)) && (sharesDirectory || sharesName)) {
      nearbyTests.push(candidateFromPath(path, "Nearby test", "inferred"));
    }

    if ((file.role === "doc" || isDocPath(path)) && (sharesDirectory || path.includes(selectedBase))) {
      nearbyDocs.push(candidateFromPath(path, "Nearby doc", "inferred"));
    }
  }

  return { nearbyTests, nearbyDocs };
}

function collectCallers(
  fileContents: Record<string, string>,
  selectedFilePath: string,
  symbols: EvidenceSymbol[],
): EvidenceFileCandidate[] {
  const symbolNames = symbols.map((symbol) => symbol.name).filter(Boolean);
  const callers: EvidenceFileCandidate[] = [];

  for (const [rawPath, contents] of Object.entries(fileContents)) {
    const path = normalizePath(rawPath);
    if (path === selectedFilePath) continue;
    const matched = symbolNames.find((name) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(contents));
    if (matched == null) continue;
    const lineCount = Math.max(1, splitLines(contents).length);
    const evidenceId = makeEvidenceId(path, 1, lineCount, `search:${matched}`);
    callers.push({
      id: `caller-${path}`,
      path,
      label: `Mentions ${matched}`,
      evidenceIds: [evidenceId],
      citations: [
        {
          evidenceId,
          filePath: path,
          startLine: 1,
          endLine: lineCount,
        },
      ],
      confidence: "inferred",
    });
  }

  return callers;
}

function collectRepoSearchCandidates(
  inventory: RepoInventory,
  repoSearches: RepoSearchEvidenceInput[],
): EvidenceFileCandidate[] {
  const inventoryPaths = new Set(inventory.files.map((file) => normalizePath(file.path)));
  const candidates: EvidenceFileCandidate[] = [];
  const seenEvidenceIds = new Set<string>();

  for (const search of repoSearches) {
    for (const result of search.results) {
      const path = normalizePath(result.path);
      if (!inventoryPaths.has(path) || !isPositiveInteger(result.line)) continue;

      const query = String(result.query ?? search.query).trim();
      if (query === "") continue;

      const evidenceId = makeEvidenceId(path, result.line, result.line, `repo-search:${query}`);
      if (seenEvidenceIds.has(evidenceId)) continue;
      seenEvidenceIds.add(evidenceId);

      candidates.push({
        id: `repo-search-${candidates.length + 1}-${path}`,
        path,
        label: `Text search match for ${query}`,
        evidenceIds: [evidenceId],
        citations: [
          {
            evidenceId,
            filePath: path,
            startLine: result.line,
            endLine: result.line,
          },
        ],
        confidence: "observed",
      });
    }
  }

  return candidates;
}

function lineForPattern(contents: string, pattern: RegExp): number {
  const lines = splitLines(contents);
  const index = lines.findIndex((line) => pattern.test(line));
  return index === -1 ? 1 : index + 1;
}

function signalFromCitation({
  id,
  label,
  value,
  filePath,
  line,
  confidence,
}: {
  id: string;
  label: string;
  value: string;
  filePath: string;
  line: number;
  confidence: EvidenceConfidence;
}): ProjectSignal {
  const normalizedPath = normalizePath(filePath);
  const evidenceId = makeEvidenceId(normalizedPath, line, line, `project-signal:${id}`);
  return {
    id,
    label,
    value,
    evidenceIds: [evidenceId],
    citations: [
      {
        evidenceId,
        filePath: normalizedPath,
        startLine: line,
        endLine: line,
      },
    ],
    confidence,
  };
}

function findInventoryFile(inventory: RepoInventory, predicate: (path: string) => boolean): string | null {
  const match = inventory.files.find((file) => predicate(normalizePath(file.path)));
  return match == null ? null : normalizePath(match.path);
}

function addInventorySignal(
  signals: ProjectSignal[],
  inventory: RepoInventory,
  id: string,
  label: string,
  value: string,
  predicate: (path: string) => boolean,
): void {
  const path = findInventoryFile(inventory, predicate) ?? normalizePath(inventory.files[0]?.path ?? inventory.sourceRoot);
  signals.push(signalFromCitation({ id, label, value, filePath: path, line: 1, confidence: "inferred" }));
}

function collectProjectSignals(
  inventory: RepoInventory,
  fileContents: Record<string, string>,
): ProjectSignal[] {
  const signals: ProjectSignal[] = [];
  const extensionCounts = new Map<string, number>();

  for (const file of inventory.files) {
    const extension = normalizePath(file.path).replace(/^.*(?=\.[^.]+$)/, "");
    if (extension.startsWith(".")) {
      extensionCounts.set(extension, (extensionCounts.get(extension) ?? 0) + 1);
    }
  }

  const dominantExtensions = [...extensionCounts.entries()]
    .toSorted((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4)
    .map(([extension, count]) => `${extension}:${count}`)
    .join(", ");
  if (dominantExtensions !== "") {
    addInventorySignal(
      signals,
      inventory,
      "dominant-extensions",
      "Dominant file types",
      dominantExtensions,
      () => true,
    );
  }

  const packagePath = findInventoryFile(inventory, (path) => path.endsWith("/package.json") || path === "package.json");
  if (packagePath != null) {
    const packageContents = fileContents[packagePath];
    if (packageContents != null) {
      try {
        const packageJson = JSON.parse(packageContents) as {
          name?: unknown;
          scripts?: Record<string, unknown>;
          dependencies?: Record<string, unknown>;
          devDependencies?: Record<string, unknown>;
        };
        if (typeof packageJson.name === "string" && packageJson.name.trim() !== "") {
          signals.push(
            signalFromCitation({
              id: "package-name",
              label: "Package name",
              value: packageJson.name,
              filePath: packagePath,
              line: lineForPattern(packageContents, /"name"\s*:/),
              confidence: "observed",
            }),
          );
        }

        const scripts = Object.keys(packageJson.scripts ?? {}).slice(0, 8);
        if (scripts.length > 0) {
          signals.push(
            signalFromCitation({
              id: "package-scripts",
              label: "Available scripts",
              value: scripts.join(", "),
              filePath: packagePath,
              line: lineForPattern(packageContents, /"scripts"\s*:/),
              confidence: "observed",
            }),
          );
        }

        const dependencies = { ...(packageJson.dependencies ?? {}), ...(packageJson.devDependencies ?? {}) };
        const framework = ["react", "vue", "svelte", "next", "vite", "express", "fastify", "hono"].find(
          (name) => Object.prototype.hasOwnProperty.call(dependencies, name),
        );
        if (framework != null) {
          signals.push(
            signalFromCitation({
              id: "framework",
              label: "Framework/library signal",
              value: framework,
              filePath: packagePath,
              line: lineForPattern(packageContents, new RegExp(`"${framework}"\\s*:`)),
              confidence: "observed",
            }),
          );
        }
      } catch {
        signals.push(
          signalFromCitation({
            id: "package-json-unparsed",
            label: "Package manifest",
            value: "package.json exists but could not be parsed",
            filePath: packagePath,
            line: 1,
            confidence: "conflict",
          }),
        );
      }
    } else {
      addInventorySignal(signals, inventory, "package-json", "Package manifest", "package.json present", (path) => path === packagePath);
    }
  }

  const readmePath = findInventoryFile(inventory, (path) => /(^|\/)readme\.md$/i.test(path));
  if (readmePath != null) {
    const readmeContents = fileContents[readmePath];
    if (readmeContents != null) {
      const lines = splitLines(readmeContents);
      const headingIndex = lines.findIndex((line) => line.trim() !== "");
      const line = headingIndex === -1 ? 1 : headingIndex + 1;
      const heading = lines[headingIndex]?.replace(/^#+\s*/, "").trim() || "README present";
      signals.push(
        signalFromCitation({
          id: "readme-heading",
          label: "README intent",
          value: heading.slice(0, 160),
          filePath: readmePath,
          line,
          confidence: "observed",
        }),
      );
    } else {
      addInventorySignal(signals, inventory, "readme", "README", "README present", (path) => path === readmePath);
    }
  }

  const tsconfigPath = findInventoryFile(inventory, (path) => path.endsWith("/tsconfig.json") || path === "tsconfig.json");
  if (tsconfigPath != null) {
    addInventorySignal(signals, inventory, "typescript-config", "TypeScript config", "tsconfig.json present", (path) => path === tsconfigPath);
  }

  const vitePath = findInventoryFile(inventory, (path) => /(^|\/)vite\.config\.[cm]?[jt]s$/.test(path));
  if (vitePath != null) {
    addInventorySignal(signals, inventory, "vite-config", "Vite config", "vite config present", (path) => path === vitePath);
  }

  const requirementsPath = findInventoryFile(inventory, (path) => path.toLowerCase().endsWith("/requirements.txt") || path.toLowerCase() === "requirements.txt");
  if (requirementsPath != null) {
    const requirementsContents = fileContents[requirementsPath];
    addInventorySignal(
      signals,
      inventory,
      "python-requirements",
      "Python requirements manifest",
      "requirements.txt present",
      (path) => path === requirementsPath,
    );

    if (requirementsContents != null) {
      const hasFastApiDependency = /(^|\n)\s*fastapi\b/m.test(requirementsContents.toLowerCase());
      if (hasFastApiDependency) {
        signals.push(
          signalFromCitation({
            id: "python-fastapi-requirements",
            label: "Python framework",
            value: "FastAPI",
            filePath: requirementsPath,
            line: lineForPattern(requirementsContents, /(^|\n)\s*fastapi\b/i),
            confidence: "observed",
          }),
        );
      }
    }
  }

  const pyprojectPath = findInventoryFile(inventory, (path) =>
    path.toLowerCase().endsWith("/pyproject.toml") || path.toLowerCase() === "pyproject.toml",
  );
  if (pyprojectPath != null) {
    const pyprojectContents = fileContents[pyprojectPath];
    addInventorySignal(signals, inventory, "python-pyproject", "Python project manifest", "pyproject.toml present", (path) => path === pyprojectPath);
    if (pyprojectContents != null && /fastapi\b/i.test(pyprojectContents)) {
      signals.push(
        signalFromCitation({
          id: "python-fastapi-pyproject",
          label: "Python framework",
          value: "FastAPI",
          filePath: pyprojectPath,
          line: lineForPattern(pyprojectContents, /fastapi\b/i),
          confidence: "observed",
        }),
      );
    }
  }

  return signals.slice(0, 12);
}

function uniqueEvidenceIds(pack: Omit<EvidencePack, "evidenceIds">): string[] {
  const relationEntries = [
    ...pack.nearbyTests,
    ...pack.nearbyDocs,
    ...pack.callerCandidates,
    ...pack.searchResults,
    ...pack.projectSignals,
  ];

  return [
    ...pack.excerpts.map((entry) => entry.evidenceId),
    ...pack.imports.map((entry) => entry.evidenceId),
    ...pack.exports.map((entry) => entry.evidenceId),
    ...pack.symbols.map((entry) => entry.evidenceId),
    ...relationEntries.flatMap((entry) => entry.evidenceIds),
    ...relationEntries.filter((entry) => entry.citations.length > 0).map((entry) => entry.id),
  ].filter((value, index, values) => values.indexOf(value) === index);
}

export function buildEvidencePack({
  inventory,
  selectedFilePath,
  userIntent,
  fileContents,
  repoSearches = [],
  excerptRange,
}: BuildEvidencePackInput): EvidencePack {
  const filePath = normalizePath(selectedFilePath);
  const contents = fileContents[filePath] ?? "";
  const lineCount = Math.max(1, splitLines(contents).length);
  const startLine = Math.max(1, excerptRange?.startLine ?? 1);
  const endLine = Math.min(lineCount, Math.max(startLine, excerptRange?.endLine ?? Math.min(lineCount, 40)));
  const lineSignals = parseLineSignals(filePath, contents);
  const nearby = collectNearbyFiles(inventory, filePath);
  const callerCandidates = collectCallers(fileContents, filePath, lineSignals.symbols);
  const searchResults = collectRepoSearchCandidates(inventory, repoSearches);
  const projectSignals = collectProjectSignals(inventory, fileContents);
  const excerpts = collectSelectedFileExcerpts({
    filePath,
    contents,
    startLine,
    endLine,
    symbols: lineSignals.symbols,
  });

  const packWithoutIds: Omit<EvidencePack, "evidenceIds"> = {
    schema: EVIDENCE_PACK_SCHEMA,
    selectedFilePath: filePath,
    userIntent,
    excerpts,
    imports: lineSignals.imports,
    exports: lineSignals.exports,
    symbols: lineSignals.symbols,
    nearbyTests: nearby.nearbyTests,
    nearbyDocs: nearby.nearbyDocs,
    callerCandidates,
    searchResults,
    projectSignals,
  };

  return {
    ...packWithoutIds,
    evidenceIds: uniqueEvidenceIds(packWithoutIds),
  };
}

function flattenClaims(proposal: LanguageProposal): LanguageProposalClaim[] {
  return [
    ...proposal.boundaryCandidates,
    ...proposal.reviewQueueCopy,
    proposal.attemptPrompt,
    ...proposal.possibleGapLabels,
    proposal.smallestRepairCopy,
    ...(proposal.questions ?? []),
    ...(proposal.readiness ?? []),
  ];
}

function evidenceIdSet(pack: EvidencePack): Set<string> {
  return new Set(pack.evidenceIds);
}

function evidenceCitationById(pack: EvidencePack): Map<string, EvidenceCitation> {
  const references = new Map<string, EvidenceCitation>();
  for (const entry of [...pack.excerpts, ...pack.imports, ...pack.exports, ...pack.symbols]) {
    references.set(entry.evidenceId, {
      evidenceId: entry.evidenceId,
      filePath: normalizePath(entry.filePath),
      startLine: entry.startLine,
      endLine: entry.endLine,
      symbol: entry.symbol,
    });
  }

  for (const candidate of [
    ...pack.nearbyTests,
    ...pack.nearbyDocs,
    ...pack.callerCandidates,
    ...pack.searchResults,
    ...pack.projectSignals,
  ]) {
    const firstCitation = candidate.citations[0];
    if (firstCitation != null) {
      references.set(candidate.id, {
        ...firstCitation,
        evidenceId: candidate.id,
        filePath: normalizePath(firstCitation.filePath),
      });
    }

    for (const citation of candidate.citations) {
      references.set(citation.evidenceId, {
        ...citation,
        filePath: normalizePath(citation.filePath),
      });
    }
  }

  return references;
}

function fileLineCounts(fileContents: Record<string, string>, pack: EvidencePack): Map<string, number> {
  const counts = new Map<string, number>();
  const recordCitation = (citation: EvidenceCitation): void => {
    const filePath = normalizePath(citation.filePath);
    counts.set(filePath, Math.max(counts.get(filePath) ?? 1, citation.endLine));
  };

  for (const [path, contents] of Object.entries(fileContents)) {
    counts.set(normalizePath(path), Math.max(1, splitLines(contents).length));
  }

  for (const candidate of [...pack.nearbyTests, ...pack.nearbyDocs, ...pack.callerCandidates, ...pack.searchResults]) {
    const filePath = normalizePath(candidate.path);
    if (!counts.has(filePath)) {
      counts.set(filePath, 1);
    }
    for (const citation of candidate.citations) {
      recordCitation(citation);
    }
  }

  for (const signal of pack.projectSignals) {
    for (const citation of signal.citations) {
      recordCitation(citation);
    }
  }

  return counts;
}

function validateCitation(
  citation: EvidenceCitation,
  pack: EvidencePack,
  fileContents: Record<string, string>,
  allowedEvidenceIds: Set<string>,
  evidenceReferences: Map<string, EvidenceCitation>,
  lineCounts: Map<string, number>,
): string[] {
  const reasons: string[] = [];
  const filePath = normalizePath(citation.filePath);

  if (!allowedEvidenceIds.has(citation.evidenceId)) {
    reasons.push(`Unknown evidence id '${citation.evidenceId}'.`);
  } else {
    const evidenceReference = evidenceReferences.get(citation.evidenceId);
    if (evidenceReference == null) {
      reasons.push(`Evidence id '${citation.evidenceId}' has no verifiable source location.`);
    } else if (
      normalizePath(evidenceReference.filePath) !== filePath ||
      evidenceReference.startLine !== citation.startLine ||
      evidenceReference.endLine !== citation.endLine
    ) {
      reasons.push(
        `Evidence id '${citation.evidenceId}' resolves to ${evidenceReference.filePath}:${evidenceReference.startLine}-${evidenceReference.endLine}, not ${filePath}:${citation.startLine}-${citation.endLine}.`,
      );
    }
  }

  if (!lineCounts.has(filePath)) {
    reasons.push(`Invented file '${filePath}' cannot be verified.`);
    return reasons;
  }

  if (!isPositiveInteger(citation.startLine) || !isPositiveInteger(citation.endLine) || citation.startLine > citation.endLine) {
    reasons.push(`Invalid citation line range ${citation.startLine}-${citation.endLine} for '${filePath}'.`);
    return reasons;
  }

  const maxLine = lineCounts.get(filePath) ?? 0;
  if (citation.endLine > maxLine) {
    reasons.push(`Line range ${citation.startLine}-${citation.endLine} out of bounds for '${filePath}'.`);
    return reasons;
  }

  if (citation.symbol != null && citation.symbol.trim().length > 0) {
    const observedSymbol = pack.symbols.some(
      (symbol) =>
        normalizePath(symbol.filePath) === filePath &&
        symbol.name === citation.symbol &&
        symbol.startLine >= citation.startLine &&
        symbol.endLine <= citation.endLine,
    );
    const contents = fileContents[filePath] ?? "";
    const textRange = excerptText(contents, citation.startLine, citation.endLine);
    const symbolPattern = new RegExp(`\\b${citation.symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (!observedSymbol || !symbolPattern.test(textRange)) {
      reasons.push(`Invalid symbol '${citation.symbol}' for ${filePath}:${citation.startLine}-${citation.endLine}.`);
    }
  }

  return reasons;
}

function readinessTextDetected(claim: LanguageProposalClaim): boolean {
  return (
    claim.kind === "readiness" ||
    /\b(readiness|ready|owned|ownership complete|can update readiness|production[-\s]+ready)\b/i.test(claim.text)
  );
}

function normalizeClaimText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function citationText(
  citation: EvidenceCitation,
  pack: EvidencePack,
  fileContents: Record<string, string>,
): string {
  const filePath = normalizePath(citation.filePath);
  const excerpt = [
    ...pack.excerpts,
    ...pack.imports,
    ...pack.exports,
    ...pack.symbols,
  ].find(
    (entry) =>
      entry.evidenceId === citation.evidenceId &&
      normalizePath(entry.filePath) === filePath &&
      entry.startLine === citation.startLine &&
      entry.endLine === citation.endLine,
  );

  if (excerpt != null) return excerpt.text;

  const contents = fileContents[filePath];
  if (contents == null) return "";
  return excerptText(contents, citation.startLine, citation.endLine);
}

function isDirectCitationClaim(
  claim: LanguageProposalClaim,
  pack: EvidencePack,
  fileContents: Record<string, string>,
): boolean {
  const claimText = normalizeClaimText(claim.text);
  if (claimText === "") return false;

  return claim.citations.some((citation) => {
    const citedText = normalizeClaimText(citationText(citation, pack, fileContents));
    return citedText !== "" && (citedText.includes(claimText) || claimText.includes(citedText));
  });
}

function requiresDirectCitationConfidence(claim: LanguageProposalClaim): boolean {
  return claim.kind !== "question" && claim.kind !== "readiness";
}

function makeVerified(
  claim: LanguageProposalClaim,
  disposition: VerifiedLanguageProposalClaim["disposition"],
  reasons: string[],
): VerifiedLanguageProposalClaim {
  return {
    ...claim,
    disposition,
    reasons,
  };
}

export function verifyLanguageProposal(input: {
  proposal: LanguageProposal | null;
  evidencePack: EvidencePack;
  fileContents: Record<string, string>;
  providerError?: unknown;
}): LanguageProposalVerification {
  if (input.providerError != null || input.proposal == null) {
    return {
      kind: "blocked_llm_unavailable",
      reason: input.providerError instanceof Error ? input.providerError.message : "language proposal provider unavailable",
    };
  }

  const { proposal, evidencePack, fileContents } = input;
  const acceptedClaims: VerifiedLanguageProposalClaim[] = [];
  const questions: VerifiedLanguageProposalClaim[] = [];
  const rejectedClaims: VerifiedLanguageProposalClaim[] = [];
  const reasons: string[] = [];
  const allowedEvidenceIds = evidenceIdSet(evidencePack);
  const evidenceReferences = evidenceCitationById(evidencePack);
  const lineCounts = fileLineCounts(fileContents, evidencePack);

  if (proposal.schema !== LANGUAGE_PROPOSAL_SCHEMA) {
    reasons.push(`Unsupported proposal schema '${proposal.schema}'.`);
  }

  if (normalizePath(proposal.selectedFilePath) !== evidencePack.selectedFilePath) {
    reasons.push(`Proposal selected file '${proposal.selectedFilePath}' does not match evidence pack '${evidencePack.selectedFilePath}'.`);
  }

  for (const claim of flattenClaims(proposal)) {
    const claimReasons: string[] = [];

    if (readinessTextDetected(claim)) {
      rejectedClaims.push(
        makeVerified(claim, "rejected", ["Language proposals cannot update or claim readiness."]),
      );
      continue;
    }

    const claimCitations = Array.isArray(claim.citations) ? claim.citations : [];
    if (!Array.isArray(claim.citations)) {
      claimReasons.push("Language proposal claim citations must be an array.");
    }

    if (claimCitations.length === 0) {
      claimReasons.push("Language proposal claims must cite evidence ids.");
    }

    for (const citation of claimCitations) {
      if (!isCitation(citation)) {
        claimReasons.push("Malformed citation cannot be verified.");
        continue;
      }
      claimReasons.push(...validateCitation(citation, evidencePack, fileContents, allowedEvidenceIds, evidenceReferences, lineCounts));
    }

    if (
      claimReasons.some((reason) =>
        reason.includes("Invented file") ||
        reason.includes("out of bounds") ||
        reason.includes("Unknown evidence id") ||
        reason.includes("resolves to") ||
        reason.includes("has no verifiable source location") ||
        reason.includes("Malformed citation") ||
        reason.includes("Invalid symbol")
      )
    ) {
      rejectedClaims.push(makeVerified(claim, "rejected", claimReasons));
      continue;
    }

    if (claimReasons.length > 0) {
      questions.push(makeVerified(claim, "downgraded_to_question", claimReasons));
      continue;
    }

    if (claim.confidence !== "observed") {
      questions.push(
        makeVerified(claim, "downgraded_to_question", [
          `Claim confidence '${claim.confidence}' is not observed; treat as a question.`,
        ]),
      );
      continue;
    }

    if (requiresDirectCitationConfidence(claim) && !isDirectCitationClaim(claim, evidencePack, fileContents)) {
      questions.push(
        makeVerified(claim, "downgraded_to_question", [
          "Observed confidence is only accepted for direct textual facts in cited lines; semantic proposal wording remains question-grade.",
        ]),
      );
      continue;
    }

    acceptedClaims.push(makeVerified(claim, "accepted", []));
  }

  if (reasons.length > 0) {
    return {
      kind: "rejected",
      acceptedClaims,
      questions,
      rejectedClaims,
      reasons,
    };
  }

  if (rejectedClaims.length > 0) {
    return {
      kind: "rejected",
      acceptedClaims,
      questions,
      rejectedClaims,
      reasons,
    };
  }

  return {
    kind: questions.length > 0 ? "accepted_with_questions" : "accepted",
    acceptedClaims,
    questions,
    rejectedClaims,
    reasons,
  };
}

function isCitation(value: unknown): value is EvidenceCitation {
  if (!isObject(value)) return false;
  return (
    typeof value.evidenceId === "string" &&
    typeof value.filePath === "string" &&
    isPositiveInteger(value.startLine) &&
    isPositiveInteger(value.endLine) &&
    (!("symbol" in value) || value.symbol == null || typeof value.symbol === "string")
  );
}

function isProposalClaim(value: unknown): value is LanguageProposalClaim {
  if (!isObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.kind === "string" &&
    typeof value.text === "string" &&
    isEvidenceConfidence(value.confidence) &&
    Array.isArray(value.citations) &&
    value.citations.every(isCitation)
  );
}

function isLanguageProposal(value: unknown): value is LanguageProposal {
  if (!isObject(value)) return false;
  return (
    value.schema === LANGUAGE_PROPOSAL_SCHEMA &&
    typeof value.providerId === "string" &&
    typeof value.generatedAt === "string" &&
    typeof value.selectedFilePath === "string" &&
    Array.isArray(value.boundaryCandidates) &&
    value.boundaryCandidates.every(isProposalClaim) &&
    Array.isArray(value.reviewQueueCopy) &&
    value.reviewQueueCopy.every(isProposalClaim) &&
    isProposalClaim(value.attemptPrompt) &&
    Array.isArray(value.possibleGapLabels) &&
    value.possibleGapLabels.every(isProposalClaim) &&
    isProposalClaim(value.smallestRepairCopy) &&
    (!("questions" in value) || value.questions == null || (Array.isArray(value.questions) && value.questions.every(isProposalClaim))) &&
    (!("readiness" in value) || value.readiness == null || (Array.isArray(value.readiness) && value.readiness.every(isProposalClaim)))
  );
}

function isRuntimeTrace(value: unknown): value is LanguageProposalRuntimeTrace {
  if (!isObject(value)) return false;
  return (
    typeof value.providerId === "string" &&
    typeof value.model === "string" &&
    typeof value.prompt === "string" &&
    typeof value.evidenceIdCount === "number"
  );
}

function isAbsoluteEndpoint(endpoint: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(endpoint);
}

function hasBrowserOrigin(): boolean {
  return (
    typeof globalThis.location === "object" &&
    globalThis.location !== null &&
    typeof globalThis.location.origin === "string"
  );
}

const languageProposalStatusPromiseCache = new Map<string, Promise<LanguageProposalStatus>>();
const languageProposalStatusResultCache = new Map<string, LanguageProposalStatus>();
const LANGUAGE_PROPOSAL_STATUS_READY_STORAGE_PREFIX = "sibi-language-proposal-ready-status.v1:";

function isLanguageProposalStatusCacheEntry(value: unknown): value is Extract<LanguageProposalStatus, { kind: "ready" }> {
  if (!isObject(value)) return false;
  return value.kind === "ready" && isLanguageProposal((value as { proposal?: unknown }).proposal);
}

function makeLanguageProposalStatusStorageKey(cacheKey: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < cacheKey.length; index++) {
    hash ^= cacheKey.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${LANGUAGE_PROPOSAL_STATUS_READY_STORAGE_PREFIX}${hash.toString(16).padStart(8, "0")}`;
}

function loadLanguageProposalStatusFromStorage(cacheKey: string): Extract<LanguageProposalStatus, { kind: "ready" }> | null {
  if (typeof globalThis.localStorage === "undefined") return null;

  try {
    const storageKey = makeLanguageProposalStatusStorageKey(cacheKey);
    const raw = globalThis.localStorage.getItem(storageKey);
    if (raw == null) return null;
    const parsed = JSON.parse(raw);
    if (!isLanguageProposalStatusCacheEntry(parsed)) {
      globalThis.localStorage.removeItem(storageKey);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveLanguageProposalStatusToStorage(cacheKey: string, status: Extract<LanguageProposalStatus, { kind: "ready" }>): void {
  if (typeof globalThis.localStorage === "undefined") return;

  try {
    globalThis.localStorage.setItem(
      makeLanguageProposalStatusStorageKey(cacheKey),
      JSON.stringify(status),
    );
  } catch {
    // localStorage is unavailable, quota-limited, or disallowed in the current context.
  }
}

function stableSerializeValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map(stableSerializeValue);
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableSerializeValue((value as Record<string, unknown>)[key])]),
  );
}

function stableRequestBody(value: unknown): string {
  return JSON.stringify(stableSerializeValue(value)) ?? "";
}

function makeLanguageProposalStatusCacheKey(
  requestInput: string,
  method: string,
  requestBody: string,
): string {
  return `${requestInput}|${method}|${requestBody}`;
}

function loadLanguageProposalStatusRespectingCallerAbort(
  statusPromise: Promise<LanguageProposalStatus>,
  signal?: AbortSignal,
): Promise<LanguageProposalStatus> {
  if (signal == null) return statusPromise;
  if (signal.aborted) return Promise.resolve({ kind: "loading" });

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      resolve({ kind: "loading" });
    };
    signal.addEventListener("abort", onAbort, { once: true });
    statusPromise
      .then((status) => {
        signal.removeEventListener("abort", onAbort);
        resolve(status);
      })
      .catch(reject)
      .finally(() => {
        signal.removeEventListener("abort", onAbort);
      });
  });
}

export async function loadLanguageProposalStatus(
  options: LoadLanguageProposalStatusOptions = {},
): Promise<LanguageProposalStatus> {
  const endpoint = options.endpoint ?? DEFAULT_LANGUAGE_PROPOSAL_ENDPOINT;
  const requestUrl = hasBrowserOrigin()
    ? new URL(endpoint, globalThis.location.origin)
    : isAbsoluteEndpoint(endpoint)
      ? new URL(endpoint)
      : new URL(`${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`, "http://127.0.0.1");

  const requestInput = hasBrowserOrigin() || isAbsoluteEndpoint(endpoint) ? requestUrl.toString() : `${requestUrl.pathname}${requestUrl.search}`;
  const hasEvidencePack = options.evidencePack != null;
  const method = hasEvidencePack ? "POST" : "GET";
  const requestBody = hasEvidencePack ? stableRequestBody(options.evidencePack) : "";
  const cacheKey = makeLanguageProposalStatusCacheKey(requestInput, method, requestBody);

  if (hasEvidencePack) {
    const cachedStatus = languageProposalStatusResultCache.get(cacheKey);
    if (cachedStatus != null) {
      return loadLanguageProposalStatusRespectingCallerAbort(Promise.resolve(cachedStatus), options.signal);
    }

    const persistedStatus = loadLanguageProposalStatusFromStorage(cacheKey);
    if (persistedStatus != null) {
      languageProposalStatusResultCache.set(cacheKey, persistedStatus);
      return loadLanguageProposalStatusRespectingCallerAbort(Promise.resolve(persistedStatus), options.signal);
    }

    const pending = languageProposalStatusPromiseCache.get(cacheKey);
    if (pending != null) {
      return loadLanguageProposalStatusRespectingCallerAbort(pending, options.signal);
    }
  }

  const executeRequest = async (): Promise<LanguageProposalStatus> => {
    try {
      const response = await fetch(requestInput, {
        body: options.evidencePack == null ? undefined : requestBody,
        headers: options.evidencePack == null ? undefined : { "content-type": "application/json" },
        method,
        signal: hasEvidencePack ? undefined : options.signal,
      });
      if (!response.ok) {
        let blockedReason = `language proposal endpoint returned ${response.status}: ${response.statusText}`;
        let trace: LanguageProposalRuntimeTrace | undefined;
        try {
          const payload = await response.json();
          if (isObject(payload) && typeof payload.code === "string") {
            blockedReason = `${payload.code}: ${typeof payload.reason === "string" ? payload.reason : blockedReason}`;
          }
          if (isObject(payload) && isRuntimeTrace(payload.runtimeTrace)) {
            trace = payload.runtimeTrace;
          }
        } catch {
          // Preserve deterministic status text when the server does not return JSON.
        }
        return {
          kind: "unavailable",
          reason: blockedReason,
          trace,
        };
      }

      const payload = await response.json();
      if (!isLanguageProposal(payload)) {
        return {
          kind: "unavailable",
          reason: "language proposal endpoint returned an invalid payload",
        };
      }

      return { kind: "ready", proposal: payload };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return { kind: "loading" };
      }

      return {
        kind: "unavailable",
        reason: error instanceof Error ? error.message : "language proposal request failed",
      };
    }
  };

  if (hasEvidencePack) {
    const requestPromise = executeRequest()
      .then((status) => {
        if (status.kind === "ready") {
          languageProposalStatusResultCache.set(cacheKey, status);
          saveLanguageProposalStatusToStorage(cacheKey, status);
        } else {
          languageProposalStatusResultCache.delete(cacheKey);
        }
        return status;
      })
      .catch(() => {
        languageProposalStatusResultCache.delete(cacheKey);
        return { kind: "unavailable", reason: "language proposal request failed" } as LanguageProposalStatus;
      })
      .finally(() => {
        languageProposalStatusPromiseCache.delete(cacheKey);
      });

    languageProposalStatusPromiseCache.set(cacheKey, requestPromise);
    return loadLanguageProposalStatusRespectingCallerAbort(requestPromise, options.signal);
  }
  return executeRequest();
}

export function __clearLanguageProposalStatusTestCache(): void {
  languageProposalStatusPromiseCache.clear();
  languageProposalStatusResultCache.clear();
}

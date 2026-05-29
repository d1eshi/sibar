import { defineConfig, loadEnv } from "vite";
import { appendFileSync } from "node:fs";
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { repoInventory } from "../engine/repo-inventory/repo-inventory.js";

const PIERRE_REACT_DIST_FILE_PATTERN =
  /@pierre[/\\](?<packageName>[^/\\]+)[/\\]dist[/\\]react[/\\](?<filePath>[^"'\\\s]+?\.js)\b/;

// This is intentionally strict: if @pierre ships new React bundles with `"use client"`
// directives (or we start importing new surfaces), we want tests to force us to make an
// explicit decision instead of silently widening a filter.
export const ALLOWED_PIERRE_USE_CLIENT_REACT_FILES = Object.freeze([
  "@pierre/diffs/dist/react/CodeView.js",
  "@pierre/diffs/dist/react/File.js",
  "@pierre/diffs/dist/react/FileDiff.js",
  "@pierre/diffs/dist/react/MultiFileDiff.js",
  "@pierre/diffs/dist/react/PatchDiff.js",
  "@pierre/diffs/dist/react/UnresolvedFile.js",
  "@pierre/diffs/dist/react/Virtualizer.js",
  "@pierre/diffs/dist/react/WorkerPoolContext.js",
  "@pierre/trees/dist/react/FileTree.js",
  "@pierre/trees/dist/react/useFileTree.js",
  "@pierre/trees/dist/react/useFileTreeSearch.js",
  "@pierre/trees/dist/react/useFileTreeSelection.js",
  "@pierre/trees/dist/react/useFileTreeSelector.js",
]);

const ALLOWED_PIERRE_USE_CLIENT_REACT_FILES_SET = new Set(ALLOWED_PIERRE_USE_CLIENT_REACT_FILES);
const SIBI_APP_ROOT = path.dirname(fileURLToPath(import.meta.url));
const SIBI_REPO_ROOT = path.dirname(SIBI_APP_ROOT);
const SIBI_REPO_ROOT_REAL = realpath(SIBI_REPO_ROOT);
const SIBI_ENV = loadEnv(process.env.NODE_ENV ?? "development", SIBI_APP_ROOT, "");
for (const [key, value] of Object.entries(SIBI_ENV)) {
  if (process.env[key] == null) {
    process.env[key] = value;
  }
}
const REPO_SEARCH_SKIP_NAMES = new Set([
  ".cache",
  ".git",
  ".next",
  ".pnpm-store",
  ".turbo",
  ".vite",
  ".vite-cache",
  ".venv",
  ".vercel",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
]);
const REPO_SEARCH_TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".mdx",
  ".mjs",
  ".py",
  ".ts",
  ".tsx",
  ".txt",
]);
const REPO_SEARCH_MAX_FILE_SIZE_BYTES = 256 * 1024;
const REPO_SEARCH_MAX_RESULTS = 50;
const LANGUAGE_PROPOSAL_SCHEMA = "sibi-language-proposal.v1";
const LANGUAGE_PROPOSAL_BLOCKED_CODE = "blocked_llm_unavailable";

const GEMINI_CITATION_SCHEMA = {
  type: "OBJECT",
  properties: {
    evidenceId: { type: "STRING" },
    filePath: { type: "STRING" },
    startLine: { type: "INTEGER" },
    endLine: { type: "INTEGER" },
    symbol: { type: "STRING" },
  },
  required: ["evidenceId", "filePath", "startLine", "endLine"],
};

const GEMINI_CLAIM_SCHEMA = {
  type: "OBJECT",
  properties: {
    id: { type: "STRING" },
    kind: {
      type: "STRING",
      enum: ["boundary_candidate", "review_queue_copy", "attempt_prompt", "gap_label", "smallest_repair", "question"],
    },
    text: { type: "STRING" },
    confidence: {
      type: "STRING",
      enum: ["observed", "inferred", "unverified", "conflict"],
    },
    citations: {
      type: "ARRAY",
      items: GEMINI_CITATION_SCHEMA,
    },
  },
  required: ["id", "kind", "text", "confidence", "citations"],
};

const GEMINI_LANGUAGE_PROPOSAL_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    schema: { type: "STRING" },
    providerId: { type: "STRING" },
    generatedAt: { type: "STRING" },
    selectedFilePath: { type: "STRING" },
    boundaryCandidates: { type: "ARRAY", items: GEMINI_CLAIM_SCHEMA },
    reviewQueueCopy: { type: "ARRAY", items: GEMINI_CLAIM_SCHEMA },
    attemptPrompt: GEMINI_CLAIM_SCHEMA,
    possibleGapLabels: { type: "ARRAY", items: GEMINI_CLAIM_SCHEMA },
    smallestRepairCopy: GEMINI_CLAIM_SCHEMA,
    questions: { type: "ARRAY", items: GEMINI_CLAIM_SCHEMA },
  },
  required: [
    "schema",
    "providerId",
    "generatedAt",
    "selectedFilePath",
    "boundaryCandidates",
    "reviewQueueCopy",
    "attemptPrompt",
    "possibleGapLabels",
    "smallestRepairCopy",
  ],
};

function normalizeEvidenceId(value) {
  return String(value ?? "").trim();
}

function collectEvidenceReferences(evidencePack) {
  const references = new Map();

  const addEvidenceReference = (citation, fallbackEvidenceId) => {
    if (citation == null || typeof citation !== "object") return;

    const evidenceId = normalizeEvidenceId(citation.evidenceId ?? fallbackEvidenceId);
    if (evidenceId === "") return;

    const filePath = String(citation.filePath ?? "").trim();
    const startLine = Number(citation.startLine);
    const endLine = Number(citation.endLine);
    const symbol = citation?.symbol;
    if (!Number.isInteger(startLine) || !Number.isInteger(endLine) || filePath === "") return;

    const canonicalReference = {
      evidenceId,
      filePath,
      startLine,
      endLine,
    };

    if (typeof symbol === "string" && symbol.trim() !== "") {
      canonicalReference.symbol = symbol;
    }

    references.set(evidenceId, canonicalReference);
  };

  const relationEntries = [
    ...(Array.isArray(evidencePack?.nearbyTests) ? evidencePack.nearbyTests : []),
    ...(Array.isArray(evidencePack?.nearbyDocs) ? evidencePack.nearbyDocs : []),
    ...(Array.isArray(evidencePack?.callerCandidates) ? evidencePack.callerCandidates : []),
    ...(Array.isArray(evidencePack?.searchResults) ? evidencePack.searchResults : []),
    ...(Array.isArray(evidencePack?.projectSignals) ? evidencePack.projectSignals : []),
  ];

  for (const source of [
    ...(Array.isArray(evidencePack?.excerpts) ? evidencePack.excerpts : []),
    ...(Array.isArray(evidencePack?.imports) ? evidencePack.imports : []),
    ...(Array.isArray(evidencePack?.exports) ? evidencePack.exports : []),
    ...(Array.isArray(evidencePack?.symbols) ? evidencePack.symbols : []),
  ]) {
    addEvidenceReference(source);
  }

  for (const candidate of relationEntries) {
    if (candidate == null || typeof candidate !== "object") continue;

    if (typeof candidate.id === "string" && candidate.id !== "") {
      const firstCitation = Array.isArray(candidate.citations) ? candidate.citations[0] : null;
      if (firstCitation != null) {
        addEvidenceReference(firstCitation, candidate.id);
      }
    }

    for (const citation of Array.isArray(candidate.citations) ? candidate.citations : []) {
      addEvidenceReference(citation);
    }
  }

  return references;
}

function canonicalizeClaimCitations(claim, evidenceReferences) {
  const citations = [];
  if (claim == null || typeof claim !== "object") {
    return claim;
  }

  if (Array.isArray(claim.citations)) {
    for (const citation of claim.citations) {
      const evidenceId = normalizeEvidenceId(citation?.evidenceId);
      const canonical = evidenceReferences.get(evidenceId);
      if (canonical == null) continue;

      const canonicalCitation = {
        evidenceId: canonical.evidenceId,
        filePath: canonical.filePath,
        startLine: canonical.startLine,
        endLine: canonical.endLine,
      };

      if (Object.hasOwn(canonical, "symbol")) {
        canonicalCitation.symbol = canonical.symbol;
      }

      citations.push(canonicalCitation);
    }
  }

  return {
    ...claim,
    citations,
  };
}

function normalizeLanguageProposalFromGemini(payload, evidencePack) {
  const evidenceReferences = collectEvidenceReferences(evidencePack);

  return {
    ...payload,
    boundaryCandidates: Array.isArray(payload.boundaryCandidates)
      ? payload.boundaryCandidates.map((claim) => canonicalizeClaimCitations(claim, evidenceReferences))
      : [],
    reviewQueueCopy: Array.isArray(payload.reviewQueueCopy)
      ? payload.reviewQueueCopy.map((claim) => canonicalizeClaimCitations(claim, evidenceReferences))
      : [],
    attemptPrompt: canonicalizeClaimCitations(payload.attemptPrompt, evidenceReferences),
    possibleGapLabels: Array.isArray(payload.possibleGapLabels)
      ? payload.possibleGapLabels.map((claim) => canonicalizeClaimCitations(claim, evidenceReferences))
      : [],
    smallestRepairCopy: canonicalizeClaimCitations(payload.smallestRepairCopy, evidenceReferences),
    ...(Array.isArray(payload.questions)
      ? {
          questions: payload.questions.map((claim) => canonicalizeClaimCitations(claim, evidenceReferences)),
        }
      : {}),
    ...(Array.isArray(payload.readiness)
      ? {
          readiness: payload.readiness.map((claim) => canonicalizeClaimCitations(claim, evidenceReferences)),
        }
      : {}),
  };
}

function isInsideRealPath(rootPath, candidatePath) {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function normalizeRepoAlias(value) {
  const normalized = normalizeSourceRootLabel(value);
  return normalized === "src" || normalized.startsWith("src/") ? "" : normalized;
}

function getAllowedRepoAlias(sourceRoot) {
  const aliases = String(process.env.SIBI_REPO_ALIASES ?? "")
    .split(/[,\n;]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const entry of aliases) {
    const separatorIndex = entry.indexOf("=");
    if (separatorIndex === -1) continue;

    const alias = normalizeRepoAlias(entry.slice(0, separatorIndex));
    const absolutePath = entry.slice(separatorIndex + 1).trim();
    if (!alias || alias !== sourceRoot || !path.isAbsolute(absolutePath) || absolutePath.includes("\0")) continue;

    return {
      alias,
      absolutePath,
    };
  }

  return null;
}

async function resolveInventorySourceRoot(sourceRoot) {
  const normalizedSourceRoot = normalizeSourceRootLabel(sourceRoot);
  if (!normalizedSourceRoot) {
    return {
      normalizedSourceRoot,
      absoluteSourceRoot: SIBI_APP_ROOT,
      isInsideAppRoot: false,
    };
  }

  const repoAlias = getAllowedRepoAlias(normalizedSourceRoot);
  const absoluteSourceRoot =
    repoAlias?.absolutePath ??
    (normalizedSourceRoot === "src" || normalizedSourceRoot.startsWith("src/")
      ? path.resolve(SIBI_APP_ROOT, normalizedSourceRoot)
      : path.resolve(SIBI_REPO_ROOT, normalizedSourceRoot));

  const [repoRootRealPath, sourceRootRealPath] = await Promise.all([
    repoAlias == null ? SIBI_REPO_ROOT_REAL : realpath(repoAlias.absolutePath),
    realpath(absoluteSourceRoot),
  ]);

  return {
    normalizedSourceRoot,
    absoluteSourceRoot,
    sourceRootRealPath,
    isInsideAppRoot: isInsideRealPath(repoRootRealPath, sourceRootRealPath),
  };
}

function normalizeContentPath(value) {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "") return "";

  if (path.isAbsolute(trimmed)) return "";
  if (/(^|[\\/])\.\.(?:[\\/]|$)/.test(trimmed)) return "";
  if (trimmed.includes("\0")) return "";

  const normalized = path.normalize(trimmed).replaceAll("\\", "/");
  return normalized.replace(/^\.\//, "").replace(/\/+$/, "");
}

async function resolveFileContentTarget({ sourceRoot, rawPath }) {
  const normalizedSourceRoot = normalizeFileContentSourceRoot(sourceRoot ?? "src");
  if (!normalizedSourceRoot) {
    return {
      kind: "invalid-source-root",
      normalizedSourceRoot: "src",
      message: "sourceRoot must stay inside the Sibi repo root",
    };
  }

  const sourceRootResolution = await resolveInventorySourceRoot(normalizedSourceRoot);
  const normalizedPath = normalizeContentPath(rawPath);

  if (!sourceRootResolution.isInsideAppRoot) {
    return {
      kind: "invalid-source-root",
      normalizedSourceRoot,
      message: "sourceRoot must stay inside the Sibi repo root",
    };
  }

  if (!normalizedPath) {
    return {
      kind: "invalid-path",
      normalizedSourceRoot,
      message: "path must be a relative file path inside the selected sourceRoot",
    };
  }

  const sourceRootPrefix = `${normalizedSourceRoot}/`;
  const normalizedRelativePath = normalizedPath.startsWith(sourceRootPrefix)
    ? normalizedPath.slice(sourceRootPrefix.length)
    : normalizedPath;

  if (!normalizedRelativePath || normalizedRelativePath === normalizedSourceRoot) {
    return {
      kind: "invalid-path",
      normalizedSourceRoot,
      message: "path must be a regular file inside the selected sourceRoot",
    };
  }

  const sourceRootItem = path.resolve(sourceRootResolution.absoluteSourceRoot, normalizedRelativePath);

  try {
    const [sourceRootRealPath, targetRealPath, targetStats] = await Promise.all([
      realpath(sourceRootResolution.absoluteSourceRoot),
      realpath(sourceRootItem),
      stat(sourceRootItem),
    ]);

    if (!targetStats.isFile()) {
      return {
        kind: "invalid-target",
        normalizedSourceRoot,
        message: "path must target a regular file",
      };
    }

    if (!isInsideRealPath(sourceRootRealPath, targetRealPath)) {
      return {
        kind: "invalid-target",
        normalizedSourceRoot,
        message: "path must stay inside the selected sourceRoot",
      };
    }

    return {
      kind: "ready",
      normalizedSourceRoot,
      normalizedPath,
      sourceRootRealPath,
      targetRealPath,
    };
  } catch (error) {
    if (error instanceof Error && error.code === "ENOENT") {
      return {
        kind: "missing",
        normalizedSourceRoot,
        message: "file not found",
      };
    }

    if (error instanceof Error && error.code === "ELOOP") {
      return {
        kind: "invalid-target",
        normalizedSourceRoot,
        message: "path resolution failed",
      };
    }

    throw error;
  }
}

function compareRepoSearchPath(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function normalizeRepoSearchQuery(value) {
  return String(value ?? "").trim();
}

function toRepoSearchPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function isRepoSearchTextFile(filePath) {
  return REPO_SEARCH_TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function makeRepoSearchExcerpt(line, queryIndex, queryLength) {
  const compactLine = line.trim().replace(/\s+/g, " ");
  if (compactLine.length <= 180) return compactLine;

  const start = Math.max(0, queryIndex - 70);
  const end = Math.min(compactLine.length, queryIndex + queryLength + 70);
  return `${start > 0 ? "..." : ""}${compactLine.slice(start, end)}${end < compactLine.length ? "..." : ""}`;
}

async function collectRepoSearchResults({ sourceRootRealPath, sourceRootLabel, relativeDirectory, query, results }) {
  if (results.length >= REPO_SEARCH_MAX_RESULTS) return;

  const absoluteDirectory = path.join(sourceRootRealPath, relativeDirectory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });

  for (const entry of entries.toSorted((left, right) => compareRepoSearchPath(left.name, right.name))) {
    if (results.length >= REPO_SEARCH_MAX_RESULTS) return;
    if (REPO_SEARCH_SKIP_NAMES.has(entry.name.toLowerCase())) continue;

    const relativePath = path.join(relativeDirectory, entry.name);
    const absolutePath = path.join(sourceRootRealPath, relativePath);

    if (entry.isDirectory()) {
      const directoryRealPath = await realpath(absolutePath);
      if (!isInsideRealPath(sourceRootRealPath, directoryRealPath)) continue;
      await collectRepoSearchResults({
        sourceRootRealPath,
        sourceRootLabel,
        relativeDirectory: relativePath,
        query,
        results,
      });
      continue;
    }

    if (!entry.isFile() || !isRepoSearchTextFile(relativePath)) continue;

    const [targetRealPath, targetStats] = await Promise.all([realpath(absolutePath), stat(absolutePath)]);
    if (!isInsideRealPath(sourceRootRealPath, targetRealPath)) continue;
    if (!targetStats.isFile() || targetStats.size > REPO_SEARCH_MAX_FILE_SIZE_BYTES) continue;

    const contents = await readFile(targetRealPath, "utf8");
    const lines = contents.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const lowerQuery = query.toLowerCase();

    for (const [lineIndex, line] of lines.entries()) {
      const queryIndex = line.toLowerCase().indexOf(lowerQuery);
      if (queryIndex === -1) continue;

      const normalizedPath = toRepoSearchPath(relativePath);
      results.push({
        path: `${sourceRootLabel}/${normalizedPath}`,
        line: lineIndex + 1,
        excerpt: makeRepoSearchExcerpt(line, queryIndex, query.length),
        query,
      });

      if (results.length >= REPO_SEARCH_MAX_RESULTS) return;
    }
  }
}

async function searchRepoSourceRoot({ sourceRoot, query }) {
  const normalizedQuery = normalizeRepoSearchQuery(query);
  const sourceRootResolution = await resolveInventorySourceRoot(sourceRoot);

  if (!sourceRootResolution.isInsideAppRoot) {
    return {
      kind: "invalid-source-root",
      message: "sourceRoot must stay inside the Sibi repo root",
    };
  }

  if (!normalizedQuery) {
    return {
      kind: "invalid-query",
      message: "query is required",
    };
  }

  const sourceRootRealPath = sourceRootResolution.sourceRootRealPath ?? (await realpath(sourceRootResolution.absoluteSourceRoot));
  const results = [];
  await collectRepoSearchResults({
    sourceRootRealPath,
    sourceRootLabel: sourceRootResolution.normalizedSourceRoot,
    relativeDirectory: "",
    query: normalizedQuery,
    results,
  });

  return {
    kind: "ready",
    payload: {
      sourceRoot: sourceRootResolution.normalizedSourceRoot,
      query: normalizedQuery,
      results,
    },
  };
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding?.("utf8");
    request.on?.("data", (chunk) => {
      body += String(chunk);
    });
    request.on?.("end", () => {
      resolve(body);
    });
    request.on?.("error", reject);

    if (typeof request.on !== "function") {
      resolve(String(request.body ?? ""));
    }
  });
}

function firstEvidenceCitation(evidencePack) {
  const excerpt = Array.isArray(evidencePack?.excerpts) ? evidencePack.excerpts[0] : null;
  if (excerpt != null) {
    return {
      evidenceId: String(excerpt.evidenceId),
      filePath: String(excerpt.filePath),
      startLine: Number(excerpt.startLine),
      endLine: Number(excerpt.endLine),
    };
  }

  const selectedFilePath = String(evidencePack?.selectedFilePath ?? "unknown");
  const evidenceId = String(Array.isArray(evidencePack?.evidenceIds) ? evidencePack.evidenceIds[0] : `${selectedFilePath}:1-1:mock`);
  return {
    evidenceId,
    filePath: selectedFilePath,
    startLine: 1,
    endLine: 1,
  };
}

function makeLanguageProposalPrompt(evidencePack) {
  return [
    "Return only a complete JSON object matching schema sibi-language-proposal.v1.",
    "Required top-level fields: schema, providerId, generatedAt, selectedFilePath, boundaryCandidates, reviewQueueCopy, attemptPrompt, possibleGapLabels, smallestRepairCopy.",
    "Set schema to 'sibi-language-proposal.v1', providerId to 'gemini-first', generatedAt to an ISO timestamp, and selectedFilePath exactly equal to the evidence pack selectedFilePath.",
    "attemptPrompt.text must be a question or short defense instruction that asks for the next ownership step and always cites at least one selected-file granular evidence span.",
    "If `questions` is present, it must enforce step-by-step ownership discovery in this exact order: (1) repository architecture / directory-level structure from projectSignals, (2) selected-file role inside that structure, (3) behavior of the focused block/symbol/range from selected-file excerpts, (4) first repair/refactor or responsibility-separation gate + minimal evidence needed.",
    "Each `questions` claim must include at least one citation from the selected file (`filePath === selectedFilePath`).",
    "If any `questions` claim uses projectSignals, that claim still must include at least one selected-file citation (no `projectSignals`-only questions).",
    "Do not include generic repo-overview questions (for example README/Vite/build tooling) that do not move ownership toward the focused selected file/range/symbol.",
    "Every claim citation.evidenceId must be one exact string from evidencePack.evidenceIds; do not invent narrower ranges or reuse an evidenceId with different lines.",
    "Entry id fields on nearbyTests, nearbyDocs, callerCandidates, searchResults, and projectSignals are relation aliases only when that exact id appears in evidencePack.evidenceIds; otherwise use the entry's own evidenceIds values.",
    "Prefer granular selected-file excerpt spans over broad excerpt spans when they support the claim.",
    "If a citation's evidenceId is from evidencePack.evidenceIds, use the canonical filePath/startLine/endLine for that exact id from evidencePack; do not create new line ranges.",
    "Each claim must include id, kind, text, confidence, and citations. Each citation must include evidenceId, filePath, startLine, and endLine exactly matching the cited evidenceId value.",
    "Use confidence 'observed' only for direct textual facts stated in the cited lines.",
    "Responsibility, boundary, gap, repair, review-queue, and attempt-prompt wording is semantic interpretation and must use confidence 'inferred' or 'unverified' unless the text is a direct citation or line description.",
    "Use projectSignals to describe the repository context before proposing the first ownership review question.",
    "Do not include a top-level readiness field.",
    "Do not claim readiness and do not use readiness-gate words such as readiness, ready, owned, ownership complete, production-ready, or can update readiness.",
    "When you need that idea, phrase it as a question about what evidence the user should inspect next.",
    JSON.stringify(evidencePack),
  ].join("\n\n");
}

function makeRuntimeTrace({ evidencePack, model, prompt, rawResponse }) {
  return {
    providerId: "gemini-first",
    model,
    prompt,
    evidenceIdCount: Array.isArray(evidencePack?.evidenceIds) ? evidencePack.evidenceIds.length : 0,
    ...(rawResponse === undefined ? {} : { rawResponse }),
  };
}

function makeSanitizedRuntimeTrace({ evidencePack, model, reason }) {
  const evidenceIdCount = Array.isArray(evidencePack?.evidenceIds) ? evidencePack.evidenceIds.length : 0;
  const selectedFilePath = typeof evidencePack?.selectedFilePath === "string" ? evidencePack.selectedFilePath : "unknown";
  return {
    providerId: "gemini-first",
    model,
    evidenceIdCount,
    prompt: `Prompt omitted from unavailable response (${reason}); evidencePack JSON not included. selectedFilePath=${selectedFilePath}; evidenceIdCount=${evidenceIdCount}.`,
  };
}

function makeMockLanguageProposal(evidencePack) {
  const selectedFilePath = String(evidencePack?.selectedFilePath ?? "unknown");
  const citation = firstEvidenceCitation(evidencePack);
  const claim = (id, kind, text) => ({
    id,
    kind,
    text,
    confidence: "observed",
    citations: [citation],
  });

  return {
    schema: LANGUAGE_PROPOSAL_SCHEMA,
    providerId: "sibi-test-mock",
    generatedAt: "2026-01-01T00:00:00.000Z",
    selectedFilePath,
    boundaryCandidates: [
      claim(
        "mock-boundary-candidate",
        "boundary_candidate",
        `Review ${selectedFilePath} first because the selected file evidence is the current ownership anchor.`,
      ),
    ],
    reviewQueueCopy: [
      claim(
        "mock-review-queue-copy",
        "review_queue_copy",
        `Attempt-first: explain what ${selectedFilePath} owns, then name the next evidence gap from the cited lines.`,
      ),
    ],
    attemptPrompt: claim(
      "mock-attempt-prompt",
      "attempt_prompt",
      `Attempt-first prompt: use the cited ${selectedFilePath} lines to state the boundary before asking for more context.`,
    ),
    possibleGapLabels: [
      claim("mock-gap-label", "gap_label", `Next gap: verify callers or tests related to ${selectedFilePath}.`),
    ],
    smallestRepairCopy: claim(
      "mock-smallest-repair",
      "smallest_repair",
      `Smallest repair: read the cited ${selectedFilePath} span and one adjacent relation before claiming ownership.`,
    ),
  };
}

async function requestLanguageProposalFromGemini({ evidencePack, apiKey, model }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const prompt = makeLanguageProposalPrompt(evidencePack);
  const baseTrace = makeRuntimeTrace({ evidencePack, model, prompt });

  const upstreamResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: GEMINI_LANGUAGE_PROPOSAL_RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    }),
  });

  if (!upstreamResponse.ok) {
    return {
      kind: "unavailable",
      status: upstreamResponse.status,
      reason: `Gemini language proposal request failed with ${upstreamResponse.status}`,
      trace: baseTrace,
    };
  }

  const payload = await upstreamResponse.json();
  const text = payload?.candidates?.[0]?.content?.parts?.find((part) => typeof part?.text === "string")?.text;
  const trace = makeRuntimeTrace({
    evidencePack,
    model,
    prompt,
    rawResponse: {
      text,
      finishReason: payload?.candidates?.[0]?.finishReason,
      usageMetadata: payload?.usageMetadata,
    },
  });
  if (typeof text !== "string" || text.trim() === "") {
    return {
      kind: "unavailable",
      status: 502,
      reason: "Gemini language proposal response did not include JSON text",
      trace,
    };
  }

  const parsed = JSON.parse(text);

  return {
    kind: "ready",
    proposal: {
      ...normalizeLanguageProposalFromGemini(parsed, evidencePack),
      runtimeTrace: trace,
    },
  };
}

export {
  resolveInventorySourceRoot,
  resolveFileContentTarget,
  searchRepoSourceRoot,
  makeMockLanguageProposal,
};

export function getPierreReactDistFileId(warning) {
  const message = String(warning?.message ?? "");
  const id = String(warning?.id ?? warning?.loc?.file ?? "");

  const haystack = `${id}\n${message}`;
  const match = haystack.match(PIERRE_REACT_DIST_FILE_PATTERN);
  if (!match?.groups) return null;

  const packageName = match.groups.packageName;
  const filePath = match.groups.filePath.replaceAll("\\", "/");
  return `@pierre/${packageName}/dist/react/${filePath}`;
}

export function isPierreModuleLevelDirectiveWarning(warning) {
  const message = String(warning?.message ?? "");
  const pierreReactFileId = getPierreReactDistFileId(warning);

  if (pierreReactFileId == null) return false;
  if (!ALLOWED_PIERRE_USE_CLIENT_REACT_FILES_SET.has(pierreReactFileId)) return false;

  return (
    warning?.code === "MODULE_LEVEL_DIRECTIVE" &&
    message.includes("Module level directives cause errors when bundled") &&
    message.includes('"use client"')
  );
}

function normalizeSourceRootLabel(sourceRoot) {
  const trimmed = String(sourceRoot ?? "").trim();
  if (trimmed === "") return "src";
  if (path.isAbsolute(trimmed)) return "";
  if (trimmed.includes("\0")) return "";
  if (trimmed === "." || trimmed === ".." || /(^|[\\/])\.\.(?:[\\/]|$)/.test(trimmed)) return "";

  const normalized = path
    .normalize(trimmed)
    .replaceAll("\\", "/")
    .replace(/\/+/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "");

  if (normalized === "" || normalized === ".") return "";
  return normalized;
}

function normalizeFileContentSourceRoot(sourceRoot) {
  const trimmed = String(sourceRoot ?? "").trim();
  if (trimmed === "") return "";
  if (path.isAbsolute(trimmed)) return "";
  if (trimmed.includes("\0")) return "";
  if (trimmed === ".") return "";
  if (trimmed === ".." || /(^|[\\/])\.\.(?:[\\/]|$)/.test(trimmed)) return "";

  const normalized = path
    .normalize(trimmed)
    .replaceAll("\\", "/")
    .replace(/\/+/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "");

  if (normalized === "" || normalized === ".") return "";
  return normalized;
}

export default defineConfig({
  cacheDir: ".vite-cache",
  plugins: [
    {
      name: "sibi-repo-inventory-endpoint",
      configureServer(server) {
        server.middlewares.use("/__sibi/repo-inventory", async (request, response) => {
          try {
            const requestUrl = new URL(request.url ?? "", "http://sibi.local");
            const rawSourceRoot = requestUrl.searchParams.get("sourceRoot") ?? "src";
            const sourceRootResolution = await resolveInventorySourceRoot(rawSourceRoot);

            if (!sourceRootResolution.isInsideAppRoot) {
              response.statusCode = 400;
              response.setHeader("content-type", "application/json");
              response.end(JSON.stringify({ error: "sourceRoot must stay inside the Sibi repo root" }));
              return;
            }

            const inventory = await repoInventory(sourceRootResolution.absoluteSourceRoot, {
              sourceRootLabel: sourceRootResolution.normalizedSourceRoot,
            });

            response.statusCode = 200;
            response.setHeader("content-type", "application/json");
            response.end(JSON.stringify(inventory));
          } catch (error) {
            if (error instanceof Error && (error.message.includes("sourceRoot") || error.code === "ENOENT")) {
              response.statusCode = 400;
              response.setHeader("content-type", "application/json");
              response.end(
                JSON.stringify({
                  error:
                    error instanceof Error && error.message.includes("must stay inside the Sibi repo root")
                      ? error.message
                      : `sourceRoot validation failed: ${error.message}`,
                }),
              );
              return;
            }

            response.statusCode = 500;
            response.setHeader("content-type", "application/json");
            response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
          }
        });
      },
    },
    {
      name: "sibi-file-content-endpoint",
      configureServer(server) {
        server.middlewares.use("/__sibi/file-content", async (request, response) => {
          try {
            const requestUrl = new URL(request.url ?? "", "http://sibi.local");
            const rawSourceRoot = requestUrl.searchParams.get("sourceRoot") ?? "src";
            const rawPath = requestUrl.searchParams.get("path");
            const target = await resolveFileContentTarget({
              sourceRoot: rawSourceRoot,
              rawPath,
            });

            if (target.kind === "invalid-source-root" || target.kind === "invalid-path") {
              response.statusCode = 400;
              response.setHeader("content-type", "application/json");
              response.end(JSON.stringify({ error: target.message }));
              return;
            }

            if (target.kind === "invalid-target") {
              response.statusCode = 400;
              response.setHeader("content-type", "application/json");
              response.end(JSON.stringify({ error: target.message }));
              return;
            }

            if (target.kind === "missing") {
              response.statusCode = 404;
              response.setHeader("content-type", "application/json");
              response.end(JSON.stringify({ error: "file not found" }));
              return;
            }

            const contents = await readFile(target.targetRealPath, "utf8");
            const payload = {
              sourceRoot: target.normalizedSourceRoot,
              path: target.normalizedPath,
              contents,
              lineCount: contents.split("\n").length,
              sizeBytes: Buffer.byteLength(contents, "utf8"),
            };

            response.statusCode = 200;
            response.setHeader("content-type", "application/json");
            response.end(JSON.stringify(payload));
          } catch (error) {
            console.error("sibi file-content endpoint failed", error);
            response.statusCode = 500;
            response.setHeader("content-type", "application/json");
            response.end(JSON.stringify({ error: "unexpected file-content error" }));
          }
        });
      },
    },
    {
      name: "sibi-repo-search-endpoint",
      configureServer(server) {
        server.middlewares.use("/__sibi/repo-search", async (request, response) => {
          try {
            const requestUrl = new URL(request.url ?? "", "http://sibi.local");
            const rawSourceRoot = requestUrl.searchParams.get("sourceRoot") ?? "src";
            const rawQuery = requestUrl.searchParams.get("query") ?? requestUrl.searchParams.get("q");
            const search = await searchRepoSourceRoot({
              sourceRoot: rawSourceRoot,
              query: rawQuery,
            });

            if (search.kind === "invalid-source-root" || search.kind === "invalid-query") {
              response.statusCode = 400;
              response.setHeader("content-type", "application/json");
              response.end(JSON.stringify({ error: search.message }));
              return;
            }

            response.statusCode = 200;
            response.setHeader("content-type", "application/json");
            response.end(JSON.stringify(search.payload));
          } catch (error) {
            if (error instanceof Error && (error.message.includes("sourceRoot") || error.code === "ENOENT")) {
              response.statusCode = 400;
              response.setHeader("content-type", "application/json");
              response.end(JSON.stringify({ error: `sourceRoot validation failed: ${error.message}` }));
              return;
            }

            console.error("sibi repo-search endpoint failed", error);
            response.statusCode = 500;
            response.setHeader("content-type", "application/json");
            response.end(JSON.stringify({ error: "unexpected repo-search error" }));
          }
        });
      },
    },
    {
      name: "sibi-language-proposal-endpoint",
      configureServer(server) {
        server.middlewares.use("/__sibi/language-proposal", async (request, response) => {
          try {
            const rawBody = await readRequestBody(request);
            const evidencePack = rawBody.trim() === "" ? null : JSON.parse(rawBody);
            const mockRequested = process.env.SIBI_LANGUAGE_PROPOSAL_MOCK === "1";

            if (mockRequested) {
              response.statusCode = 200;
              response.setHeader("content-type", "application/json");
              response.end(JSON.stringify(makeMockLanguageProposal(evidencePack)));
              return;
            }

            const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
            const model = process.env.SIBI_LANGUAGE_PROPOSAL_MODEL ?? "gemini-2.5-flash";
            const unavailableTrace = (reason) => makeSanitizedRuntimeTrace({ evidencePack, model, reason });
            if (!apiKey) {
              response.statusCode = 503;
              response.setHeader("content-type", "application/json");
              response.end(
                JSON.stringify({
                  error: LANGUAGE_PROPOSAL_BLOCKED_CODE,
                  code: LANGUAGE_PROPOSAL_BLOCKED_CODE,
                  providerId: "gemini-first",
                  reason: "Gemini API key is not configured for server-side language proposals.",
                  runtimeTrace: unavailableTrace("Gemini API key is not configured"),
                }),
              );
              return;
            }

            const result = await requestLanguageProposalFromGemini({ evidencePack, apiKey, model });
            if (result.kind !== "ready") {
              response.statusCode = result.status;
              response.setHeader("content-type", "application/json");
              response.end(
                JSON.stringify({
                  error: LANGUAGE_PROPOSAL_BLOCKED_CODE,
                  code: LANGUAGE_PROPOSAL_BLOCKED_CODE,
                  providerId: "gemini-first",
                  reason: result.reason,
                  runtimeTrace: unavailableTrace(result.reason),
                }),
              );
              return;
            }

            response.statusCode = 200;
            response.setHeader("content-type", "application/json");
            response.end(JSON.stringify(result.proposal));
          } catch (error) {
            response.statusCode = error instanceof SyntaxError ? 400 : 500;
            response.setHeader("content-type", "application/json");
            response.end(
              JSON.stringify({
                error: LANGUAGE_PROPOSAL_BLOCKED_CODE,
                code: LANGUAGE_PROPOSAL_BLOCKED_CODE,
                providerId: "gemini-first",
                reason: error instanceof SyntaxError ? "invalid evidence pack JSON" : "unexpected language-proposal error",
                runtimeTrace: makeSanitizedRuntimeTrace({
                  evidencePack: null,
                  model: process.env.SIBI_LANGUAGE_PROPOSAL_MODEL ?? "gemini-2.5-flash",
                  reason: error instanceof SyntaxError ? "invalid evidence pack JSON" : "unexpected language-proposal error",
                }),
              }),
            );
          }
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        if (isPierreModuleLevelDirectiveWarning(warning)) {
          const traceFile = process.env.SIBI_PIERRE_WARNING_TRACE_FILE;
          if (traceFile) {
            const fileId = getPierreReactDistFileId(warning);
            if (fileId) appendFileSync(traceFile, `${fileId}\n`, "utf8");
          }
          return;
        }

        defaultHandler(warning);
      },
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
});

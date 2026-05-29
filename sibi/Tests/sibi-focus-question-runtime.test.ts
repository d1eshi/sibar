import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEvidencePack,
  LANGUAGE_PROPOSAL_SCHEMA,
  verifyLanguageProposal,
  type EvidenceCitation,
  type LanguageProposal,
  type LanguageProposalClaim,
} from "../src/ownershipWorkbench/languageProposal.ts";
import {
  buildFocusCandidates,
  findFocusCandidateForCitation,
} from "../src/ownershipWorkbench/focusCandidates.ts";
import { buildQuestionBatchFromLanguageProposal } from "../src/ownershipWorkbench/questionBatch.ts";
import { buildQuestionQueueProjection } from "../src/ownershipWorkbench/questionQueue.ts";
import type { RepoInventory } from "../src/ownershipWorkbench/repoInventoryTypes.ts";

const fileContents = {
  "src/api/session.ts": [
    "import { fetchJson } from './http';",
    "",
    "export function createSession(userId: string) {",
    "  const path = `/session/${userId}`;",
    "  return fetchJson(path);",
    "}",
  ].join("\n"),
  "src/api/sessionConsumer.ts": [
    "import { createSession } from './session';",
    "export const run = () => createSession('u2');",
  ].join("\n"),
};

const inventory: RepoInventory = {
  sourceRoot: "src",
  generatedAt: "2026-01-01T00:00:00.000Z",
  files: [
    {
      path: "src/api/session.ts",
      extension: ".ts",
      role: "source",
      sizeBytes: fileContents["src/api/session.ts"].length,
      lineCount: 6,
      excerpt: "export function createSession(userId: string) {",
    },
    {
      path: "src/api/sessionConsumer.ts",
      extension: ".ts",
      role: "source",
      sizeBytes: fileContents["src/api/sessionConsumer.ts"].length,
      lineCount: 2,
      excerpt: "export const run = () => createSession('u2');",
    },
  ],
  tree: {
    path: "src",
    kind: "directory",
    fileCount: 2,
    totalSizeBytes: 220,
    children: [],
  },
};

function claim(
  id: string,
  kind: LanguageProposalClaim["kind"],
  text: string,
  citation: EvidenceCitation,
  confidence: LanguageProposalClaim["confidence"] = "observed",
): LanguageProposalClaim {
  return {
    id,
    kind,
    text,
    confidence,
    citations: [citation],
  };
}

function buildPack() {
  return buildEvidencePack({
    inventory,
    selectedFilePath: "src/api/session.ts",
    userIntent: "Understand session creation ownership.",
    fileContents,
    repoSearches: [
      {
        query: "createSession",
        results: [
          {
            path: "src/api/sessionConsumer.ts",
            line: 2,
            excerpt: "export const run = () => createSession('u2');",
          },
        ],
      },
    ],
  });
}

test("buildFocusCandidates projects compact observed ranges with stable ids", () => {
  const pack = buildPack();
  const first = buildFocusCandidates({ evidencePack: pack, fileContents });
  const second = buildFocusCandidates({ evidencePack: pack, fileContents });

  assert.equal(first.schema, "sibi-focus-candidates.v1");
  assert.deepEqual(first.candidates.map((candidate) => candidate.id), second.candidates.map((candidate) => candidate.id));

  const functionCandidate = first.candidates.find(
    (candidate) => candidate.symbol === "createSession" && candidate.startLine === 3 && candidate.endLine === 6,
  );
  assert.ok(functionCandidate);
  assert.equal(functionCandidate.kind, "function");
  assert.equal(functionCandidate.confidence, "observed");
  assert.ok(functionCandidate.evidenceIds.includes("src/api/session.ts:3-6:excerpt"));
  assert.match(functionCandidate.excerpt, /fetchJson/);

  const lineCandidate = first.candidates.find((candidate) => candidate.startLine === 5 && candidate.endLine === 5);
  assert.ok(lineCandidate);
  assert.equal(lineCandidate.kind, "api_call");
});

test("findFocusCandidateForCitation maps verified citations to deterministic candidates", () => {
  const pack = buildPack();
  const focus = buildFocusCandidates({ evidencePack: pack, fileContents });
  const excerpt = pack.excerpts.find((entry) => entry.evidenceId === "src/api/session.ts:3-6:excerpt");
  assert.ok(excerpt);

  const candidate = findFocusCandidateForCitation(focus.candidates, excerpt);

  assert.ok(candidate);
  assert.equal(candidate.filePath, "src/api/session.ts");
  assert.equal(candidate.startLine, 3);
  assert.equal(candidate.endLine, 6);
});

test("findFocusCandidateForCitation expands single-line default export headers to component ownership blocks", () => {
  const appContents = [
    "import * as React from 'react';",
    "",
    "type Todo = { id: number; title: string };",
    "",
    "export default function App(): React.ReactElement {",
    "  const [todos, setTodos] = React.useState<Todo[]>([]);",
    "  const [title, setTitle] = React.useState('');",
    "  const addTodo = () => {",
    "    setTodos((items) => [...items, { id: items.length + 1, title }]);",
    "  };",
    "  return <form onSubmit={addTodo}>{todos.length}</form>;",
    "}",
  ].join("\n");
  const appFileContents = {
    "src/App.tsx": appContents,
  };
  const appInventory: RepoInventory = {
    sourceRoot: "src",
    generatedAt: "2026-01-01T00:00:00.000Z",
    files: [
      {
        path: "src/App.tsx",
        extension: ".tsx",
        role: "source",
        sizeBytes: appContents.length,
        lineCount: 12,
        excerpt: "export default function App(): React.ReactElement {",
      },
    ],
    tree: {
      path: "src",
      kind: "directory",
      fileCount: 1,
      totalSizeBytes: appContents.length,
      children: [],
    },
  };
  const pack = buildEvidencePack({
    inventory: appInventory,
    selectedFilePath: "src/App.tsx",
    userIntent: "Review App ownership.",
    fileContents: appFileContents,
  });
  const singleLineHeader = pack.excerpts.find((entry) => entry.evidenceId === "src/App.tsx:5-5:excerpt");
  assert.ok(singleLineHeader);
  const headerNeighborhood = pack.excerpts.find((entry) => entry.evidenceId === "src/App.tsx:4-6:excerpt");
  assert.ok(headerNeighborhood);
  const focus = buildFocusCandidates({ evidencePack: pack, fileContents: appFileContents });

  const candidate = findFocusCandidateForCitation(focus.candidates, singleLineHeader);
  const neighborhoodCandidate = findFocusCandidateForCitation(focus.candidates, headerNeighborhood);

  assert.ok(candidate);
  assert.equal(candidate.kind, "component");
  assert.equal(candidate.symbol, "App");
  assert.equal(candidate.startLine, 5);
  assert.equal(candidate.endLine, 12);
  assert.equal(candidate.ui.displayRangeLabel, "lines 5-12");
  assert.equal(neighborhoodCandidate?.id, candidate.id);
});

test("buildQuestionBatchFromLanguageProposal maps verified questions to focus candidates", () => {
  const pack = buildPack();
  const focus = buildFocusCandidates({ evidencePack: pack, fileContents });
  const excerpt = pack.excerpts.find((entry) => entry.evidenceId === "src/api/session.ts:3-6:excerpt");
  assert.ok(excerpt);
  const citation: EvidenceCitation = {
    evidenceId: excerpt.evidenceId,
    filePath: excerpt.filePath,
    startLine: excerpt.startLine,
    endLine: excerpt.endLine,
    symbol: "createSession",
  };
  const proposal: LanguageProposal = {
    schema: LANGUAGE_PROPOSAL_SCHEMA,
    providerId: "test-provider",
    generatedAt: "2026-01-01T00:00:00.000Z",
    selectedFilePath: "src/api/session.ts",
    boundaryCandidates: [],
    reviewQueueCopy: [],
    attemptPrompt: claim("prompt", "attempt_prompt", excerpt.text, citation),
    possibleGapLabels: [],
    smallestRepairCopy: claim("repair", "smallest_repair", excerpt.text, citation),
    questions: [
      claim(
        "trace-question",
        "question",
        "Can you trace why createSession builds the path before fetchJson?",
        citation,
      ),
    ],
  };
  const verification = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents });
  assert.ok(verification.kind === "accepted" || verification.kind === "accepted_with_questions");

  const batch = buildQuestionBatchFromLanguageProposal({
    proposal,
    verification,
    focusCandidates: focus.candidates,
  });

  assert.equal(batch.schema, "sibi-question-batch.v1");
  assert.equal(batch.providerId, "test-provider");
  assert.equal(batch.questions.length, 2);
  assert.equal(batch.questions[0]?.state, "active");
  assert.equal(batch.questions[1]?.intent, "trace");
  assert.equal(batch.diagnostics.length, 0);
  assert.deepEqual(batch.selectedFiles, ["src/api/session.ts"]);
});

test("buildQuestionBatchFromLanguageProposal rewrites generic provider text into concrete focus-guided prompt", () => {
  const pack = buildPack();
  const focus = buildFocusCandidates({ evidencePack: pack, fileContents });
  const excerpt = pack.excerpts.find((entry) => entry.evidenceId === "src/api/session.ts:3-6:excerpt");
  assert.ok(excerpt);

  const genericAttempt = claim(
    "prompt-generic",
    "attempt_prompt",
    "Considering this is a TypeScript/React project, please walk me through the high-level architecture and what this code does.",
    excerpt,
  );
  const proposal: LanguageProposal = {
    schema: LANGUAGE_PROPOSAL_SCHEMA,
    providerId: "test-provider",
    generatedAt: "2026-01-01T00:00:00.000Z",
    selectedFilePath: "src/api/session.ts",
    boundaryCandidates: [],
    reviewQueueCopy: [],
    attemptPrompt: genericAttempt,
    possibleGapLabels: [],
    smallestRepairCopy: claim(
      "repair",
      "smallest_repair",
      "The selected function may need extraction if validation logic grows.",
      excerpt,
    ),
  };
  const verification = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents });
  assert.ok(verification.kind === "accepted" || verification.kind === "accepted_with_questions");

  const batch = buildQuestionBatchFromLanguageProposal({
    proposal,
    verification,
    focusCandidates: focus.candidates,
  });

  assert.equal(batch.questions.length, 1);
  const generated = batch.questions[0];
  assert.ok(generated != null);
  assert.notEqual(generated.prompt, genericAttempt.text);
  assert.equal(generated.prompt.includes("Considering this is"), false);
  assert.equal(generated.prompt.includes("TypeScript/React project"), false);
  assert.ok(generated.prompt.includes("ownership boundary"));
  assert.ok(generated.prompt.includes("src/api/session.ts"));
  assert.ok(generated.prompt.includes("createSession"));
  assert.equal(generated.prompt.toLowerCase().includes("provider signal"), false);
  assert.equal(generated.prompt.includes("1)"), false);
  assert.equal(generated.prompt.includes("2)"), false);
  assert.equal(generated.prompt.includes("3)"), false);
  assert.equal(generated.prompt.includes("4)"), false);

  const queue = buildQuestionQueueProjection({ batch });
  assert.equal(queue.items.length, 1);
  const title = queue.items[0]?.title ?? "";
  assert.equal(title.includes("1)"), false);
  assert.equal(title.includes("2)"), false);
  assert.ok(title.toLowerCase().includes("ownership"));
});

test("buildQuestionBatchFromLanguageProposal includes repair/refactor gate when smallest repair or gap labels are present", () => {
  const pack = buildPack();
  const focus = buildFocusCandidates({ evidencePack: pack, fileContents });
  const excerpt = pack.excerpts.find((entry) => entry.evidenceId === "src/api/session.ts:3-6:excerpt");
  assert.ok(excerpt);
  const proposal: LanguageProposal = {
    schema: LANGUAGE_PROPOSAL_SCHEMA,
    providerId: "test-provider",
    generatedAt: "2026-01-01T00:00:00.000Z",
    selectedFilePath: "src/api/session.ts",
    boundaryCandidates: [],
    reviewQueueCopy: [],
    attemptPrompt: claim(
      "prompt",
      "attempt_prompt",
      "How can we explain what createSession owns?",
      excerpt,
    ),
    possibleGapLabels: [
      claim(
        "gap",
        "gap_label",
        "Validate if callers can access this ownership contract directly from the route layer.",
        excerpt,
      ),
    ],
    smallestRepairCopy: claim(
      "repair",
      "smallest_repair",
      "Split response building from request construction to keep responsibilities clear.",
      excerpt,
    ),
  };
  const verification = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents });
  assert.ok(verification.kind === "accepted" || verification.kind === "accepted_with_questions");

  const batch = buildQuestionBatchFromLanguageProposal({
    proposal,
    verification,
    focusCandidates: focus.candidates,
  });

  assert.equal(batch.questions.length, 1);
  const generated = batch.questions[0];
  assert.ok(generated != null);
  assert.equal(generated.prompt.includes("repair/refactor"), false);
  assert.ok(generated.whyThisMatters.includes("repair"));
  assert.ok(generated.answerPlaceholder.includes("refactor"));
});

test("buildQuestionBatchFromLanguageProposal blocks questions that do not map to focus candidates", () => {
  const pack = buildPack();
  const focus = buildFocusCandidates({ evidencePack: pack, fileContents });
  const searchCitation = pack.searchResults[0]?.citations[0];
  assert.ok(searchCitation);
  const proposal: LanguageProposal = {
    schema: LANGUAGE_PROPOSAL_SCHEMA,
    providerId: "test-provider",
    generatedAt: "2026-01-01T00:00:00.000Z",
    selectedFilePath: "src/api/session.ts",
    boundaryCandidates: [],
    reviewQueueCopy: [],
    attemptPrompt: claim("caller-prompt", "attempt_prompt", "export const run = () => createSession('u2');", searchCitation),
    possibleGapLabels: [],
    smallestRepairCopy: claim("caller-repair", "smallest_repair", "export const run = () => createSession('u2');", searchCitation),
  };
  const verification = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents });
  assert.equal(verification.kind, "accepted");

  const batch = buildQuestionBatchFromLanguageProposal({
    proposal,
    verification,
    focusCandidates: focus.candidates,
  });

  assert.equal(batch.questions.length, 0);
  assert.ok(batch.rejectedQuestionIds.includes("caller-prompt"));
  assert.equal(batch.diagnostics.some((entry) => entry.code === "question_without_focus"), true);
});

test("buildQuestionQueueProjection selects the first attemptable question and reports blocked queues", () => {
  const pack = buildPack();
  const focus = buildFocusCandidates({ evidencePack: pack, fileContents });
  const excerpt = pack.excerpts.find((entry) => entry.evidenceId === "src/api/session.ts:3-6:excerpt");
  assert.ok(excerpt);
  const proposal: LanguageProposal = {
    schema: LANGUAGE_PROPOSAL_SCHEMA,
    providerId: "test-provider",
    generatedAt: "2026-01-01T00:00:00.000Z",
    selectedFilePath: "src/api/session.ts",
    boundaryCandidates: [],
    reviewQueueCopy: [],
    attemptPrompt: claim("prompt", "attempt_prompt", excerpt.text, excerpt),
    possibleGapLabels: [],
    smallestRepairCopy: claim("repair", "smallest_repair", excerpt.text, excerpt),
  };
  const verification = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents });
  const batch = buildQuestionBatchFromLanguageProposal({
    proposal,
    verification,
    focusCandidates: focus.candidates,
  });

  const queue = buildQuestionQueueProjection({ batch });
  assert.equal(queue.schema, "sibi-question-queue.v1");
  assert.equal(queue.activeQuestionId, batch.questions[0]?.id);
  assert.equal(queue.activeFocusCandidateId, batch.questions[0]?.focusCandidateId);
  assert.equal(queue.progress.total, 1);

  const blockedQueue = buildQuestionQueueProjection({
    batch: {
      ...batch,
      questions: [],
      rejectedQuestionIds: ["missing"],
      diagnostics: [{ code: "question_batch_empty", severity: "blocked", message: "empty" }],
    },
  });
  assert.equal(blockedQueue.activeQuestionId, null);
  assert.equal(blockedQueue.blockedState?.code, "question_batch_empty");
  assert.equal(blockedQueue.progress.blocked, 0);
});

test("buildQuestionBatchFromLanguageProposal rejects all questions when verification is rejected", () => {
  const pack = buildPack();
  const focus = buildFocusCandidates({ evidencePack: pack, fileContents });
  const excerpt = pack.excerpts.find((entry) => entry.evidenceId === "src/api/session.ts:3-6:excerpt");
  assert.ok(excerpt);
  const proposal: LanguageProposal = {
    schema: LANGUAGE_PROPOSAL_SCHEMA,
    providerId: "test-provider",
    generatedAt: "2026-01-01T00:00:00.000Z",
    selectedFilePath: "src/api/does-not-match.ts",
    boundaryCandidates: [],
    reviewQueueCopy: [],
    attemptPrompt: claim("attempt-prompt", "attempt_prompt", excerpt.text, excerpt),
    possibleGapLabels: [],
    smallestRepairCopy: claim("repair", "smallest_repair", "Reduce coupling before retrying.", excerpt),
  };
  const verification = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents });
  assert.equal(verification.kind, "rejected");

  const batch = buildQuestionBatchFromLanguageProposal({
    proposal,
    verification,
    focusCandidates: focus.candidates,
  });

  assert.equal(batch.questions.length, 0);
  assert.equal(batch.verifierDisposition, "rejected");
  assert.equal(batch.diagnostics.some((entry) => entry.code === "provider_schema_invalid"), true);

  const queue = buildQuestionQueueProjection({ batch });
  assert.equal(queue.activeQuestionId, null);
  assert.equal(queue.activeFocusCandidateId, null);
  assert.equal(queue.items.length, 0);
  assert.equal(queue.progress.total, 0);
  assert.equal(queue.progress.blocked, 0);
  assert.equal(queue.blockedState?.code, "provider_schema_invalid");
});

test("buildQuestionBatchFromLanguageProposal keeps one visible question per focus/prompt duplicate", () => {
  const pack = buildPack();
  const focus = buildFocusCandidates({ evidencePack: pack, fileContents });
  const excerpt = pack.excerpts.find((entry) => entry.evidenceId === "src/api/session.ts:3-6:excerpt");
  assert.ok(excerpt);
  const proposal: LanguageProposal = {
    schema: LANGUAGE_PROPOSAL_SCHEMA,
    providerId: "test-provider",
    generatedAt: "2026-01-01T00:00:00.000Z",
    selectedFilePath: "src/api/session.ts",
    boundaryCandidates: [],
    reviewQueueCopy: [],
    attemptPrompt: claim("attempt", "attempt_prompt", "How can we explain what createSession owns?", excerpt),
    questions: [
      claim(
        "trace-question-1",
        "question",
        "Can you trace why createSession builds the path before fetchJson?   ",
        excerpt,
      ),
      claim(
        "trace-question-2",
        "question",
        "Can you trace why createSession builds the path before fetchJson? ",
        excerpt,
      ),
    ],
    possibleGapLabels: [],
    smallestRepairCopy: claim(
      "repair",
      "smallest_repair",
      "Split response building from request construction to keep responsibilities clear.",
      excerpt,
    ),
  };
  const verification = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents });
  assert.equal(verification.kind, "accepted_with_questions");

  const batch = buildQuestionBatchFromLanguageProposal({
    proposal,
    verification,
    focusCandidates: focus.candidates,
  });

  assert.equal(batch.questions.length, 2);
  assert.equal(batch.questions[0]?.state, "active");
  assert.equal(batch.rejectedQuestionIds.includes("trace-question-2"), true);
  assert.equal(batch.rejectedQuestionIds.includes("trace-question-1"), false);

  const queue = buildQuestionQueueProjection({ batch });
  assert.equal(queue.progress.total, 2);
  assert.equal(queue.progress.blocked, 0);
  assert.equal(queue.items.length, 2);
});

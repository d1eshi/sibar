import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEvidencePack,
  LANGUAGE_PROPOSAL_SCHEMA,
  loadLanguageProposalStatus,
  __clearLanguageProposalStatusTestCache,
  verifyLanguageProposal,
  type EvidenceCitation,
  type LanguageProposal,
  type LanguageProposalClaim,
} from "../src/ownershipWorkbench/languageProposal.ts";
import type { RepoInventory } from "../src/ownershipWorkbench/repoInventoryTypes.ts";

const fileContents = {
  "src/api/session.ts": [
    "import { fetchJson } from './http';",
    "",
    "export function createSession(userId: string) {",
    "  return fetchJson(`/session/${userId}`);",
    "}",
  ].join("\n"),
  "src/api/session.test.ts": [
    "import { createSession } from './session';",
    "test('creates a session', () => {",
    "  createSession('u1');",
    "});",
  ].join("\n"),
  "src/api/sessionConsumer.ts": [
    "import { createSession } from './session';",
    "export const run = () => createSession('u2');",
  ].join("\n"),
  "src/package.json": [
    "{",
    '  "name": "session-service",',
    '  "scripts": { "test": "node --test" },',
    '  "dependencies": { "vite": "^7.0.0" }',
    "}",
  ].join("\n"),
  "src/README.md": "# Session service\n\nOwns session request helpers.",
};

const inventory: RepoInventory = {
  sourceRoot: "src",
  generatedAt: "2026-01-01T00:00:00.000Z",
  files: [
    {
      path: "src/api/session.ts",
      extension: ".ts",
      role: "source",
      sizeBytes: 160,
      lineCount: 5,
      excerpt: "export function createSession(userId: string) {",
    },
    {
      path: "src/api/session.test.ts",
      extension: ".ts",
      role: "test",
      sizeBytes: 120,
      lineCount: 4,
      excerpt: "test('creates a session', () => {",
    },
    {
      path: "src/api/sessionConsumer.ts",
      extension: ".ts",
      role: "source",
      sizeBytes: 90,
      lineCount: 2,
      excerpt: "export const run = () => createSession('u2');",
    },
    {
      path: "src/package.json",
      extension: ".json",
      role: "config",
      sizeBytes: 120,
      lineCount: 5,
      excerpt: '"name": "session-service"',
    },
    {
      path: "src/README.md",
      extension: ".md",
      role: "doc",
      sizeBytes: 48,
      lineCount: 3,
      excerpt: "# Session service",
    },
  ],
  tree: {
    path: "src",
    kind: "directory",
    fileCount: 5,
    totalSizeBytes: 538,
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

function proposalWith(claims: Partial<LanguageProposal>): LanguageProposal {
  const pack = buildEvidencePack({
    inventory,
    selectedFilePath: "src/api/session.ts",
    userIntent: "Understand session ownership boundary.",
    fileContents,
    repoSearches: [
      {
        query: "createSession",
        results: [
          {
            path: "src/api/sessionConsumer.ts",
            line: 2,
            excerpt: "export const run = () => createSession('u2');",
            query: "createSession",
          },
        ],
      },
    ],
  });
  const excerpt = pack.excerpts[0]!;
  const citation: EvidenceCitation = {
    evidenceId: excerpt.evidenceId,
    filePath: excerpt.filePath,
    startLine: excerpt.startLine,
    endLine: excerpt.endLine,
  };

  return {
    schema: LANGUAGE_PROPOSAL_SCHEMA,
    providerId: "test-provider",
    generatedAt: "2026-01-01T00:00:00.000Z",
    selectedFilePath: "src/api/session.ts",
    boundaryCandidates: [claim("boundary", "boundary_candidate", "Session creation boundary starts in createSession.", citation)],
    reviewQueueCopy: [claim("queue", "review_queue_copy", "Review caller handling next.", citation)],
    attemptPrompt: claim("prompt", "attempt_prompt", "Explain createSession from cited lines.", citation),
    possibleGapLabels: [claim("gap", "gap_label", "Caller handling may be the next evidence gap.", citation)],
    smallestRepairCopy: claim("repair", "smallest_repair", "Read the nearby test before claiming the boundary.", citation),
    ...claims,
  };
}

test("buildEvidencePack derives textual evidence and nearby relations from inventory and contents", () => {
  const pack = buildEvidencePack({
    inventory,
    selectedFilePath: "src/api/session.ts",
    userIntent: "Understand session ownership boundary.",
    fileContents,
    repoSearches: [
      {
        query: "createSession",
        results: [
          {
            path: "src/api/sessionConsumer.ts",
            line: 2,
            excerpt: "export const run = () => createSession('u2');",
            query: "createSession",
          },
        ],
      },
    ],
  });

  assert.equal(pack.schema, "sibi-evidence-pack.v1");
  assert.equal(pack.selectedFilePath, "src/api/session.ts");
  assert.equal(pack.imports.length, 1);
  assert.equal(pack.exports.length, 1);
  assert.ok(pack.symbols.some((symbol) => symbol.name === "fetchJson" && symbol.startLine === 1));
  assert.ok(pack.symbols.some((symbol) => symbol.name === "createSession" && symbol.startLine === 3));
  assert.ok(pack.symbols.some((symbol) => symbol.name === "fetchJson" && symbol.startLine === 4));
  assert.deepEqual(pack.nearbyTests.map((entry) => entry.path), ["src/api/session.test.ts"]);
  assert.deepEqual(pack.callerCandidates.map((entry) => entry.path).sort(), [
    "src/api/session.test.ts",
    "src/api/sessionConsumer.ts",
  ]);
  assert.deepEqual(pack.searchResults.map((entry) => entry.path), ["src/api/sessionConsumer.ts"]);
  assert.deepEqual(
    pack.projectSignals.map((signal) => signal.id).filter((id) => ["package-name", "framework", "readme-heading"].includes(id)),
    ["package-name", "framework", "readme-heading"],
  );
  assert.equal(pack.projectSignals.find((signal) => signal.id === "package-name")?.value, "session-service");
  assert.equal(pack.searchResults[0]?.evidenceIds[0], "src/api/sessionConsumer.ts:2-2:repo-search:createSession");
  assert.ok(pack.evidenceIds.includes(pack.symbols[0]!.evidenceId));
  assert.ok(pack.evidenceIds.includes("src/api/sessionConsumer.ts:2-2:repo-search:createSession"));
  assert.ok(pack.evidenceIds.includes("src/package.json:2-2:project-signal:package-name"));
  assert.ok(pack.evidenceIds.includes("src/api/session.ts:3-5:excerpt"));
  assert.ok(pack.evidenceIds.includes("caller-src/api/sessionConsumer.ts"));
});

test("buildEvidencePack captures generic Python symbols and framework signals", () => {
  const localFileContents = {
    "sibi/demo/react-fastapi-todo/api/main.py": [
      "from fastapi import FastAPI, HTTPException",
      "from pydantic import BaseModel",
      "from typing import List, Optional",
      "",
      "",
      "class TodoItem(BaseModel):",
      "    id: int",
      "    title: str",
      "    completed: bool = False",
      "",
      "",
      "app = FastAPI()",
      "_TODOS: List[TodoItem] = [",
      "    TodoItem(id=1, title=\"Sincronizar inventario con sourceRoot\", completed=True),",
      "    TodoItem(id=2, title=\"Validar flujo React+FastAPI en Sibi\", completed=False),",
      "]",
      "",
      "",
      "@app.get(\"/api/todos\", response_model=List[TodoItem])",
      "def list_todos() -> List[TodoItem]:",
      "    return _TODOS",
      "",
      "@app.post(\"/api/todos\", response_model=TodoItem)",
      "def create_todo(todo: TodoItem) -> TodoItem:",
      "    next_id = max((item.id for item in _TODOS), default=0) + 1",
      "    next_todo = TodoItem(id=next_id, **todo.model_dump(exclude={\"id\"}))",
      "    _TODOS.append(next_todo)",
      "    return next_todo",
      "",
      "@app.put(\"/api/todos/{todo_id}\", response_model=TodoItem)",
      "def update_todo(todo_id: int, completed: bool) -> TodoItem:",
      "    todo = next((item for item in _TODOS if item.id == todo_id), None)",
      "    if todo is None:",
      "        raise HTTPException(status_code=404, detail=\"Todo not found\")",
      "    todo.completed = completed",
      "    return todo",
    ].join("\n"),
    "sibi/demo/react-fastapi-todo/requirements.txt": "fastapi==0.111.0\n",
    "sibi/demo/react-fastapi-todo/pyproject.toml": [
      "[project]",
      'dependencies = ["fastapi>=0.111", "pydantic"]',
    ].join("\n"),
  };
  const localInventory: RepoInventory = {
    sourceRoot: "sibi/demo/react-fastapi-todo",
    generatedAt: "2026-01-01T00:00:00.000Z",
    files: [
      {
        path: "sibi/demo/react-fastapi-todo/api/main.py",
        extension: ".py",
        role: "source",
        sizeBytes: localFileContents["sibi/demo/react-fastapi-todo/api/main.py"].length,
        lineCount: localFileContents["sibi/demo/react-fastapi-todo/api/main.py"].split("\n").length,
        excerpt: "from fastapi import FastAPI, HTTPException",
      },
      {
        path: "sibi/demo/react-fastapi-todo/requirements.txt",
        extension: ".txt",
        role: "config",
        sizeBytes: localFileContents["sibi/demo/react-fastapi-todo/requirements.txt"].length,
        lineCount: 1,
        excerpt: "fastapi==0.111.0",
      },
      {
        path: "sibi/demo/react-fastapi-todo/pyproject.toml",
        extension: ".toml",
        role: "config",
        sizeBytes: localFileContents["sibi/demo/react-fastapi-todo/pyproject.toml"].length,
        lineCount: 2,
        excerpt: "[project]",
      },
    ],
    tree: {
      path: "sibi/demo/react-fastapi-todo",
      kind: "directory",
      fileCount: 3,
      totalSizeBytes: Object.values(localFileContents).reduce((sum, file) => sum + file.length, 0),
      children: [],
    },
  };

  const pack = buildEvidencePack({
    inventory: localInventory,
    selectedFilePath: "sibi/demo/react-fastapi-todo/api/main.py",
    userIntent: "Understand todo API boundaries.",
    fileContents: localFileContents,
  });

  assert.ok(pack.symbols.some((symbol) => symbol.name === "TodoItem" && symbol.kind === "class"));
  assert.ok(pack.symbols.some((symbol) => symbol.name === "list_todos" && symbol.kind === "function"));
  assert.ok(pack.symbols.some((symbol) => symbol.name === "create_todo" && symbol.kind === "function"));
  assert.ok(pack.symbols.some((symbol) => symbol.name === "update_todo" && symbol.kind === "function"));
  assert.ok(pack.symbols.some((symbol) => symbol.name === "FastAPI" && symbol.kind === "const"));
  assert.ok(pack.imports.some((entry) => entry.text.includes("from fastapi import FastAPI, HTTPException")));
  assert.ok(pack.projectSignals.some((signal) => signal.id === "python-fastapi-requirements"));
  assert.ok(pack.projectSignals.some((signal) => signal.id === "python-fastapi-pyproject"));
  assert.ok(pack.projectSignals.some((signal) => signal.id === "python-requirements"));
  assert.ok(pack.projectSignals.some((signal) => signal.id === "python-pyproject"));
});

test("buildEvidencePack records import identifiers as symbols and validates import-line citations", () => {
  const importContents = [
    "// search surface",
    "import { searchWithVisualBrief } from './searchWithVisualBrief';",
    "",
    "import ResultsPage from './ResultsPage';",
    "import SearchExperience, { createSearchSession as startSearchSession } from './SearchExperience';",
    "",
    "export const run = () => searchWithVisualBrief();",
  ].join("\n");
  const importFileContents = {
    "src/search/SearchSurface.tsx": importContents,
  };
  const importInventory: RepoInventory = {
    sourceRoot: "src",
    generatedAt: "2026-01-01T00:00:00.000Z",
    files: [
      {
        path: "src/search/SearchSurface.tsx",
        extension: ".tsx",
        role: "source",
        sizeBytes: importContents.length,
        lineCount: 7,
        excerpt: "import ResultsPage from './ResultsPage';",
      },
    ],
    tree: {
      path: "src",
      kind: "directory",
      fileCount: 1,
      totalSizeBytes: importContents.length,
      children: [],
    },
  };
  const pack = buildEvidencePack({
    inventory: importInventory,
    selectedFilePath: "src/search/SearchSurface.tsx",
    userIntent: "Review search ownership.",
    fileContents: importFileContents,
  });

  for (const [name, line] of [
    ["searchWithVisualBrief", 2],
    ["ResultsPage", 4],
    ["startSearchSession", 5],
    ["SearchExperience", 5],
    ["run", 7],
    ["searchWithVisualBrief", 7],
  ] as const) {
    assert.ok(
      pack.symbols.some((symbol) => symbol.name === name && symbol.kind === "const" && symbol.startLine === line),
      `Expected ${name} to be observed on line ${line}`,
    );
  }

  const importSymbol = pack.symbols.find((symbol) => symbol.name === "SearchExperience");
  assert.ok(importSymbol);
  const importCitation: EvidenceCitation = {
    evidenceId: importSymbol.evidenceId,
    filePath: importSymbol.filePath,
    startLine: importSymbol.startLine,
    endLine: importSymbol.endLine,
    symbol: "SearchExperience",
  };
  const proposal: LanguageProposal = {
    schema: LANGUAGE_PROPOSAL_SCHEMA,
    providerId: "test-provider",
    generatedAt: "2026-01-01T00:00:00.000Z",
    selectedFilePath: "src/search/SearchSurface.tsx",
    boundaryCandidates: [claim("import-symbol", "boundary_candidate", importSymbol.text, importCitation)],
    reviewQueueCopy: [],
    attemptPrompt: claim("import-prompt", "attempt_prompt", importSymbol.text, importCitation),
    possibleGapLabels: [],
    smallestRepairCopy: claim("import-repair", "smallest_repair", importSymbol.text, importCitation),
  };

  const accepted = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents: importFileContents });
  assert.equal(accepted.kind, "accepted");

  const rejected = verifyLanguageProposal({
    proposal: {
      ...proposal,
      boundaryCandidates: [
        claim("invalid-import-symbol", "boundary_candidate", importSymbol.text, {
          ...importCitation,
          symbol: "MissingImport",
        }),
      ],
    },
    evidencePack: pack,
    fileContents: importFileContents,
  });

  assert.equal(rejected.kind, "rejected");
  const rejectedReasons = rejected.kind === "rejected" ? rejected.rejectedClaims.flatMap((entry) => entry.reasons).join("\n") : "";
  assert.match(rejectedReasons, /Invalid symbol 'MissingImport'/);
});

test("verifyLanguageProposal accepts generated selected-file subrange evidence", () => {
  const pack = buildEvidencePack({
    inventory,
    selectedFilePath: "src/api/session.ts",
    userIntent: "Understand session ownership boundary.",
    fileContents,
  });
  const subrange = pack.excerpts.find((entry) => entry.evidenceId === "src/api/session.ts:3-5:excerpt");
  assert.ok(subrange);

  const citation: EvidenceCitation = {
    evidenceId: subrange.evidenceId,
    filePath: subrange.filePath,
    startLine: subrange.startLine,
    endLine: subrange.endLine,
  };
  const proposal = proposalWith({
    boundaryCandidates: [claim("subrange-boundary", "boundary_candidate", subrange.text, citation)],
    reviewQueueCopy: [],
    attemptPrompt: claim("subrange-prompt", "attempt_prompt", subrange.text, citation),
    possibleGapLabels: [],
    smallestRepairCopy: claim("subrange-repair", "smallest_repair", subrange.text, citation),
  });

  const result = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents });

  assert.equal(result.kind, "accepted");
});

test("buildEvidencePack emits bounded selected-file single-line excerpts for hook state lines", () => {
  const appContents = [
    "import { useState } from 'react';",
    "",
    "export default function App() {",
    "  const heading = 'Rooms';",
    "  const [rooms, setRooms] = useState([]);",
    "",
    "  return <RoomList title={heading} rooms={rooms} />;",
    "}",
  ].join("\n");
  const appFileContents = {
    "roomix-proto/src/app/App.jsx": appContents,
  };
  const appInventory: RepoInventory = {
    sourceRoot: "roomix-proto/src",
    generatedAt: "2026-01-01T00:00:00.000Z",
    files: [
      {
        path: "roomix-proto/src/app/App.jsx",
        extension: ".jsx",
        role: "source",
        sizeBytes: appContents.length,
        lineCount: 8,
        excerpt: "export default function App() {",
      },
    ],
    tree: {
      path: "roomix-proto/src",
      kind: "directory",
      fileCount: 1,
      totalSizeBytes: appContents.length,
      children: [],
    },
  };
  const pack = buildEvidencePack({
    inventory: appInventory,
    selectedFilePath: "roomix-proto/src/app/App.jsx",
    userIntent: "Understand room app state.",
    fileContents: appFileContents,
    excerptRange: { startLine: 1, endLine: 8 },
  });
  const hookExcerpt = pack.excerpts.find((entry) => entry.evidenceId === "roomix-proto/src/app/App.jsx:5-5:excerpt");
  assert.ok(hookExcerpt);
  assert.equal(hookExcerpt.text, "  const [rooms, setRooms] = useState([]);");
  const appSymbol = pack.symbols.find((symbol) => symbol.evidenceId === "roomix-proto/src/app/App.jsx:3-3:symbol:App");
  assert.ok(appSymbol);
  assert.equal(appSymbol.kind, "function");
  const appBlockExcerpt = pack.excerpts.find((entry) => entry.evidenceId === "roomix-proto/src/app/App.jsx:3-8:excerpt");
  assert.ok(appBlockExcerpt);
  assert.ok(pack.evidenceIds.includes("roomix-proto/src/app/App.jsx:5-5:excerpt"));
  assert.ok(pack.evidenceIds.includes("roomix-proto/src/app/App.jsx:3-3:excerpt"));

  const citation: EvidenceCitation = {
    evidenceId: hookExcerpt.evidenceId,
    filePath: hookExcerpt.filePath,
    startLine: hookExcerpt.startLine,
    endLine: hookExcerpt.endLine,
  };
  const appClaim = claim("hook-line", "boundary_candidate", hookExcerpt.text, citation);
  const proposal: LanguageProposal = {
    schema: LANGUAGE_PROPOSAL_SCHEMA,
    providerId: "test-provider",
    generatedAt: "2026-01-01T00:00:00.000Z",
    selectedFilePath: "roomix-proto/src/app/App.jsx",
    boundaryCandidates: [appClaim],
    reviewQueueCopy: [],
    attemptPrompt: claim("hook-prompt", "attempt_prompt", hookExcerpt.text, citation),
    possibleGapLabels: [],
    smallestRepairCopy: claim("hook-repair", "smallest_repair", hookExcerpt.text, citation),
  };

  const accepted = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents: appFileContents });
  assert.equal(accepted.kind, "accepted");

  const inventedCitation: EvidenceCitation = {
    evidenceId: "roomix-proto/src/app/App.jsx:5-6:excerpt",
    filePath: "roomix-proto/src/app/App.jsx",
    startLine: 5,
    endLine: 6,
  };
  const rejected = verifyLanguageProposal({
    proposal: {
      ...proposal,
      boundaryCandidates: [claim("invented-hook-nearby", "boundary_candidate", "Invented nearby hook range.", inventedCitation)],
    },
    evidencePack: pack,
    fileContents: appFileContents,
  });

  assert.equal(rejected.kind, "rejected");
  const rejectedReasons = rejected.kind === "rejected" ? rejected.rejectedClaims.flatMap((entry) => entry.reasons).join("\n") : "";
  assert.match(rejectedReasons, /Unknown evidence id 'roomix-proto\/src\/app\/App\.jsx:5-6:excerpt'/);
});

test("buildEvidencePack observes selected-file local variables and late single-line excerpts", () => {
  const appLines = Array.from({ length: 95 }, (_, index) => `// filler ${index + 1}`);
  appLines[0] = "import { useState } from 'react';";
  appLines[2] = "function App() {";
  appLines[10] = "  const [demoMode, setDemoMode] = useState(false);";
  appLines[11] = "  const path = window.location.pathname;";
  appLines[12] = "  const resultsBrief = [{ title: path }];";
  appLines[69] = "  const briefItems = resultsBrief.map((result) => result.title);";
  appLines[88] = "  return <ResultsPanel path={path} briefItems={briefItems} demoMode={demoMode} />;";
  appLines[89] = "}";
  const appContents = appLines.join("\n");
  const appFileContents = {
    "src/app/App.jsx": appContents,
  };
  const appInventory: RepoInventory = {
    sourceRoot: "src",
    generatedAt: "2026-01-01T00:00:00.000Z",
    files: [
      {
        path: "src/app/App.jsx",
        extension: ".jsx",
        role: "source",
        sizeBytes: appContents.length,
        lineCount: appLines.length,
        excerpt: "function App() {",
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
    selectedFilePath: "src/app/App.jsx",
    userIntent: "Understand result ownership.",
    fileContents: appFileContents,
  });

  for (const [name, line] of [
    ["demoMode", 11],
    ["path", 12],
    ["resultsBrief", 13],
    ["briefItems", 70],
  ] as const) {
    const symbol = pack.symbols.find((entry) => entry.name === name);
    assert.ok(symbol, `Expected ${name} to be observed as a symbol`);
    assert.equal(symbol.startLine, line);

    const citation: EvidenceCitation = {
      evidenceId: symbol.evidenceId,
      filePath: symbol.filePath,
      startLine: symbol.startLine,
      endLine: symbol.endLine,
      symbol: name,
    };
    const proposal: LanguageProposal = {
      schema: LANGUAGE_PROPOSAL_SCHEMA,
      providerId: "test-provider",
      generatedAt: "2026-01-01T00:00:00.000Z",
      selectedFilePath: "src/app/App.jsx",
      boundaryCandidates: [claim(`symbol-${name}`, "boundary_candidate", symbol.text, citation)],
      reviewQueueCopy: [],
      attemptPrompt: claim(`prompt-${name}`, "attempt_prompt", symbol.text, citation),
      possibleGapLabels: [],
      smallestRepairCopy: claim(`repair-${name}`, "smallest_repair", symbol.text, citation),
    };
    const accepted = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents: appFileContents });
    assert.equal(accepted.kind, "accepted");
  }

  const lateExcerpt = pack.excerpts.find((entry) => entry.evidenceId === "src/app/App.jsx:89-89:excerpt");
  assert.ok(lateExcerpt);
  assert.equal(lateExcerpt.text, "  return <ResultsPanel path={path} briefItems={briefItems} demoMode={demoMode} />;");
  assert.ok(pack.evidenceIds.includes("src/app/App.jsx:89-89:excerpt"));
  assert.ok(pack.excerpts.length < appLines.length / 2);
});

test("verifyLanguageProposal accepts selected-file call reference symbols on cited lines only", () => {
  const appContents = [
    "import React, { useEffect, useState } from 'react';",
    "import Header from './Header.jsx';",
    "import SearchBox from './SearchBox.jsx';",
    "import ResultsPanel from './ResultsPanel.jsx';",
    "import Footer from './Footer.jsx';",
    "import ThemeProvider from './ThemeProvider.jsx';",
    "import AnalyticsProvider from './AnalyticsProvider.jsx';",
    "import { clearResultsBrief, getStoredResultsBrief, saveResultsBrief } from './resultsBriefStorage.js';",
    "",
    "export default function App() {",
    "  const [query, setQuery] = useState('');",
    "  const [filters, setFilters] = useState([]);",
    "  const [resultsBrief, setResultsBrief] = useState(getStoredResultsBrief);",
    "",
    "  useEffect(() => {",
    "    saveResultsBrief(resultsBrief);",
    "  }, [resultsBrief]);",
    "  setResultsBrief(getStoredResultsBrief());",
    "}",
  ].join("\n");
  const appFileContents = {
    "roomix-proto/src/app/App.jsx": appContents,
  };
  const appInventory: RepoInventory = {
    sourceRoot: "roomix-proto/src",
    generatedAt: "2026-01-01T00:00:00.000Z",
    files: [
      {
        path: "roomix-proto/src/app/App.jsx",
        extension: ".jsx",
        role: "source",
        sizeBytes: appContents.length,
        lineCount: 19,
        excerpt: "export default function App() {",
      },
    ],
    tree: {
      path: "roomix-proto/src",
      kind: "directory",
      fileCount: 1,
      totalSizeBytes: appContents.length,
      children: [],
    },
  };
  const pack = buildEvidencePack({
    inventory: appInventory,
    selectedFilePath: "roomix-proto/src/app/App.jsx",
    userIntent: "Review results brief ownership.",
    fileContents: appFileContents,
  });
  const callSymbol = pack.symbols.find(
    (symbol) => symbol.name === "getStoredResultsBrief" && symbol.startLine === 13,
  );
  assert.ok(callSymbol);
  assert.equal(callSymbol.evidenceId, "roomix-proto/src/app/App.jsx:13-13:symbol:getStoredResultsBrief");
  assert.ok(pack.evidenceIds.includes(callSymbol.evidenceId));

  const excerpt = pack.excerpts.find((entry) => entry.evidenceId === "roomix-proto/src/app/App.jsx:13-13:excerpt");
  assert.ok(excerpt);
  const citation: EvidenceCitation = {
    evidenceId: excerpt.evidenceId,
    filePath: excerpt.filePath,
    startLine: excerpt.startLine,
    endLine: excerpt.endLine,
    symbol: "getStoredResultsBrief",
  };
  const proposal: LanguageProposal = {
    schema: LANGUAGE_PROPOSAL_SCHEMA,
    providerId: "test-provider",
    generatedAt: "2026-01-01T00:00:00.000Z",
    selectedFilePath: "roomix-proto/src/app/App.jsx",
    boundaryCandidates: [claim("call-symbol", "boundary_candidate", excerpt.text, citation)],
    reviewQueueCopy: [],
    attemptPrompt: claim("call-prompt", "attempt_prompt", excerpt.text, citation),
    possibleGapLabels: [],
    smallestRepairCopy: claim("call-repair", "smallest_repair", excerpt.text, citation),
  };

  const accepted = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents: appFileContents });
  assert.equal(accepted.kind, "accepted");

  const importOnlyCitation: EvidenceCitation = {
    evidenceId: "roomix-proto/src/app/App.jsx:13-13:excerpt",
    filePath: "roomix-proto/src/app/App.jsx",
    startLine: 13,
    endLine: 13,
    symbol: "saveResultsBrief",
  };
  const rejected = verifyLanguageProposal({
    proposal: {
      ...proposal,
      boundaryCandidates: [claim("wrong-line-symbol", "boundary_candidate", excerpt.text, importOnlyCitation)],
    },
    evidencePack: pack,
    fileContents: appFileContents,
  });

  assert.equal(rejected.kind, "rejected");
  const rejectedReasons = rejected.kind === "rejected" ? rejected.rejectedClaims.flatMap((entry) => entry.reasons).join("\n") : "";
  assert.match(rejectedReasons, /Invalid symbol 'saveResultsBrief'/);
});

test("verifyLanguageProposal rejects invented selected-file subranges", () => {
  const pack = buildEvidencePack({
    inventory,
    selectedFilePath: "src/api/session.ts",
    userIntent: "Understand session ownership boundary.",
    fileContents,
  });
  const inventedCitation: EvidenceCitation = {
    evidenceId: "src/api/session.ts:3-4:excerpt",
    filePath: "src/api/session.ts",
    startLine: 3,
    endLine: 4,
  };
  const proposal = proposalWith({
    boundaryCandidates: [claim("invented-subrange", "boundary_candidate", "Invented subrange.", inventedCitation)],
  });

  const result = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents });

  assert.equal(result.kind, "rejected");
  const rejectedReasons = result.kind === "rejected" ? result.rejectedClaims.flatMap((entry) => entry.reasons).join("\n") : "";
  assert.match(rejectedReasons, /Unknown evidence id 'src\/api\/session\.ts:3-4:excerpt'/);
});

test("verifyLanguageProposal accepts real candidate id aliases as evidence ids", () => {
  const pack = buildEvidencePack({
    inventory,
    selectedFilePath: "src/api/session.ts",
    userIntent: "Understand session ownership boundary.",
    fileContents,
  });
  const caller = pack.callerCandidates.find((entry) => entry.path === "src/api/sessionConsumer.ts");
  const sourceCitation = caller?.citations[0];
  assert.ok(caller);
  assert.ok(sourceCitation);
  assert.ok(pack.evidenceIds.includes(caller.id));

  const aliasCitation: EvidenceCitation = {
    evidenceId: caller.id,
    filePath: sourceCitation.filePath,
    startLine: sourceCitation.startLine,
    endLine: sourceCitation.endLine,
  };
  const citedText = fileContents[sourceCitation.filePath]!;
  const proposal = proposalWith({
    boundaryCandidates: [claim("candidate-alias-boundary", "boundary_candidate", citedText, aliasCitation)],
    reviewQueueCopy: [],
    attemptPrompt: claim("candidate-alias-prompt", "attempt_prompt", citedText, aliasCitation),
    possibleGapLabels: [],
    smallestRepairCopy: claim("candidate-alias-repair", "smallest_repair", citedText, aliasCitation),
  });

  const result = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents });

  assert.equal(result.kind, "accepted");
});

test("verifyLanguageProposal rejects invented candidate id aliases", () => {
  const pack = buildEvidencePack({
    inventory,
    selectedFilePath: "src/api/session.ts",
    userIntent: "Understand session ownership boundary.",
    fileContents,
  });
  const caller = pack.callerCandidates.find((entry) => entry.path === "src/api/sessionConsumer.ts");
  const sourceCitation = caller?.citations[0];
  assert.ok(sourceCitation);

  const inventedAliasCitation: EvidenceCitation = {
    evidenceId: "caller-src/api/inventedConsumer.ts",
    filePath: sourceCitation.filePath,
    startLine: sourceCitation.startLine,
    endLine: sourceCitation.endLine,
  };
  const proposal = proposalWith({
    boundaryCandidates: [claim("invented-candidate-alias", "boundary_candidate", "Invented candidate alias.", inventedAliasCitation)],
  });

  const result = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents });

  assert.equal(result.kind, "rejected");
  const rejectedReasons = result.kind === "rejected" ? result.rejectedClaims.flatMap((entry) => entry.reasons).join("\n") : "";
  assert.match(rejectedReasons, /Unknown evidence id 'caller-src\/api\/inventedConsumer\.ts'/);
});

test("verifyLanguageProposal validates ProjectSignal citation files from citations", () => {
  const signalInventory: RepoInventory = {
    ...inventory,
    files: [
      {
        path: "src/.gitignore",
        extension: ".gitignore",
        role: "config",
        sizeBytes: 24,
        lineCount: 2,
        excerpt: "node_modules",
      },
      ...inventory.files,
    ],
    tree: {
      path: "src",
      kind: "directory",
      fileCount: 6,
      totalSizeBytes: 562,
      children: [],
    },
  };
  const pack = buildEvidencePack({
    inventory: signalInventory,
    selectedFilePath: "src/api/session.ts",
    userIntent: "Understand session ownership boundary.",
    fileContents,
  });
  const signal = pack.projectSignals.find((entry) => entry.id === "dominant-extensions");
  const citation = signal?.citations[0];
  assert.ok(citation);
  assert.equal(citation.filePath, "src/.gitignore");

  const projectClaim = claim("project-signal", "question", "Which dominant file type context should be inspected next?", citation, "inferred");
  const proposal: LanguageProposal = {
    schema: LANGUAGE_PROPOSAL_SCHEMA,
    providerId: "test-provider",
    generatedAt: "2026-01-01T00:00:00.000Z",
    selectedFilePath: "src/api/session.ts",
    boundaryCandidates: [],
    reviewQueueCopy: [],
    attemptPrompt: projectClaim,
    possibleGapLabels: [],
    smallestRepairCopy: projectClaim,
    questions: [projectClaim],
  };

  const result = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents });
  const rejectedReasons = result.kind === "rejected" ? result.rejectedClaims.flatMap((entry) => entry.reasons).join("\n") : "";

  assert.notEqual(result.kind, "rejected");
  assert.doesNotMatch(rejectedReasons, /Invented file 'src\/\.gitignore'/);
});

test("verifyLanguageProposal rejects invented files, out-of-range citations, invalid symbols, and readiness claims", () => {
  const pack = buildEvidencePack({
    inventory,
    selectedFilePath: "src/api/session.ts",
    userIntent: "Understand session ownership boundary.",
    fileContents,
  });
  const excerpt = pack.excerpts[0]!;
  const symbol = pack.symbols[0]!;

  const proposal = proposalWith({
    boundaryCandidates: [
      claim("invented", "boundary_candidate", "Invented file claim.", {
        evidenceId: excerpt.evidenceId,
        filePath: "src/api/missing.ts",
        startLine: 1,
        endLine: 1,
      }),
      claim("range", "boundary_candidate", "Out of range claim.", {
        evidenceId: excerpt.evidenceId,
        filePath: excerpt.filePath,
        startLine: 1,
        endLine: 99,
      }),
      claim("symbol", "boundary_candidate", "Invalid symbol claim.", {
        evidenceId: symbol.evidenceId,
        filePath: symbol.filePath,
        startLine: symbol.startLine,
        endLine: symbol.endLine,
        symbol: "deleteSession",
      }),
    ],
    readiness: [
      claim("ready", "readiness", "The model says ownership is ready.", {
        evidenceId: excerpt.evidenceId,
        filePath: excerpt.filePath,
        startLine: excerpt.startLine,
        endLine: excerpt.endLine,
      }),
      claim("production-ready", "boundary_candidate", "This boundary is production-ready.", {
        evidenceId: excerpt.evidenceId,
        filePath: excerpt.filePath,
        startLine: excerpt.startLine,
        endLine: excerpt.endLine,
      }),
      claim("production ready", "boundary_candidate", "This boundary is production ready.", {
        evidenceId: excerpt.evidenceId,
        filePath: excerpt.filePath,
        startLine: excerpt.startLine,
        endLine: excerpt.endLine,
      }),
    ],
  });

  const result = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents });

  assert.equal(result.kind, "rejected");
  assert.equal(result.kind === "rejected" ? result.rejectedClaims.length : 0, 6);
  const rejectedReasons = result.kind === "rejected" ? result.rejectedClaims.flatMap((entry) => entry.reasons).join("\n") : "";
  assert.match(rejectedReasons, /Invented file 'src\/api\/missing\.ts'/);
  assert.match(rejectedReasons, /out of bounds/);
  assert.match(rejectedReasons, /Invalid symbol 'deleteSession'/);
  assert.match(rejectedReasons, /cannot update or claim readiness/);
});

test("verifyLanguageProposal downgrades semantic claims to questions instead of accepting them as observed", () => {
  const pack = buildEvidencePack({
    inventory,
    selectedFilePath: "src/api/session.ts",
    userIntent: "Understand session ownership boundary.",
    fileContents,
  });
  const excerpt = pack.excerpts[0]!;
  const proposal = proposalWith({
    possibleGapLabels: [
      claim(
        "inferred-gap",
        "gap_label",
        "Caller handling might be incomplete.",
        {
          evidenceId: excerpt.evidenceId,
          filePath: excerpt.filePath,
          startLine: excerpt.startLine,
          endLine: excerpt.endLine,
        },
        "inferred",
      ),
    ],
  });

  const result = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents });

  assert.equal(result.kind, "accepted_with_questions");
  assert.ok(result.questions.some((entry) => entry.id === "inferred-gap"));
  assert.ok(result.questions.some((entry) => entry.id === "boundary"));
  assert.equal(result.questions.find((entry) => entry.id === "boundary")?.disposition, "downgraded_to_question");
  assert.match(
    result.questions.find((entry) => entry.id === "boundary")?.reasons.join("\n") ?? "",
    /direct textual facts/,
  );
});

test("verifyLanguageProposal rejects evidence ids cited against a different file range", () => {
  const pack = buildEvidencePack({
    inventory,
    selectedFilePath: "src/api/session.ts",
    userIntent: "Understand session ownership boundary.",
    fileContents,
  });
  const excerpt = pack.excerpts[0]!;
  const proposal = proposalWith({
    boundaryCandidates: [
      claim("mismatch", "boundary_candidate", "Mismatched evidence id location.", {
        evidenceId: excerpt.evidenceId,
        filePath: excerpt.filePath,
        startLine: 1,
        endLine: 1,
      }),
    ],
  });

  const result = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents });

  assert.equal(result.kind, "rejected");
  const rejectedReasons = result.kind === "rejected" ? result.rejectedClaims.flatMap((entry) => entry.reasons).join("\n") : "";
  assert.match(rejectedReasons, /resolves to src\/api\/session\.ts:1-5, not src\/api\/session\.ts:1-1/);
});

test("verifyLanguageProposal rejects malformed citations without throwing", () => {
  const pack = buildEvidencePack({
    inventory,
    selectedFilePath: "src/api/session.ts",
    userIntent: "Understand session ownership boundary.",
    fileContents,
  });

  const proposal = proposalWith({
    attemptPrompt: {
      id: "malformed-citation",
      kind: "attempt_prompt",
      text: "Malformed citation should be rejected.",
      confidence: "observed",
      citations: [{ evidenceId: pack.excerpts[0]!.evidenceId }],
    } as LanguageProposalClaim,
  });

  const verification = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents });

  assert.equal(verification.kind, "rejected");
  const rejectedReasons = verification.kind === "rejected" ? verification.rejectedClaims.flatMap((entry) => entry.reasons).join("\n") : "";
  assert.match(rejectedReasons, /Malformed citation/);
});

test("verifyLanguageProposal accepts repo-search citations only at their observed match line", () => {
  const pack = buildEvidencePack({
    inventory,
    selectedFilePath: "src/api/session.ts",
    userIntent: "Understand session ownership boundary.",
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
  const searchCitation = pack.searchResults[0]!.citations[0]!;
  const proposal = proposalWith({
    boundaryCandidates: [
      claim("search-match", "boundary_candidate", "export const run = () => createSession('u2');", searchCitation),
    ],
    reviewQueueCopy: [],
    attemptPrompt: claim("prompt", "attempt_prompt", "export const run = () => createSession('u2');", searchCitation),
    possibleGapLabels: [],
    smallestRepairCopy: claim("repair", "smallest_repair", "export const run = () => createSession('u2');", searchCitation),
  });

  const result = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents });

  assert.equal(result.kind, "accepted");
});

test("verifyLanguageProposal accepts observed non-question claims only when they quote cited lines", () => {
  const pack = buildEvidencePack({
    inventory,
    selectedFilePath: "src/api/session.ts",
    userIntent: "Understand session ownership boundary.",
    fileContents,
  });
  const excerpt = pack.excerpts[0]!;
  const citation: EvidenceCitation = {
    evidenceId: excerpt.evidenceId,
    filePath: excerpt.filePath,
    startLine: excerpt.startLine,
    endLine: excerpt.endLine,
  };
  const proposal = proposalWith({
    boundaryCandidates: [
      claim("quoted-boundary", "boundary_candidate", excerpt.text, citation),
    ],
    reviewQueueCopy: [],
    attemptPrompt: claim("quoted-prompt", "attempt_prompt", excerpt.text, citation),
    possibleGapLabels: [],
    smallestRepairCopy: claim("quoted-repair", "smallest_repair", excerpt.text, citation),
  });

  const result = verifyLanguageProposal({ proposal, evidencePack: pack, fileContents });

  assert.equal(result.kind, "accepted");
  assert.deepEqual(result.acceptedClaims.map((entry) => entry.id).sort(), [
    "quoted-boundary",
    "quoted-prompt",
    "quoted-repair",
  ]);
});

test("verifyLanguageProposal returns blocked_llm_unavailable for provider failures", () => {
  const pack = buildEvidencePack({
    inventory,
    selectedFilePath: "src/api/session.ts",
    userIntent: "Understand session ownership boundary.",
    fileContents,
  });

  const result = verifyLanguageProposal({
    proposal: null,
    evidencePack: pack,
    fileContents,
    providerError: new Error("provider timeout"),
  });

  assert.equal(result.kind, "blocked_llm_unavailable");
  assert.equal(result.reason, "provider timeout");
});

test("loadLanguageProposalStatus validates language proposal endpoint payloads", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocation = (globalThis as { location?: { origin?: string } }).location;
  const validProposal = proposalWith({});
  const calls: string[] = [];
  const responses: unknown[] = [validProposal, { schema: "wrong" }];
  let index = 0;

  globalThis.fetch = async (input: RequestInfo | URL) => {
    calls.push(typeof input === "string" ? input : input.toString());
    const payload = responses[index];
    index += 1;
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => payload,
    } as Response;
  };

  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: {
      origin: "http://localhost:5174",
    },
    writable: true,
  });

  try {
    const first = await loadLanguageProposalStatus();
    assert.equal(first.kind, "ready");
    assert.equal(calls[0], "http://localhost:5174/__sibi/language-proposal");

    const second = await loadLanguageProposalStatus();
    assert.equal(second.kind, "unavailable");
    assert.equal(second.reason, "language proposal endpoint returned an invalid payload");
  } finally {
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: originalLocation,
      writable: true,
    });
    globalThis.fetch = originalFetch;
  }
});

test("loadLanguageProposalStatus caches POST ready responses in local storage across cache clears", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocation = (globalThis as { location?: { origin?: string } }).location;
  const originalLocalStorage = (globalThis as { localStorage?: Storage }).localStorage;
  const pack = buildEvidencePack({
    inventory,
    selectedFilePath: "src/api/session.ts",
    userIntent: "Understand session ownership boundary.",
    fileContents,
    repoSearches: [
      {
        query: "createSession",
        results: [
          {
            path: "src/api/sessionConsumer.ts",
            line: 2,
            excerpt: "export const run = () => createSession('u2');",
            query: "createSession",
          },
        ],
      },
    ],
  });
  const calls: string[] = [];
  const proposal = proposalWith({});
  const storage = new Map<string, string>();
  const fakeLocalStorage: Storage = {
    get length() {
      return storage.size;
    },
    clear() {
      storage.clear();
    },
    getItem(key: string) {
      return storage.has(key) ? storage.get(key) ?? null : null;
    },
    key(index: number) {
      return Array.from(storage.keys())[index] ?? null;
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
  };

  globalThis.fetch = async (input: RequestInfo | URL) => {
    calls.push(typeof input === "string" ? input : input.toString());
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => proposal,
    } as Response;
  };

  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: {
      origin: "http://localhost:5174",
    },
    writable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: fakeLocalStorage,
    writable: true,
  });

  try {
    __clearLanguageProposalStatusTestCache();
    const first = await loadLanguageProposalStatus({ evidencePack: pack });
    assert.equal(first.kind, "ready");
    assert.equal(calls.length, 1);
    const storedKeys = Array.from(storage.keys());
    assert.equal(storedKeys.length, 1);
    const storageKey = storedKeys[0];
    if (storageKey == null) throw new Error("Expected one localStorage key");
    assert.equal(storageKey.startsWith("sibi-language-proposal-ready-status.v1:"), true);
    assert.equal(storageKey.includes("src/api/session.ts"), false);
    assert.equal(storageKey.length < 80, true);

    __clearLanguageProposalStatusTestCache();
    const second = await loadLanguageProposalStatus({ evidencePack: pack });
    assert.equal(second.kind, "ready");
    assert.equal(calls.length, 1);
  } finally {
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: originalLocation,
      writable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
      writable: true,
    });
    globalThis.fetch = originalFetch;
  }
});

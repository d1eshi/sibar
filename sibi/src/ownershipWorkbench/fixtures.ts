import { parsePatchFiles } from "@pierre/diffs";
import type {
  CodeViewDiffItem,
  CodeViewFileItem,
  DiffLineAnnotation,
  FileDiffMetadata,
  ParsedPatch,
  LineAnnotation,
} from "@pierre/diffs";

import { evidenceForLine, isInBoundary } from "./helpers.ts";
import type {
  BoundaryState,
  EvidenceRef,
  OwnershipBoundary,
  ReviewQueueItem,
  TreeNode,
  WorkbenchLineMetadata,
} from "./types.ts";

export const ownershipBoundary: OwnershipBoundary = {
  id: "boundary-01",
  title: "Session API boundary for absent sessions",
  filePath: "src/api/session.ts",
  startLine: 9,
  endLine: 14,
  whyMatters:
    "This boundary decides whether caller code can rely on null semantics when a user has no active session. If this contract changes, downstream auth checks and UI safety assumptions can silently break.",
  prompt: [
    "Explain this boundary in your own words:",
    "1. What is being controlled?",
    "2. Which evidence proves it?",
    "3. What would break if this boundary disappeared?",
  ],
  returnCondition: "Re-answer the original boundary prompt and name exactly one missing caller contract in your own words.",
};

export const fixtureEvidence: EvidenceRef[] = [
  {
    id: "E-001",
    title: "Response branch handling",
    detail: "204 Empty response is converted to `null` before JSON parsing.",
    location: "src/api/session.ts:12-15",
    confidence: "observed",
  },
  {
    id: "E-002",
    title: "Caller usage",
    detail: "Session consumer checks for falsy values before making authenticated requests.",
    location: "src/runtime/consumer.ts:41-53",
    confidence: "inferred",
  },
  {
    id: "E-003",
    title: "Diff touch coverage",
    detail: "Only the status-handling branch changed for the touched file; no call graph expansion in this fixture.",
    location: "session.ts diff hunk + session.test.ts appended test",
    confidence: "unverified",
  },
  {
    id: "E-004",
    title: "Conflict candidate",
    detail: "A nearby doc states `createSession` always resolves to object; this fixture proves a `null` branch exists.",
    location: "docs/notes/session-api.md:4-9",
    confidence: "conflict",
  },
];

export const ownershipReviewQueue: ReviewQueueItem[] = [
  {
    id: "queue-session-boundary",
    filePath: "src/api/session.ts",
    boundaryTitle: "Session API boundary for absent sessions",
    priority: 1,
    touched: true,
    orderReason: "The touched diff changes the return contract from always-json to possible null.",
    nextStep: "Inspect the added 204 branch and confirm what caller behavior it requires.",
    state: "gap",
  },
  {
    id: "queue-session-test",
    filePath: "src/api/session.test.ts",
    boundaryTitle: "Regression evidence for absent session behavior",
    priority: 2,
    touched: true,
    orderReason: "The test proves the new null branch exists but does not prove downstream safety.",
    nextStep: "Check what the test covers before accepting it as ownership evidence.",
    state: "attempted",
  },
  {
    id: "queue-runtime-consumer",
    filePath: "src/runtime/consumer.ts",
    boundaryTitle: "Caller contract for unauthenticated runtime paths",
    priority: 3,
    touched: false,
    orderReason: "This inferred caller is the first place the null contract can break user-facing auth flow.",
    nextStep: "Trace the falsy-session branch before asking for the ownership attempt.",
    state: "attempted",
  },
];

export const fileFixtures: Record<string, string> = {
  "src/api/session.ts": `import type { LoginPayload } from "./types";

export async function createSession(payload: LoginPayload) {
  const response = await fetch("/api/session", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
`,
  "src/api/session.test.ts": `import { createSession } from "./session";

test("handles no active session", async () => {
  await expect(createSession({ email: "a@b.com" })).resolves.toBeNull();
});
`,
  "src/runtime/consumer.ts": `export async function loadUser() {
  const session = await createSession({ email: "u@domain.com" });
  if (!session) return { authenticated: false };
  return { authenticated: true };
}
`,
};

export const fixtureDiff = `diff --git a/src/api/session.ts b/src/api/session.ts
index 4f2cc..8f9ad 100644
--- a/src/api/session.ts
+++ b/src/api/session.ts
@@ -1,11 +1,14 @@
 import type { LoginPayload } from "./types";
\x20
 export async function createSession(payload: LoginPayload) {
   const response = await fetch("/api/session", {
     method: "POST",
     body: JSON.stringify(payload),
   });
\x20
+  if (response.status === 204) {
+    return null;
+  }
  return response.json();
 }
diff --git a/src/api/session.test.ts b/src/api/session.test.ts
index 9f11a..7e2bc 100644
--- a/src/api/session.test.ts
+++ b/src/api/session.test.ts
@@ -1 +1,5 @@
 import { createSession } from "./session";
\x20
+test("handles no active session", async () => {
+  await expect(createSession({ email: "a@b.com" })).resolves.toBeNull();
+});
`;

export const fileTreeFixture: TreeNode[] = [
  {
    id: "src",
    path: "src",
    name: "src",
    kind: "directory",
    state: "unvisited",
    evidenceDensity: 5,
    children: [
      {
        id: "src/api",
        path: "src/api",
        name: "api",
        kind: "directory",
        state: "unvisited",
        evidenceDensity: 6,
        changes: 5,
        children: [
          {
            id: "src/api/session.ts",
            path: "src/api/session.ts",
            name: "session.ts",
            kind: "file",
            state: "gap",
            changes: 5,
            reason: "Boundary introduces new null return behavior with authentication consequences.",
            evidenceDensity: 8,
          },
          {
            id: "src/api/session.test.ts",
            path: "src/api/session.test.ts",
            name: "session.test.ts",
            kind: "file",
            state: "attempted",
            changes: 2,
            reason: "Test exists but does not include caller behavior under auth failure.",
            evidenceDensity: 3,
          },
        ],
      },
      {
        id: "src/runtime",
        path: "src/runtime",
        name: "runtime",
        kind: "directory",
        state: "unvisited",
        changes: 0,
        evidenceDensity: 2,
        children: [
          {
            id: "src/runtime/consumer.ts",
            path: "src/runtime/consumer.ts",
            name: "consumer.ts",
            kind: "file",
            state: "attempted",
            changes: 0,
            reason: "Usage inferred from fixture behavior assumptions.",
            evidenceDensity: 4,
          },
        ],
      },
    ],
  },
];

export const fileTreeNodeByPath: Record<string, TreeNode> = fileTreeFixture.reduce(
  (acc, node) => {
    const walk = (entries: TreeNode[]) => {
      for (const entry of entries) {
        acc[entry.path] = entry;
        if (entry.kind === "directory" && entry.children != null) {
          walk(entry.children);
        }
      }
    };

    walk([node]);
    return acc;
  },
  {} as Record<string, TreeNode>,
);

export const initialFileStates: Record<string, BoundaryState> = {
  "src/api/session.ts": "gap",
  "src/api/session.test.ts": "attempted",
  "src/runtime/consumer.ts": "attempted",
};

export const fileTreePaths: string[] = (() => {
  const paths: string[] = [];
  const walk = (nodes: TreeNode[]): void => {
    for (const node of nodes) {
      if (node.kind === "file") {
        paths.push(node.path);
      }
      if (node.kind === "directory" && node.children != null) {
        walk(node.children);
      }
    }
  };
  walk(fileTreeFixture);
  return paths;
})();

function fixtureEvidenceForLine(filePath: string, lineNumber: number): EvidenceRef[] {
  return fixtureEvidence.filter((entry) => evidenceForLine([entry], filePath, lineNumber));
}

function makeOwnershipBoundaryAnnotations(path: string, lineNumber: number): LineAnnotation<WorkbenchLineMetadata>[] {
  if (path !== ownershipBoundary.filePath || !isInBoundary(path, lineNumber, ownershipBoundary)) {
    return [];
  }

  return [
    {
      kind: "ownership-boundary",
      label: "boundary",
      detail: `${ownershipBoundary.title} (${ownershipBoundary.startLine}-${ownershipBoundary.endLine})`,
    },
  ];
}

function makeFileLineAnnotations(path: string): LineAnnotation<WorkbenchLineMetadata>[] {
  const contents = fileFixtures[path];
  if (!contents) {
    return [];
  }

  const lineCount = contents.split("\n").length;
  const annotations: LineAnnotation<WorkbenchLineMetadata>[] = [];

  for (let line = 1; line <= lineCount; line++) {
    const boundaryMetadata = makeOwnershipBoundaryAnnotations(path, line);
    for (const metadata of boundaryMetadata) {
      annotations.push({ lineNumber: line, metadata });
    }

    for (const evidence of fixtureEvidenceForLine(path, line)) {
      annotations.push({
        lineNumber: line,
        metadata: {
          kind: "evidence",
          label: `evidence ${evidence.id}`,
          detail: `${evidence.title}: ${evidence.detail}`,
        },
      });
    }
  }

  return annotations;
}

function extractDiffLineAnnotations(
  filePath: string,
  fileDiff: FileDiffMetadata,
): DiffLineAnnotation<WorkbenchLineMetadata>[] {
  const byLine: DiffLineAnnotation<WorkbenchLineMetadata>[] = [];

  for (const hunk of fileDiff.hunks) {
    let additionLine = hunk.additionStart;
    let deletionLine = hunk.deletionStart;

    for (const content of hunk.hunkContent) {
      if (content.type === "context") {
        for (let i = 0; i < content.lines; i++) {
          if (isInBoundary(filePath, additionLine, ownershipBoundary)) {
            byLine.push({
              side: "additions",
              lineNumber: additionLine,
              metadata: {
                kind: "ownership-boundary",
                label: "boundary",
                detail: `${ownershipBoundary.title} (${ownershipBoundary.startLine}-${ownershipBoundary.endLine})`,
              },
            });
          }

          if (isInBoundary(filePath, deletionLine, ownershipBoundary)) {
            byLine.push({
              side: "deletions",
              lineNumber: deletionLine,
              metadata: {
                kind: "ownership-boundary",
                label: "boundary",
                detail: `${ownershipBoundary.title} (${ownershipBoundary.startLine}-${ownershipBoundary.endLine})`,
              },
            });
          }

          for (const evidence of fixtureEvidenceForLine(filePath, additionLine)) {
            byLine.push({
              side: "additions",
              lineNumber: additionLine,
              metadata: {
                kind: "evidence",
                label: `evidence ${evidence.id}`,
                detail: `${evidence.title}: ${evidence.detail}`,
              },
            });
          }

          for (const evidence of fixtureEvidenceForLine(filePath, deletionLine)) {
            byLine.push({
              side: "deletions",
              lineNumber: deletionLine,
              metadata: {
                kind: "evidence",
                label: `evidence ${evidence.id}`,
                detail: `${evidence.title}: ${evidence.detail}`,
              },
              });
          }

          additionLine += 1;
          deletionLine += 1;
        }
        continue;
      }

      for (let i = 0; i < content.deletions; i++) {
        if (isInBoundary(filePath, deletionLine, ownershipBoundary)) {
          byLine.push({
            side: "deletions",
            lineNumber: deletionLine,
            metadata: {
              kind: "ownership-boundary",
              label: "boundary",
              detail: `${ownershipBoundary.title} (${ownershipBoundary.startLine}-${ownershipBoundary.endLine})`,
            },
          });
        }

        for (const evidence of fixtureEvidenceForLine(filePath, deletionLine)) {
          byLine.push({
            side: "deletions",
            lineNumber: deletionLine,
            metadata: {
              kind: "evidence",
              label: `evidence ${evidence.id}`,
              detail: `${evidence.title}: ${evidence.detail}`,
            },
          });
        }

        deletionLine += 1;
      }

      for (let i = 0; i < content.additions; i++) {
        if (isInBoundary(filePath, additionLine, ownershipBoundary)) {
          byLine.push({
            side: "additions",
            lineNumber: additionLine,
            metadata: {
              kind: "ownership-boundary",
              label: "boundary",
              detail: `${ownershipBoundary.title} (${ownershipBoundary.startLine}-${ownershipBoundary.endLine})`,
            },
          });
        }

        for (const evidence of fixtureEvidenceForLine(filePath, additionLine)) {
          byLine.push({
            side: "additions",
            lineNumber: additionLine,
            metadata: {
              kind: "evidence",
              label: `evidence ${evidence.id}`,
              detail: `${evidence.title}: ${evidence.detail}`,
            },
          });
        }

        additionLine += 1;
      }
    }
  }

  return byLine;
}

export const fixtureParsedPatches = (() => {
  try {
    const parsed = parsePatchFiles(fixtureDiff, "sibi-slice-0", true);
    if (parsed.length === 0) {
      console.error(
        "[sibi-workbench] Fixture diff parsed to zero file changes. Expected two fixture changes in `fixtureDiff`.",
      );
    }
    return parsed;
  } catch (error) {
    console.error("[sibi-workbench] Fixture diff failed to parse; diff mode will fallback to file content only.", error);
    return [] as ParsedPatch[];
  }
})();
export const fileDiffsByPath = fixtureParsedPatches.flatMap((patch) => patch.files).reduce(
  (acc, fileDiff) => {
    acc[fileDiff.name] = fileDiff;
    return acc;
  },
  {} as Record<string, FileDiffMetadata>,
);

export const codeViewFileItemsByPath: Record<string, CodeViewFileItem<WorkbenchLineMetadata>> =
  Object.fromEntries(
    Object.entries(fileFixtures).map(([path, fileContents]) => [
      path,
      {
        id: `file:${path}`,
        type: "file",
        file: { name: path, contents: fileContents },
        annotations: makeFileLineAnnotations(path),
      },
    ]),
  );

export const codeViewDiffItemsByPath: Record<string, CodeViewDiffItem<WorkbenchLineMetadata>> =
  Object.fromEntries(
    Object.entries(fileDiffsByPath).map(([path, fileDiff]) => [
      path,
      {
        id: `diff:${path}`,
        type: "diff",
        fileDiff,
        annotations: extractDiffLineAnnotations(path, fileDiff),
      },
    ]),
  );

export const initialFile = Object.keys(fileFixtures)[0];

export const noCodeLinePlaceHolder = "No diff available for this fixture file.";

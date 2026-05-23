import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, extname, relative } from "node:path";

import { getArtifactSession, readState, writeState } from "./persistence/state.ts";
import {
  fail,
  now,
  toOperationState,
  type ArtifactSession,
  type ConceptEdge,
  type ConceptEdgeRelation,
  type ConceptGraph,
  type ConceptNode,
  type ConceptNodeKind,
  type EvidenceCitation,
  type RuntimeSuccess,
} from "./runtime-support.ts";

type FileEvidence = {
  path: string;
  relativePath: string;
  lines: string[];
};

type NodeRule = {
  id: string;
  label: string;
  kind: ConceptNodeKind;
  why_it_matters: string;
  prerequisite_concepts: string[];
  pathPattern: RegExp;
  linePattern: RegExp;
};

const SOURCE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".mjs",
  ".swift",
  ".ts",
  ".tsx",
]);

const SKIPPED_DIRS = new Set([".git", ".swiftpm", "node_modules", "dist", "build", ".next"]);
const MAX_FILE_BYTES = 128 * 1024;

const NODE_RULES: NodeRule[] = [
  {
    id: "entry-point",
    label: "Runtime entry point",
    kind: "runtime",
    why_it_matters: "This is where an external caller crosses into the artifact's runtime behavior.",
    prerequisite_concepts: [],
    pathPattern: /(^|\/)(runtime|index|main|cli|server|app|sibi)(\.[^/]+)?$/i,
    linePattern: /\b(runFromSTDIO|handleRequest|main\(|start|listen|spawnSync|command)\b/,
  },
  {
    id: "runtime-boundary",
    label: "Command boundary and payload contract",
    kind: "architecture",
    why_it_matters: "This boundary decides which commands are accepted and what shape the runtime returns.",
    prerequisite_concepts: ["entry-point"],
    pathPattern: /runtime|command|client|bridge/i,
    linePattern: /\b(command|payload|handleRequest|RuntimeRequest|RuntimeResponse|switch)\b/,
  },
  {
    id: "state-persistence",
    label: "Runtime state persistence",
    kind: "data_flow",
    why_it_matters: "Later learning steps depend on state that can be saved and reloaded.",
    prerequisite_concepts: ["runtime-boundary"],
    pathPattern: /state|store|persist|storage|memory/i,
    linePattern: /\b(readState|writeState|readFileSync|writeFileSync|persist|store|runtime-state)\b/,
  },
  {
    id: "core-policy",
    label: "Core learning policy",
    kind: "algorithm",
    why_it_matters: "Policy code determines how the artifact turns evidence into learning actions.",
    prerequisite_concepts: ["runtime-boundary"],
    pathPattern: /policy|pedagogy|question|runtime|pipeline|layer|signal/i,
    linePattern: /\b(generateQuestions|verifyAnswer|policy|Layer|gap|confidence|question|evidence)\b/,
  },
  {
    id: "artifact-data-flow",
    label: "Artifact data flow",
    kind: "data_flow",
    why_it_matters: "This flow explains how bounded artifact inputs become reusable runtime outputs.",
    prerequisite_concepts: ["entry-point", "state-persistence"],
    pathPattern: /artifact|runtime|state|selection|client/i,
    linePattern: /\b(artifact_session|included_paths|excluded_paths|selection|summary|writeState|readState)\b/,
  },
  {
    id: "test-coverage",
    label: "Runtime behavior tests",
    kind: "testing",
    why_it_matters: "Tests show which behavior is expected to stay stable as the artifact changes.",
    prerequisite_concepts: ["runtime-boundary"],
    pathPattern: /(^|\/)(tests?|.*\.test)\//i,
    linePattern: /\b(test\(|assert\.|expect|handleRequest|spawnSync)\b/,
  },
  {
    id: "failure-modes",
    label: "Failure modes and rejected inputs",
    kind: "risk",
    why_it_matters: "Rejected inputs and errors mark the places most likely to break trust if loosened.",
    prerequisite_concepts: ["runtime-boundary"],
    pathPattern: /runtime|state|selection|test|error|validation/i,
    linePattern: /\b(fail\(|throw new|catch|reject|outside|invalid|missing|error\.code)\b/,
  },
];

function isWithinRoot(candidatePath: string, rootPath: string): boolean {
  return candidatePath === rootPath || candidatePath.startsWith(rootPath.endsWith("/") ? rootPath : `${rootPath}/`);
}

function isExcluded(path: string, artifactSession: ArtifactSession): boolean {
  return artifactSession.excluded_paths.some((excludedPath) => isWithinRoot(path, excludedPath));
}

function isIncluded(path: string, artifactSession: ArtifactSession): boolean {
  return artifactSession.included_paths.some((includedPath) => isWithinRoot(path, includedPath));
}

function compareFileEvidence(left: FileEvidence, right: FileEvidence): number {
  return left.relativePath.localeCompare(right.relativePath);
}

function readInventoryPath(path: string, artifactSession: ArtifactSession, files: FileEvidence[]): void {
  if (!existsSync(path)) return;
  const realPath = realpathSync(path);
  if (!isWithinRoot(realPath, artifactSession.root_path) || isExcluded(realPath, artifactSession)) return;

  const stats = statSync(realPath);
  if (stats.isDirectory()) {
    if (SKIPPED_DIRS.has(basename(realPath))) return;
    for (const entry of readdirSync(realPath).sort()) {
      readInventoryPath(`${realPath}/${entry}`, artifactSession, files);
    }
    return;
  }

  if (!stats.isFile() || stats.size > MAX_FILE_BYTES || !SOURCE_EXTENSIONS.has(extname(realPath))) {
    return;
  }
  if (!isIncluded(realPath, artifactSession)) return;

  const raw = readFileSync(realPath, "utf8");
  if (raw.includes("\u0000")) return;
  files.push({
    path: realPath,
    relativePath: relative(artifactSession.root_path, realPath) || basename(realPath),
    lines: raw.split(/\r?\n/),
  });
}

function buildInventory(artifactSession: ArtifactSession): FileEvidence[] {
  const files: FileEvidence[] = [];
  for (const includedPath of artifactSession.included_paths) {
    readInventoryPath(includedPath, artifactSession, files);
  }
  return files.sort(compareFileEvidence);
}

function excerpt(line: string): string {
  return line.trim().replace(/\s+/g, " ").slice(0, 180);
}

function findCitation(files: FileEvidence[], rule: NodeRule): EvidenceCitation | null {
  const pathMatches = files.filter((file) => rule.pathPattern.test(file.relativePath));
  const searchFiles = pathMatches.length > 0 ? pathMatches : files;
  for (const file of searchFiles) {
    const lineIndex = file.lines.findIndex((line) => rule.linePattern.test(line));
    if (lineIndex >= 0) {
      return {
        file_path: file.path,
        start_line: lineIndex + 1,
        end_line: lineIndex + 1,
        excerpt: excerpt(file.lines[lineIndex]),
      };
    }
  }
  return null;
}

function sourcePaths(evidence: EvidenceCitation[]): string[] {
  return Array.from(new Set(evidence.map((entry) => entry.file_path)));
}

function buildNodes(files: FileEvidence[]): ConceptNode[] {
  const nodes: ConceptNode[] = [];
  for (const rule of NODE_RULES) {
    const citation = findCitation(files, rule);
    if (!citation) continue;
    nodes.push({
      id: rule.id,
      label: rule.label,
      kind: rule.kind,
      source_paths: sourcePaths([citation]),
      why_it_matters: rule.why_it_matters,
      prerequisite_concepts: rule.prerequisite_concepts.filter((id) => nodes.some((node) => node.id === id)),
      evidence: [citation],
    });
  }
  return nodes;
}

function nodeByID(nodes: ConceptNode[], id: string): ConceptNode | null {
  return nodes.find((node) => node.id === id) ?? null;
}

function makeEdge(
  nodes: ConceptNode[],
  id: string,
  from: string,
  to: string,
  relation: ConceptEdgeRelation,
  label: string,
  evidenceNodeID: string,
): ConceptEdge | null {
  const fromNode = nodeByID(nodes, from);
  const toNode = nodeByID(nodes, to);
  const evidenceNode = nodeByID(nodes, evidenceNodeID);
  if (!fromNode || !toNode || !evidenceNode) return null;
  return {
    id,
    from,
    to,
    relation,
    label,
    evidence: evidenceNode.evidence,
  };
}

function buildEdges(nodes: ConceptNode[]): ConceptEdge[] {
  return [
    makeEdge(
      nodes,
      "entry-routes-command-boundary",
      "entry-point",
      "runtime-boundary",
      "calls",
      "Entry point routes requests into the runtime command boundary.",
      "runtime-boundary",
    ),
    makeEdge(
      nodes,
      "command-boundary-persists-state",
      "runtime-boundary",
      "state-persistence",
      "persists",
      "Runtime command handling writes durable state for later commands.",
      "state-persistence",
    ),
    makeEdge(
      nodes,
      "policy-depends-on-boundary",
      "core-policy",
      "runtime-boundary",
      "depends_on",
      "Learning policy depends on the command boundary to supply bounded payloads.",
      "core-policy",
    ),
    makeEdge(
      nodes,
      "tests-cover-runtime-boundary",
      "test-coverage",
      "runtime-boundary",
      "tests",
      "Tests exercise the runtime command boundary as the observable contract.",
      "test-coverage",
    ),
    makeEdge(
      nodes,
      "failure-modes-risk-boundary",
      "failure-modes",
      "runtime-boundary",
      "risks",
      "Failure-mode checks show where invalid inputs could weaken the boundary.",
      "failure-modes",
    ),
  ].filter((edge): edge is ConceptEdge => edge !== null);
}

function assertCitationAllowed(citation: EvidenceCitation, artifactSession: ArtifactSession): void {
  if (!isWithinRoot(citation.file_path, artifactSession.root_path) || !isIncluded(citation.file_path, artifactSession)) {
    fail("concept_graph_boundary_violation", "Concept graph evidence must stay inside included artifact paths.");
  }
  if (isExcluded(citation.file_path, artifactSession)) {
    fail("concept_graph_boundary_violation", "Concept graph evidence must not cite excluded artifact paths.");
  }
  if (citation.start_line < 1 || citation.end_line < citation.start_line || !citation.excerpt) {
    fail("invalid_concept_graph", "Concept graph evidence must include a file range and excerpt.");
  }
}

function validateGraph(graph: ConceptGraph, artifactSession: ArtifactSession): void {
  for (const node of graph.nodes) {
    if (node.evidence.length === 0 || !node.why_it_matters.trim()) {
      fail("invalid_concept_graph", "Every concept node must include why_it_matters and evidence.");
    }
    node.evidence.forEach((citation) => assertCitationAllowed(citation, artifactSession));
  }
  for (const edge of graph.edges) {
    if (edge.evidence.length === 0) {
      fail("invalid_concept_graph", "Every concept edge must include evidence.");
    }
    edge.evidence.forEach((citation) => assertCitationAllowed(citation, artifactSession));
  }
}

export function buildConceptGraphCommand(payload: Record<string, unknown>): RuntimeSuccess<{
  artifact_session_id: string;
  concept_graph: ConceptGraph;
  operation_state: { message: string };
}> {
  const state = readState();
  const artifactSession = getArtifactSession(state, payload.artifact_session_id as string | undefined);
  const files = buildInventory(artifactSession);
  if (files.length === 0) {
    fail("empty_artifact", "No readable source, test, or documentation files were found inside the artifact boundary.");
  }

  const graph: ConceptGraph = {
    artifact_session_id: artifactSession.artifact_session_id,
    generated_at: now(),
    scope: {
      root_path: artifactSession.root_path,
      included_paths: artifactSession.included_paths,
      excluded_paths: artifactSession.excluded_paths,
    },
    nodes: buildNodes(files),
    edges: [],
  };
  graph.edges = buildEdges(graph.nodes);
  validateGraph(graph, artifactSession);

  artifactSession.concept_graph = graph;
  writeState(state);

  return {
    ok: true,
    data: {
      artifact_session_id: artifactSession.artifact_session_id,
      concept_graph: graph,
      operation_state: toOperationState("Concept graph built from bounded artifact evidence."),
    },
  };
}

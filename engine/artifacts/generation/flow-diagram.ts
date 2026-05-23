import type {
  ConceptSlice,
  EvidenceInventoryEntry,
  EvidenceRef,
  ThinkingArtifact,
  UserOperationKind,
} from "../../runtime-deep-ownership.ts";
import { detectEvidenceRoleConflicts } from "./authority.ts";
import { resolveCreatedAt } from "./deterministic-clock.ts";
import { evidenceRefFromEntry, getConceptSliceEvidence } from "./evidence-helpers.ts";
import type { AuthorityCheckResult, ArtifactGenerationOptions, GeneratedEdge, GeneratedNode } from "./types.ts";

function determineNodeRole(
  index: number,
  total: number,
): "input" | "process" | "data" | "output" | "unknown" {
  if (total === 1) return "process";
  if (index === 0) return "input";
  if (index === total - 1) return "output";
  if (index === Math.floor(total / 2)) return "process";
  return "data";
}

function buildNodePrompt(entry: EvidenceInventoryEntry, slice: ConceptSlice): string {
  switch (entry.role) {
    case "implementation":
      return `What does the implementation in ${entry.path} reveal about "${slice.label}"?`;
    case "behavior_oracle":
      return `How does the test in ${entry.path} validate the behavior of "${slice.label}"?`;
    case "interface":
      return `What contract does ${entry.path} define for "${slice.label}"?`;
    case "intent":
      return `What does the documentation in ${entry.path} claim about "${slice.label}"?`;
    default:
      return `What evidence does ${entry.path} provide for "${slice.label}"?`;
  }
}

function buildFlowNodes(
  evidence: EvidenceInventoryEntry[],
  slice: ConceptSlice,
  roleConflict: { hasConflict: boolean; conflicts: AuthorityCheckResult[] },
): GeneratedNode[] {
  const nodes: GeneratedNode[] = [];
  for (let i = 0; i < evidence.length; i++) {
    const entry = evidence[i];
    const nodeId = `N-${String(i + 1).padStart(3, "0")}`;
    const isInferred =
      roleConflict.hasConflict &&
      entry.role !== "implementation" &&
      entry.role !== "source_truth";

    nodes.push({
      id: nodeId,
      label: entry.excerpt.substring(0, 60),
      role: determineNodeRole(i, evidence.length),
      evidence: [entry.id],
      is_inferred: isInferred,
      user_prompt: buildNodePrompt(entry, slice),
    });
  }
  return nodes;
}

function buildFlowEdges(
  nodes: GeneratedNode[],
  evidence: EvidenceInventoryEntry[],
  roleConflict: { hasConflict: boolean },
): GeneratedEdge[] {
  const edges: GeneratedEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const fromRole = evidence[i]?.role;
    const toRole = evidence[i + 1]?.role;
    const isInferred =
      roleConflict.hasConflict &&
      fromRole !== toRole &&
      fromRole !== "implementation" &&
      toRole !== "implementation";

    edges.push({
      from: nodes[i].id,
      to: nodes[i + 1].id,
      relation: i === 0 ? "input_to_process" : i === nodes.length - 2 ? "produces" : "feeds_into",
      evidence: [nodes[i].evidence[0], nodes[i + 1].evidence[0]].filter(
        (evidenceId): evidenceId is string => !!evidenceId,
      ),
      is_inferred: isInferred,
    });
  }
  return edges;
}

function buildFlowDiagramPrompt(
  evidence: EvidenceInventoryEntry[],
  slice: ConceptSlice,
  roleConflict: { hasConflict: boolean },
): string {
  const evidenceList = evidence
    .map((entry) => `  - ${entry.id} (${entry.role}): ${entry.path}`)
    .join("\n");

  let prompt = `Trace the flow through the concept "${slice.label}" across the following evidence:\n${evidenceList}\n\n` +
    `For each step in the flow, identify: (1) the evidence role, (2) whether the claim is directly evidenced or inferred, and (3) how the evidence connects to the next step.`;

  if (roleConflict.hasConflict) {
    prompt +=
      `\n\nIMPORTANT: Evidence role conflicts exist in this flow. ` +
      `Resolve them by treating implementation and source_truth evidence as authoritative over intent/docs. ` +
      `Mark ambiguous connections as inferred.`;
  }

  return prompt;
}

export function generateFlowDiagramArtifact(
  evidenceInventory: EvidenceInventoryEntry[],
  conceptSlice: ConceptSlice,
  options: ArtifactGenerationOptions = {},
): ThinkingArtifact {
  if (!Array.isArray(evidenceInventory) || evidenceInventory.length === 0) {
    throw new Error("Cannot generate flow diagram: evidence inventory is empty");
  }

  const sliceEvidence = getConceptSliceEvidence(evidenceInventory, conceptSlice);
  if (sliceEvidence.length === 0) {
    throw new Error(
      `Cannot generate flow diagram: no evidence in inventory matches concept slice ${conceptSlice.id} requirements`,
    );
  }

  const prefix = options.artifactIdPrefix ?? "TA-FD";
  const artifactId = `${prefix}-${conceptSlice.id}`;

  const sourceEvidenceRefs: EvidenceRef[] = sliceEvidence.map((entry) => evidenceRefFromEntry(entry));
  const hiddenEvidenceRefs: EvidenceRef[] = sliceEvidence
    .filter((entry) => entry.role === "implementation" || entry.role === "source_truth")
    .map((entry) => evidenceRefFromEntry(entry));

  const roleConflict = detectEvidenceRoleConflicts(sourceEvidenceRefs);
  const nodes = buildFlowNodes(sliceEvidence, conceptSlice, roleConflict);
  const edges = buildFlowEdges(nodes, sliceEvidence, roleConflict);
  const entryNode = nodes.length > 0 ? nodes[0].id : "N-001";
  const terminalNodes = nodes.length > 0 ? [nodes[nodes.length - 1].id] : [];
  const uncertaintyMarkers = roleConflict.conflicts.map((conflict) => conflict.resolution);

  const operationKind: UserOperationKind = conceptSlice.operation_target;
  const operationPrompt = buildFlowDiagramPrompt(sliceEvidence, conceptSlice, roleConflict);
  const successCriteria = [
    `Traces the full path from entry to terminal through all ${sliceEvidence.length} evidence nodes`,
    "For each node, identifies the evidence role and whether the claim is directly evidenced or inferred",
    "Explains edge relations between nodes using evidence",
    "Identifies any uncertainty markers or role conflicts in the diagram",
  ];

  const purposeText = roleConflict.hasConflict
    ? `Show the causal path through "${conceptSlice.label}" with ${sliceEvidence.length} evidence sources. ` +
      `Conflicting evidence roles detected — ambiguous nodes marked as inferred/unknown. ` +
      `The user must ${conceptSlice.operation_target} the full flow.`
    : `Show the causal path through "${conceptSlice.label}" across ${sliceEvidence.length} evidence sources. ` +
      `The user must ${conceptSlice.operation_target} the flow end-to-end.`;

  const createdAt = resolveCreatedAt(options, {
    artifact_kind: "flow_diagram",
    concept_slice_id: conceptSlice.id,
    source_evidence_ids: sourceEvidenceRefs.map((ref) => ref.evidence_id),
    operation_kind: operationKind,
  });

  return {
    id: artifactId,
    kind: "flow_diagram",
    title: `Flow: ${conceptSlice.label}`,
    purpose: purposeText,
    concept_slice_id: conceptSlice.id,
    source_evidence: sourceEvidenceRefs,
    hidden_solution_evidence: hiddenEvidenceRefs,
    user_operation: {
      id: `OP-${artifactId}`,
      kind: operationKind,
      prompt: operationPrompt,
      artifact_ids: [artifactId],
      required_evidence: conceptSlice.source_evidence,
      allowed_hints: 3,
      blocked_shortcuts: ["cannot_skip_edge_tracing", "cannot_ignore_inferred_markers"],
      success_criteria: successCriteria,
    },
    renderer: "flow_diagram",
    payload: {
      nodes,
      edges,
      entry_node: entryNode,
      terminal_nodes: terminalNodes,
      uncertainty_markers: uncertaintyMarkers,
    },
    success_criteria: successCriteria,
    created_at: createdAt,
  };
}

import {
  DEFAULT_ROADMAP,
  NODE_PREREQUISITES,
  NODE_EVIDENCE_KEYWORDS,
  TRACKS,
} from "./workspace-data.js";
import { normalizeId } from "./workspace-utils.js";

function miniNodeFactory({ id, title, goal, readerPrompt, sources = [] }) {
  const kinds = ["direct-reading", "paper", "direct-reading", "direct-reading"];
  return {
    id,
    title,
    goal,
    readerPrompt,
    resources: sources.map((title, index) => ({
      kind: kinds[index % kinds.length],
      title,
      source: "Current source card",
      action: `Read: ${title}.`,
    })),
  };
}

const STUDY_NODE_PLANS = {
  backprop: {
    displayTitle: "Backpropagation",
    source: "Karpathy-style backprop walkthrough plus Rumelhart, Hinton, and Williams 1986",
    focus: "Decompose reverse-mode differentiation into five smaller concepts before asking for an explanation.",
    recommendedDecision: "Open Chain rule trace, read one primary source, then write a scalar trace attempt.",
    readerMove: "Use the selected mini-node resource, then submit a reconstruction before hints.",
    defaultMiniNodeId: "chain-rule",
    miniNodes: [
      miniNodeFactory({
        id: "computational-graph",
        title: "Computational graph",
        goal: "Represent the forward expression as nodes and edges before any gradient math.",
        readerPrompt: "Trace one scalar loss through Value nodes and name each parent edge.",
        sources: [
          "micrograd Value object walkthrough",
          "micrograd Value data, children, and backward fields",
          "Read only the definition paragraph then restate it",
        ],
      }),
      miniNodeFactory({
        id: "local-derivative",
        title: "Local derivatives",
        goal: "State each primitive derivative locally before composing the whole graph.",
        readerPrompt: "Write the local derivative for add, multiply, tanh, and power nodes.",
        sources: [
          "CS231n local gradient examples",
          "Derivative tables for elementwise and pointwise operations",
          "Reproduce one derivative table from memory",
        ],
      }),
      miniNodeFactory({
        id: "chain-rule",
        title: "Chain rule trace",
        goal: "Compose local derivatives from loss to parameter without skipping links.",
        readerPrompt: "Follow one output-to-weight path and multiply every local derivative in order.",
        sources: [
          "Rumelhart, Hinton, Williams",
          "Error propagation framing and scalar graph mapping",
          "Read the source and map each stage to one local derivative",
        ],
      }),
      miniNodeFactory({
        id: "reverse-topology",
        title: "Reverse-topology pass",
        goal: "Run backward only after the forward graph order is known.",
        readerPrompt: "List the nodes in forward order, reverse them, then call each backward closure once.",
        sources: [
          "Nielsen backprop chapter",
          "Algorithm section and graph traversal interpretation",
          "Convert it to traversal language with one example",
        ],
      }),
      miniNodeFactory({
        id: "gradient-accumulation",
        title: "Gradient accumulation",
        goal: "Explain why shared nodes add gradients instead of replacing them.",
        readerPrompt: "Find a forked graph where one value contributes through two paths and sum both gradients.",
        sources: [
          "Automatic differentiation in machine learning: a survey",
          "Reverse accumulation description and micrograd comparison",
          "Create one forked graph and compute final accumulation by hand",
        ],
      }),
    ],
  },
  tokenization: {
    displayTitle: "Tokenization",
    source: "Tokenization source primers and sequence corpus examples.",
    focus: "Split corpus understanding into boundaries, ID space design, and reconstruction stability.",
    recommendedDecision: "Start with boundary definition, then produce one idempotent tokenization trace.",
    readerMove: "Read two examples in the mini-node resources and create a tiny token table.",
    defaultMiniNodeId: "token-boundaries",
    miniNodes: [
      miniNodeFactory({
        id: "token-boundaries",
        title: "Token boundaries",
        goal: "Identify where token boundaries appear in raw text.",
        readerPrompt: "Break one paragraph into whitespace and punctuation boundaries.",
        sources: [
          "Token boundary primers",
          "Whitespace and punctuation examples",
          "Create a token boundary table for one sentence",
        ],
      }),
      miniNodeFactory({
        id: "vocab-design",
        title: "Vocabulary design",
        goal: "Select a minimal ID-space with deterministic unknown handling.",
        readerPrompt: "Design an ID map for 12 unique symbols and verify roundtrip decode.",
        sources: [
          "Vocabulary design notes",
          "Unknown token and whitespace encoding guidance",
          "Draft a deterministic vocabulary plan for a toy corpus",
        ],
      }),
      miniNodeFactory({
        id: "sequence-splitting",
        title: "Sequence splitting",
        goal: "Generate model-ready indexed windows with no data leakage.",
        readerPrompt: "Split two short texts into fixed windows and compare overlap behavior.",
        sources: [
          "Sequence modeling notes",
          "Windowing and truncation examples",
          "Show one overlap example and its expected outputs",
        ],
      }),
      miniNodeFactory({
        id: "id-alignment",
        title: "ID alignment",
        goal: "Keep token ID alignment stable between encode/decode operations.",
        readerPrompt: "Run one encode/decode cycle and show bijection for known tokens.",
        sources: [
          "Tokenizer implementations",
          "Encode/decode consistency guide",
          "Verify roundtrip for OOV and unknown tokens",
        ],
      }),
      miniNodeFactory({
        id: "tokenization-recall",
        title: "Recall check",
        goal: "Recall tokenization invariants under friction.",
        readerPrompt: "Answer one recall prompt for token boundaries and ID alignment.",
        sources: [
          "Recall card prompt",
          "Tokenization invariants checklist",
          "Build one hidden-edge recall test",
        ],
      }),
    ],
  },
  transformer: {
    displayTitle: "Transformer / Attention",
    source: "Attention and sequence literature from modern transformer primers.",
    focus: "Split attention into masking, similarity scoring, and head composition.",
    recommendedDecision: "Trace one 2-token attention path and then map masking constraints to the output.",
    readerMove: "Read attention resources and write one worked attention trace.",
    defaultMiniNodeId: "attention-intuition",
    miniNodes: [
      miniNodeFactory({
        id: "attention-intuition",
        title: "Attention intuition",
        goal: "Explain attention as weighted context lookup.",
        readerPrompt: "Compute weighted context for a 2-token toy input manually.",
        sources: [
          "Attention primer",
          "Weighted sum walkthrough",
          "Build one simple attention score table",
        ],
      }),
      miniNodeFactory({
        id: "masking-causality",
        title: "Masking and causality",
        goal: "Explain why causality masks future positions in autoregressive settings.",
        readerPrompt: "Sketch one masked attention matrix for three tokens.",
        sources: [
          "Causal masking notes",
          "Transformer walkthrough",
          "Show one masked future-position example",
        ],
      }),
      miniNodeFactory({
        id: "positional-encoding",
        title: "Positional encoding",
        goal: "Represent position as deterministic side-channel signal.",
        readerPrompt: "Compare absolute and relative effects on two-token examples.",
        sources: [
          "Positional signal references",
          "Positional encodings in practice",
          "Annotate one sequence with positional values",
        ],
      }),
      miniNodeFactory({
        id: "multihead-composition",
        title: "Multi-head composition",
        goal: "Understand how multiple heads capture different projections.",
        readerPrompt: "Draft two-headed attention for one sample and compare outputs.",
        sources: [
          "Multi-head notes",
          "Head parallelism examples",
          "Explain how separate heads route different signal channels",
        ],
      }),
      miniNodeFactory({
        id: "transformer-recall",
        title: "Recall check",
        goal: "Recall transformer constraints and attention flow under friction.",
        readerPrompt: "Answer one recall prompt that contrasts attention path and masking.",
        sources: ["Transformer recall prompt", "Sequence-to-sequence comparison prompt", "Build one quick check card"],
      }),
    ],
  },
  scaling: {
    displayTitle: "Scaling intuition",
    source: "Capacity and compute scaling references.",
    focus: "Separate model size, data, and training compute contributions with practical checkpoints.",
    recommendedDecision: "Create three checkpoints: small-medium-large and compare compute assumptions.",
    readerMove: "Read scaling tables and build one compute-cost estimate.",
    defaultMiniNodeId: "scaling-math",
    miniNodes: [
      miniNodeFactory({
        id: "scaling-math",
        title: "Scaling tradeoffs",
        goal: "Quantify expected gains with model-data-compute triad.",
        readerPrompt: "Compute a toy scaling curve from three data points.",
        sources: [
          "Scaling law notes",
          "Empirical scaling chart references",
          "Create one toy scaling table from synthetic points",
        ],
      }),
      miniNodeFactory({
        id: "compute-budgeting",
        title: "Compute budgeting",
        goal: "Translate compute assumptions into training schedule constraints.",
        readerPrompt: "Estimate wall-clock for three batch-size assumptions.",
        sources: [
          "Compute budgeting docs",
          "Batch and optimizer scheduling examples",
          "Draft one cost spreadsheet with assumptions",
        ],
      }),
      miniNodeFactory({
        id: "diminishing-returns",
        title: "Diminishing returns",
        goal: "Detect where more tokens no longer improve expected metrics.",
        readerPrompt: "Fit a simple saturating curve to toy quality points.",
        sources: [
          "Validation quality curves",
          "Toy plateau examples",
          "Explain saturation signatures in one paragraph",
        ],
      }),
      miniNodeFactory({
        id: "deployment-route",
        title: "Deployment route",
        goal: "Map scaling choices to reproducible infrastructure checkpoints.",
        readerPrompt: "Write three deployment checkpoints with one rollback condition each.",
        sources: [
          "Systems planning notes",
          "Deployment checklist",
          "Create one checkpoint plan with risks",
        ],
      }),
      miniNodeFactory({
        id: "scaling-recall",
        title: "Recall check",
        goal: "Recall scaling tradeoffs and bottlenecks from memory.",
        readerPrompt: "Answer one recall prompt about compute/data/model balance.",
        sources: ["Scaling recall prompt", "Tradeoff card", "Build one memory-only answer"],
      }),
    ],
  },
};

function buildMiniNodeDefaults(plan) {
  return [
    {
      id: `${plan.nodeId}-definition`,
      title: "Definition boundary",
      goal: `Define ${plan.displayTitle} without borrowing a memorized phrase.`,
      readerPrompt: `Write the smallest correct definition for ${plan.displayTitle}.`,
      resources: [
        {
          kind: "direct-reading",
          title: `${plan.displayTitle} primary note`,
          source: "Current source card",
          action: "Read the definition paragraph, then restate it.",
        },
      ],
    },
    {
      id: `${plan.nodeId}-mechanism`,
      title: "Mechanism",
      goal: `Explain how ${plan.displayTitle} changes state or data.`,
      readerPrompt: `Trace one input through ${plan.displayTitle} and name the intermediate state.`,
      resources: [
        {
          kind: "direct-reading",
          title: `${plan.displayTitle} worked example`,
          source: "Session reader",
          action: "Read one worked example and rewrite the steps from memory.",
        },
      ],
    },
    {
      id: `${plan.nodeId}-failure`,
      title: "Failure mode",
      goal: `Identify one way ${plan.displayTitle} is commonly misunderstood.`,
      readerPrompt: "Write the wrong explanation first, then repair the missing condition.",
      resources: [
        {
          kind: "direct-reading",
          title: `${plan.displayTitle} misconception check`,
          source: "Sibar repair lane",
          action: "Read the failure case and make one contrastive recall card.",
        },
      ],
    },
    {
      id: `${plan.nodeId}-artifact`,
      title: "Build artifact",
      goal: `Create a small artifact that proves ${plan.displayTitle} is operational.`,
      readerPrompt: `Build or sketch the smallest executable artifact for ${plan.displayTitle}.`,
      resources: [
        {
          kind: "direct-reading",
          title: `${plan.displayTitle} implementation prompt`,
          source: "Workspace artifact lane",
          action: "Read the artifact requirement and produce one checkable output.",
        },
      ],
    },
    {
      id: `${plan.nodeId}-recall`,
      title: "Recall check",
      goal: `Recall ${plan.displayTitle} under friction without looking at notes.`,
      readerPrompt: `Answer one recall question for ${plan.displayTitle}, then grade the missing link.`,
      resources: [
        {
          kind: "direct-reading",
          title: `${plan.displayTitle} recall prompt`,
          source: "Sibar readiness lane",
          action: "Read the prompt once, hide it, and answer from memory.",
        },
      ],
    },
  ];
}

function cloneMiniNode(miniNode) {
  return {
    ...miniNode,
    resources: (miniNode.resources || []).map((resource) => ({ ...resource })),
  };
}

function normalizeArtifactResource(resource, fallbackTitle) {
  if (typeof resource === "string") {
    return {
      kind: "direct-reading",
      title: resource,
      source: "Imported roadmap artifact",
      action: "Read the source and write a short reconstruction.",
    };
  }

  return {
    kind: resource?.kind || resource?.medium || "direct-reading",
    title: resource?.title || fallbackTitle || "Imported source",
    source: resource?.source || resource?.url || "Imported roadmap artifact",
    action: resource?.action || resource?.reading_action || resource?.instruction || "Read the source and write a short reconstruction.",
  };
}

function localMiniNodeId(nodeId, miniNode, index) {
  const raw = String(miniNode?.id || miniNode?.title || `${nodeId}-mini-${index + 1}`);
  const suffix = raw.includes("::") ? raw.split("::").pop() : raw;
  return normalizeId(suffix) || `${nodeId}-mini-${index + 1}`;
}

function sourcesForArtifactMiniNode(node, miniNodeId, index) {
  const nodeSources = Array.isArray(node?.sources) ? node.sources : [];
  const exact = nodeSources.filter((source) => {
    const sourceMiniId = source.mini_node_id || source.miniNodeId || source.mini_node || "";
    const sourceId = String(source.id || "");
    return (
      sourceMiniId === miniNodeId ||
      sourceId.includes(`::${miniNodeId}::`) ||
      sourceId.endsWith(`::${miniNodeId}`) ||
      source.display_order === index
    );
  });
  if (exact.length) return exact;
  return index === 0 ? nodeSources : [];
}

function normalizeArtifactMiniNode(node, miniNode, index) {
  const id = localMiniNodeId(node.id, miniNode, index);
  const title = miniNode?.title || `Concept ${index + 1}`;
  const fallbackSources = sourcesForArtifactMiniNode(node, id, index);
  const resources = Array.isArray(miniNode?.resources) && miniNode.resources.length
    ? miniNode.resources
    : fallbackSources;

  return {
    id,
    title,
    goal: miniNode?.goal || miniNode?.objective || `Understand ${title} deeply enough to reconstruct it.`,
    readerPrompt:
      miniNode?.readerPrompt ||
      miniNode?.reader_prompt ||
      miniNode?.prompt ||
      `Read one source for ${title}, then reconstruct the concept without looking.`,
    resources: (resources.length ? resources : [`${title} imported reading`]).map((resource) =>
      normalizeArtifactResource(resource, `${title} imported source`),
    ),
  };
}

export function getTrackIdForNode(nodeId) {
  return TRACKS.find((track) => track.nodes.includes(nodeId))?.id || "track-unknown";
}

export function getNodeById(roadmap, nodeId) {
  return roadmap.find((item) => item.id === nodeId);
}

export function getNodeTitleById(roadmap, nodeId) {
  return getNodeById(roadmap, nodeId)?.title || nodeId;
}

export function getNodeLockedReasons(node, roadmap = []) {
  if (Array.isArray(node?.locked_reasons) && node.locked_reasons.length) {
    return [...node.locked_reasons];
  }

  const map = new Map((roadmap || []).map((item) => [item.id, item]));
  const requirements = Array.isArray(node?.prerequisites) ? node.prerequisites : NODE_PREREQUISITES[node.id] || [];
  const reasons = [];
  for (const requirementId of requirements) {
    const req = map.get(requirementId);
    if (!req || !["understood", "built", "published"].includes(req.status)) {
      reasons.push(`Requires ${getNodeTitleById(roadmap, requirementId)} to be ready.`);
    }
  }
  return reasons;
}

export function lockReasonForNode(nodeId, roadmap) {
  const node = getNodeById(roadmap, nodeId);
  const reasons = getNodeLockedReasons(node || { id: nodeId }, roadmap);
  return reasons.join("; ") || "No prerequisite lock.";
}

export function buildNodeStudyPlan(nodeIdOrNode, roadmap = DEFAULT_ROADMAP) {
  const node =
    typeof nodeIdOrNode === "object"
      ? nodeIdOrNode
      : roadmap.find((item) => item.id === nodeIdOrNode) || DEFAULT_ROADMAP.find((item) => item.id === nodeIdOrNode);
  const resolved = node || { id: String(nodeIdOrNode || "learning-node"), title: "Learning node", status: "unseen" };
  const trackId = resolved.track_id || getTrackIdForNode(resolved.id);
  const planned = STUDY_NODE_PLANS[resolved.id];
  const artifactMiniNodes = Array.isArray(resolved.mini_nodes)
    ? resolved.mini_nodes.map((miniNode, index) => normalizeArtifactMiniNode(resolved, miniNode, index))
    : [];
  const miniNodes = artifactMiniNodes.length
    ? artifactMiniNodes
    : planned
      ? planned.miniNodes.map(cloneMiniNode)
      : buildMiniNodeDefaults({ nodeId: resolved.id, displayTitle: resolved.title });
  const plan = {
    nodeId: resolved.id,
    trackId,
    displayTitle: planned?.displayTitle || resolved.title,
    status: resolved.status || "unseen",
    source: planned?.source || resolved.sources?.[0]?.title || "Current source card",
    focus:
      planned?.focus ||
      resolved.focus ||
      resolved.why_it_matters ||
      `Break ${resolved.title} into five study concepts with one reader action each.`,
    recommendedDecision:
      planned?.recommendedDecision ||
      resolved.recommended_decision ||
      `Pick the weakest mini-node, read one resource, then attempt reconstruction.`,
    readerMove: planned?.readerMove || resolved.reader_move || "Read the selected resource and write a short reconstruction before hints.",
    defaultMiniNodeId: planned?.defaultMiniNodeId || miniNodes[0]?.id,
    miniNodes,
    prerequisites: Array.isArray(resolved.prerequisites) ? [...resolved.prerequisites] : NODE_PREREQUISITES[resolved.id] || [],
  };
  plan.lockedReasons = getNodeLockedReasons(resolved, roadmap);
  return plan;
}

export { NODE_EVIDENCE_KEYWORDS };

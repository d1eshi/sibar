export const STATUS = {
  unseen: "○",
  in_progress: "◐",
  understood: "●",
  built: "◆",
  published: "★",
};

export const STATUS_CLASS = {
  unseen: "locked",
  in_progress: "building",
  understood: "ready",
  built: "ready",
  published: "ready",
};

export const DEFAULT_ROADMAP = [
  { id: "foundations", title: "Math for ML", status: "understood" },
  { id: "micrograd", title: "Micrograd", status: "in_progress" },
  { id: "backprop", title: "Backprop from scratch", status: "understood" },
  { id: "mlp", title: "MLP training loop", status: "in_progress" },
  { id: "tokenization", title: "Tokenization", status: "unseen" },
  { id: "bigram", title: "Bigram LM", status: "unseen" },
  { id: "transformer", title: "Transformer block", status: "unseen" },
  { id: "scaling", title: "Scaling intuition", status: "unseen" },
  { id: "kernels", title: "Kernel / systems preview", status: "unseen" },
];

const ROADMAP_SIGNALS = [
  {
    phrase: "karpathy",
    match: ["karpathy", "zero to hero", "micrograd"],
    nodes: ["foundations", "micrograd", "backprop"],
    claims: [
      "Source describes a from-scratch route through backprop and neural networks.",
      "The material emphasizes implementation-grade math intuition.",
    ],
    outputs: [
      "Build scalar Value graph and chain-rule trace",
      "Explain one backward pass in your own words",
      "Write recall card for symbols and tensor shapes",
    ],
  },
  {
    phrase: "backprop",
    match: ["backprop", "chain rule", "gradient"],
    nodes: ["backprop", "mlp"],
    claims: [
      "Source includes reverse-mode gradient flow and parameter accumulation.",
      "The text links gradients to training behavior.",
    ],
    outputs: ["Implement one full forward/backward toy example", "Draft failure matrix for vanishing gradients"],
  },
  {
    phrase: "token",
    match: ["tokenization", "token"],
    nodes: ["tokenization"],
    claims: [
      "Source requires a tokenization framing before sequence modeling.",
      "Source distinguishes token IDs, vocab, and sequence boundaries.",
    ],
    outputs: ["Create a tiny tokenizer card", "Run a token-boundary audit on sample text"],
  },
  {
    phrase: "bigram",
    match: ["bigram", "makemore"],
    nodes: ["bigram"],
    claims: [
      "Source suggests a minimal language model for next-token distribution.",
    ],
    outputs: ["Train one tiny bigram table", "Compare surprisal behavior across two inputs"],
  },
  {
    phrase: "transformer",
    match: ["transformer", "attention", "gpt", "self-attention"],
    nodes: ["transformer"],
    claims: [
      "Source references attention as a routing mechanism.",
      "Source implies sequence structure before stack composition.",
    ],
    outputs: ["Sketch a 2-token attention trace", "Write an explain card for masking and position effects"],
  },
  {
    phrase: "scaling",
    match: ["scaling", "chinchilla", "capacity"],
    nodes: ["scaling"],
    claims: [
      "Source ties data, model size, and compute tradeoffs.",
    ],
    outputs: ["List three scaling checkpoints and expected evidence", "Create a reproducible compute-cost estimate"],
  },
  {
    phrase: "kernel",
    match: ["kernel", "jax", "pallas", "triton", "systems"],
    nodes: ["kernels"],
    claims: [
      "Source extends toward kernel-level optimization.",
      "Systems-aware artifacts are expected before publishing confidence.",
    ],
    outputs: ["Define one profiling hypothesis", "Draft micro-benchmark protocol for one op"],
  },
];

const NODE_HINTS = [
  "micrograd", "backprop", "mlp", "tokenization", "bigram", "transformer", "scaling", "kernels",
];

const HINTS = [
  "Write the forward-pass equations in 6 lines without looking at notes.",
  "Explain the same loop as if the reviewer knows nothing about your repo.",
  "Point out one common failure mode and one repair action for it.",
];

const MODE_SCOPE_LABELS = {
  "/map": "roadmap",
  "/read": "read",
  "/explain": "scope",
  "/test": "recall",
  "/critic": "diagnostic",
  "/repair": "repair",
  "/build": "artifact",
  "/publish": "evidence",
};

export const DEFAULT_ARTIFACTS = [
  "Micrograd derivation note",
  "Backprop explainability card",
  "Recall test: chain rule without notes",
];

export const DEFAULT_EVIDENCE = [
  "Source: Karpathy-style backprop walkthrough",
  "Code slice: src/runtime-deep-ownership.ts (line evidence)",
  "Practice output: reconstructed derivative",
];

const DEFAULT_EVIDENCE_CHECKLIST = [
  { id: "reconstruction", label: "Reconstruction attempt exists", required: true, complete: false },
  { id: "explanation", label: "Own-words explanation included", required: true, complete: false },
  { id: "recall", label: "Recall output created", required: true, complete: false },
];

const ATTEMPT_SIGNAL_MAP = {
  reconstruction: ["derive", "derivation", "derivative", "chain", "gradient", "backprop", "code", "equation", "pseudo", "reconstruct"],
  explanation: ["explain", "because", "intuitively", "in my words", "reason", "meaning"],
  recall: ["recall", "quiz", "question", "test", "check", "memory", "prompt"],
};

const NODE_EVIDENCE_KEYWORDS = {
  micrograd: ["micrograd", "value", "scalar", "engine"],
  backprop: ["backprop", "chain", "gradient", "dL", "dl", "jacobian", "autograd"],
  mlp: ["mlp", "weights", "layers", "activation", "training"],
  tokenization: ["token", "vocab", "ids", "sequence"],
  bigram: ["bigram", "makemore", "next token", "transition"],
  transformer: ["attention", "transformer", "query", "key", "value"],
  scaling: ["scaling", "compute", "capacity", "chinchilla"],
  kernels: ["kernel", "jax", "pallas", "triton", "systems", "benchmark"],
};

const STUDY_NODE_PLANS = {
  backprop: {
    displayTitle: "Backpropagation",
    source: "Karpathy-style backprop walkthrough plus Rumelhart, Hinton, and Williams 1986",
    focus: "Decompose reverse-mode differentiation into five smaller concepts before asking for an explanation.",
    recommendedDecision: "Open the mini-node that feels unclear, read one primary source, then write a scalar trace attempt.",
    readerMove: "Use the selected mini-node resource, then submit a reconstruction before hints.",
    defaultMiniNodeId: "chain-rule",
    miniNodes: [
      {
        id: "computational-graph",
        title: "Computational graph",
        goal: "Represent the forward expression as nodes and edges before any gradient math.",
        readerPrompt: "Trace one scalar loss through Value nodes and name each parent edge.",
        resources: [
          {
            kind: "direct-reading",
            title: "micrograd Value object walkthrough",
            source: "Karpathy micrograd lecture",
            action: "Read the Value data, children, and backward fields before coding.",
          },
        ],
      },
      {
        id: "local-derivative",
        title: "Local derivatives",
        goal: "State each primitive derivative locally before composing the whole graph.",
        readerPrompt: "Write the local derivative for add, multiply, tanh, and power nodes.",
        resources: [
          {
            kind: "direct-reading",
            title: "CS231n backprop notes",
            source: "Stanford CS231n",
            action: "Read the local gradient examples and reproduce one table.",
          },
        ],
      },
      {
        id: "chain-rule",
        title: "Chain rule trace",
        goal: "Compose local derivatives from loss to parameter without skipping links.",
        readerPrompt: "Follow one output-to-weight path and multiply every local derivative in order.",
        resources: [
          {
            kind: "paper",
            title: "Learning representations by back-propagating errors",
            source: "Rumelhart, Hinton, Williams, Nature 1986",
            action: "Read the error propagation framing and map it to the scalar graph.",
          },
        ],
      },
      {
        id: "reverse-topology",
        title: "Reverse topological pass",
        goal: "Run backward only after the forward graph order is known.",
        readerPrompt: "List the nodes in forward order, reverse them, then call each backward closure once.",
        resources: [
          {
            kind: "direct-reading",
            title: "Neural Networks and Deep Learning, backprop chapter",
            source: "Michael Nielsen",
            action: "Read the algorithm section and convert it to graph traversal language.",
          },
        ],
      },
      {
        id: "gradient-accumulation",
        title: "Gradient accumulation",
        goal: "Explain why shared nodes add gradients instead of replacing them.",
        readerPrompt: "Find a forked graph where one value contributes through two paths and sum both gradients.",
        resources: [
          {
            kind: "paper",
            title: "Automatic differentiation in machine learning: a survey",
            source: "Baydin et al.",
            action: "Read the reverse accumulation description and compare it with micrograd.",
          },
        ],
      },
    ],
  },
};

export function normalizeText(value) {
  return (value || "").toLowerCase().trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dedupe(values) {
  const seen = new Set();
  return values.filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function createInitialChecklist() {
  return DEFAULT_EVIDENCE_CHECKLIST.map((item) => ({ ...item }));
}

function titleFromSource(sourceText) {
  const clean = (sourceText || "").trim();
  if (!clean) return "Source card: no input yet";
  const firstLine = clean.replace(/\s+/g, " ").split(" ").slice(0, 8).join(" ");
  return `Source card: ${firstLine}`;
}

function detectSignals(sourceText) {
  const normalized = normalizeText(sourceText);
  if (!normalized) return [];

  return ROADMAP_SIGNALS.filter((signal) => signal.match.some((term) => normalized.includes(term)));
}

function roadmapDeltas(before, after) {
  const map = new Map(before.map((node) => [node.id, node.status]));
  return after
    .map((node) => ({ id: node.id, title: node.title, from: map.get(node.id) || "unseen", to: node.status }))
    .filter((item) => item.from !== item.to);
}

export function formatAttempt(entry, index) {
  return `Attempt ${index + 1}: ${entry.slice(0, 110)}${entry.length > 110 ? "..." : ""}`;
}

export function compileSourceToRoadmap(sourceText, roadmapTemplate = DEFAULT_ROADMAP) {
  const normalized = normalizeText(sourceText);
  const roadmap = roadmapTemplate.map((node) => ({ ...node }));

  const priorStatus = roadmapTemplate.map((node) => ({ ...node }));
  const matchedSignals = ROADMAP_SIGNALS.filter((signal) => signal.match.some((term) => normalized.includes(term)));
  const claims = matchedSignals.flatMap((signal) => signal.claims);
  const suggestedNodeTitles = [];
  const nextSessionOutputs = [];
  const unlocked = [];

  for (const signal of matchedSignals) {
    for (const output of signal.outputs) {
      nextSessionOutputs.push(output);
    }
    for (const nodeId of signal.nodes) {
      const node = roadmap.find((item) => item.id === nodeId);
      if (!node) continue;
      const nodeTitle = node.title;
      if (!suggestedNodeTitles.includes(nodeTitle)) {
        suggestedNodeTitles.push(nodeTitle);
      }
      if (node.status === "unseen") {
        node.status = "in_progress";
        unlocked.push(nodeTitle);
      }
    }
  }

  const fallback = matchedSignals.length === 0
    ? [
        "No deterministic claim cluster matched exactly.",
        "Add explicit source terms: tokenization, attention, backprop, scaling.",
      ]
    : [];

  const inProgressCount = roadmap.filter((node) => node.status === "in_progress").length;
  return {
    roadmap,
    sourceCard: {
      title: titleFromSource(sourceText),
      claims: dedupe((claims.length ? claims : fallback).map((claim) => claim.trim())),
      suggestedNodes: dedupe(suggestedNodeTitles),
      nextSessionOutputs: dedupe(nextSessionOutputs),
    },
    unlockedNodes: dedupe(unlocked),
    roadmapDeltas: roadmapDeltas(priorStatus, roadmap),
    inProgressCount,
  };
}

function genericMiniNodes(node) {
  const title = node?.title || "Learning node";
  const stem = node?.id || "learning-node";
  return [
    {
      id: `${stem}-definition`,
      title: "Definition boundary",
      goal: `Define ${title} without borrowing a memorized phrase.`,
      readerPrompt: `Write the smallest correct definition for ${title}.`,
      resources: [
        {
          kind: "direct-reading",
          title: `${title} primary note`,
          source: "Current source card",
          action: "Read only the definition paragraph, then close it and restate it.",
        },
      ],
    },
    {
      id: `${stem}-mechanism`,
      title: "Mechanism",
      goal: `Explain how ${title} changes state or data.`,
      readerPrompt: `Trace one input through ${title} and name the intermediate state.`,
      resources: [
        {
          kind: "direct-reading",
          title: `${title} worked example`,
          source: "Current session reader",
          action: "Read one worked example and rewrite the steps from memory.",
        },
      ],
    },
    {
      id: `${stem}-failure`,
      title: "Failure mode",
      goal: `Identify one way ${title} is commonly misunderstood.`,
      readerPrompt: `Write the wrong explanation first, then repair the missing condition.`,
      resources: [
        {
          kind: "direct-reading",
          title: `${title} misconception check`,
          source: "Sibar repair lane",
          action: "Read the failure case and make one contrastive recall card.",
        },
      ],
    },
    {
      id: `${stem}-artifact`,
      title: "Build artifact",
      goal: `Create a small artifact that proves ${title} is operational.`,
      readerPrompt: `Build or sketch the smallest executable artifact for ${title}.`,
      resources: [
        {
          kind: "direct-reading",
          title: `${title} implementation prompt`,
          source: "Workspace artifact lane",
          action: "Read the artifact requirement and produce one checkable output.",
        },
      ],
    },
    {
      id: `${stem}-recall`,
      title: "Recall check",
      goal: `Recall ${title} under friction without looking at notes.`,
      readerPrompt: `Answer one recall question for ${title}, then grade the missing link.`,
      resources: [
        {
          kind: "direct-reading",
          title: `${title} recall prompt`,
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

export function buildNodeStudyPlan(nodeIdOrNode, roadmap = DEFAULT_ROADMAP) {
  const node =
    typeof nodeIdOrNode === "object"
      ? nodeIdOrNode
      : roadmap.find((item) => item.id === nodeIdOrNode) || DEFAULT_ROADMAP.find((item) => item.id === nodeIdOrNode);
  const resolvedNode = node || { id: String(nodeIdOrNode || "learning-node"), title: "Learning node", status: "unseen" };
  const planned = STUDY_NODE_PLANS[resolvedNode.id];
  const miniNodes = planned ? planned.miniNodes.map(cloneMiniNode) : genericMiniNodes(resolvedNode);

  return {
    nodeId: resolvedNode.id,
    displayTitle: planned?.displayTitle || resolvedNode.title,
    status: resolvedNode.status || "unseen",
    source: planned?.source || "Current source card",
    focus: planned?.focus || `Break ${resolvedNode.title} into five study concepts with one reader action each.`,
    recommendedDecision:
      planned?.recommendedDecision || "Pick the weakest mini-node, read one resource, then attempt reconstruction.",
    readerMove: planned?.readerMove || "Read the selected resource and write a short reconstruction before hints.",
    defaultMiniNodeId: planned?.defaultMiniNodeId || miniNodes[0]?.id,
    miniNodes,
  };
}

function activeRoadmapNode(state) {
  return (
    state.roadmap.find((node) => node.id === state.activeNodeId) ||
    state.roadmap.find((node) => node.status === "in_progress" || node.status === "built") ||
    state.roadmap[0]
  );
}

function getStudyContext(state) {
  const node = activeRoadmapNode(state);
  const plan = buildNodeStudyPlan(node, state.roadmap);
  const miniNode =
    plan.miniNodes.find((item) => item.id === state.activeMiniNodeId) ||
    plan.miniNodes.find((item) => item.id === plan.defaultMiniNodeId) ||
    plan.miniNodes[0];

  return { node, plan, miniNode };
}

export function requestConceptHelpForState(state) {
  const context = getStudyContext(state);
  const resource = context.miniNode?.resources?.[0];
  state.activeNodeId = context.node?.id || context.plan.nodeId;
  state.activeMiniNodeId = context.miniNode?.id || context.plan.defaultMiniNodeId;
  state.conceptHelpRequested = true;
  state.repairAction = `Deepen ${context.miniNode.title}: ${resource?.action || "read the focused source and retry."}`;

  return {
    scope: MODE_SCOPE_LABELS["/read"],
    text: `Profundicemos mas en ${context.miniNode.title}: lee ${resource?.title || "the selected resource"}, escribe una reconstruccion de 3 lineas y repasemos el gap.`,
    readerFocus: context.miniNode.readerPrompt,
  };
}

function createAttemptHistoryItem(attempts, attemptText) {
  const attempt = normalizeText(attemptText);
  if (!attempt) return null;
  const full = attemptText.trim();
  attempts.push(full);
  return {
    index: attempts.length - 1,
    summary: formatAttempt(full, attempts.length - 1),
    full,
  };
}

function detectReadinessSignals(normalizedAttempt) {
  const signals = {};
  for (const [key, terms] of Object.entries(ATTEMPT_SIGNAL_MAP)) {
    signals[key] = terms.some((term) => normalizedAttempt.includes(term));
  }

  const missing = [];
  if (!signals.reconstruction) {
    missing.push("reconstruction not present");
  }
  if (!signals.explanation) {
    missing.push("explanation not present");
  }
  if (!signals.recall) {
    missing.push("recall not present");
  }

  return {
    ...signals,
    score: Object.values(signals).filter(Boolean).length,
    missing,
  };
}

function inferTargetNode(normalizedAttempt, roadmap) {
  for (const keyword of NODE_HINTS) {
    if (!normalizedAttempt.includes(keyword)) continue;
    const node = roadmap.find((item) => item.id === keyword);
    if (node) return node.id;
  }
  return roadmap.find((item) => item.status === "in_progress")?.id;
}

function readinessLabel(score) {
  if (score === 0) return "No evidence yet";
  if (score === 1) return "Attempt logged";
  if (score === 2) return "Ready for repair/build checks";
  return "Evidence-backed candidate";
}

function appendUnique(values, value) {
  if (!value) return;
  if (!values.includes(value)) {
    values.push(value);
  }
}

function applyAttemptEvaluation(state, attemptText, attempt) {
  const normalized = normalizeText(attemptText);
  const signals = detectReadinessSignals(normalized);
  const targetNodeId = inferTargetNode(normalized, state.roadmap);
  const targetNode = state.roadmap.find((item) => item.id === targetNodeId);

  state.detectedGap = signals.missing.join(", ") || "No immediate gap";
  state.readinessScore = signals.score;
  state.readinessLabel = readinessLabel(signals.score);

  for (const item of state.evidenceChecklist) {
    if (signals[item.id]) {
      item.complete = true;
    }
  }

  if (signals.reconstruction && !state.evidence.includes(`Attempt reconstruction: ${attempt.index + 1}`)) {
    state.evidence.push(`Attempt reconstruction: ${attempt.index + 1}`);
  }

  if (signals.explanation) {
    appendUnique(state.evidence, `Attempt explanation: ${attempt.index + 1}`);
  }

  if (targetNode && targetNode.status === "in_progress" && signals.score >= 2) {
    targetNode.status = "built";
    appendUnique(
      state.artifacts,
      `Build checkpoint: ${targetNode.title} (built from attempt ${attempt.index + 1})`,
    );
    state.repairAction = `Repair action ready for ${targetNode.title}: add a scalar failure test.`;
  }

  if (signals.score >= 3 && targetNode && targetNode.status === "built") {
    state.repairAction = `Repair complete for ${targetNode.title}: provide one concrete patch path.`;
    state.evidence.push(`Evidence package ready for ${targetNode.title}`);
  }

  return {
    targetNode,
    signals,
    detectedGap: state.detectedGap,
    readinessLabel: state.readinessLabel,
    readinessScore: state.readinessScore,
  };
}

export function evaluateAttemptForState(state, attemptText) {
  const entry = createAttemptHistoryItem(state.attempts, attemptText);
  if (!entry) return { entry: null, evaluation: null };
  return { entry, evaluation: applyAttemptEvaluation(state, attemptText, entry) };
}

export function describeModeAction(mode, state) {
  return makeModeAction(mode, state);
}

function makeModeAction(mode, state) {
  const context = getStudyContext(state);
  const targetNode = context.node;
  const targetTitle = context.plan.displayTitle;
  const miniTitle = context.miniNode?.title || "selected mini-node";
  const primaryResource = context.miniNode?.resources?.[0];

  switch (mode) {
    case "/map": {
      const deltas = state.lastCompile?.roadmapDeltas || [];
      if (!deltas.length) {
        return {
          scope: MODE_SCOPE_LABELS[mode],
          text: `Active node map: ${targetTitle} expands into ${context.plan.miniNodes.length} mini-nodes. Compile source to add roadmap deltas.`,
        };
      }
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text: `Roadmap deltas: ${deltas.map((delta) => `${delta.title}: ${delta.from} -> ${delta.to}`).join("; ")}. Active node: ${targetTitle}.`,
      };
    }
    case "/read": {
      const claims = state.lastCompile?.sourceCard?.claims || [];
      const claimText = claims.length ? ` Source claims: ${claims.join(" | ")}` : "";
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text: `Reader focus for ${targetTitle} / ${miniTitle}: ${context.miniNode.readerPrompt} Resource: ${primaryResource?.kind || "direct-reading"} - ${primaryResource?.title || context.plan.source} (${primaryResource?.source || context.plan.source}).${claimText}`,
      };
    }
    case "/explain": {
      if (!state.attempts.length) {
        return {
          scope: MODE_SCOPE_LABELS[mode],
          text: `Explain is scoped and withheld for ${targetTitle}: submit a reconstruction attempt before unlocking hint responses.`,
        };
      }
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text: `Hint-only explain scope for ${miniTitle}: ${nextHint(state.attempts.length)}`,
      };
    }
    case "/test": {
      if (!state.attempts.length) {
        return {
          scope: MODE_SCOPE_LABELS[mode],
          text: "Recall scope blocked until attempt evidence exists.",
        };
      }
      const recallPrompt = `Recall for ${targetTitle} / ${miniTitle}: state the chain-link between forward and backward for one node.`;
      appendUnique(state.artifacts, `Recall task: ${recallPrompt}`);
      appendUnique(state.evidence, `Recall card generated: ${recallPrompt}`);
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text: `Created recall prompt for ${targetTitle}.`,
      };
    }
    case "/critic": {
      if (!state.attempts.length) {
        return {
          scope: MODE_SCOPE_LABELS[mode],
          text: "Critic needs an attempt to evaluate. Submit one first.",
        };
      }
      const lastAttempt = state.attempts[state.attempts.length - 1];
      const signals = detectReadinessSignals(normalizeText(lastAttempt));
      const verdict = {
        score: signals.score,
        gaps: signals.missing,
      };
      const text =
        verdict.score >= 2
          ? `Critic result: evidence-ready candidate with ${verdict.gaps.length} gap(s).`
          : `Critic result: insufficient detail; gaps -> ${verdict.gaps.join(", ")}`;
      state.detectedGap = verdict.gaps.join(", ") || "No immediate gap";
      if (verdict.gaps.length) {
        state.repairAction = `Repair action for ${miniTitle}: address ${verdict.gaps[0]}`;
      }
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text,
      };
    }
    case "/repair": {
      const suggestion =
        state.repairAction || `Repair action: reduce attempt scope to ${miniTitle} and re-run ${targetTitle} reconstruction.`;
      appendUnique(state.artifacts, `Repair task: ${suggestion}`);
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text: `Repair plan set: ${suggestion}`,
      };
    }
    case "/build": {
      const requirement = `Build requirement: implement ${targetTitle} mini artifact for ${miniTitle}.`;
      appendUnique(state.artifacts, requirement);
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text: `Build scope pinned. ${requirement}`,
      };
    }
    case "/publish": {
      if (state.readinessScore < 2 || !state.attempts.length) {
        return {
          scope: MODE_SCOPE_LABELS[mode],
          text: "Publish blocked: evidence-backed attempt required before publish scope unlocks.",
          blocked: true,
        };
      }

      const publishCandidate = state.roadmap.find((item) => item.status === "built") || state.roadmap.find((item) => item.status === "in_progress");
      if (publishCandidate) {
        publishCandidate.status = "published";
      }
      const publishedTitle = publishCandidate ? publishCandidate.title : targetTitle;
      appendUnique(state.evidence, `Evidence draft: ${publishedTitle} published.`);
      appendUnique(state.artifacts, `Published draft: ${publishedTitle}`);
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text: `Publish scope applied to ${publishedTitle}.`,
      };
    }
    default:
      return { scope: "generic", text: `Unknown mode ${mode}` };
  }
}

function nextHint(attemptsCount) {
  return HINTS[Math.min(attemptsCount - 1, HINTS.length - 1)] || "Repair mode: create a smaller reconstruction and re-run attempt.";
}

function createDefaultState() {
  return {
    roadmap: DEFAULT_ROADMAP.map((node) => ({ ...node })),
    attempts: [],
    artifacts: [...DEFAULT_ARTIFACTS],
    evidence: [...DEFAULT_EVIDENCE],
    evidenceChecklist: createInitialChecklist(),
    mode: "/map",
    activeNodeId: "backprop",
    activeMiniNodeId: "chain-rule",
    conceptHelpRequested: false,
    unlockedBySource: [],
    lastCompile: null,
    readinessLabel: "No evidence yet",
    readinessScore: 0,
    detectedGap: "Attempt before scope actions",
    repairAction: "None",
    modeActions: [],
    modeLogs: [],
    lastAction: null,
  };
}

function renderRoadmap(roadmap, roadmapEl, activeNodeId) {
  if (!roadmapEl) return;
  roadmapEl.innerHTML = roadmap
    .map(
      (node) => `
      <li class="${STATUS_CLASS[node.status] || ""} ${node.id === activeNodeId ? "active" : ""}">
        <button type="button" data-node-id="${escapeHtml(node.id)}" aria-pressed="${node.id === activeNodeId ? "true" : "false"}">
          <span class="roadmap-status" aria-label="${escapeHtml(node.status)}">${STATUS[node.status]}</span>
          <span>${escapeHtml(node.title)}</span>
        </button>
        <span>${escapeHtml(node.status)}</span>
      </li>
    `,
    )
    .join("");
}

function renderItems(listEl, values) {
  if (!listEl) return;
  listEl.innerHTML = values.map((value) => `<li>${escapeHtml(value)}</li>`).join("");
}

function renderSourceCard(root, sourceResult) {
  if (!root.sourceCard) return;
  if (root.sourceCardTitle) {
    root.sourceCardTitle.textContent = sourceResult.sourceCard.title;
  }

  const claims = sourceResult.sourceCard.claims || [];
  const suggested = sourceResult.sourceCard.suggestedNodes || [];
  const next = sourceResult.sourceCard.nextSessionOutputs || [];
  root.sourceClaims.innerHTML = claims.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  root.sourceSuggested.innerHTML = suggested.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  root.sourceNextSession.innerHTML = next.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderHistory(historyEl, attempts) {
  if (!historyEl) return;
  if (!attempts.length) {
    historyEl.textContent = "No attempts yet. Start by writing one short reconstruction.";
    return;
  }
  historyEl.textContent = attempts
    .map((attempt, index) => formatAttempt(attempt, index))
    .join("\n");
}

function renderChecklist(el, checklist) {
  if (!el) return;
  el.innerHTML = checklist
    .map((item) => `<li class="${item.complete ? "done" : ""}">${item.complete ? "[x]" : "[ ]"} ${escapeHtml(item.label)}</li>`)
    .join("");
}

function renderModeLog(logEl, entries) {
  if (!logEl) return;
  logEl.innerHTML = entries
    .map((entry) => `<li>[${escapeHtml(entry.scope)}] ${escapeHtml(entry.text)}</li>`)
    .join("");
}

function renderNodeReader(root, state) {
  const context = getStudyContext(state);
  state.activeNodeId = context.node?.id || context.plan.nodeId;
  state.activeMiniNodeId = context.miniNode?.id || context.plan.defaultMiniNodeId;

  if (root.activeNodeTitle) {
    root.activeNodeTitle.textContent = `Learning Node: ${context.plan.displayTitle}`;
  }
  if (root.activeNodeFocus) {
    root.activeNodeFocus.textContent = context.plan.focus;
  }
  if (root.activeNodeSource) {
    root.activeNodeSource.textContent = `Source: ${context.plan.source}`;
  }
  if (root.miniNodeList) {
    root.miniNodeList.innerHTML = context.plan.miniNodes
      .map(
        (miniNode) => `
          <li>
            <button type="button" data-mini-node-id="${escapeHtml(miniNode.id)}" aria-pressed="${miniNode.id === context.miniNode.id ? "true" : "false"}">
              <strong>${escapeHtml(miniNode.title)}</strong>
              <span>${escapeHtml(miniNode.goal)}</span>
            </button>
          </li>
        `,
      )
      .join("");
  }

  if (root.readerInstruction) {
    const helpPrefix = state.conceptHelpRequested ? "Profundicemos: " : "";
    root.readerInstruction.textContent = `${helpPrefix}${context.miniNode.readerPrompt}`;
  }
  if (root.readerResourceList) {
    root.readerResourceList.innerHTML = (context.miniNode.resources || [])
      .map(
        (resource) => `
          <li>
            <strong>${escapeHtml(resource.kind)}</strong>: ${escapeHtml(resource.title)}
            <span>${escapeHtml(resource.source)} - ${escapeHtml(resource.action)}</span>
          </li>
        `,
      )
      .join("");
  }

  renderLmContext(root, context);
  return context;
}

function renderLmContext(root, context) {
  const resource = context.miniNode?.resources?.[0];
  if (root.lmActiveNode) root.lmActiveNode.textContent = context.plan.displayTitle;
  if (root.lmActiveMiniNode) root.lmActiveMiniNode.textContent = context.miniNode?.title || "None";
  if (root.lmRecommendedDecision) root.lmRecommendedDecision.textContent = context.plan.recommendedDecision;
  if (root.lmReaderMove) {
    root.lmReaderMove.textContent = resource
      ? `${context.plan.readerMove} Current resource: ${resource.title}.`
      : context.plan.readerMove;
  }
}

export function initResearchWorkspace({
  roadmapPanel = "roadmapList",
  artifactList = "artifactList",
  evidenceList = "evidenceList",
  attemptForm = {
    sourceText: "sourceText",
    compileButton: "compileSource",
    compilerResult: "compilerResult",
    attemptInput: "attemptInput",
    submitAttempt: "submitAttempt",
    requestHint: "requestHint",
    attemptBadge: "attemptBadge",
    attemptFeedback: "attemptFeedback",
    attemptHistory: "attemptHistory",
    sourceCard: "sourceCard",
    sourceCardTitle: "sourceCardTitle",
    sourceClaims: "sourceClaims",
    sourceSuggested: "sourceSuggested",
    sourceNextSession: "sourceNextSession",
    activeNodeTitle: "activeNodeTitle",
    activeNodeFocus: "activeNodeFocus",
    activeNodeSource: "activeNodeSource",
    conceptConfusion: "conceptConfusion",
    miniNodeList: "miniNodeList",
    readerInstruction: "readerInstruction",
    readerResourceList: "readerResourceList",
    evidenceChecklist: "evidenceChecklist",
    readinessSummary: "readinessSummary",
    gapSummary: "gapSummary",
    repairActionText: "repairActionText",
  },
  modePanel = "lmModes",
  modeStatus = "lmModeStatus",
  modeActionLog = "modeActionLog",
  lmContext = {
    activeNode: "lmActiveNode",
    activeMiniNode: "lmActiveMiniNode",
    recommendedDecision: "lmRecommendedDecision",
    readerMove: "lmReaderMove",
  },
}) {
  const state = createDefaultState();

  const root = {
    roadmap: document.getElementById(roadmapPanel),
    artifacts: document.getElementById(artifactList),
    evidence: document.getElementById(evidenceList),
    compileButton: document.getElementById(attemptForm.compileButton),
    sourceText: document.getElementById(attemptForm.sourceText),
    compilerResult: document.getElementById(attemptForm.compilerResult),
    attemptInput: document.getElementById(attemptForm.attemptInput),
    submitAttempt: document.getElementById(attemptForm.submitAttempt),
    requestHint: document.getElementById(attemptForm.requestHint),
    attemptBadge: document.getElementById(attemptForm.attemptBadge),
    attemptFeedback: document.getElementById(attemptForm.attemptFeedback),
    attemptHistory: document.getElementById(attemptForm.attemptHistory),
    sourceCard: document.getElementById(attemptForm.sourceCard),
    sourceCardTitle: document.getElementById(attemptForm.sourceCardTitle),
    sourceClaims: document.getElementById(attemptForm.sourceClaims),
    sourceSuggested: document.getElementById(attemptForm.sourceSuggested),
    sourceNextSession: document.getElementById(attemptForm.sourceNextSession),
    activeNodeTitle: document.getElementById(attemptForm.activeNodeTitle),
    activeNodeFocus: document.getElementById(attemptForm.activeNodeFocus),
    activeNodeSource: document.getElementById(attemptForm.activeNodeSource),
    conceptConfusion: document.getElementById(attemptForm.conceptConfusion),
    miniNodeList: document.getElementById(attemptForm.miniNodeList),
    readerInstruction: document.getElementById(attemptForm.readerInstruction),
    readerResourceList: document.getElementById(attemptForm.readerResourceList),
    evidenceChecklist: document.getElementById(attemptForm.evidenceChecklist),
    readinessSummary: document.getElementById(attemptForm.readinessSummary),
    gapSummary: document.getElementById(attemptForm.gapSummary),
    repairActionText: document.getElementById(attemptForm.repairActionText),
    modePanel: document.getElementById(modePanel),
    modeStatus: document.getElementById(modeStatus),
    modeActionLog: document.getElementById(modeActionLog),
    lmActiveNode: document.getElementById(lmContext.activeNode),
    lmActiveMiniNode: document.getElementById(lmContext.activeMiniNode),
    lmRecommendedDecision: document.getElementById(lmContext.recommendedDecision),
    lmReaderMove: document.getElementById(lmContext.readerMove),
  };

  const maxModeEntries = 6;

  function render() {
    const context = renderNodeReader(root, state);
    renderRoadmap(state.roadmap, root.roadmap, context.node?.id || state.activeNodeId);
    renderItems(root.artifacts, state.artifacts);
    renderItems(root.evidence, state.evidence);
    renderHistory(root.attemptHistory, state.attempts);
    renderChecklist(root.evidenceChecklist, state.evidenceChecklist);
    if (root.readinessSummary) root.readinessSummary.textContent = state.readinessLabel;
    if (root.gapSummary) root.gapSummary.textContent = state.detectedGap;
    if (root.repairActionText) root.repairActionText.textContent = state.repairAction;
    renderModeLog(root.modeActionLog, state.modeActions);

    if (state.lastCompile) {
      renderSourceCard(root, state.lastCompile);
      if (root.compilerResult) {
        const unlockedText = state.lastCompile.unlockedNodes.length
          ? `Source mapped to roadmap: ${state.lastCompile.unlockedNodes.join(", ")}.`
          : "No roadmap unlocks; keep claims concrete.";
        root.compilerResult.textContent = `${unlockedText} In progress nodes: ${state.lastCompile.inProgressCount}.`;
      }
    }
    wireRoadmapSelection();
    wireMiniNodeSelection();
  }

  function pushModeAction(entry) {
    state.lastAction = entry;
    state.modeActions = [entry, ...state.modeActions].slice(0, maxModeEntries);
    renderModeLog(root.modeActionLog, state.modeActions);
  }

  function runMode(mode) {
    const action = makeModeAction(mode, state);
    pushModeAction(action);
    if (action.text) {
      if (root.attemptFeedback) {
        root.attemptFeedback.textContent = action.text;
      }
    }
    if (mode === "/critic" && action.text === "No immediate gap") {
      state.detectedGap = "No immediate gap";
    }
    render();
  }

  function selectNode(nodeId) {
    const plan = buildNodeStudyPlan(nodeId, state.roadmap);
    state.activeNodeId = plan.nodeId;
    state.activeMiniNodeId = plan.defaultMiniNodeId;
    state.conceptHelpRequested = false;
    pushModeAction({
      scope: MODE_SCOPE_LABELS["/map"],
      text: `Active node selected: ${plan.displayTitle}; ${plan.miniNodes.length} mini-nodes loaded into reader.`,
    });
    render();
  }

  function selectMiniNode(miniNodeId) {
    const plan = buildNodeStudyPlan(state.activeNodeId, state.roadmap);
    const miniNode = plan.miniNodes.find((item) => item.id === miniNodeId);
    if (!miniNode) return;
    state.activeMiniNodeId = miniNode.id;
    state.conceptHelpRequested = false;
    pushModeAction({
      scope: MODE_SCOPE_LABELS["/read"],
      text: `Reader focused: ${plan.displayTitle} / ${miniNode.title}.`,
    });
    render();
  }

  function wireRoadmapSelection() {
    const buttons = root.roadmap?.querySelectorAll?.("button[data-node-id]");
    buttons?.forEach((button) => {
      if (button.dataset.bound === "true") return;
      button.dataset.bound = "true";
      button.addEventListener("click", () => selectNode(button.dataset.nodeId));
    });
  }

  function wireMiniNodeSelection() {
    const buttons = root.miniNodeList?.querySelectorAll?.("button[data-mini-node-id]");
    buttons?.forEach((button) => {
      if (button.dataset.bound === "true") return;
      button.dataset.bound = "true";
      button.addEventListener("click", () => selectMiniNode(button.dataset.miniNodeId));
    });
  }

  function setMode(nextMode) {
    state.mode = nextMode;
    const buttons = root.modePanel?.querySelectorAll("button[data-mode]");
    buttons?.forEach((button) => button.setAttribute("aria-pressed", button.dataset.mode === nextMode ? "true" : "false"));
    if (root.modeStatus) root.modeStatus.textContent = `Mode: ${nextMode}`;
    runMode(nextMode);
  }

  function wireModes() {
    if (!root.modePanel) return;

    const buttons = Array.from(root.modePanel.querySelectorAll("button[data-mode]"));
    const configuredModes = new Set();

    buttons.forEach((button) => {
      const mode = button.dataset.mode;
      if (!mode) return;
      configuredModes.add(mode);

      if (button.textContent == null || button.textContent.trim() === "") {
        button.textContent = mode;
      }
      button.type = "button";
      button.setAttribute("aria-pressed", mode === "/map" ? "true" : "false");
      button.addEventListener("click", () => setMode(mode));
    });

    if (typeof LM_MODES !== "undefined") {
      LM_MODES.filter((mode) => !configuredModes.has(mode)).forEach((mode) => {
        const li = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = mode;
        button.dataset.mode = mode;
        button.setAttribute("aria-pressed", mode === "/map" ? "true" : "false");
        button.addEventListener("click", () => setMode(mode));
        li.appendChild(button);
        root.modePanel.appendChild(li);
        configuredModes.add(mode);
      });
    }

    const orderedModes = LM_MODES.filter((mode) => configuredModes.has(mode));
    return orderedModes;
  }

  root.compileButton?.addEventListener("click", () => {
    const sourceResult = compileSourceToRoadmap(root.sourceText?.value || "", state.roadmap);
    state.roadmap = sourceResult.roadmap;
    state.unlockedBySource = sourceResult.unlockedNodes;
    state.lastCompile = sourceResult;
    render();
    pushModeAction({
      scope: MODE_SCOPE_LABELS["/map"],
      text: `Source mapped. Claims: ${sourceResult.sourceCard.claims.length}; next outputs: ${sourceResult.sourceCard.nextSessionOutputs.length}.`,
    });
  });

  root.submitAttempt?.addEventListener("click", () => {
    const current = root.attemptInput?.value || "";
    const entry = createAttemptHistoryItem(state.attempts, current);
    if (!entry) {
      root.attemptFeedback.textContent = "Attempt is required before any tool mode can continue.";
      return;
    }
    root.attemptInput.value = "";
    root.requestHint.disabled = false;

    const evaluation = applyAttemptEvaluation(state, current, entry);
    root.attemptBadge.textContent = `Attempt ${state.attempts.length}`;
    render();

    if (state.attempts.length === 1) {
      root.attemptFeedback.textContent = "Reconstruction captured. Move through /explain and /critic next.";
    } else if (state.attempts.length === 2) {
      root.attemptFeedback.textContent = `Attempt logged (${evaluation.readinessLabel}). Use /test to generate recall.`;
    } else {
      root.attemptFeedback.textContent = `Evidence readiness: ${evaluation.readinessLabel}. Next action: ${state.repairAction}.`;
    }

    pushModeAction({
      scope: "evaluation",
      text: `Attempt ${entry.index + 1} evaluated -> ${evaluation.readinessLabel}; target ${evaluation.targetNode?.title || "none"}.`,
    });
  });

  root.conceptConfusion?.addEventListener("click", () => {
    const action = requestConceptHelpForState(state);
    if (root.attemptFeedback) {
      root.attemptFeedback.textContent = action.text;
    }
    pushModeAction(action);
    render();
  });

  root.requestHint?.addEventListener("click", () => {
    root.attemptFeedback.textContent = nextHint(state.attempts.length);
    pushModeAction({
      scope: "hint",
      text: `Hint emitted for attempt ${state.attempts.length}.`,
    });
  });

  render();
  const wiredModes = wireModes();
  setMode("/map");

  return {
    state,
    rerender: render,
    setMode,
    runMode,
    wireModes,
    wiredModes,
    selectNode,
    selectMiniNode,
    createModeAction: makeModeAction,
  };
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initResearchWorkspace({});
  });
}

export const LM_MODES = ["/map", "/read", "/explain", "/test", "/critic", "/repair", "/build", "/publish"];

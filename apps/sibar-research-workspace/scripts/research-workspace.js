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

export function normalizeText(value) {
  return (value || "").toLowerCase().trim();
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
  const targetNode = state.roadmap.find((node) => node.status === "in_progress" || node.status === "built") || state.roadmap[0];
  const targetTitle = targetNode ? targetNode.title : "Learning node";

  switch (mode) {
    case "/map": {
      const deltas = state.lastCompile?.roadmapDeltas || [];
      if (!deltas.length) {
        return {
          scope: MODE_SCOPE_LABELS[mode],
          text: "No roadmap deltas yet. Compile source to seed roadmap cards.",
        };
      }
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text: `Roadmap deltas: ${deltas.map((delta) => `${delta.title}: ${delta.from} -> ${delta.to}`).join("; ")}`,
      };
    }
    case "/read": {
      const claims = state.lastCompile?.sourceCard?.claims || [];
      if (!claims.length) {
        return {
          scope: MODE_SCOPE_LABELS[mode],
          text: "No claims extracted yet. Run /map compile first.",
        };
      }
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text: `Claims: ${claims.join(" | ")}`,
      };
    }
    case "/explain": {
      if (!state.attempts.length) {
        return {
          scope: MODE_SCOPE_LABELS[mode],
          text: "Explain is scoped and withheld: submit a reconstruction attempt before unlocking hint responses.",
        };
      }
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text: `Hint-only explain scope: ${nextHint(state.attempts.length)}`,
      };
    }
    case "/test": {
      if (!state.attempts.length) {
        return {
          scope: MODE_SCOPE_LABELS[mode],
          text: "Recall scope blocked until attempt evidence exists.",
        };
      }
      const recallPrompt = `Recall for ${targetTitle}: state the chain-link between forward and backward for one node.`;
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
        state.repairAction = `Repair action: address ${verdict.gaps[0]}`;
      }
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text,
      };
    }
    case "/repair": {
      const suggestion = state.repairAction || `Repair action: reduce attempt scope and re-run ${targetTitle} reconstruction.`;
      appendUnique(state.artifacts, `Repair task: ${suggestion}`);
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text: `Repair plan set: ${suggestion}`,
      };
    }
    case "/build": {
      const requirement = `Build requirement: implement ${targetTitle} mini artifact.`;
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

function renderRoadmap(roadmap, roadmapEl) {
  if (!roadmapEl) return;
  roadmapEl.innerHTML = roadmap
    .map(
      (node) => `
      <li class="${STATUS_CLASS[node.status] || ""}">
        <span class="roadmap-status" aria-label="${node.status}">${STATUS[node.status]}</span>
        <span>${node.title}</span>
        <span>${node.status}</span>
      </li>
    `,
    )
    .join("");
}

function renderItems(listEl, values) {
  if (!listEl) return;
  listEl.innerHTML = values.map((value) => `<li>${value}</li>`).join("");
}

function renderSourceCard(root, sourceResult) {
  if (!root.sourceCard) return;
  if (root.sourceCardTitle) {
    root.sourceCardTitle.textContent = sourceResult.sourceCard.title;
  }

  const claims = sourceResult.sourceCard.claims || [];
  const suggested = sourceResult.sourceCard.suggestedNodes || [];
  const next = sourceResult.sourceCard.nextSessionOutputs || [];
  root.sourceClaims.innerHTML = claims.map((item) => `<li>${item}</li>`).join("");
  root.sourceSuggested.innerHTML = suggested.map((item) => `<li>${item}</li>`).join("");
  root.sourceNextSession.innerHTML = next.map((item) => `<li>${item}</li>`).join("");
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
    .map((item) => `<li class="${item.complete ? "done" : ""}">${item.complete ? "[x]" : "[ ]"} ${item.label}</li>`)
    .join("");
}

function renderModeLog(logEl, entries) {
  if (!logEl) return;
  logEl.innerHTML = entries
    .map((entry) => `<li>[${entry.scope}] ${entry.text}</li>`)
    .join("");
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
    evidenceChecklist: "evidenceChecklist",
    readinessSummary: "readinessSummary",
    gapSummary: "gapSummary",
    repairActionText: "repairActionText",
  },
  modePanel = "lmModes",
  modeStatus = "lmModeStatus",
  modeActionLog = "modeActionLog",
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
    evidenceChecklist: document.getElementById(attemptForm.evidenceChecklist),
    readinessSummary: document.getElementById(attemptForm.readinessSummary),
    gapSummary: document.getElementById(attemptForm.gapSummary),
    repairActionText: document.getElementById(attemptForm.repairActionText),
    modePanel: document.getElementById(modePanel),
    modeStatus: document.getElementById(modeStatus),
    modeActionLog: document.getElementById(modeActionLog),
  };

  const maxModeEntries = 6;

  function render() {
    renderRoadmap(state.roadmap, root.roadmap);
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
    createModeAction: makeModeAction,
  };
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initResearchWorkspace({});
  });
}

export const LM_MODES = ["/map", "/read", "/explain", "/test", "/critic", "/repair", "/build", "/publish"];

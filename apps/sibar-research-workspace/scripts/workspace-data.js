export const CONTRACT_NAMESPACE = "roadmap-compiler";
export const ROADMAP_CONTRACT_VERSION = "1.0.0";

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

export const ANTI_OVERLOAD = {
  max_active_sessions: 1,
  max_visible_choices: 3,
};

export const MODE_SCOPE_LABELS = {
  "/map": "roadmap",
  "/read": "read",
  "/explain": "scope",
  "/test": "recall",
  "/critic": "diagnostic",
  "/repair": "repair",
  "/build": "artifact",
  "/publish": "evidence",
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

export const MISSION_ID = "mission-frontier-research";
export const ARC_ID = "arc-neural-nets";

export const TRACKS = [
  {
    id: "track-foundations",
    title: "Foundations and gradients",
    nodes: ["foundations", "micrograd", "backprop", "mlp"],
    status: "ready",
  },
  {
    id: "track-sequence",
    title: "Sequence models and systems",
    nodes: ["tokenization", "bigram", "transformer", "scaling", "kernels"],
    status: "locked",
  },
];

export const NODE_PREREQUISITES = {
  micrograd: ["foundations"],
  backprop: ["micrograd"],
  mlp: ["backprop"],
  tokenization: ["foundations"],
  bigram: ["tokenization"],
  transformer: ["bigram"],
  scaling: ["transformer"],
  kernels: ["transformer"],
};

export const ROADMAP_SIGNALS = [
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
    outputs: [
      "Implement one full forward/backward toy example",
      "Draft failure matrix for vanishing gradients",
    ],
  },
  {
    phrase: "token",
    match: ["tokenization", "token"],
    nodes: ["tokenization"],
    claims: [
      "Source requires a tokenization framing before sequence modeling.",
      "The material distinguishes token IDs, vocab, and sequence boundaries.",
    ],
    outputs: [
      "Create a tiny tokenizer card",
      "Run a token-boundary audit on sample text",
    ],
  },
  {
    phrase: "bigram",
    match: ["bigram", "makemore"],
    nodes: ["bigram"],
    claims: ["Source suggests a minimal language model for next-token distribution."],
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
    claims: ["Source ties data, model size, and compute tradeoffs."],
    outputs: [
      "List three scaling checkpoints and expected evidence",
      "Create a reproducible compute-cost estimate",
    ],
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

export const NODE_HINTS = [
  "foundations",
  "micrograd",
  "backprop",
  "tokenization",
  "bigram",
  "transformer",
  "scaling",
  "kernels",
  "mlp",
];

export const NODE_EVIDENCE_KEYWORDS = {
  foundations: ["math", "vector", "matrix", "gradient"],
  micrograd: ["micrograd", "value", "scalar", "engine"],
  backprop: ["backprop", "chain", "gradient", "dL", "dl", "jacobian", "autograd"],
  mlp: ["mlp", "weights", "layers", "activation", "training"],
  tokenization: ["token", "vocab", "ids", "sequence"],
  bigram: ["bigram", "makemore", "next token", "transition"],
  transformer: ["attention", "transformer", "query", "key", "value"],
  scaling: ["scaling", "compute", "capacity", "chinchilla"],
  kernels: ["kernel", "jax", "pallas", "triton", "systems", "benchmark"],
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

export const DEFAULT_EVIDENCE_CHECKLIST = [
  { id: "reconstruction", label: "Reconstruction attempt exists", required: true, complete: false },
  { id: "explanation", label: "Own-words explanation included", required: true, complete: false },
  { id: "recall", label: "Recall output created", required: true, complete: false },
];

export const HINTS = [
  "Write the forward-pass equations in 6 lines without looking at notes.",
  "Explain the same loop as if the reviewer knows nothing about your repo.",
  "Point out one common failure mode and one repair action for it.",
];

export const ATTEMPT_SIGNAL_MAP = {
  reconstruction: ["derive", "derivation", "derivative", "chain", "gradient", "backprop", "code", "equation", "pseudo", "reconstruct"],
  explanation: ["explain", "because", "intuitively", "in my words", "reason", "meaning"],
  recall: ["recall", "quiz", "question", "test", "check", "memory", "prompt"],
};

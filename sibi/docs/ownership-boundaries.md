# Sibi Ownership Boundaries

Sibi is the wedge for ownership verification over AI-assisted technical work.
It is not an education platform, a code review clone, or a generic document
reader. The product promise is:

> Do not just ship AI-generated work. Prove you own it.

The initial surface is intentionally small: paste a diff, PR text, or agent
output; Sibi turns it into scoped ownership claims, evidence-backed questions,
gaps, artifacts, and readiness. Later repo connectors, PR integrations, and
agent-session imports must preserve the same boundaries.

## Product Boundary

Sibi exists to answer one operational question:

```text
Is the human ready to accept this AI-assisted work, and what evidence proves it?
```

The category is ownership infrastructure for AI-assisted builders. The user is
not entering Sibi to take a course. They are entering because they are about to
accept work they may not understand yet.

Sibi should become the system of record for:

- accepted AI work: commits, PRs, diffs, agent sessions, specs, decisions,
  generated code, tests, incidents;
- demonstrated human ownership: attempts, explanations, failed questions,
  repaired gaps, artifacts, recall history, transfer proofs, readiness claims.

Internally, cognitive debt can be modeled as:

```text
accepted AI work - demonstrated human ownership
```

Do not sell this as a precise scientific metric in the MVP. The product should
say it detects ownership gaps, not that it fully measures cognitive debt.

## Runtime Split

The LLM may propose meaning. The runtime decides what enters the system.

```text
LLM:
  detects meaning, intention, concepts, risks, possible gaps

Runtime:
  validates evidence, scope, schema, readiness, memory, and pedagogy
```

The LLM can say: "this diff appears to change memory ownership behavior." It
cannot be the final authority that the user understands Rust, JAX, a repo, or an
architecture. Sibi only records claims that survive validation.

Every future feature should follow this gate:

```text
LLM output
  -> schema validation
  -> evidence validation
  -> scope validation
  -> pedagogy validation
  -> UI projection
```

## Non-Goals For Now

Do not build these for the first wedge:

- a custom AST or parser to understand every language;
- language-specific detectors for concepts like Rust ownership, JAX memory, or
  Python async behavior;
- a large deterministic classifier that replaces model interpretation;
- OS folder access as the first interaction;
- a broad repo-understanding agent before the pasted diff path proves useful;
- global claims like "the user understands Rust" or "this repo is owned";
- a cognitive debt dashboard that implies more precision than the system has.

The valuable system is a claim verifier, not a hand-written semantic analyzer.

## Core Contracts

All model-generated review data must be expressed through strict contracts. If a
claim cannot point to evidence and an operation, it should not be shown as an
ownership finding.

```ts
type EvidenceRef = {
  file_path: string;
  start_line: number;
  end_line: number;
  excerpt: string;
  source_kind: "diff" | "repo" | "test" | "doc" | "conversation";
};

type OwnershipClaim = {
  claim: string;
  evidence_refs: EvidenceRef[];
  confidence: "low" | "medium" | "high";
};

type OwnershipGap = {
  gap: string;
  evidence_refs: EvidenceRef[];
  operation: "explain" | "trace" | "modify" | "test" | "benchmark" | "transfer";
  severity: "blocking" | "important" | "optional";
};

type OwnershipQuestion = {
  question: string;
  operation: "explain" | "trace" | "predict" | "modify" | "test" | "transfer";
  required_evidence_refs: EvidenceRef[];
  success_criteria: string[];
};

type ArtifactRecommendation = {
  kind: "note" | "diagram" | "code_probe" | "test" | "benchmark" | "derivation" | "evidence_table";
  reason: string;
  required_evidence_refs: EvidenceRef[];
};

type ReadinessClaim = {
  status: "blocked" | "limited" | "ready";
  operation: string;
  subject: string;
  supporting_evidence_refs: EvidenceRef[];
  user_attempt_ref?: string;
  blocked_by_gap_ids: string[];
};
```

These contracts can evolve, but future integrations must keep the same spine:

```text
claim -> evidence -> operation -> question -> artifact -> readiness scope
```

## Pedagogy Rules

Ownership is demonstrated ability to operate on a system with evidence, without
blindly depending on the LLM. It is not reading, agreeing with an explanation, or
answering "yes, I understand."

Valid ownership operations:

- `explain`: explain what changed and why it matters;
- `trace`: follow the affected flow across the relevant evidence;
- `predict`: anticipate behavior, failure modes, or regressions;
- `modify`: change a variant without breaking the concept;
- `test`: design or run evidence that validates the risk;
- `benchmark`: prove a performance or resource claim;
- `transfer`: use the concept in another context.

Global rules:

- no readiness without a user attempt;
- no readiness broader than the evidence supports;
- no gap without an operation;
- no artifact recommendation without a reason and required evidence;
- no repair without a return condition back to the original work;
- recall and transfer are separate checks;
- repeated gaps update memory instead of being treated as new isolated events.

Example unit of memory:

```text
OwnershipGap {
  subject: "buffer reuse in tensor allocator"
  evidence: "src/buffer.rs:42-68"
  operation_failed: "trace"
  user_attempt: "..."
  repair: "build code probe / explain allocation path"
  return_condition: "trace the original diff again"
}
```

## Sibi And Sibar

Sibi handles the moment of risk:

```text
AI produces work
  -> Sibi extracts ownership claims
  -> runtime validates evidence
  -> user answers ownership questions
  -> Sibi records gaps and scoped readiness
```

Sibar handles deeper repair:

```text
gap
  -> Sibar repair session
  -> artifact
  -> recall
  -> transfer
  -> return to original PR or diff
```

Sibi should not become the full workspace. It should emit clean ownership review
artifacts that Sibar can use to create repair sessions.

## Evaluation Boundary

Sibi needs three eval families.

Contract evals check that model outputs are traceable:

```text
claim -> evidence -> operation -> question -> artifact -> readiness scope
```

They fail on invented files, invented lines, abstract gaps, global readiness,
missing operations, or unsupported artifact recommendations.

Pedagogy evals check that the system preserves the learning rules:

- no readiness without attempt;
- gap tied to operation;
- scoped readiness only;
- repair has return condition;
- recall is not treated as transfer;
- repeated gaps update memory.

Ownership evals check whether the human demonstrated operation over the work:

- can explain the diff;
- can trace the flow;
- can predict a failure;
- can identify or design the test;
- can modify a variant;
- can transfer the concept later.

## MVP Rule

The current `sibi` app may stay deterministic while the product loop is tested.
When an LLM is introduced, it must sit behind the contracts above. A model can
propose claims and gaps, but only the runtime can admit them into readiness,
memory, UI, or Sibar handoff.

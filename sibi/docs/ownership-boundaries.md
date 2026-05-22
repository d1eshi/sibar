# Sibi Ownership Boundaries

Sibi is the wedge for ownership verification over AI-assisted technical work.
It is not an education platform, a code review clone, or a generic document
reader. The product promise is:

> Do not just ship AI-generated work. Prove you own it.

The initial surface is intentionally small: paste a diff, PR text, or agent
output; Sibi turns it into scoped ownership claims, evidence-backed questions,
gaps, artifacts, and readiness. Later repo connectors, PR integrations, and
agent-session imports must preserve the same boundaries.

## Manifesto

AI made software faster than human understanding.

Teams can now generate code, features, diffs, and architectures at a speed their
mental models cannot absorb. The result is not just technical debt. It is
cognitive debt: code that exists, passes tests, may even ship, but is not truly
owned by the people responsible for it.

Sibi does not explain your codebase to you.

It makes you prove ownership of it:

- one boundary at a time;
- one attempt at a time;
- one gap at a time.

The wedge is not "learn faster" or "ask anything about a codebase." The wedge is
cognitive debt recovery for AI-generated or AI-assisted software.

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

Every diff should be treated as a mutation over ownership, not only as a code
change. The product loop must ask:

1. What changed in the system?
2. What changed in the user's mental model?
3. Did the gap between system behavior and demonstrated ownership grow or shrink?

Tests passing is not enough. Sibi can say that code compiles while ownership is
still blocked.

## Ownership Harness

Sibi should feel like an ownership harness, not a code explainer. The default
interaction is attempt-first:

```text
User selects diff/file/directory
  -> Sibi builds deterministic context
  -> Sibi shows a prioritized review queue
  -> Sibi asks an ownership claim
  -> user attempts an explanation
  -> Sibi diagnoses the gap
  -> Sibi gives the smallest repair
  -> user retries
  -> ownership state updates
```

The primary action is not:

```text
Explain this file with LLM
```

The primary action is:

```text
Prove ownership
```

The UI may offer hints, but it must not make explanation the first move. A user
does not prove ownership by reading an answer. They prove ownership by attempting
an operation and having that attempt checked against evidence.

### First-Run Review Sequence

The first visible right-panel experience should be a guided review sequence, not
the internal lab and not the ownership prompt alone. Sibi should tell the user
what it is about to inspect before asking for ownership:

```text
Review touched surface
  -> show the current prioritized queue step
  -> state why the review starts there
  -> name the next check
  -> ask the current file/check question
  -> record missing or inconclusive answers as observations
  -> advance to the next relationship check
  -> reveal minimal context after repeated weak attempts
```

The queue should make the relationship between files and boundaries explicit.
Touched files are usually reviewed first, but only because they provide the
initial evidence for a boundary. Supporting tests and inferred callers can follow
when they are needed to prove or falsify the boundary. The default UI should
keep this compact and sequential: current focus, why that item starts first, and
the next action. The full queue belongs in the local lab, where each queue item
should show:

- file or boundary name;
- touched status;
- priority;
- reason for order;
- next step.

The ownership prompt is a stage in this sequence. The local derivation lab is
not part of the default user-facing UI. It should open only through an explicit
local/debug query param such as `?view=lab` or `?lab=1`, where it can show trace
derivation, the full priority queue, state projection, and report context
without overwhelming the normal flow.

The default session should be guided, not open chat. Sibi asks one bounded
question at a time for the current queue item. The touched API file can ask what
changed in `src/api/session.ts`; later checks such as `session.test.ts` and
`consumer.ts` must ask the user to connect files instead of summarizing one file
in isolation. Empty attempts, explicit unknowns, and inconclusive answers advance
the queue and log a concrete observation: `no answer`, `inconclusive`, or `could
not connect caller/test`. After two weak attempts in a row, Sibi should show only
the smallest useful hint ladder before the next attempt.

Anti-patterns for the wedge:

- explain file;
- summarize folder;
- ask anything about codebase;
- generate docs as the main output;
- mark readiness before the user attempts the boundary.

Preferred product verbs:

- prove ownership;
- diagnose gap;
- repair boundary;
- re-attempt;
- track debt;
- schedule revisit.

## Ownership Boundaries

The core unit is not necessarily a file. The core unit is an ownership boundary:

```text
boundary = a technical responsibility the user must be able to explain, modify,
and defend with evidence
```

A file can contain multiple boundaries, and one boundary can cross several
files. The product should avoid asking only "what does this file do?" when the
real gap is a boundary distinction such as:

- where attempt evaluation ends and deterministic validation begins;
- where evidence collection ends and pedagogical judgment begins;
- who consumes a runtime contract;
- what would break if a validation layer disappeared.

File-tree state should be cognitive, not just technical. Valid states include:

- `unvisited`;
- `attempted`;
- `owned`;
- `partial`;
- `gap`;
- `blocked`;
- `questionable`.

Every non-owned state needs a reason, for example:

- `gap: cannot explain deletion risk`;
- `gap: confuses caller with consumer`;
- `gap: understands function, not boundary`;
- `gap: no evidence from tests/specs`;
- `gap: overconfident but wrong`;
- `blocked: missing prerequisite boundary`.

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

The runtime builds evidence such as imports, exports, callers, tests, touched
files, spec links, docs references, runtime logs, eval results, naming
inconsistencies, suspected dead code, and dependency depth. The LLM interprets
human attempts and proposes semantic structure, but it does not own the truth of
the system.

## Evidence Extraction Layer

Sibi should not build a custom AST engine for the first wedge. That is expensive,
fragile, and pulls the product into compiler, parser, LSP, and language-server
work before the ownership loop is proven.

The first architecture should be hybrid:

```text
cheap deterministic signals
  + LLM evidence extraction
  + strict contracts
  + verification / confidence scoring
```

Do not call this an AST. Call it an evidence extraction layer.

The goal is not perfect language understanding. The goal is enough verified
evidence to ask a human whether they own the changed boundary.

Evidence must be separated by confidence and source:

- `observed`: cheap facts the runtime can verify, such as file exists, symbol
  text appears, import string exists, export keyword exists, nearby test exists,
  git diff touched file, or path matches a known pattern;
- `inferred`: semantic interpretations the LLM can propose, such as likely
  responsibility, likely boundary, naming mismatch, or layer confusion;
- `unverified`: hypotheses that can only become questions until checked, such as
  dead-code suspicion, deletion safety, main-entrypoint claims, or unclear
  boundary claims.

Rules:

- no source means no high confidence;
- inferred claims cannot become ownership facts;
- unverified claims can only become questions;
- observed facts may update the evidence graph;
- conflicts between LLM claims and runtime checks lower confidence or block the
  claim from readiness.

Start semantic. Verify cheaply. Specialize only where repeated errors create
product pain.

Initial deterministic checks can be simple:

```text
rg "export function"
rg "export const"
rg "from './"
git diff --name-only
git grep "symbolName"
```

Language-specific analyzers can be introduced later where they pay for
themselves:

- TypeScript: `ts-morph` or the TypeScript Compiler API;
- Python: built-in `ast`;
- Rust: `cargo metadata` or rust-analyzer;
- Go: `go/parser`.

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

type EvidenceItem = {
  kind: "observed" | "inferred" | "unverified";
  claim: string;
  source?: {
    file_path?: string;
    start_line?: number;
    end_line?: number;
    symbol?: string;
  };
  confidence: "low" | "medium" | "high";
  verification_needed?: string;
};

type CodeEvidence = {
  file_path: string;
  language: "ts" | "tsx" | "js" | "jsx" | "py" | "rs" | "go" | "unknown";
  symbols: Array<{
    name: string;
    kind: "function" | "class" | "type" | "constant" | "component" | "unknown";
    exported: boolean;
    responsibility_claim?: string;
  }>;
  imports: Array<{
    source: string;
    imported_names?: string[];
  }>;
  possible_callers?: Array<{
    symbol: string;
    callers: string[];
    confidence: "low" | "medium" | "high";
  }>;
  risk_claims: EvidenceItem[];
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

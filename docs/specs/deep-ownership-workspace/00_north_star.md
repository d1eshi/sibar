# 00: North Star

## Thesis

Sibi should become the system that turns technical ambition into verified deep
ownership.

The target user is not only trying to understand a repo. The target user wants
to become capable of building serious technical work: reinforcement learning,
LLMs, agents, optimization systems, Rust systems, ML from scratch, research
paper implementations, and eventually technology that does not exist yet.

The product must not make the user dependent on explanations. It must make the
user stronger at thinking.

## Core Claim

Sibi is not an explainer.

Sibi is a deep ownership runtime:

```text
real artifact
  -> user attempt
  -> evidence check
  -> gap detection
  -> prerequisite repair
  -> construction
  -> re-evaluation
  -> memory
```

Sibi should not satisfy curiosity by answering too early. It should preserve the
productive friction that creates understanding.

## First User

The first user is a builder using AI to accelerate their work, while trying to
become technically serious enough to own the systems they build.

They may say:

```text
I want to build RL agents, but I cannot justify why this update equation works.
I want to understand this LLM training repo, but the codebase is too large.
I want to learn Rust through real systems, not toy syntax examples.
I want to read a paper and implement the core idea myself.
I want to understand this agent-generated app enough to safely extend it.
```

The user is creative and impatient. Sibi must not block construction. It should
convert construction into understanding.

## What Deep Ownership Means

Deep ownership is demonstrated, not claimed.

A user owns a concept, flow, formula, or codebase slice when they can perform
several of these operations with evidence:

1. Explain it in their own words.
2. Trace it across code, tests, math, docs, or experiments.
3. Derive why a variable, parameter, formula, or abstraction exists.
4. Predict what changes when a parameter, condition, or dependency changes.
5. Build a minimal version from scratch.
6. Modify a bounded implementation safely.
7. Debug a failure mode by naming what broke and why.
8. Design a counterexample.
9. Compare multiple hypotheses.
10. Transfer the concept to a different artifact.
11. Teach the concept with citations and caveats.

Reading every line is neither necessary nor sufficient. Sometimes the user must
read a line carefully. Sometimes they need a flow map. Sometimes they need a
math derivation. Sometimes they need an experiment. Sibi's job is to choose the
smallest artifact that forces the right thinking operation.

## Moat

The moat is not code search, repo indexing, or generated diagrams by themselves.

The moat is the accumulated, evidence-backed understanding graph:

1. what artifacts the user touched
2. what concepts those artifacts express
3. what the user attempted before seeing an answer
4. where the user showed correct reasoning
5. where the user confused concepts
6. what prerequisite was missing
7. what repair worked
8. what the user retained after time
9. what the user could transfer to a new artifact
10. what the user is ready to modify, debug, or teach

Generic assistants optimize for output. Sibi optimizes for ownership.

## Product Position

Do not position Sibi as:

1. a code assistant
2. a repo chat
3. a course platform
4. a passive tutor
5. a code editor
6. a diagramming tool

Position Sibi as:

> a technical ownership workspace for people building and learning difficult
> systems from real artifacts.

## Strategic Wedge

The strongest first wedge is:

> Learn and own real AI/ML/RL/code artifacts deeply enough to build with them.

This includes:

1. existing open source repos
2. generated repos
3. papers
4. notebooks
5. tests
6. docs
7. math derivations
8. experiments
9. small scratch implementations

The first dogfood artifact can remain this Sibi repo because it already contains
the relevant product and runtime loops. But the product story should point
toward AI research and deep technical construction, not only repo onboarding.

## Non-Negotiables

1. Sibi never defaults to explaining first.
2. Every important claim cites evidence or declares uncertainty.
3. The user must attempt the operation before seeing the full answer.
4. Readiness requires user evidence, not just artifact evidence.
5. Sibi can generate artifacts for thinking, but those artifacts must be
   grounded in declared sources.
6. Sibi must distinguish study artifacts from product-code changes.
7. The UI must make evidence, gaps, and next actions visible.
8. Large codebases require progressive ownership, not fake completeness.
9. The system must remain useful when the user wants to build immediately.
10. The memory layer is the asset.


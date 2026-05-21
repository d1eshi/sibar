# 14: Workspace Intent Flow

Status: historical/reference for first-run product intake. The heavy
`WorkspaceIntent` form in this document is superseded by
`22_source_intent_ingestion_mvp.md` for the current MVP. Keep this document as
background for internal `Workspace*` compiler naming and bounded-plan contracts.

## Goal

Define the first user-facing flow for Sibar Research Workspace: the user creates
a bounded workspace from an intent before seeing a pre-filled roadmap or session.

This slice deliberately starts at `WorkspaceIntent`, not global intent. Global
ambition is useful context, but it is too broad to drive the first UI without
collapsing the product into a generic planning surface.

## Concept Hierarchy

```text
User Ambition
  -> Workspace
        -> Node
              -> Session
                    -> Artifact / Evidence
```

`User Ambition` is the durable direction. `Workspace` is one bounded program of
work under that ambition. A workspace may be one of several paths under the same
ambition:

```text
Ambition: Convertirme en researcher tecnico de AI

Workspaces:
  1. Neural Nets from Scratch
  2. Language Models from Scratch
  3. JAX Transformers
  4. Scaling Laws
  5. Systems / Kernels
  6. Research Practice
```

## First Flow

The first screen is `Create Workspace`.

```text
What are you trying to build or understand?
[ quiero aprender embeddings, a no mas poder ]

Source / playbook
[ URL / pasted text / paper / repo ]

Why does this matter?
[ I want evidence for frontier AI researcher preparation ]

What do you already know?
[ optional background ]

What do you not know yet?
[ optional unknowns / locked areas ]

Desired output
[ repo, notes, benchmark, public writeup ]

Generate workspace
```

The strings above are examples, not static defaults. The first usable path may
start from only the first intent field; if source/playbook is empty, the system
uses the intent text as inline evidence until the user supplies stronger source.

The UI must make the global ambition visible as context, but the user is not
asked to solve the whole ambition at once. The created object is a workspace:

```text
Global ambition:
  Convertirme en AI researcher-builder

Workspace intent:
  Embeddings

Session:
  Explain embeddings as vectors and compare them
```

## Contract Order

The first implementation slice introduces contracts in this order:

```text
WorkspaceIntent
SourceIntake
WorkspacePlan
SessionPlan
EvidencePlan
```

`RoadmapArtifact` is not the source of truth for this flow. Existing roadmap
projection can remain as UI adapter/demo output, but the product promise is not
"we sell a roadmap." The promise is converting a user ambition into a bounded
workspace with sessions and evidence.

## Transition

```text
User fills WorkspaceIntent
  -> LLM compiles WorkspacePlan
  -> System selects first SessionPlan
  -> UI opens session
```

The LLM compilation step may be represented by deterministic builders in tests
and local demos, but the boundary remains the same: the compiler consumes
`WorkspaceIntent` and produces a `WorkspacePlan`. The UI then projects that plan
into visible nodes, a first session, and evidence expectations.

## Example Output

For a user asking to learn embeddings deeply, Sibar can propose:

```text
Proposed Workspace: Embeddings

This workspace will produce:
- embeddings notes
- small artifact
- next session

Start with:
Session 01 - Embeddings foundations
```

The first session may later lead to vector search, retrieval evaluation, or
embedding model internals, but the system should start with the smallest
prerequisite session that makes the workspace executable and evidence-backed.

## Acceptance

1. `WorkspaceIntent` records what the user is trying to build or understand,
   source/playbook input, motivation, knowns, unknowns, and desired outputs.
2. `SourceIntake` preserves the raw source/playbook input and classified source
   kind without becoming the workspace plan.
3. `WorkspacePlan` names a bounded workspace and carries proposed outputs,
   nodes, the first session, and evidence expectations.
4. `SessionPlan` is scoped to one node/session and does not claim global
   ambition completion.
5. `EvidencePlan` names artifact/evidence outputs that can later feed the deep
   ownership loop.
6. UI under `apps/` may project this flow, but domain contracts and deterministic
   builders live under `src/pedagogoai`.

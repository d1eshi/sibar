# Sibi v0.1 Build-to-Learn Mission

## Plan Overview

This mission turns the v0.1 foundation specs into an implementation-ready queue.
Sibi v0.1 must run one reproducible Build-to-Learn session over one bounded
software artifact, measure its own pedagogy/runtime behavior through evals, and
show the user what they are studying through a reusable Swift panel, a floating
standalone `NSPanel` host, and a Graph + Code canvas.

The mission extends the existing eight specs with:

1. `Spec 09: Project Learning Agent` - a bounded LLM/Codex adapter that proposes candidate signals only.
2. `Spec 10: Study Panel UI` - a Swift panel, app host, and canvas that render runtime-owned study state.
3. Internal eval specs for datasets, deterministic pedagogy checks, and LLM+runtime trace checks.

## Expected Functionality

### Milestone 1 - Deterministic Build-to-Learn Core

- Create an explicit artifact session with visible include/exclude boundaries.
- Build a small evidence-cited concept graph from the artifact.
- Run an autopsy step where the user predicts/explains before Sibi answers.
- Capture answer evidence, detect gaps/misconceptions, create repair challenges, persist memory, and export readiness.

### Milestone 2 - Pedagogy Evals

- Create canonical eval cases for the Sibi moat: L1-L5 answers, misconception examples, missing evidence, boundary violations, and readiness expectations.
- Run deterministic evals without an LLM to verify layer classification, gap detection, challenge creation, memory, and readiness logic.

### Milestone 3 - Bounded Agent And Study Panel

- Run a configured Codex model runner against the bounded artifact and capture traceable `candidate_signals`.
- Validate model output through deterministic boundaries, evidence checks, and pedagogy rules before using it.
- Render the session in a Swift study panel through `SibiCore`, without Swift owning memory, queues, evals, or readiness decisions.
- Host the study panel in `SibiStudyApp` so the user can refresh live artifact
  and session state from an accessory floating `NSPanel`.
- Open a Graph + Code canvas from the same runtime snapshot without adopting
  observer, OCR, spotlight, screen capture, or permission scope yet.

## Boundaries

In scope:

- `docs/specs/01-10`
- TypeScript runtime commands and local runtime state under `src/`
- Pedagogy modules under `src/pedagogy/`
- Runtime tests under `Tests/runtime.test.ts`
- Swift bridge models/client in `Sources/SibiCore/` only after TypeScript command contracts stabilize
- Mission eval datasets and eval harness contracts
- Manual Swift study panel contract, standalone `NSPanel` app host, Graph + Code
  canvas, and future implementation slices
- Worker/verifier orchestration rules in `library/orchestration.md`

Out of scope for this mission:

- Ambient macOS observer
- OCR, spotlight, screen capture, voice, browser scraping, editor plugins, background watchers, or workspace mutation
- LLM deciding truth, mastery, readiness, or final grades
- Swift-side persistence, queueing, concept extraction, gap detection, evals, or readiness
- Team dashboards, cloud sync, shared workspaces, or release automation

## Environment Setup

- Required tools: Node 22.6+, npm, SwiftPM, Swift 5.9+.
- Required env: `SIBI_RUNTIME_HOME` for local test state isolation.
- Optional env for Spec 09: configured Codex runner command, model, and reasoning effort.
- Known constraint: model-backed features must be skipped or marked blocked unless Codex runner access is explicitly configured.
- Model policy: code-producing workers use `gpt-5.5 medium`; verifier workers use `gpt-5.2 high`; model evals compare Codex `gpt-5.2 medium` against Codex `gpt-5.5 low`.

## Testing Strategy

- Automated: `npm test`, `npm run typecheck`, eval harness tests, and `swift test` when Swift bridge APIs change.
- Manual: dogfood one session over this repo from artifact boundary to readiness report and panel rendering.
- Blocked or user-dependent: live Codex traces require configured runner access and must record model, reasoning effort, prompt, boundary, files read, and validation output.

## Mission Readiness

- Dependency readiness: existing TypeScript runtime and `SibiCore` bridge are present; artifact, graph, readiness, agent, eval, and UI contracts are not yet implemented.
- Validation readiness: this mission is ready when each feature maps to at least one `VAL-*` assertion and has a governing iteration spec.

## Non-Functional Requirements

- Keep implementation slices narrow and commit by intent.
- Preserve local-first behavior and visible evidence.
- Refuse unbounded filesystem reads.
- Treat LLM outputs as candidate evidence, never as source of truth.
- Keep UI reusable and runtime-state driven.
- Require handoff evidence before marking any feature complete.
- Use a verifier worker after every implementation slice before completion.
- Research dataset sizing inside E01/E03 before claiming benchmark quality.

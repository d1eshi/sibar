# Spec: Cognitive Debt, Cognitive Load, and Daily Readout

## Purpose

Bring research signals into reproducible product signals without replacing human
judgment. This spec defines what we can measure from boundary attempts, relation
gaps, and transfer behavior, and how those measurements feed daily readout.

## Goal

- Define stable metrics that can be derived from contracted evidence + attempts.
- Define how metrics drive `daily learning readout`.
- Ensure metrics are used for transfer and escalation decisions instead of chat
  narratives.

## Core Metric Contracts

### `cognitive_debt_metric`

```ts
type CognitiveDebtMetric = {
  artifactScope: string;
  boundaryId: string;
  boundary_gap_density: number;       // 0..1
  readiness_debt: number;            // 0..1
  calibration_gap: number;            // 0..1
  attempt_variance: number;           // 0..1
  source_inputs: {
    attemptIds: string[];
    evidenceRefIds: string[];
    transferAttemptIds?: string[];
  };
  lastComputedAt: string;
};
```

#### Relation gap density

`boundary_gap_density = clamp01(confirmed_relation_gaps / max(1, candidate_relation_items))`

Inputs are boundary-scoped signals from the memory export:

- confirmed relation signals:
  - guided observation reason `could not connect caller/test`,
  - non-ready readiness gap reasons that mention relation/test/caller,
  - persisted recurring gaps that start with `relation-gap:`.
- candidate relation items come from boundary files + review queue files + local code-evidence relation candidates.

#### Readiness debt

`readiness_debt = clamp01(1 - local_readiness_signal)`

`local_readiness_signal` is not a truth claim or user mastery metric. It is only a
boundary/session-local ownership-progress signal (for product routing only).

`local_readiness_signal = mean(signal)` where each readiness attempt emits:

- `1` when `readiness_gate == "ready"`
- `0.56` when `readiness_gate == "repair-needed"`
- `0.2` when `readiness_gate == "blocked"`

#### Calibration gap

`calibrationGap = abs(self_confidence - evidence_confidence)`

`calibration_gap = clamp01(mean( calibration_gap_i for all readiness attempts ))`
where `calibration_gap_i = abs(self_confidence_i - evidence_fit_i)`.

#### Attempt variance

Measured attempt drift over attempts for the same boundary (timing + correction
steps + confidence shifts), bounded to avoid unbounded growth.

Implementation uses a weighted bounded standard-deviation mix of:

- confidence drift,
- evidence-fit drift,
- elapsed-time drift.

### `cognitive_load_metric`

```ts
type CognitiveLoadMetric = {
  boundaryId: string;
  boundary_fanout: number;
  dependency_depth: number;
  repair_retry_count: number;
  source_inputs: {
    attemptIds: string[];
    evidenceRefIds: string[];
    transferAttemptIds?: string[];
  };
  churn_weight: number;
  lastComputedAt: string;
};
```

#### Fanout

`boundary_fanout` = count of observed relation candidates (boundary files, review queue files, and code-evidence candidates).

#### Dependency depth

`dependency_depth` is deterministic from bounded context signals:

- presence of caller/test files,
- runtime-context presence,
- non-boundary relation candidates,
- transfer failure/retry history.

#### Churn weight

Combined normalized weight from repair retries and open question cycles and unresolved recurring gaps.

## Daily Learning Readout

```ts
type DailyReadout = {
  date: string;
  outstanding_gaps: string[];
  ready_count: number;
  transfer_summary: Array<{
    boundaryId: string;
    result: "pass" | "fail" | "skipped";
    reason?: string;
  }>;
  load_hotspots: string[];
  top_3_follow_up_actions: string[];
  cognitive_debt_metric: CognitiveDebtMetric;
  cognitive_load_metric: CognitiveLoadMetric;
};
```

Readout rules:

- must use persisted attempts/evidence/relation data;
- must not claim mastery;
- must show what is unresolved, not only what is done;
- must include one explicit anti-overload recommendation when load is high and no
  stable readiness exists.

## Mapping to Product Decisions

- A boundary with high `boundary_gap_density` and `calibration_gap` should be locked
  to remediation flow before advancing.
- A boundary with repeated transfer failure should route to Workspace escalation
  review and mark a prerequisite stack.
- A high `cognitive_load_metric` boundary cannot be the only source of "ready".
- Repeating the same unresolved gap across days converts to a "recurring_gap" tag.

## Acceptance

- All metrics have deterministic formulas and can be recomputed from stored
  runtime records.
- Every metric row references source inputs (attempt IDs and evidence refs).
- Daily readout has at least:
  - one completed boundary, one unresolved gap, one transfer status.
- Any boundary marked ready with warning metrics must include follow-up conditions
  before final handoff.

## Gates and Validation

- `Readiness` and `metric` changes require cross-check in a lab-facing trace
  page and one manual reproducibility path.
- Playwright + browser-skill traces must cover:
  - metric update after attempt/re-attempt,
  - transfer fail path,
  - escalation candidate path.
- A metrics-only success is never an acceptance condition.

## Open Questions

- Should `cognitive_load_metric` prioritize fanout depth, retry pressure, or
  time-to-resolution when they disagree?

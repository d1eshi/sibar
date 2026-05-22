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
  relationGapDensity: number;      // 0..1
  readinessDebt: number;           // 0..1
  calibrationGap: number;          // 0..1
  attemptVariance: number;         // >=0
  lastComputedAt: string;
};
```

#### Relation gap density

`relationGapDensity = confirmed_relation_gaps / candidate_relation_items`

#### Readiness debt

`readinessDebt = 1 - local_readiness_signal`

`local_readiness_signal` is not a truth claim or user mastery metric. It is only a
boundary/session-local ownership-progress signal (for product routing only).

#### Calibration gap

`calibrationGap = abs(self_confidence - evidence_confidence)`

#### Attempt variance

Measured attempt drift over attempts for the same boundary (timing + correction
steps + confidence shifts), bounded to avoid unbounded growth.

### `cognitive_load_metric`

```ts
type CognitiveLoadMetric = {
  boundaryId: string;
  fanoutCount: number;
  dependencyDepth: number;
  repairRetryCount: number;
  churnWeight: number;
  lastComputedAt: string;
};
```

#### Fanout

Number of observed relations from and to the boundary (calls, callers, tests,
docs).

#### Dependency depth

Derived from relation chain length inside the bounded context.

#### Churn weight

Combined normalized weight from repair retries and open question cycles.

## Daily Learning Readout

```ts
type DailyReadout = {
  date: string;
  completed_boundaries: string[];
  outstanding_gaps: string[];
  transfer_summary: Array<{
    boundaryId: string;
    result: "pass" | "fail" | "skipped";
    reason?: string;
  }>;
  top_debt_boundaries: Array<{ boundaryId: string; score: number }>;
  top_load_boundaries: Array<{ boundaryId: string; score: number }>;
  recommended_actions: string[];
};
```

Readout rules:

- must use persisted attempts/evidence/relation data;
- must not claim mastery;
- must show what is unresolved, not only what is done;
- must include one explicit anti-overload recommendation when load is high and no
  stable readiness exists.

## Mapping to Product Decisions

- A boundary with high `relationGapDensity` and `calibrationGap` should be locked
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

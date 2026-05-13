import type { ReadinessReport } from "../../runtime-readiness.ts";

export type EvalDatasetIndex = {
  dataset_id: string;
  version: string;
  cases: { id: string; case_class: string; layer: number; file: string }[];
};

export type EvalCase = {
  id: string;
  title: string;
  case_class: string;
  artifact_boundary: { root: string; included_paths: string[]; excluded_paths: string[] };
  learning_goal: string;
  concept_under_test: { id: string; label: string; layer_target: number };
  user_answer: { kind: string; text: string; declared_confidence: string };
  llm_fixture_response: null | {
    candidate_signals: {
      signal_type: string;
      claim: string;
      confidence: string;
      citations: { path: string; range: string }[];
    }[];
  };
  expected_layer: { level: number; label: string; rationale: string };
  expected_gap: null | { should_create: boolean; severity?: string; confidence?: string; observed_layer?: number };
  expected_misconception: null | { should_create: boolean; label: string | null };
  expected_challenge: { should_create: boolean; challenge_type?: string };
  expected_readiness: { claim: string; confidence: string; must_cite_evidence: boolean };
  required_evidence: { path: string; range: string; expectation: string }[];
  forbidden_evidence: { path: string; reason: string }[];
  boundary_expectations: {
    accepted_evidence_must_be_inside_boundary: boolean;
    reject_forbidden_evidence: boolean;
    expected_rejection_reason: string | null;
  };
  gap_readiness_expectations: {
    create_gap: boolean;
    create_challenge: boolean;
    persist_declared_uncertainty: boolean;
    allowed_readiness_claims: string[];
    disallowed_readiness_claims: string[];
  };
};

export type BoundaryObservation = {
  accepted_paths: string[];
  rejected_paths: string[];
  rejection_reasons: string[];
};

export type CaseObservation = {
  expected_layer: number;
  classified_layer: number;
  learning_gap: null | {
    created: true;
    severity: string;
    confidence: string;
    observed_layer: number;
    suspected_misconception: string;
    artifact_evidence_count: number;
    answer_evidence_count: number;
  };
  challenge: null | { created: true; challenge_type: string; due_after: string; expected_evidence_count: number };
  readiness: ReadinessReport["summary"] | null;
  memory: { answer_count: number; gap_count: number; challenge_count: number; uncertainty_persisted: boolean };
  boundary: BoundaryObservation;
  model_called: false;
};

export type CaseResult = {
  id: string;
  title: string;
  case_class: string;
  passed: boolean;
  observations: CaseObservation;
  mismatches: { field: string; expected: unknown; actual: unknown }[];
};

export type DeterministicPedagogyEvalReport = {
  report_id: string;
  generated_at: string;
  dataset: { id: string; version: string; index_path: string };
  validation: "VAL-EVAL-002";
  no_llm: true;
  aggregate: {
    total_cases: number;
    passed_cases: number;
    failed_cases: number;
    total_mismatches: number;
    gap_cases: number;
    challenge_cases: number;
    readiness_cases_with_evidence: number;
  };
  cases: CaseResult[];
};

export type RunOptions = {
  indexPath?: string;
  reportPath?: string;
  runtimeHome?: string;
};

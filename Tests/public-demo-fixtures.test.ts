/**
 * Tests for demo fixture traceability and gating.
 *
 * VAL-CROSS-001: Engineering evidence feeds demo fixtures.
 *   Each answer state must trace to source_report_path, case_id,
 *   answer_state, observed_finding, user_evidence, repo_evidence,
 *   repair_task, reevaluation_prompt, and readiness.
 *
 * VAL-CROSS-002: Specs 02-04 are closed before demo claims them.
 *   The public demo does not present spec 02-04 behaviors as
 *   accomplished unless the corresponding CLI/eval assertions pass.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  DEMO_FIXTURES,
  validateDemoFixturesTraceability,
  demoClaimsAreGated,
  specs02to04Passed,
  loadBenchmarkReport,
  findCaseInBenchmarkReport,
  type DemoFixtureEntry,
} from "../src/demo/fixtures.ts";

// ---------------------------------------------------------------------------
// VAL-CROSS-001: Engineering evidence feeds demo fixtures
// ---------------------------------------------------------------------------

test("demo fixtures array is non-empty and covers five answer states", () => {
  assert.ok(Array.isArray(DEMO_FIXTURES), "DEMO_FIXTURES must be an array");
  assert.ok(DEMO_FIXTURES.length >= 5, "must have at least 5 entries");

  const states = new Set(DEMO_FIXTURES.map((e) => e.answer_state));
  const requiredStates = [
    "grounded",
    "uncited",
    "partial",
    "overconfident_wrong",
    "design_induced_confusion",
  ] as const;
  for (const state of requiredStates) {
    assert.ok(
      states.has(state),
      `DEMO_FIXTURES must include answer_state "${state}"`,
    );
  }
});

test("every demo fixture entry has all required trace fields", () => {
  const requiredStringFields: Array<keyof DemoFixtureEntry> = [
    "answer_state",
    "source_report_path",
    "case_id",
    "mastery_check_id",
    "concept_id",
    "operation",
    "observed_finding",
    "readiness",
    "user_evidence",
  ];

  for (let i = 0; i < DEMO_FIXTURES.length; i++) {
    const entry = DEMO_FIXTURES[i];
    for (const field of requiredStringFields) {
      assert.ok(
        typeof entry[field] === "string" && (entry[field] as string).length > 0,
        `entry ${i} ("${entry.answer_state}") must have non-empty "${field}"`,
      );
    }
    // repo_evidence must be a non-empty array
    assert.ok(
      Array.isArray(entry.repo_evidence) && entry.repo_evidence.length > 0,
      `entry ${i} must have non-empty repo_evidence array`,
    );
    // repair_task can be null for readiness cases, string otherwise
    if (entry.observed_finding === "readiness") {
      assert.equal(
        entry.repair_task,
        null,
        `entry ${i} readiness case must have null repair_task`,
      );
      assert.equal(
        entry.reevaluation_prompt,
        null,
        `entry ${i} readiness case must have null reevaluation_prompt`,
      );
    } else {
      assert.ok(
        typeof entry.repair_task === "string" &&
          (entry.repair_task as string).length > 0,
        `entry ${i} gap case must have non-empty repair_task`,
      );
      assert.ok(
        typeof entry.reevaluation_prompt === "string" &&
          (entry.reevaluation_prompt as string).length > 0,
        `entry ${i} gap case must have non-empty reevaluation_prompt`,
      );
    }
    // gap_present must be a boolean
    assert.equal(
      typeof entry.gap_present,
      "boolean",
      `entry ${i} must have boolean gap_present`,
    );
    // report_case_passed and demo_claimable must be booleans
    assert.equal(
      typeof entry.report_case_passed,
      "boolean",
      `entry ${i} must have boolean report_case_passed`,
    );
    assert.equal(
      typeof entry.demo_claimable,
      "boolean",
      `entry ${i} must have boolean demo_claimable`,
    );
  }
});

test("demo fixtures are unique by answer_state", () => {
  const stateCounts = new Map<string, number>();
  for (const entry of DEMO_FIXTURES) {
    stateCounts.set(
      entry.answer_state,
      (stateCounts.get(entry.answer_state) ?? 0) + 1,
    );
  }
  for (const [state, count] of stateCounts) {
    assert.equal(
      count,
      1,
      `answer_state "${state}" appears ${count} times; expected exactly 1`,
    );
  }
});

test("every demo fixture traces to a real source report", () => {
  for (const entry of DEMO_FIXTURES) {
    const absPath = resolve(entry.source_report_path);
    assert.ok(
      existsSync(absPath),
      `source report for "${entry.answer_state}" must exist: ${entry.source_report_path}`,
    );
  }
});

test("every demo fixture case_id exists in its source report", () => {
  for (const entry of DEMO_FIXTURES) {
    const absPath = resolve(entry.source_report_path);
    const raw = JSON.parse(readFileSync(absPath, "utf8")) as Record<
      string,
      unknown
    >;
    const reportCase = findCaseInBenchmarkReport(raw, entry.case_id);
    assert.ok(
      reportCase !== null,
      `case_id "${entry.case_id}" not found in ${entry.source_report_path} for answer_state "${entry.answer_state}"`,
    );
  }
});

test("demo fixtures do not contradict benchmark report data", () => {
  const absPath = resolve(DEMO_FIXTURES[0].source_report_path);
  const raw = JSON.parse(readFileSync(absPath, "utf8")) as Record<
    string,
    unknown
  >;

  for (const entry of DEMO_FIXTURES) {
    const reportCase = findCaseInBenchmarkReport(raw, entry.case_id);
    assert.ok(
      reportCase !== null,
      `case_id "${entry.case_id}" not found for "${entry.answer_state}"`,
    );

    // observed_gap_present must match
    assert.equal(
      reportCase["observed_gap_present"],
      entry.gap_present,
      `gap_present mismatch for "${entry.answer_state}": fixture says ${entry.gap_present}, report says ${String(reportCase["observed_gap_present"])}`,
    );

    // observed_gap_type must match (null in report = fixture must have null)
    if (entry.gap_type === null) {
      assert.equal(
        reportCase["observed_gap_type"],
        null,
        `gap_type mismatch for "${entry.answer_state}": fixture says null, report says ${String(reportCase["observed_gap_type"])}`,
      );
    } else {
      assert.equal(
        reportCase["observed_gap_type"],
        entry.gap_type,
        `gap_type mismatch for "${entry.answer_state}"`,
      );
    }

    // observed_readiness must match
    assert.equal(
      reportCase["observed_readiness"],
      entry.readiness,
      `readiness mismatch for "${entry.answer_state}": fixture says "${entry.readiness}", report says "${String(reportCase["observed_readiness"])}"`,
    );

    // observed_issue_candidate_type must match
    assert.equal(
      reportCase["observed_issue_candidate_type"],
      entry.issue_candidate_type,
      `issue_candidate_type mismatch for "${entry.answer_state}"`,
    );

    // The report case must have passed
    assert.equal(
      reportCase["passed"],
      true,
      `case_id "${entry.case_id}" must have passed in report; fixture "${entry.answer_state}" cannot trace to a failed case`,
    );
  }
});

test("validateDemoFixturesTraceability returns all-consistent report", () => {
  const report = validateDemoFixturesTraceability();

  assert.equal(
    report.total_entries,
    DEMO_FIXTURES.length,
    "total_entries must match fixture count",
  );
  assert.equal(report.all_reports_exist, true, "all reports must exist");
  assert.equal(report.all_cases_found, true, "all cases must be found");
  assert.equal(
    report.all_data_consistent,
    true,
    "all data must be consistent with reports",
  );
  assert.equal(
    report.claimable_entries,
    DEMO_FIXTURES.filter((e) => e.demo_claimable).length,
    "claimable_entries count must match",
  );
  assert.equal(report.non_claimable_entries, 0, "no non-claimable entries expected");

  for (const trace of report.traces) {
    assert.equal(
      trace.report_exists,
      true,
      `trace for "${trace.answer_state}" must have report_exists=true`,
    );
    assert.equal(
      trace.case_found_in_report,
      true,
      `trace for "${trace.answer_state}" must have case_found_in_report=true`,
    );
    assert.equal(
      trace.data_consistent,
      true,
      `trace for "${trace.answer_state}" must be data_consistent; inconsistencies: ${trace.inconsistencies.join("; ")}`,
    );
  }
});

test("demo fixtures distinguish readiness from gap states correctly", () => {
  for (const entry of DEMO_FIXTURES) {
    if (entry.answer_state === "grounded") {
      assert.equal(
        entry.observed_finding,
        "readiness",
        `grounded fixture must have readiness finding`,
      );
      assert.equal(entry.gap_present, false);
      assert.equal(entry.gap_type, null);
      assert.equal(entry.repair_task, null);
    } else {
      assert.notEqual(
        entry.observed_finding,
        "readiness",
        `gap state "${entry.answer_state}" must not have readiness finding`,
      );
      assert.equal(entry.gap_present, true);
      assert.ok(typeof entry.gap_type === "string");
      assert.ok(typeof entry.repair_task === "string");
    }
  }
});

// ---------------------------------------------------------------------------
// VAL-CROSS-002: Specs 02-04 gating
// ---------------------------------------------------------------------------

test("specs 02-04 engineering checks pass (benchmark report is all-green)", () => {
  const passed = specs02to04Passed();
  assert.equal(
    passed,
    true,
    "specs 02-04 must pass before demo claims them; benchmark report must have 40 passed cases with zero mismatches",
  );
});

test("loadBenchmarkReport returns parseable report", () => {
  const report = loadBenchmarkReport();
  assert.ok(report !== null, "benchmark report must be loadable");

  const r = report as Record<string, unknown>;
  assert.ok(
    Array.isArray(r["cases"]),
    "benchmark report must have 'cases' array",
  );
  assert.equal(
    (r["cases"] as Array<unknown>).length,
    40,
    "benchmark report must have 40 cases",
  );
  assert.equal(
    (r["aggregate"] as Record<string, unknown>)["total_cases"],
    40,
    "aggregate must show 40 total cases",
  );
});

test("demoClaimsAreGated returns true when all gates pass", () => {
  // Gate 1: specs 02-04 pass
  assert.equal(
    specs02to04Passed(),
    true,
    "specs 02-04 must pass for gating to succeed",
  );

  // Gate 2: all fixtures trace to passing report sections
  const traceability = validateDemoFixturesTraceability();
  assert.equal(
    traceability.all_data_consistent,
    true,
    "all fixtures must be data-consistent with reports",
  );

  // Gate 3: no unsupported placeholder
  for (const entry of DEMO_FIXTURES) {
    assert.equal(
      entry.demo_claimable,
      true,
      `"${entry.answer_state}" must be demo_claimable=true when backed by passing report`,
    );
    assert.equal(
      entry.report_case_passed,
      true,
      `"${entry.answer_state}" must have report_case_passed=true`,
    );
  }

  // Composite gate check
  assert.equal(
    demoClaimsAreGated(),
    true,
    "demoClaimsAreGated must return true when all gates pass",
  );
});

test("no unsupported placeholder is presented as accomplished behavior", () => {
  // Every entry must be claimable AND backed by a passed report case
  for (const entry of DEMO_FIXTURES) {
    if (entry.demo_claimable) {
      assert.equal(
        entry.report_case_passed,
        true,
        `"${entry.answer_state}" is demo_claimable but its source case did not pass`,
      );
    }
  }

  // No gaps in traceability
  const traceability = validateDemoFixturesTraceability();
  const brokenTraces = traceability.traces.filter(
    (t) => !t.data_consistent,
  );
  assert.equal(
    brokenTraces.length,
    0,
    `found ${brokenTraces.length} fixtures with data inconsistencies: ${brokenTraces.map((t) => t.answer_state).join(", ")}`,
  );
});

test("demo fixture entry case_ids use valid GC-XXX format", () => {
  for (const entry of DEMO_FIXTURES) {
    assert.ok(
      /^GC-\d{3}$/.test(entry.case_id),
      `case_id "${entry.case_id}" for "${entry.answer_state}" must match GC-NNN format`,
    );
  }
});

test("demo fixture evidence includes repo paths within artifact boundary", () => {
  for (const entry of DEMO_FIXTURES) {
    for (const citation of entry.repo_evidence) {
      assert.ok(
        citation.path.startsWith("src/") || citation.path.startsWith("Tests/"),
        `repo evidence path "${citation.path}" for "${entry.answer_state}" must be within artifact boundary (src/ or Tests/)`,
      );
      assert.ok(
        typeof citation.rationale === "string" &&
          citation.rationale.length > 0,
        `repo evidence for "${entry.answer_state}" must have non-empty rationale`,
      );
      assert.ok(
        typeof citation.excerpt === "string" && citation.excerpt.length > 0,
        `repo evidence for "${entry.answer_state}" must have non-empty excerpt`,
      );
    }
  }
});

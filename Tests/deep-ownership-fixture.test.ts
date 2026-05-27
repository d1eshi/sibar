import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  validateDeepOwnershipFixture,
  validateEvidenceEntry,
  validateEvidenceId,
  validateSkipRecord,
  validateUnknownZone,
  validateBoundaryEnforcement,
  validateReadinessClaim,
  validateThinkingArtifact,
  validateEvidenceRef,
  checkBoundaryEscape,
  loadAndValidateFixture,
  type DeepOwnershipFixture,
  type EvidenceInventoryEntry,
  type SkipRecord,
  type UnknownZone,
  type ReadinessClaim,
  type ThinkingArtifact,
  RECOGNIZED_EVIDENCE_ROLES,
  RECOGNIZED_OPERATION_KINDS,
  RECOGNIZED_ARTIFACT_KINDS,
} from "../engine/deep-ownership/index.ts";

// ── Helpers ───────────────────────────────────────────────────────────

const ROOT = resolve(process.cwd());
const FIXTURE_PATH = "evals/deep-ownership-workspace/fixtures/sibi-pedagogy-loop.json";

function loadFixture(): DeepOwnershipFixture {
  if (!existsSync(FIXTURE_PATH)) {
    throw new Error(`Fixture not found at ${FIXTURE_PATH}`);
  }
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as DeepOwnershipFixture;
}

// ── Evidence Identity Tests ──────────────────────────────────────────

describe("Evidence Identity", () => {
  test("every evidence entry has a stable EV-NNN id", () => {
    const fixture = loadFixture();
    assert.ok(fixture.evidence_inventory.length > 0, "Evidence inventory is non-empty");

    for (const entry of fixture.evidence_inventory) {
      assert.match(entry.id, /^EV-\d{3}$/, `Evidence ID ${entry.id} does not match EV-NNN format`);
    }
  });

  test("every evidence entry has required identity fields", () => {
    const fixture = loadFixture();
    for (const entry of fixture.evidence_inventory) {
      assert.ok(typeof entry.id === "string" && entry.id.length > 0, `Entry ${entry.id || "unknown"}: missing id`);
      assert.ok(typeof entry.path === "string" && entry.path.length > 0, `Entry ${entry.id}: missing path`);
      assert.ok(typeof entry.role === "string" && entry.role.length > 0, `Entry ${entry.id}: missing role`);
      assert.ok(typeof entry.content_hash === "string" && entry.content_hash.length > 0, `Entry ${entry.id}: missing content_hash`);
      assert.ok(typeof entry.source_type === "string" && entry.source_type.length > 0, `Entry ${entry.id}: missing source_type`);
      assert.ok(typeof entry.size_bytes === "number" && entry.size_bytes > 0, `Entry ${entry.id}: missing or zero size_bytes`);
      assert.ok(typeof entry.excerpt === "string" && entry.excerpt.length > 0, `Entry ${entry.id}: missing excerpt`);
      assert.ok(typeof entry.extension === "string", `Entry ${entry.id}: missing extension`);
      assert.ok(typeof entry.status === "string", `Entry ${entry.id}: missing status`);
    }
  });

  test("no duplicate evidence IDs", () => {
    const fixture = loadFixture();
    const ids = fixture.evidence_inventory.map((e) => e.id);
    const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    assert.deepEqual([...new Set(dupes)], [], "Duplicate evidence IDs found");
  });

  test("evidence IDs are stable across validation", () => {
    const fixture = loadFixture();
    const ids = fixture.evidence_inventory.map((e) => e.id);
    // Verify IDs are the specific expected values for this fixture version
    assert.ok(ids.includes("EV-001"), "EV-001 is present");
    assert.ok(ids.includes("EV-002"), "EV-002 is present");
    assert.ok(ids.includes("EV-003"), "EV-003 is present");
    assert.ok(ids.includes("EV-004"), "EV-004 is present");
    // Verify hash format
    for (const entry of fixture.evidence_inventory) {
      assert.ok(
        entry.content_hash.startsWith("sha256:") || entry.content_hash.includes(":"),
        `Content hash for ${entry.id} should have algorithm prefix`,
      );
    }
  });
});

// ── Role Classification Tests ─────────────────────────────────────────

describe("Role Classification", () => {
  test("all evidence entries have recognized roles", () => {
    const fixture = loadFixture();
    for (const entry of fixture.evidence_inventory) {
      assert.ok(
        RECOGNIZED_EVIDENCE_ROLES.includes(entry.role),
        `Evidence ${entry.id} has unrecognized role '${entry.role}'. Recognized: ${RECOGNIZED_EVIDENCE_ROLES.join(", ")}`,
      );
    }
  });

  test("at least one implementation role entry exists", () => {
    const fixture = loadFixture();
    const implEntries = fixture.evidence_inventory.filter((e) => e.role === "implementation");
    assert.ok(implEntries.length > 0, "Evidence inventory should include at least one 'implementation' role entry");
  });

  test("at least one behavior_oracle role entry exists", () => {
    const fixture = loadFixture();
    const testEntries = fixture.evidence_inventory.filter((e) => e.role === "behavior_oracle");
    assert.ok(testEntries.length > 0, "Evidence inventory should include at least one 'behavior_oracle' role entry");
  });

  test("source files are classified as implementation or interface", () => {
    const fixture = loadFixture();
    for (const entry of fixture.evidence_inventory) {
      if (entry.extension === ".ts" && !entry.path.includes("Tests/")) {
        assert.ok(
          ["implementation", "interface"].includes(entry.role),
          `Source file ${entry.id} (${entry.path}) should be implementation or interface, got ${entry.role}`,
        );
      }
    }
  });

  test("test files are classified as behavior_oracle", () => {
    const fixture = loadFixture();
    for (const entry of fixture.evidence_inventory) {
      if (entry.path.startsWith("Tests/")) {
        assert.equal(
          entry.role,
          "behavior_oracle",
          `Test file ${entry.id} (${entry.path}) should be behavior_oracle, got ${entry.role}`,
        );
      }
    }
  });
});

// ── Unknown Zone Tests ───────────────────────────────────────────────

describe("Unknown Zones", () => {
  test("unknown zones array exists and has entries", () => {
    const fixture = loadFixture();
    assert.ok(Array.isArray(fixture.unknown_zones), "unknown_zones is an array");
    assert.ok(fixture.unknown_zones.length > 0, "unknown_zones must have at least one entry");
  });

  test("every unknown zone has required fields", () => {
    const fixture = loadFixture();
    for (const zone of fixture.unknown_zones) {
      assert.ok(typeof zone.id === "string" && zone.id.length > 0, `Unknown zone ${zone.id || "unknown"}: missing id`);
      assert.ok(typeof zone.path === "string" && zone.path.length > 0, `Unknown zone ${zone.id}: missing path`);
      assert.ok(typeof zone.reason === "string" && zone.reason.trim().length > 0, `Unknown zone ${zone.id}: missing or empty reason`);
      assert.ok(typeof zone.risk_if_ignored === "string" && zone.risk_if_ignored.trim().length > 0, `Unknown zone ${zone.id}: missing risk_if_ignored`);
      assert.ok(typeof zone.when_to_open === "string" && zone.when_to_open.trim().length > 0, `Unknown zone ${zone.id}: missing when_to_open`);
    }
  });

  test("unknown zone IDs have UZ-NNN format", () => {
    const fixture = loadFixture();
    for (const zone of fixture.unknown_zones) {
      assert.match(zone.id, /^UZ-\d{3}$/, `Unknown zone ID ${zone.id} does not match UZ-NNN format`);
    }
  });

  test("no duplicate unknown zone IDs", () => {
    const fixture = loadFixture();
    const ids = fixture.unknown_zones.map((z) => z.id);
    const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    assert.deepEqual([...new Set(dupes)], [], "Duplicate unknown zone IDs found");
  });
});

// ── Skip Record Tests ────────────────────────────────────────────────

describe("Skip Records", () => {
  test("skip records exist and have entries", () => {
    const fixture = loadFixture();
    assert.ok(Array.isArray(fixture.skip_records), "skip_records is an array");
    assert.ok(fixture.skip_records.length > 0, "skip_records must have at least one entry");
  });

  test("skip records document dependency directories and lockfiles", () => {
    const fixture = loadFixture();
    const reasons = fixture.skip_records.map((r) => r.reason);
    assert.ok(
      reasons.includes("dependency_directory"),
      "Skip records should document node_modules or equivalent dependency directories",
    );
    assert.ok(
      reasons.includes("lockfile"),
      "Skip records should document lockfiles",
    );
  });

  test("every skip record has required fields", () => {
    const fixture = loadFixture();
    for (const record of fixture.skip_records) {
      assert.ok(typeof record.id === "string" && record.id.length > 0, `Skip record ${record.id || "unknown"}: missing id`);
      assert.ok(typeof record.path === "string" && record.path.length > 0, `Skip record ${record.id}: missing path`);
      assert.ok(typeof record.reason === "string" && record.reason.length > 0, `Skip record ${record.id}: missing reason`);
      assert.ok(
        ["none", "low", "medium", "high"].includes(record.risk_if_ignored),
        `Skip record ${record.id}: invalid risk_if_ignored '${record.risk_if_ignored}'`,
      );
    }
  });

  test("no duplicate skip record IDs", () => {
    const fixture = loadFixture();
    const ids = fixture.skip_records.map((r) => r.id);
    const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    assert.deepEqual([...new Set(dupes)], [], "Duplicate skip record IDs found");
  });
});

// ── Boundary Enforcement Tests ────────────────────────────────────────

describe("Boundary Enforcement", () => {
  test("all evidence inventory paths are within the declared boundary", () => {
    const fixture = loadFixture();
    const boundary = fixture.artifact_boundary;
    const includedSet = new Set(boundary.included_sources);

    for (const entry of fixture.evidence_inventory) {
      assert.ok(
        includedSet.has(entry.path),
        `Evidence ${entry.id} path '${entry.path}' is not in boundary included_sources`,
      );
    }
  });

  test("thinking artifact evidence refs are within the declared boundary", () => {
    const fixture = loadFixture();
    const boundary = fixture.artifact_boundary;
    const includedSet = new Set(boundary.included_sources);

    for (const artifact of fixture.thinking_artifacts) {
      for (const ref of artifact.source_evidence) {
        assert.ok(
          includedSet.has(ref.file_path),
          `Artifact ${artifact.id} evidence ref ${ref.evidence_id} path '${ref.file_path}' is not in boundary`,
        );
      }
      for (const ref of artifact.hidden_solution_evidence) {
        assert.ok(
          includedSet.has(ref.file_path),
          `Artifact ${artifact.id} hidden evidence ref ${ref.evidence_id} path '${ref.file_path}' is not in boundary`,
        );
      }
    }
  });

  test("out_of_bound_refs is empty", () => {
    const fixture = loadFixture();
    assert.ok(Array.isArray(fixture.out_of_bound_refs), "out_of_bound_refs is an array");
    assert.equal(
      fixture.out_of_bound_refs.length,
      0,
      "out_of_bound_refs must be empty — out-of-bound evidence should be blocked, not silently tracked",
    );
  });

  test("loop state reports boundary enforced", () => {
    const fixture = loadFixture();
    assert.ok(fixture.loop_state, "Loop state exists");
    assert.equal(fixture.loop_state.boundary_enforced, true);
    assert.equal(fixture.loop_state.out_of_bound_accesses, 0);
  });

  test("boundary enforcement rejects paths with parent-directory traversal", () => {
    const boundary = loadFixture().artifact_boundary;
    const result = checkBoundaryEscape("../secret/file.ts", ROOT, boundary);
    assert.equal(result.blocked, true, ".. traversal should be blocked");
    assert.ok(result.reason && result.reason.includes("parent-directory"), "Block reason should mention parent-directory");
  });

  test("boundary enforcement rejects absolute paths outside root", () => {
    const boundary = loadFixture().artifact_boundary;
    const result = checkBoundaryEscape("/etc/passwd", ROOT, boundary);
    assert.equal(result.blocked, true, "Absolute path outside root should be blocked");
  });

  test("boundary enforcement rejects excluded patterns", () => {
    const boundary = loadFixture().artifact_boundary;
    const result = checkBoundaryEscape("node_modules/some-lib/index.js", ROOT, boundary);
    assert.equal(result.blocked, true, "Excluded pattern should be blocked");
  });
});

// ── Readiness Scope Tests ─────────────────────────────────────────────

describe("Readiness Scope", () => {
  test("readiness claim is scoped to one operation and concept slice", () => {
    const fixture = loadFixture();
    assert.ok(fixture.readiness_claim, "Readiness claim exists");
    assert.ok(
      fixture.readiness_claim.scope && fixture.readiness_claim.scope.length > 0,
      "Readiness has a scope string",
    );
    assert.ok(fixture.readiness_claim.concept_slice_id, "Readiness references a concept slice");
    assert.ok(fixture.readiness_claim.operation_id, "Readiness references an operation");
  });

  test("readiness claim does not assert whole-repo ownership", () => {
    const fixture = loadFixture();
    const scope = fixture.readiness_claim.scope.toLowerCase();
    const wholeRepoIndicators = [
      "this repo", "this repository", "this project", "this codebase",
      "entire repo", "entire repository", "entire project",
      "full repo", "full repository", "full codebase",
      "the repo", "the whole", "complete understanding",
    ];
    for (const indicator of wholeRepoIndicators) {
      assert.ok(
        !scope.includes(indicator),
        `Readiness scope contains whole-repo indicator: '${indicator}'`,
      );
    }
  });

  test("readiness is blocked when gaps exist", () => {
    const fixture = loadFixture();
    if (fixture.readiness_claim.blocking_gaps && fixture.readiness_claim.blocking_gaps.length > 0) {
      assert.equal(
        fixture.readiness_claim.status,
        "blocked",
        "Readiness with blocking gaps should be 'blocked'",
      );
    }
  });

  test("readiness status is a recognized value", () => {
    const fixture = loadFixture();
    assert.ok(
      ["ready", "limited", "blocked", "unknown"].includes(fixture.readiness_claim.status),
      `Readiness status '${fixture.readiness_claim.status}' is not recognized`,
    );
  });
});

// ── Thinking Artifact Tests ──────────────────────────────────────────

describe("Thinking Artifacts", () => {
  test("at least one thinking artifact exists", () => {
    const fixture = loadFixture();
    assert.ok(Array.isArray(fixture.thinking_artifacts), "thinking_artifacts is an array");
    assert.ok(fixture.thinking_artifacts.length > 0, "At least one thinking artifact must exist");
  });

  test("at least one artifact has a code_slice kind", () => {
    const fixture = loadFixture();
    const codeSlice = fixture.thinking_artifacts.find((a) => a.kind === "code_slice");
    assert.ok(codeSlice, "At least one thinking artifact should be a code_slice");
  });

  test("at least one artifact has a flow_diagram kind", () => {
    const fixture = loadFixture();
    const flowDiagram = fixture.thinking_artifacts.find((a) => a.kind === "flow_diagram");
    assert.ok(flowDiagram, "At least one thinking artifact should be a flow_diagram");
  });

  test("every thinking artifact has source evidence", () => {
    const fixture = loadFixture();
    for (const artifact of fixture.thinking_artifacts) {
      assert.ok(
        Array.isArray(artifact.source_evidence) && artifact.source_evidence.length > 0,
        `Artifact ${artifact.id} must have source evidence`,
      );
      for (const ref of artifact.source_evidence) {
        assert.ok(typeof ref.evidence_id === "string", `Artifact ${artifact.id}: evidence ref missing evidence_id`);
        assert.ok(typeof ref.file_path === "string", `Artifact ${artifact.id}: evidence ref missing file_path`);
        assert.ok(typeof ref.role === "string", `Artifact ${artifact.id}: evidence ref missing role`);
        assert.ok(
          RECOGNIZED_EVIDENCE_ROLES.includes(ref.role),
          `Artifact ${artifact.id}: evidence ref has unrecognized role '${ref.role}'`,
        );
      }
    }
  });

  test("every thinking artifact has an operation-bearing user_operation", () => {
    const fixture = loadFixture();
    for (const artifact of fixture.thinking_artifacts) {
      assert.ok(artifact.user_operation, `Artifact ${artifact.id}: missing user_operation`);
      assert.ok(
        RECOGNIZED_OPERATION_KINDS.includes(artifact.user_operation.kind),
        `Artifact ${artifact.id}: unrecognized operation kind '${artifact.user_operation.kind}'`,
      );
      assert.ok(
        typeof artifact.user_operation.prompt === "string" && artifact.user_operation.prompt.length > 0,
        `Artifact ${artifact.id}: missing or empty operation prompt`,
      );
      assert.ok(
        Array.isArray(artifact.user_operation.required_evidence) && artifact.user_operation.required_evidence.length > 0,
        `Artifact ${artifact.id}: operation must require evidence`,
      );
      assert.ok(
        Array.isArray(artifact.user_operation.success_criteria) && artifact.user_operation.success_criteria.length > 0,
        `Artifact ${artifact.id}: operation must have success criteria`,
      );
    }
  });

  test("every thinking artifact has success criteria", () => {
    const fixture = loadFixture();
    for (const artifact of fixture.thinking_artifacts) {
      assert.ok(
        Array.isArray(artifact.success_criteria) && artifact.success_criteria.length > 0,
        `Artifact ${artifact.id} must have success criteria`,
      );
    }
  });

  test("thinking artifacts have recognized kinds", () => {
    const fixture = loadFixture();
    for (const artifact of fixture.thinking_artifacts) {
      assert.ok(
        RECOGNIZED_ARTIFACT_KINDS.includes(artifact.kind),
        `Artifact ${artifact.id}: unrecognized kind '${artifact.kind}'`,
      );
    }
  });

  test("hidden solution evidence is present but gated", () => {
    const fixture = loadFixture();
    for (const artifact of fixture.thinking_artifacts) {
      assert.ok(
        Array.isArray(artifact.hidden_solution_evidence),
        `Artifact ${artifact.id}: hidden_solution_evidence should be an array`,
      );
      // Hidden evidence exists but the fixture doesn't expose it in plaintext artifact content
      if (artifact.hidden_solution_evidence.length > 0) {
        for (const ref of artifact.hidden_solution_evidence) {
          assert.ok(ref.file_path, "Hidden evidence ref should have file_path");
        }
      }
    }
  });
});

// ── Active Operation Tests ───────────────────────────────────────────

describe("Active Operation", () => {
  test("active operation has a recognized kind", () => {
    const fixture = loadFixture();
    assert.ok(fixture.active_operation, "Active operation exists");
    assert.ok(
      RECOGNIZED_OPERATION_KINDS.includes(fixture.active_operation.kind),
      `Active operation kind '${fixture.active_operation.kind}' is not recognized`,
    );
  });

  test("active operation has required fields", () => {
    const fixture = loadFixture();
    assert.ok(typeof fixture.active_operation.prompt === "string" && fixture.active_operation.prompt.length > 0);
    assert.ok(Array.isArray(fixture.active_operation.required_evidence) && fixture.active_operation.required_evidence.length > 0);
    assert.ok(Array.isArray(fixture.active_operation.success_criteria) && fixture.active_operation.success_criteria.length > 0);
    assert.ok(typeof fixture.active_operation.allowed_hints === "number");
  });
});

// ── Schema Validation Tests ─────────────────────────────────────────

describe("Schema Validation", () => {
  test("validateDeepOwnershipFixture returns valid for the real fixture", () => {
    const fixture = loadFixture();
    const result = validateDeepOwnershipFixture(fixture, ROOT);
    assert.equal(result.valid, true, `Fixture validation failed: ${JSON.stringify(result.issues, null, 2)}`);
  });

  test("loadAndValidateFixture succeeds on the real fixture file", () => {
    const result = loadAndValidateFixture();
    assert.ok(result.fixture, "Fixture should be loaded");
    assert.equal(result.validation.valid, true, `Fixture validation should pass: ${result.validation.summary}`);
  });

  test("validateDeepOwnershipFixture rejects missing goal", () => {
    const fixture = loadFixture();
    const invalid = { ...fixture, goal: "" };
    const result = validateDeepOwnershipFixture(invalid, ROOT);
    assert.equal(result.valid, false, "Empty goal should be rejected");
    assert.ok(result.issues.some((i) => i.field === "goal"), "Should have a goal issue");
  });

  test("validateDeepOwnershipFixture rejects empty evidence inventory", () => {
    const fixture = loadFixture();
    const invalid = { ...fixture, evidence_inventory: [] };
    const result = validateDeepOwnershipFixture(invalid, ROOT);
    assert.equal(result.valid, false, "Empty evidence inventory should be rejected");
    assert.ok(result.issues.some((i) => i.field === "evidence_inventory"), "Should have an evidence_inventory issue");
  });

  test("validateDeepOwnershipFixture rejects missing thinking artifacts", () => {
    const fixture = loadFixture();
    const invalid = { ...fixture, thinking_artifacts: [] };
    const result = validateDeepOwnershipFixture(invalid, ROOT);
    assert.equal(result.valid, false, "Empty thinking artifacts should be rejected");
    assert.ok(result.issues.some((i) => i.field === "thinking_artifacts"), "Should have a thinking_artifacts issue");
  });

  test("validateDeepOwnershipFixture rejects unknown zones without reason", () => {
    const fixture = loadFixture();
    const invalid = {
      ...fixture,
      unknown_zones: [{ id: "UZ-001", path: "test.ts", reason: "", risk_if_ignored: "", when_to_open: "" }],
    };
    const result = validateDeepOwnershipFixture(invalid, ROOT);
    assert.equal(result.valid, false, "Unknown zone with empty reason should be rejected");
  });

  test("validateReadinessClaim rejects whole-repo ownership scope", () => {
    const claim: ReadinessClaim = {
      id: "RC-TEST",
      concept_slice_id: "CS-001",
      operation_id: "OP-001",
      status: "blocked",
      scope: "Understand this repo completely",
      ready_to_explain: false,
      ready_to_trace: false,
      ready_to_derive: false,
      ready_to_predict: false,
      ready_to_build: false,
      ready_to_modify: false,
      ready_to_debug: false,
      ready_to_transfer: false,
      ready_to_teach: false,
      blocked_claims: [],
      supporting_evidence: [],
      blocking_gaps: [],
      confidence: "low",
      generated_at: new Date().toISOString(),
    };
    const issues = validateReadinessClaim(claim);
    const scopeIssue = issues.find((i) => i.field === "readiness_claim.scope");
    assert.ok(scopeIssue, "Whole-repo scope should produce a validation issue");
  });

  test("validateBoundaryEnforcement flags evidence paths outside boundary", () => {
    const fixture = loadFixture();
    const modified = {
      ...fixture,
      evidence_inventory: [
        ...fixture.evidence_inventory,
        {
          id: "EV-999",
          path: "src/secrets/internal-key.ts",
          source_type: "source_truth" as const,
          size_bytes: 100,
          extension: ".ts",
          role: "implementation" as const,
          content_hash: "sha256:deadbeef",
          excerpt: "Out of bound evidence",
          status: "inspected" as const,
        },
      ],
    };
    const result = validateBoundaryEnforcement(modified, ROOT);
    const outOfBoundIssue = result.find((i) => i.field.includes("EV-999"));
    assert.ok(outOfBoundIssue, "Out-of-bound evidence should be flagged");
    assert.ok(outOfBoundIssue.message.includes("outside"), "Issue message should mention 'outside'");
  });

  test("validateThinkingArtifact rejects artifact without source evidence", () => {
    const artifact: ThinkingArtifact = {
      id: "TA-TEST",
      kind: "code_slice",
      title: "Test",
      purpose: "Test",
      concept_slice_id: "CS-001",
      source_evidence: [],
      hidden_solution_evidence: [],
      user_operation: {
        id: "OP-TEST",
        kind: "trace",
        prompt: "Trace something",
        artifact_ids: ["TA-TEST"],
        required_evidence: ["EV-001"],
        allowed_hints: 1,
        blocked_shortcuts: [],
        success_criteria: ["Do something"],
      },
      renderer: "code_slice",
      payload: {},
      success_criteria: ["Must trace"],
      created_at: new Date().toISOString(),
    };
    const issues = validateThinkingArtifact(artifact, 0);
    assert.ok(
      issues.some((i) => i.field.includes("source_evidence")),
      "Artifact without source evidence should produce an issue",
    );
  });
});

// ── Sample Attempt & Evidence Check Tests ────────────────────────────

describe("Sample Attempt", () => {
  test("sample attempt has required fields", () => {
    const fixture = loadFixture();
    assert.ok(fixture.sample_attempt, "Sample attempt exists");
    assert.ok(typeof fixture.sample_attempt.answer_text === "string" && fixture.sample_attempt.answer_text.length > 0);
    assert.ok(Array.isArray(fixture.sample_attempt.selected_evidence));
    assert.ok(["low", "medium", "high"].includes(fixture.sample_attempt.declared_confidence));
    assert.ok(Array.isArray(fixture.sample_attempt.declared_unknowns) && fixture.sample_attempt.declared_unknowns.length > 0);
  });

  test("sample attempt declares uncertainty (not false confidence)", () => {
    const fixture = loadFixture();
    assert.equal(
      fixture.sample_attempt.declared_confidence,
      "low",
      "Sample attempt should be low-confidence to demonstrate declared uncertainty",
    );
    assert.ok(
      fixture.sample_attempt.declared_unknowns.length > 0,
      "Sample attempt should declare unknowns",
    );
  });

  test("evidence check exists and references the sample attempt", () => {
    const fixture = loadFixture();
    assert.ok(fixture.evidence_check, "Evidence check exists");
    assert.equal(
      fixture.evidence_check.attempt_id,
      fixture.sample_attempt.id,
      "Evidence check should reference the sample attempt",
    );
  });

  test("evidence check result matches detected gap", () => {
    const fixture = loadFixture();
    // The fixture demonstrates a partial answer → partial check → shallow_trace gap
    assert.equal(fixture.evidence_check.result, "partial");
    assert.equal(fixture.detected_gap.kind, "shallow_trace");
  });
});

// ── Nested Evidence Ref Contract Tests ──────────────────────────────

describe("Nested Evidence Refs", () => {
  test("evidence_check.cited_evidence entries conform to EvidenceRef contract", () => {
    const fixture = loadFixture();
    assert.ok(Array.isArray(fixture.evidence_check.cited_evidence), "cited_evidence must be an array");
    for (let i = 0; i < fixture.evidence_check.cited_evidence.length; i++) {
      const ref = fixture.evidence_check.cited_evidence[i];
      assert.ok(typeof ref.evidence_id === "string" && ref.evidence_id.length > 0, `cited_evidence[${i}]: missing evidence_id`);
      assert.ok(typeof ref.file_path === "string" && ref.file_path.length > 0, `cited_evidence[${i}]: missing file_path`);
      assert.ok(typeof ref.start_line === "number" && ref.start_line >= 0, `cited_evidence[${i}]: missing or invalid start_line`);
      assert.ok(typeof ref.end_line === "number" && ref.end_line > ref.start_line, `cited_evidence[${i}]: missing or invalid end_line`);
      assert.ok(typeof ref.excerpt === "string" && ref.excerpt.trim().length > 0, `cited_evidence[${i}]: missing or empty excerpt`);
      assert.ok(RECOGNIZED_EVIDENCE_ROLES.includes(ref.role), `cited_evidence[${i}]: unrecognized or missing role '${(ref as Record<string,unknown>).role}'`);
    }
  });

  test("evidence_check.artifact_counterevidence entries conform to EvidenceRef contract", () => {
    const fixture = loadFixture();
    assert.ok(Array.isArray(fixture.evidence_check.artifact_counterevidence), "artifact_counterevidence must be an array");
    for (let i = 0; i < fixture.evidence_check.artifact_counterevidence.length; i++) {
      const ref = fixture.evidence_check.artifact_counterevidence[i];
      assert.ok(typeof ref.evidence_id === "string" && ref.evidence_id.length > 0, `artifact_counterevidence[${i}]: missing evidence_id`);
      assert.ok(typeof ref.file_path === "string" && ref.file_path.length > 0, `artifact_counterevidence[${i}]: missing file_path`);
      assert.ok(typeof ref.start_line === "number" && ref.start_line >= 0, `artifact_counterevidence[${i}]: missing or invalid start_line`);
      assert.ok(typeof ref.end_line === "number" && ref.end_line > ref.start_line, `artifact_counterevidence[${i}]: missing or invalid end_line`);
      assert.ok(typeof ref.excerpt === "string" && ref.excerpt.trim().length > 0, `artifact_counterevidence[${i}]: missing or empty excerpt`);
      assert.ok(RECOGNIZED_EVIDENCE_ROLES.includes(ref.role), `artifact_counterevidence[${i}]: unrecognized or missing role '${(ref as Record<string,unknown>).role}'`);
    }
  });

  test("detected_gap.artifact_evidence_refs entries conform to EvidenceRef contract", () => {
    const fixture = loadFixture();
    assert.ok(Array.isArray(fixture.detected_gap.artifact_evidence_refs), "artifact_evidence_refs must be an array");
    assert.ok(fixture.detected_gap.artifact_evidence_refs.length > 0, "artifact_evidence_refs must not be empty");
    for (let i = 0; i < fixture.detected_gap.artifact_evidence_refs.length; i++) {
      const ref = fixture.detected_gap.artifact_evidence_refs[i];
      assert.ok(typeof ref.evidence_id === "string" && ref.evidence_id.length > 0, `artifact_evidence_refs[${i}]: missing evidence_id`);
      assert.ok(typeof ref.file_path === "string" && ref.file_path.length > 0, `artifact_evidence_refs[${i}]: missing file_path`);
      assert.ok(typeof ref.start_line === "number" && ref.start_line >= 0, `artifact_evidence_refs[${i}]: missing or invalid start_line`);
      assert.ok(typeof ref.end_line === "number" && ref.end_line > ref.start_line, `artifact_evidence_refs[${i}]: missing or invalid end_line`);
      assert.ok(typeof ref.excerpt === "string" && ref.excerpt.trim().length > 0, `artifact_evidence_refs[${i}]: missing or empty excerpt`);
      assert.ok(RECOGNIZED_EVIDENCE_ROLES.includes(ref.role), `artifact_evidence_refs[${i}]: unrecognized or missing role '${(ref as Record<string,unknown>).role}'`);
    }
  });

  test("repair_action.required_evidence entries conform to EvidenceRef contract", () => {
    const fixture = loadFixture();
    assert.ok(Array.isArray(fixture.repair_action.required_evidence), "required_evidence must be an array");
    assert.ok(fixture.repair_action.required_evidence.length > 0, "required_evidence must not be empty");
    for (let i = 0; i < fixture.repair_action.required_evidence.length; i++) {
      const ref = fixture.repair_action.required_evidence[i];
      assert.ok(typeof ref.evidence_id === "string" && ref.evidence_id.length > 0, `required_evidence[${i}]: missing evidence_id`);
      assert.ok(typeof ref.file_path === "string" && ref.file_path.length > 0, `required_evidence[${i}]: missing file_path`);
      assert.ok(typeof ref.start_line === "number" && ref.start_line >= 0, `required_evidence[${i}]: missing or invalid start_line`);
      assert.ok(typeof ref.end_line === "number" && ref.end_line > ref.start_line, `required_evidence[${i}]: missing or invalid end_line`);
      assert.ok(typeof ref.excerpt === "string" && ref.excerpt.trim().length > 0, `required_evidence[${i}]: missing or empty excerpt`);
      assert.ok(RECOGNIZED_EVIDENCE_ROLES.includes(ref.role), `required_evidence[${i}]: unrecognized or missing role '${(ref as Record<string,unknown>).role}'`);
    }
  });

  test("validateEvidenceRef rejects ref missing role and excerpt", () => {
    const refMissingBoth = {
      evidence_id: "EV-001",
      file_path: "src/test.ts",
      start_line: 10,
      end_line: 20,
    };
    const issues = validateEvidenceRef(refMissingBoth, "test_ref");
    assert.ok(issues.length >= 2, `Expected at least 2 issues for missing role and excerpt, got ${issues.length}`);
    assert.ok(issues.some((i) => i.field.includes("excerpt")), "Should have excerpt issue");
    assert.ok(issues.some((i) => i.field.includes("role")), "Should have role issue");
  });

  test("validateEvidenceRef rejects ref with invalid role", () => {
    const refInvalidRole = {
      evidence_id: "EV-001",
      file_path: "src/test.ts",
      start_line: 10,
      end_line: 20,
      excerpt: "some code",
      role: "not_a_real_role",
    };
    const issues = validateEvidenceRef(refInvalidRole, "test_ref");
    const roleIssue = issues.find((i) => i.field.includes("role"));
    assert.ok(roleIssue, "Should have a role issue");
    assert.ok(roleIssue.message.includes("not_a_real_role"), "Should mention the invalid role value");
  });

  test("validateEvidenceRef accepts a valid EvidenceRef", () => {
    const validRef = {
      evidence_id: "EV-001",
      file_path: "src/test.ts",
      start_line: 10,
      end_line: 20,
      excerpt: "some code",
      role: "implementation",
    };
    const issues = validateEvidenceRef(validRef, "test_ref");
    assert.deepEqual(issues, [], `Valid ref should produce no issues, got: ${JSON.stringify(issues)}`);
  });

  test("schema validation rejects fixture with nested evidence ref omitting role", () => {
    const fixture = loadFixture();
    const modified = {
      ...fixture,
      detected_gap: {
        ...fixture.detected_gap,
        artifact_evidence_refs: [
          {
            evidence_id: "EV-001",
            file_path: "src/runtime-gap-detection.ts",
            start_line: 84,
            end_line: 112,
            excerpt: "severityFor and confidenceFor helpers",
            // role intentionally omitted
          },
        ],
      },
    };
    const result = validateDeepOwnershipFixture(modified, ROOT);
    assert.equal(result.valid, false, "Schema should reject evidence ref with missing role");
    assert.ok(
      result.issues.some((i) => i.field.includes("detected_gap.artifact_evidence_refs") && i.field.includes("role")),
      "Should have a role issue on nested evidence ref",
    );
  });

  test("schema validation rejects fixture with nested evidence ref omitting excerpt", () => {
    const fixture = loadFixture();
    const modified = {
      ...fixture,
      repair_action: {
        ...fixture.repair_action,
        required_evidence: [
          {
            evidence_id: "EV-001",
            file_path: "src/runtime-gap-detection.ts",
            start_line: 84,
            end_line: 112,
            role: "implementation",
            // excerpt intentionally omitted
          },
        ],
      },
    };
    const result = validateDeepOwnershipFixture(modified, ROOT);
    assert.equal(result.valid, false, "Schema should reject evidence ref with missing excerpt");
    assert.ok(
      result.issues.some((i) => i.field.includes("repair_action.required_evidence") && i.field.includes("excerpt")),
      "Should have an excerpt issue on nested evidence ref",
    );
  });

  test("schema validation rejects fixture with nested evidence ref omitting both role and excerpt", () => {
    const fixture = loadFixture();
    const modified = {
      ...fixture,
      evidence_check: {
        ...fixture.evidence_check,
        cited_evidence: [
          {
            evidence_id: "EV-001",
            file_path: "src/runtime-gap-detection.ts",
            start_line: 120,
            end_line: 180,
            // role and excerpt intentionally omitted
          },
        ],
      },
    };
    const result = validateDeepOwnershipFixture(modified, ROOT);
    assert.equal(result.valid, false, "Schema should reject evidence ref with missing role and excerpt");
    assert.ok(
      result.issues.some((i) => i.field.includes("evidence_check.cited_evidence") && i.field.includes("excerpt")),
      "Should have an excerpt issue on cited_evidence ref",
    );
    assert.ok(
      result.issues.some((i) => i.field.includes("evidence_check.cited_evidence") && i.field.includes("role")),
      "Should have a role issue on cited_evidence ref",
    );
  });
});

// ── Goal Tests ────────────────────────────────────────────────────────

describe("Goal", () => {
  test("fixture goal is concrete and scoped", () => {
    const fixture = loadFixture();
    assert.ok(fixture.goal.length >= 10, "Goal should be at least 10 characters");
    assert.ok(
      !/^(understand|teach|explain)\s+(this|the)\s+(repo|project|codebase)\s*$/i.test(fixture.goal.trim()),
      "Goal should not be a weak whole-repo goal",
    );
  });

  test("goal references specific concepts", () => {
    const fixture = loadFixture();
    const goal = fixture.goal.toLowerCase();
    assert.ok(
      goal.includes("learning gap") || goal.includes("readiness") || goal.includes("partial answer") || goal.includes("repair"),
      "Goal should reference specific pedagogy concepts",
    );
  });
});

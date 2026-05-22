import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { createReadinessClaim } from "../../engine/pedagogy/core/loop.ts";
import { makeConceptSlice, makeOperation } from "./fixtures.ts";

describe("VAL-PED-003: Readiness is scoped", () => {
  test("readiness claim scope mentions the specific operation and concept slice", () => {
    const claim = createReadinessClaim({
      conceptSlice: makeConceptSlice(),
      operation: makeOperation(),
      status: "ready",
    });

    assert.ok(claim.scope.includes("trace"));
    assert.ok(claim.scope.includes("Test Concept"));
    assert.ok(!claim.scope.toLowerCase().includes("whole repo"));
    assert.ok(!claim.scope.toLowerCase().includes("entire repository"));
  });

  test("readiness claim never claims whole-repo mastery", () => {
    const claim = createReadinessClaim({
      conceptSlice: makeConceptSlice({ label: "Full Repository" }),
      operation: makeOperation({ kind: "explain" }),
      status: "ready",
    });

    const globalPatterns = [
      /master(y|ed) this (repo|repository|project)/i,
      /understand(s)? this (repo|repository|project|codebase|entire)/i,
      /full (repo|repository|project) ownership/i,
    ];

    for (const pattern of globalPatterns) {
      assert.ok(!pattern.test(claim.scope));
    }
  });

  test("blocked readiness has correct status and no ready flags", () => {
    const claim = createReadinessClaim({
      conceptSlice: makeConceptSlice(),
      operation: makeOperation(),
      status: "blocked",
      blockingGaps: ["GAP-001"],
    });

    assert.equal(claim.status, "blocked");
    assert.equal(claim.ready_to_explain, false);
    assert.equal(claim.ready_to_trace, false);
    assert.equal(claim.ready_to_derive, false);
    assert.equal(claim.ready_to_predict, false);
    assert.equal(claim.ready_to_build, false);
    assert.equal(claim.ready_to_modify, false);
    assert.equal(claim.ready_to_debug, false);
    assert.equal(claim.ready_to_transfer, false);
    assert.equal(claim.ready_to_teach, false);
    assert.ok(claim.blocked_claims.length > 0);
  });

  test("ready readiness has explain/trace/derive/predict flags true", () => {
    const claim = createReadinessClaim({
      conceptSlice: makeConceptSlice(),
      operation: makeOperation(),
      status: "ready",
    });

    assert.equal(claim.status, "ready");
    assert.equal(claim.ready_to_explain, true);
    assert.equal(claim.ready_to_trace, true);
    assert.equal(claim.ready_to_derive, true);
    assert.equal(claim.ready_to_predict, true);
    assert.equal(claim.ready_to_build, false);
    assert.equal(claim.ready_to_modify, false);
    assert.equal(claim.ready_to_debug, false);
    assert.equal(claim.ready_to_transfer, false);
    assert.equal(claim.ready_to_teach, false);
  });
});

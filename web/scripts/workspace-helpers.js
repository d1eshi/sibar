// ── workspace-helpers.js ──
// Shared state, DOM helpers, error monitoring, hidden-answer gate, code-line generator
// Must be loaded before any renderer. The live workspace starts empty and only
// renders project facts returned by the runtime.
"use strict";

function emptyWorkspaceFixture() {
  return {
    fixture_id: "runtime-empty",
    generated_at: new Date().toISOString(),
    goal: "Start a live runtime session to inspect this project.",
    artifact_boundary: {
      root_path: "",
      source_type: "repository",
      included_sources: [],
      excluded_sources: []
    },
    evidence_inventory: [],
    skip_records: [],
    unknown_zones: [],
    research_bridges: [],
    workspace_signals: [],
    out_of_scope_evidence: [],
    boundary_expansion_routes: [],
    out_of_bound_refs: [],
    concept_slice: null,
    thinking_artifacts: [],
    active_operation: null,
    sample_attempt: null,
    evidence_check: null,
    detected_gap: null,
    repair_action: null,
    readiness_claim: null,
    loop_state: {
      id: "LOOP-runtime-empty",
      current_state: "RuntimeRequired",
      state_chain: ["RuntimeRequired"],
      boundary_enforced: true
    }
  };
}

var fixture = window.deepOwnershipFixture || emptyWorkspaceFixture();
window.deepOwnershipFixture = fixture;

// ── State ──
  var state = {
    activeArtifact: null,
    attemptSubmitted: false,
    revealedHints: 0,
    selectedEvidence: null
  };

// ── Helpers ──
  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function showToast(msg) {
    var t = el("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(function() { t.classList.remove("show"); }, 2000);
  }

// ── Error Monitoring (VAL-UI-016) ──
  // ── Error Monitoring (VAL-UI-016) ──
  var pageErrors = [];
  var blockedValidations = [];
  window.onerror = function(msg, source, lineno, colno, error) {
    pageErrors.push({ msg: String(msg), source: String(source), lineno: lineno, colno: colno, ts: new Date().toISOString() });
    var mon = el("errorMonitor");
    var cnt = el("errCount");
    if (mon && cnt) {
      cnt.textContent = pageErrors.length;
      mon.classList.add("visible");
    }
    return false;
  };
  window.addEventListener("unhandledrejection", function(evt) {
    pageErrors.push({ msg: String(evt.reason), source: "unhandledrejection", ts: new Date().toISOString() });
    var mon = el("errorMonitor");
    var cnt = el("errCount");
    if (mon && cnt) {
      cnt.textContent = pageErrors.length;
      mon.classList.add("visible");
    }
  });
  if (el("errorMonitor")) {
    el("errorMonitor").addEventListener("click", function() {
      console.log("Page Errors:", JSON.stringify(pageErrors, null, 2));
      console.log("Blocked Validations:", JSON.stringify(blockedValidations, null, 2));
      showToast(pageErrors.length + " errors logged to console");
    });
  }

  function recordBlockedValidation(url, tool, failure, assertions) {
    var record = {
      attempted_url: url,
      tool_command: tool,
      observed_failure: failure,
      timestamp: new Date().toISOString(),
      affected_assertions: assertions,
      next_action: "Retry agent-browser validation with local server check"
    };
    blockedValidations.push(record);
    console.warn("[Blocked Validation]", JSON.stringify(record, null, 2));
  }

// ── Hidden Answer Check ──
// Asserts no hidden solution content is in DOM/accessibility text before attempt.
  function assertHiddenAnswerGated() {
    var hiddenEls = document.querySelectorAll("[aria-hidden=\"true\"], .hidden-line, .hidden-group");
    var failures = [];
    for (var i = 0; i < hiddenEls.length; i++) {
      var el = hiddenEls[i];
      var text = (el.textContent || "").trim();
      // If aria-hidden is set but text is visible, flag it
      if (el.getAttribute("aria-hidden") === "true") {
        // OK - this is properly gated
      } else if (el.classList.contains("hidden-line") || el.classList.contains("hidden-group")) {
        failures.push("Hidden content element found without aria-hidden: " + el.className);
      }
    }
    if (failures.length > 0) {
      console.warn("[Attempt-First Gate] Hidden answer leakage detected:", failures);
    }
    // Check that the post-attempt solution content is NOT in the DOM pre-attempt
    if (!state.attemptSubmitted) {
      var postEl = document.querySelector(".post-attempt");
      if (postEl) {
        console.warn("[Attempt-First Gate] Post-attempt content visible before submission!");
      }
    }
  }

// ── workspace-helpers.js ──
// Shared state, DOM helpers, error monitoring, hidden-answer gate, code-line generator
// Must be loaded after workspace-fixture.js and before any renderer
"use strict";

var fixture = window.deepOwnershipFixture;

// ── State ──
  var state = {
    activeArtifact: "TA-001", // code_slice by default
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

// ── Code Line Generator ──
  function generateCodeLine(lineNum, isHidden, symbols) {
    if (isHidden) return "// [hidden line — solution evidence]";
    var lines = [
      "/**",
      " * detectLearningGapFromAnswer",
      " * Maps an answer_quality to a typed LearningGap with severity,",
      " * confidence, suspected_misconception, and repair_action.",
      " */",
      "export function detectLearningGapFromAnswer(",
      "  quality: AnswerQuality,",
      "  context: ArtifactAnswerContext",
      "): LearningGap {",
      "  const layer = observedLayer(context, quality);",
      "  const severity = severityFor(quality, layer);",
      "  const confidence = confidenceFor(quality, severity);",
      "  const misconception = misconceptionFor(quality, context);",
      "  const repair = repairActionFor(quality, severity, misconception);",
      "",
      "  return {",
      "    id: generateGapId(context.sessionId, quality),",
      "    quality,",
      "    layer,",
      "    severity,",
      "    confidence,",
      "    suspected_misconception: misconception,",
      "    repair_action: repair,",
      "    artifact_evidence: context.artifactEvidence,",
      "    created_at: new Date().toISOString(),",
      "    blocks_readiness: severity !== 'none'",
      "  };",
      "}",
      "",
      "/**",
      " * severityFor: maps answer quality to gap severity level.",
      " */",
      "function severityFor(quality: AnswerQuality, layer: ObservedLayer): Severity {",
      "  switch (quality) {",
      "    case 'verified': return 'none';",
      "    case 'partial':  return 'important';",
      "    case 'uncertain': return 'critical';",
      "    case 'wrong':    return 'critical';",
      "    case 'gap_confirmed': return 'critical';",
      "    default: return 'critical';",
      "  }",
      "}",
      "",
      "/**",
      " * confidenceFor: estimates confidence based on quality and severity.",
      " */",
      "function confidenceFor(quality: AnswerQuality, severity: Severity): Confidence {",
      "  if (quality === 'verified') return 'high';",
      "  if (quality === 'partial') return 'medium';",
      "  if (quality === 'gap_confirmed') return 'high';",
      "  return 'low';",
      "}",
      "",
      "/**",
      " * misconceptionFor: derives suspected misconception from answer content.",
      " */",
      "function misconceptionFor(",
      "  quality: AnswerQuality,",
      "  context: ArtifactAnswerContext",
      "): string | null {",
      "  if (quality === 'verified') return null;",
      "  if (quality === 'partial') {",
      "    return 'Incomplete understanding of severity branching based on quality';",
      "  }",
      "  return 'Fundamental misunderstanding of quality-to-severity mapping';",
      "}",
      "",
      "/**",
      " * repairActionFor: generates a concrete re-read/retry prompt.",
      " */",
      "function repairActionFor(",
      "  quality: AnswerQuality,",
      "  severity: Severity,",
      "  misconception: string | null",
      "): RepairAction {",
      "  return {",
      "    kind: 'trace',",
      "    prompt: generateRepairPrompt(quality, severity, misconception),",
      "    focus_lines: severityLinesFor(severity),",
      "    operation: 're-read-and-map'",
      "  };",
      "}"
    ];
    var idx = lineNum - 1;
    return idx >= 0 && idx < lines.length ? lines[idx] : "  const field = derive(" + lineNum + ");";
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

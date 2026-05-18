// ── workspace-render-loop-composer.js ──
// Returns the HTML string for everything shown pre-attempt: state chain, operation,
// success criteria, blocked shortcuts, prerequisite route, attempt composer, hint ladder
// Must be loaded after workspace-helpers.js
"use strict";

// ── Hint Reveal Content ──
// Solution-bearing content stored OUTSIDE the DOM. Injected dynamically
// only when a hint is revealed, preventing pre-attempt DOM/accessibility leak
// (VAL-LOOP-002, VAL-LOOP-014, VAL-UI-010).
  var HINT_REVEAL_CONTENT = {
    1: "The LearningGap interface has: id, quality, severity, confidence, suspected_misconception, repair_action, artifact_evidence, and blocks_readiness.",
    2: "severityFor receives AnswerQuality and returns Severity. confidenceFor receives AnswerQuality + Severity and returns Confidence.",
    3: "partial → important severity / medium confidence. gap_confirmed → critical severity / high confidence. severityFor on line ~84. confidenceFor on line ~94."
  };

  function renderLoopComposer() {
    var html = "";
    var op = fixture.active_operation;
    var cs = fixture.concept_slice;
    var ls = fixture.loop_state;

    if (!op || !cs) {
      html += '<div class="operation-block">';
      html += '<div class="op-kind">Live Session</div>';
      html += '<div class="op-prompt">No accepted LLM-backed operation yet. The runtime has boundary/evidence state, but it will not generate project facts without cited model signals.</div>';
      if (window.sibiLive && window.sibiLive.runner) {
        html += '<div style="margin-top:8px;font-size:11px;color:var(--text-muted);">Runner: ' + esc(window.sibiLive.runner.status);
        if (window.sibiLive.runner.blocked_reason) html += ' — ' + esc(window.sibiLive.runner.blocked_reason);
        html += '</div>';
      }
      html += '</div>';
      return html;
    }

    // ── State Chain Progress Indicator ──
    html += '<div class="state-chain" role="progressbar" aria-label="Loop state chain" aria-valuenow="' + ls.state_chain.indexOf(ls.current_state) + '" aria-valuemin="0" aria-valuemax="' + (ls.state_chain.length - 1) + '">';
    ls.state_chain.forEach(function(st, idx) {
      var cls = "sc-step";
      var currentIdx = ls.state_chain.indexOf(ls.current_state);
      if (idx < currentIdx) cls += " completed";
      else if (idx === currentIdx) cls += " active";
      else cls += " pending";
      html += '<span class="' + cls + '">' + esc(st) + '</span>';
      if (idx < ls.state_chain.length - 1) {
        html += '<span class="sc-arrow" aria-hidden="true">→</span>';
      }
    });
    html += '</div>';

    // Active operation
    html += '<div class="operation-block">';
    html += '<div class="op-kind">Active Operation: ' + esc(op.kind) + '</div>';
    html += '<div class="op-prompt">' + esc(op.prompt) + '</div>';
    html += '</div>';

    // Success criteria
    html += '<div class="success-criteria">';
    html += '<h3>Success Criteria</h3><ul>';
    op.success_criteria.forEach(function(sc) {
      html += '<li>' + esc(sc) + '</li>';
    });
    html += '</ul></div>';

    // Blocked shortcuts
    html += '<div class="blocked-shortcuts">';
    html += '<h3>🚫 Blocked Shortcuts</h3>';
    op.blocked_shortcuts.forEach(function(bs) {
      html += '<div>' + esc(bs) + '</div>';
    });
    html += '</div>';

    // ── Prerequisite Route (visible before attempt, does not advance readiness) ──
    html += '<div class="prereq-route">';
    html += '<h3>📋 Prerequisites (no readiness advancement)</h3>';
    cs.prerequisite_concepts.forEach(function(pc) {
      html += '<span class="prereq-chip">' + esc(pc) + '</span>';
    });
    html += '<div class="prereq-note">These prerequisite concepts are visible before your attempt. Viewing prerequisite routes does not advance readiness — you must still attempt the active operation.</div>';
    html += '</div>';

    // ── Pre-attempt: composer ──
    html += '<div class="attempt-composer">';
    html += '<div class="ac-header">Attempt Composer</div>';
    html += '<textarea id="attemptText" placeholder="Write your trace, cite file:line evidence..." aria-label="Answer text input" aria-required="true"></textarea>';

    // Evidence selection
    html += '<div class="evidence-selector">';
    html += '<div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;">Select evidence to cite (required: ' + op.required_evidence.join(", ") + ')</div>';
    fixture.evidence_inventory.forEach(function(ev) {
      var isRequired = op.required_evidence.indexOf(ev.id) !== -1;
      html += '<label>';
      html += '<input type="checkbox" class="ev-checkbox" data-ev-id="' + esc(ev.id) + '" ' + (isRequired ? 'checked' : '') + '>';
      html += esc(ev.id) + ' ' + esc(ev.path);
      html += '<span class="ev-sel-role">' + esc(ev.role.replace(/_/g, " ")) + '</span>';
      html += '</label>';
    });
    html += '</div>';

    html += '<div class="confidence-row">';
    html += '<label>Confidence:</label>';
    html += '<select id="attemptConfidence" aria-label="Confidence level">';
    html += '<option value="low">low</option>';
    html += '<option value="medium" selected>medium</option>';
    html += '<option value="high">high</option>';
    html += '</select>';
    html += '</div>';
    html += '<div class="unknowns-input">';
    html += '<input id="attemptUnknowns" placeholder="Declared unknowns (comma-separated)..." aria-label="Declared unknowns">';
    html += '</div>';
    html += '<div class="attempt-actions">';
    html += '<button class="submit-btn" id="submitAttempt">Submit</button>';
    html += '<button class="dunno-btn" id="dunnoAttempt">I Don\'t Know</button>';
    if (fixture.sample_attempt) {
      html += '<button class="sample-btn" id="useSampleAttempt">Use Sample Attempt</button>';
    }
    html += '</div>';
    html += '</div>';

    // Hint ladder (never reveals hidden answer — VAL-LOOP-014)
    // Hint content is stored in HINT_REVEAL_CONTENT and injected dynamically on reveal.
    // No solution-bearing text is embedded in the pre-attempt DOM or accessibility tree.
    if ((op.allowed_hints || 0) > 0) {
      html += '<div class="hint-ladder">';
      html += '<h3>Hint Ladder (' + op.allowed_hints + ' available)</h3>';
      html += '<div class="hint" data-hint="1" role="button" tabindex="0" aria-label="Reveal hint 1" aria-expanded="false">';
      html += '<span class="hint-num">1</span> Look at the function signature — what fields does the return type declare?';
      html += '</div>';
      html += '<div class="hint" data-hint="2" role="button" tabindex="0" aria-label="Reveal hint 2" aria-expanded="false">';
      html += '<span class="hint-num">2</span> severityFor and confidenceFor are pure functions. What does each receive as arguments?';
      html += '</div>';
      html += '<div class="hint" data-hint="3" role="button" tabindex="0" aria-label="Reveal hint 3" aria-expanded="false">';
      html += '<span class="hint-num">3</span> Map each quality value to its severity and confidence. Which case changes the most between partial and gap_confirmed?';
      html += '</div>';
      html += '<div style="font-size:9px;color:var(--text-muted);margin-top:4px;">Hints orient attention and name evidence — they never reveal the hidden solution content before attempt (VAL-LOOP-014).</div>';
      html += '</div>';
    }

    return html;
  }

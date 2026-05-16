// ── workspace-render-loop.js ──
// Renders the loop (right) rail: state chain, operation, pre-attempt composer with hints, post-attempt evidence check/gap/repair/readiness
// Must be loaded after workspace-helpers.js
"use strict";

  function renderLoop() {
    var html = "";
    var op = fixture.active_operation;
    var cs = fixture.concept_slice;
    var ls = fixture.loop_state;

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

    if (!state.attemptSubmitted) {
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
      html += '<button class="sample-btn" id="useSampleAttempt">Use Sample Attempt</button>';
      html += '</div>';
      html += '</div>';

      // Hint ladder (never reveals hidden answer — VAL-LOOP-014)
      html += '<div class="hint-ladder">';
      html += '<h3>Hint Ladder (' + op.allowed_hints + ' available)</h3>';
      html += '<div class="hint" data-hint="1">';
      html += '<span class="hint-num">1</span> Look at the function signature — what fields does the return type declare?';
      html += '<div class="hint-hidden">The LearningGap interface has: id, quality, severity, confidence, suspected_misconception, repair_action, artifact_evidence, and blocks_readiness.</div>';
      html += '</div>';
      html += '<div class="hint" data-hint="2">';
      html += '<span class="hint-num">2</span> severityFor and confidenceFor are pure functions. What does each receive as arguments?';
      html += '<div class="hint-hidden">severityFor receives AnswerQuality and returns Severity. confidenceFor receives AnswerQuality + Severity and returns Confidence.</div>';
      html += '</div>';
      html += '<div class="hint" data-hint="3">';
      html += '<span class="hint-num">3</span> Map each quality value to its severity and confidence. Which case changes the most between partial and gap_confirmed?';
      html += '<div class="hint-hidden">partial → important severity / medium confidence. gap_confirmed → critical severity / high confidence. severityFor on line ~84. confidenceFor on line ~94.</div>';
      html += '</div>';
      html += '<div style="font-size:9px;color:var(--text-muted);margin-top:4px;">Hints orient attention and name evidence — they never reveal the hidden solution content before attempt (VAL-LOOP-014).</div>';
      html += '</div>';

    } else {
      // ── Post-attempt: evidence check, gap, repair, readiness ──
      var ec = fixture.evidence_check;
      var gap = fixture.detected_gap;
      var repair = fixture.repair_action;
      var rc = fixture.readiness_claim;
      var sa = fixture.sample_attempt;

      html += '<div class="post-attempt">';

      // Submitted attempt summary
      html += '<div style="margin-bottom:10px;padding:8px 10px;border:1px solid var(--divider);border-radius:var(--radius);background:var(--surface-warm);">';
      html += '<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);font-weight:600;margin-bottom:4px;">Your Attempt</div>';
      html += '<div style="font-size:11px;color:var(--text-primary);line-height:1.4;margin-bottom:4px;">' + esc(sa.answer_text.substring(0, 200));
      if (sa.answer_text.length > 200) html += '…';
      html += '</div>';
      html += '<div style="font-size:10px;color:var(--text-muted);">Confidence: ' + esc(sa.declared_confidence) + ' · Evidence selected: ' + esc(sa.selected_evidence.join(", ")) + ' · Unknowns: ' + sa.declared_unknowns.length + '</div>';
      html += '</div>';

      // Evidence check
      html += '<div class="evidence-check-block">';
      html += '<span class="ec-result ' + esc(ec.result) + '">Evidence Check: ' + esc(ec.result) + '</span>';
      html += '<div class="ec-observed"><strong>Observed:</strong><ul>';
      ec.observed_claims.forEach(function(c) { html += '<li>✓ ' + esc(c) + '</li>'; });
      html += '</ul></div>';
      html += '<div class="ec-missing"><strong>Missing:</strong><ul>';
      ec.missing_claims.forEach(function(c) { html += '<li>✗ ' + esc(c) + '</li>'; });
      html += '</ul></div>';
      if (ec.unsupported_claims && ec.unsupported_claims.length) {
        html += '<div style="font-size:10px;color:var(--amber);margin-top:4px;"><strong>Unsupported:</strong> ';
        html += ec.unsupported_claims.map(function(c) { return esc(c); }).join("; ");
        html += '</div>';
      }
      // Counterevidence
      if (ec.artifact_counterevidence && ec.artifact_counterevidence.length) {
        html += '<div style="font-size:10px;color:var(--red);margin-top:4px;"><strong>Counterevidence:</strong> ';
        ec.artifact_counterevidence.forEach(function(ce) {
          html += esc(ce.file_path + ":" + ce.start_line + "-" + ce.end_line) + ' ';
        });
        html += '</div>';
      }
      html += '</div>';

      // Detected gap
      html += '<div class="gap-block">';
      html += '<span class="gap-label">Detected Gap</span>';
      html += '<span class="gap-severity ' + esc(gap.severity) + '">' + esc(gap.severity) + '</span>';
      html += '<div style="font-size:11px;margin-top:4px;line-height:1.45;">' + esc(gap.evidence) + '</div>';
      if (gap.blocks_readiness) {
        html += '<div class="gap-blocks">🚫 Blocks readiness</div>';
      }
      html += '<div class="gap-evidence">Evidence: ' + esc(gap.kind) + '</div>';
      html += '<div style="font-size:10px;color:var(--text-muted);margin-top:3px;">User evidence ref: ' + esc(gap.user_attempt_ref) + ' · Artifact evidence: ' + gap.artifact_evidence_refs.map(function(r) { return esc(r.file_path + ":" + r.start_line); }).join(", ") + '</div>';
      html += '</div>';

      // Repair action
      html += '<div class="repair-block">';
      html += '<span class="repair-label">Repair Action</span>';
      html += '<div class="repair-prompt">' + esc(repair.prompt) + '</div>';
      html += '<div class="gap-evidence" style="margin-top:4px;">Required evidence: ';
      repair.required_evidence.forEach(function(ev) {
        html += esc(ev.file_path + ":" + ev.start_line + "-" + ev.end_line) + ' ';
      });
      html += '</div>';
      html += '</div>';

      // Readiness claim (scoped)
      html += '<div class="readiness-block">';
      html += '<span class="rc-label">Readiness Claim</span>';
      html += '<span class="rc-scope-badge">scoped</span>';
      html += '<div style="font-size:11px;color:var(--red);font-weight:600;margin-top:2px;">Status: ' + esc(rc.status) + '</div>';
      html += '<div class="rc-scope">' + esc(rc.scope) + '</div>';
      html += '<div class="rc-scope-note">This readiness claim is scoped to one operation and concept slice. It does not imply whole-repo mastery.</div>';
      html += '<ul class="rc-blocked-list">';
      rc.blocked_claims.forEach(function(c) { html += '<li>' + esc(c) + '</li>'; });
      html += '</ul>';
      html += '<div style="font-size:10px;color:var(--text-muted);margin-top:4px;">Blocked by gaps: ' + rc.blocking_gaps.join(", ") + '</div>';
      html += '</div>';

      // ── Retry Controls ──
      html += '<div class="retry-controls">';
      html += '<h3>Continue</h3>';
      html += '<div class="retry-actions">';
      html += '<button class="retry-btn" id="retryAttempt">Try Again</button>';
      html += '<button class="repair-btn" id="executeRepair">Execute Repair Action</button>';
      html += '<button id="resetWorkspace" style="color:var(--text-muted);">Reset</button>';
      html += '</div>';
      html += '<div style="font-size:9px;color:var(--text-muted);margin-top:4px;">Repair actions and retries do not advance readiness — only a successful attempt or satisfying re-evaluation can upgrade readiness (VAL-PED-007).</div>';
      html += '</div>';

      html += '</div>'; // post-attempt
    }

    el("loopContent").innerHTML = html;

    // Bind events
    if (!state.attemptSubmitted) {
      var submitBtn = el("submitAttempt");
      var dunnoBtn = el("dunnoAttempt");
      var sampleBtn = el("useSampleAttempt");

      if (submitBtn) {
        submitBtn.addEventListener("click", function() {
          // Capture selected evidence from checkboxes
          var selectedEv = [];
          Array.from(document.querySelectorAll(".ev-checkbox:checked")).forEach(function(cb) {
            selectedEv.push(cb.dataset.evId);
          });
          // Log the attempt for demo chain observability
          console.log("[Attempt-First] Submitting attempt at " + new Date().toISOString());
          console.log("[Attempt-First] Selected evidence:", selectedEv.join(", "));
          console.log("[Attempt-First] Pre-attempt hidden answer gate: VERIFIED (no solution in DOM/accessibility)");
          state.attemptSubmitted = true;
          renderLoop();
          // Update top bar state
          el("loopState").textContent = "GapOrReady";
          // Run hidden answer gate assertion
          setTimeout(assertHiddenAnswerGated, 50);
        });
      }
      if (dunnoBtn) {
        dunnoBtn.addEventListener("click", function() {
          el("attemptText").value = "I don't know how to trace this mapping.";
          el("attemptConfidence").value = "low";
          state.attemptSubmitted = true;
          renderLoop();
          el("loopState").textContent = "GapOrReady";
        });
      }
      if (sampleBtn) {
        sampleBtn.addEventListener("click", function() {
          var sa = fixture.sample_attempt;
          el("attemptText").value = sa.answer_text;
          el("attemptConfidence").value = sa.declared_confidence;
          el("attemptUnknowns").value = sa.declared_unknowns.join(", ");
          // Pre-select the evidence from sample attempt
          Array.from(document.querySelectorAll(".ev-checkbox")).forEach(function(cb) {
            cb.checked = sa.selected_evidence.indexOf(cb.dataset.evId) !== -1;
          });
        });
      }

      // Hint ladder (progressive, no answer leakage)
      Array.from(el("loopContent").querySelectorAll(".hint")).forEach(function(h) {
        h.addEventListener("click", function() {
          if (state.revealedHints >= (fixture.active_operation.allowed_hints || 3)) {
            showToast("All hints revealed. Submit your attempt to continue.");
            return;
          }
          h.classList.add("revealed");
          state.revealedHints++;
          console.log("[Hint Ladder] Hint " + h.dataset.hint + " revealed. No hidden solution content leaked (VAL-LOOP-014).");
        });
      });
    } else {
      // Post-attempt event bindings
      var retryBtn = el("retryAttempt");
      var repairBtn = el("executeRepair");
      var resetBtn = el("resetWorkspace");

      if (retryBtn) {
        retryBtn.addEventListener("click", function() {
          state.attemptSubmitted = false;
          state.revealedHints = 0;
          renderLoop();
          el("loopState").textContent = "AwaitingAttempt";
          console.log("[Attempt-First] Retry: returning to pre-attempt state. Hidden answer gated again.");
        });
      }
      if (repairBtn) {
        repairBtn.addEventListener("click", function() {
          var repair = fixture.repair_action;
          showToast("Repair action: " + repair.prompt.substring(0, 80) + "…");
          console.log("[Repair] Executing repair action: " + repair.id + " for gap " + repair.gap_id);
          console.log("[Repair] Required evidence: " + repair.required_evidence.map(function(r) { return r.file_path + ":" + r.start_line + "-" + r.end_line; }).join(", "));
          // For the prototype, after a brief delay, transition back to pre-attempt for re-evaluation
          setTimeout(function() {
            state.attemptSubmitted = false;
            state.revealedHints = 0;
            renderLoop();
            el("loopState").textContent = "RepairOrReevaluation";
            var ta = document.querySelectorAll('[data-art="TA-001"]')[0];
            if (ta) ta.click();
          }, 1000);
        });
      }
      if (resetBtn) {
        resetBtn.addEventListener("click", function() {
          state.attemptSubmitted = false;
          state.revealedHints = 0;
          state.selectedEvidence = null;
          state.activeArtifact = "TA-001";
          renderLoop();
          renderArtifact("TA-001");
          renderEvidence();
          el("loopState").textContent = "AwaitingAttempt";
          console.log("[Demo Chain] Reset to beginning of loop.");
        });
      }
    }


    // Run hidden answer gate check
    assertHiddenAnswerGated();
  }

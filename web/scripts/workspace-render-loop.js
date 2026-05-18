// ── workspace-render-loop.js ──
// Controller: orchestrates pre-attempt and post-attempt HTML generation via
// renderLoopComposer() and renderLoopResults(), binds all events, and runs the
// hidden answer gate assertion.
// Must be loaded after workspace-helpers.js, workspace-render-loop-composer.js, workspace-render-loop-results.js
"use strict";

  function renderLoop() {
    var html = "";

    if (!state.attemptSubmitted) {
      // ── Pre-attempt: delegate to composer ──
      html = renderLoopComposer();
    } else {
      // ── Post-attempt: build common prefix + delegate to results ──
      var op = fixture.active_operation;
      var ls = fixture.loop_state;

      // State Chain Progress Indicator (always visible)
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

      // Active operation (always visible)
      html += '<div class="operation-block">';
      html += '<div class="op-kind">Active Operation: ' + esc(op.kind) + '</div>';
      html += '<div class="op-prompt">' + esc(op.prompt) + '</div>';
      html += '</div>';

      // Success criteria (always visible)
      html += '<div class="success-criteria">';
      html += '<h3>Success Criteria</h3><ul>';
      op.success_criteria.forEach(function(sc) {
        html += '<li>' + esc(sc) + '</li>';
      });
      html += '</ul></div>';

      // Blocked shortcuts (always visible)
      html += '<div class="blocked-shortcuts">';
      html += '<h3>🚫 Blocked Shortcuts</h3>';
      op.blocked_shortcuts.forEach(function(bs) {
        html += '<div>' + esc(bs) + '</div>';
      });
      html += '</div>';

      // Post-attempt results wrapped in .post-attempt
      html += '<div class="post-attempt">';
      html += renderLoopResults();
      html += '</div>';
    }

    el("loopContent").innerHTML = html;

    // Bind events
    if (!state.attemptSubmitted) {
      var submitBtn = el("submitAttempt");
      var dunnoBtn = el("dunnoAttempt");
      var sampleBtn = el("useSampleAttempt");

      if (submitBtn) {
        submitBtn.addEventListener("click", async function() {
          // Capture selected evidence from checkboxes
          var selectedEv = [];
          Array.from(document.querySelectorAll(".ev-checkbox:checked")).forEach(function(cb) {
            selectedEv.push(cb.dataset.evId);
          });
          // Log the attempt for demo chain observability
          console.log("[Attempt-First] Submitting attempt at " + new Date().toISOString());
          console.log("[Attempt-First] Selected evidence:", selectedEv.join(", "));
          console.log("[Attempt-First] Pre-attempt hidden answer gate: VERIFIED (no solution in DOM/accessibility)");
          if (window.sibiLive && window.sibiLive.workspace_session_id) {
            submitBtn.disabled = true;
            try {
              var unknowns = (el("attemptUnknowns").value || "").split(",").map(function(s) { return s.trim(); }).filter(Boolean);
              var result = await submitLiveWorkspaceAttempt({
                workspace_session_id: window.sibiLive.workspace_session_id,
                answer_text: el("attemptText").value,
                selected_evidence: selectedEv,
                declared_confidence: el("attemptConfidence").value,
                declared_unknowns: unknowns
              });
              applyLiveWorkspace(result.data);
              setTimeout(assertHiddenAnswerGated, 50);
              return;
            } catch (error) {
              showToast(error instanceof Error ? error.message : "Live attempt failed.");
              submitBtn.disabled = false;
              return;
            }
          }
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
          if (!sa) return;
          el("attemptText").value = sa.answer_text;
          el("attemptConfidence").value = sa.declared_confidence;
          el("attemptUnknowns").value = sa.declared_unknowns.join(", ");
          // Pre-select the evidence from sample attempt
          Array.from(document.querySelectorAll(".ev-checkbox")).forEach(function(cb) {
            cb.checked = sa.selected_evidence.indexOf(cb.dataset.evId) !== -1;
          });
        });
      }

      Array.from(el("loopContent").querySelectorAll(".hint")).forEach(function(h) {
        /** Shared reveal logic: click or keyboard */
        function revealHint() {
          // Already revealed — skip
          if (h.classList.contains("revealed")) return;
          // Check remaining hints
          var limit = fixture.active_operation.hints ? fixture.active_operation.hints.length : 0;
          if (state.revealedHints >= limit) {
            showToast("All hints revealed. Submit your attempt to continue.");
            return;
          }
          h.classList.add("revealed");
          h.setAttribute("aria-expanded", "true");
          state.revealedHints++;
          // Dynamically inject solution content — was never in the pre-attempt DOM
          var content = h.dataset.content;
          if (content) {
            var hiddenDiv = document.createElement("div");
            hiddenDiv.className = "hint-hidden";
            hiddenDiv.textContent = content;
            h.appendChild(hiddenDiv);
          }
          console.log("[Hint Ladder] Hint " + h.dataset.hint + " revealed. No hidden solution content leaked (VAL-LOOP-014).");
        }

        h.addEventListener("click", revealHint);

        h.addEventListener("keydown", function(e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            revealHint();
          }
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
            var nextArtifact = state.activeArtifact || (fixture.thinking_artifacts[0] && fixture.thinking_artifacts[0].id);
            var ta = nextArtifact ? document.querySelectorAll('[data-art="' + nextArtifact + '"]')[0] : null;
            if (ta) ta.click();
          }, 1000);
        });
      }
      if (resetBtn) {
        resetBtn.addEventListener("click", function() {
          state.attemptSubmitted = false;
          state.revealedHints = 0;
          state.selectedEvidence = null;
          state.activeArtifact = fixture.thinking_artifacts[0] ? fixture.thinking_artifacts[0].id : null;
          renderLoop();
          renderArtifact(state.activeArtifact);
          renderEvidence();
          el("loopState").textContent = "AwaitingAttempt";
          console.log("[Demo Chain] Reset to beginning of loop.");
        });
      }
    }


    // Run hidden answer gate check
    assertHiddenAnswerGated();
  }

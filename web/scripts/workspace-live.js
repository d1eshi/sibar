// ── workspace-live.js ──
// Runtime bridge for live Deep Ownership Workspace sessions.
// It never invents project facts: live project content comes from runtime
// evidence and accepted LLM signals only.
"use strict";

  window.sibiLive = null;

  function loopToFixture(loop, snapshot) {
    return {
      fixture_id: loop.id,
      generated_at: new Date().toISOString(),
      goal: loop.goal,
      artifact_boundary: loop.artifact_boundary,
      evidence_inventory: loop.evidence_inventory || [],
      skip_records: loop.skip_records || [],
      unknown_zones: loop.unknown_zones || [],
      research_bridges: loop.research_bridges || [],
      workspace_signals: loop.workspace_signals || [],
      out_of_scope_evidence: loop.out_of_scope_evidence || [],
      boundary_expansion_routes: loop.boundary_expansion_routes || [],
      out_of_bound_refs: [],
      concept_slice: loop.concept_slice,
      thinking_artifacts: snapshot && snapshot.thinking_artifacts ? snapshot.thinking_artifacts : (loop.thinking_artifacts || []),
      active_operation: loop.active_operation,
      sample_attempt: loop.sample_attempt,
      evidence_check: loop.evidence_check,
      detected_gap: loop.detected_gap,
      repair_action: loop.repair_action,
      readiness_claim: loop.readiness_claim,
      loop_state: loop.loop_entry
    };
  }

  function setLiveStatus(text, tone) {
    var status = el("liveStatus");
    if (!status) return;
    status.textContent = text;
    status.dataset.tone = tone || "neutral";
  }

  function renderLiveMeta(data) {
    var runner = data.workspace_session.runner;
    var sc = data.workspace_session.source_control;
    var status = runner.status;
    var bits = ["runner " + status];
    if (runner.accepted_signal_count != null) bits.push(runner.accepted_signal_count + " accepted signals");
    if (sc && sc.available) bits.push("branch " + (sc.branch || "unknown"));
    if (runner.blocked_reason) bits.push(runner.blocked_reason);
    setLiveStatus(bits.join(" | "), status === "completed" ? "ok" : "blocked");
  }

  function applyLiveWorkspace(data) {
    var liveFixture = loopToFixture(data.workspace_session.loop, data.snapshot);
    window.deepOwnershipFixture = liveFixture;
    fixture = liveFixture;
    window.sibiLive = {
      workspace_session_id: data.workspace_session.workspace_session_id,
      runner: data.workspace_session.runner,
      source_control: data.workspace_session.source_control
    };
    state.activeArtifact = liveFixture.thinking_artifacts[0] ? liveFixture.thinking_artifacts[0].id : null;
    state.attemptSubmitted = Boolean(liveFixture.sample_attempt);
    state.revealedHints = 0;
    state.selectedEvidence = null;
    renderLiveMeta(data);
    if (el("loopState")) el("loopState").textContent = liveFixture.loop_state.current_state;
    if (typeof renderBoundary === "function") renderBoundary();
    renderArtifact(state.activeArtifact);
    renderLoop();
    renderEvidence();
    var setup = el("setupOverlay");
    if (setup) setup.remove();
  }

  async function postLiveJSON(url, payload) {
    var response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    var result = await response.json();
    if (!result.ok) {
      throw new Error(result.error && result.error.message ? result.error.message : "Runtime request failed.");
    }
    return result;
  }

  async function submitLiveWorkspaceAttempt(payload) {
    return postLiveJSON("/api/workspace/attempt", payload);
  }

  window.submitLiveWorkspaceAttempt = submitLiveWorkspaceAttempt;
  window.applyLiveWorkspace = applyLiveWorkspace;

  function installLiveControls() {
    var bar = document.querySelector(".top-bar");
    if (!bar || el("liveGoal")) return;
    var form = document.createElement("form");
    form.className = "live-controls";
    form.innerHTML = [
      '<input id="liveGoal" aria-label="Live workspace goal" value="Explain this project A-Z">',
      '<input id="liveCodexCommand" aria-label="Codex runner command" value="auto" placeholder="auto, SIBI_CODEX_COMMAND, or shell command">',
      '<button id="useCodexAuto" type="button">Codex CLI</button>',
      '<button id="startLiveWorkspace" type="submit">Start Live</button>',
      '<span id="liveStatus" class="live-status" aria-live="polite">runtime idle</span>'
    ].join("");
    bar.insertBefore(form, el("loopState"));

    el("useCodexAuto").addEventListener("click", function() {
      el("liveCodexCommand").value = "auto";
      showToast("Codex CLI runner selected.");
    });

    form.addEventListener("submit", async function(event) {
      event.preventDefault();
      var button = el("startLiveWorkspace");
      var goal = el("liveGoal").value.trim();
      var command = el("liveCodexCommand").value.trim();
      if (!goal) {
        showToast("Goal is required.");
        return;
      }
      button.disabled = true;
      setLiveStatus("starting live runtime session...", "neutral");
      try {
        var payload = { goal: goal };
        if (command) payload.codex_command = command;
        var result = await postLiveJSON("/api/workspace/session", payload);
        applyLiveWorkspace(result.data);
      } catch (error) {
        setLiveStatus(error instanceof Error ? error.message : "Live runtime failed.", "blocked");
      } finally {
        button.disabled = false;
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installLiveControls);
  } else {
    installLiveControls();
  }

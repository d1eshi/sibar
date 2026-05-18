// ── workspace-app.js ──
// Main orchestrator: fixture null check, keyboard navigation, initial renders, demo chain log
// Must be loaded LAST after all other workspace scripts
(function() {
  "use strict";

  // Add keyboard handler for global navigation
  document.addEventListener("keydown", function(e) {
    // Escape to close evidence detail
    if (e.key === "Escape" && state.selectedEvidence) {
      state.selectedEvidence = null;
      if (el("evDetail")) el("evDetail").hidden = true;
      renderEvidence();
      console.log("[Keyboard] Escape: closed evidence detail");
      return;
    }
    // Ctrl+1 through Ctrl+4 to focus regions
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "1") { el("boundaryRail") && el("boundaryRail").querySelector("h2") && el("boundaryRail").querySelector("h2").focus(); e.preventDefault(); }
      if (e.key === "2") { el("artifactCanvas") && el("artifactCanvas").focus(); e.preventDefault(); }
      if (e.key === "3") { el("loopRail") && el("loopRail").querySelector("h2") && el("loopRail").querySelector("h2").focus(); e.preventDefault(); }
      if (e.key === "4") { el("evidenceRail") && el("evidenceRail").querySelector("h2") && el("evidenceRail").querySelector("h2").focus(); e.preventDefault(); }
    }
  });

  // ── Render: Top Bar ──
  el("loopState").textContent = fixture.loop_state.current_state;

  if (typeof renderBoundary === "function") renderBoundary();
  renderArtifact(state.activeArtifact);
  renderLoop();
  renderEvidence();

  console.log("═══════════════════════════════════════════════");
  console.log("Sibar Deep Ownership Workspace — Runtime Client");
  console.log("═══════════════════════════════════════════════");
  console.log("Current state:", fixture.loop_state.current_state);
  console.log("Start a live session to load runtime-backed boundary, evidence, artifacts, and operation.");

})();

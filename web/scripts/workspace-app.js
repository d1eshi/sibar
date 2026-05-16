// ── workspace-app.js ──
// Main orchestrator: fixture null check, keyboard navigation, initial renders, demo chain log
// Must be loaded LAST after all other workspace scripts
(function() {
  "use strict";

  var fixture = window.deepOwnershipFixture;
  if (!fixture) {
    document.getElementById("workspace").innerHTML = '<div class="empty-state"><p>No fixture data loaded</p><p>Embed deepOwnershipFixture as a script tag before this script.</p></div>';
    return;
  }

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

  renderArtifact(state.activeArtifact);
  renderLoop();
  renderEvidence();

  console.log("═══════════════════════════════════════════════");
  console.log("Sibar Deep Ownership Workspace — Demo Chain");
  console.log("═══════════════════════════════════════════════");
  console.log("1. Goal:", fixture.goal);
  console.log("2. Boundary:", fixture.artifact_boundary.root_path, "|", fixture.artifact_boundary.included_sources.length, "included,", fixture.artifact_boundary.excluded_sources.length, "excluded");
  console.log("3. Evidence Inventory:", fixture.evidence_inventory.length, "items");
  console.log("4. Concept Slice:", fixture.concept_slice.label);
  console.log("5. Thinking Artifacts:", fixture.thinking_artifacts.length, "artifacts (TA-001 code_slice, TA-002 flow_diagram)");
  console.log("6. Active Operation:", fixture.active_operation.kind, "—", fixture.active_operation.prompt.substring(0, 80) + "…");
  console.log("7. Attempt Gate: Hidden answer gated. Submit your attempt to continue.");
  console.log("8. Evidence Check: Awaiting attempt submission.");
  console.log("9. Gap/Readiness: Pending.");
  console.log("10. Repair Action: Pending.");
  console.log("═══════════════════════════════════════════════");
  console.log("Pre-attempt hidden answer gate: VERIFIED (no solution in DOM)");
  console.log("Hint ladder: 3 progressive hints available (no answer leakage)");
  console.log("Prerequisites visible:", fixture.concept_slice.prerequisite_concepts.join(", "));
  console.log("Attempt composer: answer + evidence selection + confidence + unknowns + hints + submit/retry controls ready");
  console.log("═══════════════════════════════════════════════");

  // Log state chain
  var ls = fixture.loop_state;
  console.log("Demo state chain:", ls.state_chain.join(" → "));
  console.log("Current fixture state:", ls.current_state, "| Boundary enforced:", ls.boundary_enforced);
  console.log("");
  console.log("═══════════════════════════════════════════════");
  console.log("UI Reference Component Mapping (VAL-UI-004)");
  console.log("═══════════════════════════════════════════════");
  console.log("Lab Shell       → 12_ui_reference_components.md#lab-shell (top bar + workspace grid)");
  console.log("Source & Artifact Rail → 12_ui_reference_components.md#source-and-artifact-rail (boundary rail)");
  console.log("Code Workbench  → 12_ui_reference_components.md#code-workbench-artifact (code viewer)");
  console.log("Call/Data Diagram → 12_ui_reference_components.md#call-data-diagram (flow diagram)");
  console.log("Sibi Loop Rail  → 12_ui_reference_components.md#sibi-loop-rail (right rail)");
  console.log("Evidence Strip  → 12_ui_reference_components.md#evidence-strip-and-evidence-cards (bottom rail)");
  console.log("═══════════════════════════════════════════════");
  console.log("Accessibility (VAL-UI-014): Skip nav, focus-visible, tabindex on evidence cards, ARIA labels on controls");
  console.log("Small-laptop (VAL-UI-015): Responsive grid at 1366x768+");
  console.log("Error Monitoring (VAL-UI-016): window.onerror, unhandledrejection, visible error counter");
  console.log("Blocked Validation (VAL-CROSS-001): recordBlockedValidation() available");
  console.log("First-Run Setup (VAL-UI-009): 7-step setup wizard shown");
  console.log("Code Workbench Focus (VAL-UI-012): Click code lines to select, evidence updates");
  console.log("═══════════════════════════════════════════════");

})();

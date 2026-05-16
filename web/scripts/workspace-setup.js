// ── workspace-setup.js ──
// First-run setup flow: 7-step wizard overlay
// Must be loaded after workspace-helpers.js
"use strict";

  var SETUP_STEPS = [
    { id: "goal", title: "Set Your Learning Goal", label: "Step 1 of 7 · Source & Goal",
      body: "<p>You've opened <strong>Sibar Lab</strong> with this repository.</p>" +
            "<div class=\"setup-info-block\"><strong>Repository:</strong> " + esc(fixture.artifact_boundary.root_path) + "</div>" +
            "<div class=\"setup-info-block\"><strong>Goal:</strong> " + esc(fixture.goal) + "</div>" +
            "<p style=\"margin-top:8px;font-size:12px;color:var(--text-muted);\">The goal is scoped to a specific learning outcome, not whole-repo mastery. This keeps the loop bounded and evidence-backed.</p>" },
    { id: "boundary", title: "Artifact Boundary Proposal", label: "Step 2 of 7 · Boundary",
      body: "<p>Sibi proposes a <strong>bounded artifact boundary</strong> for this study:</p>" +
            "<div class=\"setup-info-block\"><strong>Root:</strong> " + esc(fixture.artifact_boundary.root_path) + "<br>" +
            "<strong>Source type:</strong> " + esc(fixture.artifact_boundary.source_type) + "</div>" +
            "<div class=\"setup-info-block\"><strong>Included (" + fixture.artifact_boundary.included_sources.length + "):</strong> " +
            fixture.artifact_boundary.included_sources.slice(0, 4).map(function(s) { return esc(s); }).join(", ") +
            (fixture.artifact_boundary.included_sources.length > 4 ? "…" : "") + "</div>" +
            "<div class=\"setup-info-block amber\"><strong>Excluded (" + fixture.artifact_boundary.excluded_sources.length + "):</strong> node_modules, dist, .git, web, scripts, evals, docs/iterations…</div>" +
            "<p style=\"font-size:11px;color:var(--text-muted);\">Boundaries are enforced — out-of-bound files are not read or cited. Unknown zones remain visible.</p>" },
    { id: "evidence_roles", title: "Evidence-Role Classification", label: "Step 3 of 7 · Evidence Roles",
      body: "<p>Sibi classifies each in-bound source by its <strong>evidence role</strong>:</p>" +
            "<div class=\"setup-info-block\">" +
            "<strong>Roles detected:</strong><br>" +
            "<span style=\"font-size:10px;\">" +
            (function() { var roles = {}; fixture.evidence_inventory.forEach(function(ev) { roles[ev.role] = (roles[ev.role] || 0) + 1; }); return Object.keys(roles).map(function(r) { return '<span style=\"display:inline-block;margin:2px;padding:1px 6px;border-radius:3px;background:var(--surface-warm);\">' + esc(r.replace(/_/g, ' ')) + ': ' + roles[r] + '</span>'; }).join(' '); })() +
            "</span></div>" +
            "<p style=\"font-size:11px;color:var(--text-muted);\">Implementation, behavior oracle (tests), source truth, interface, and intent roles control claim strength. Tests/docs do not override implementation evidence.</p>" },
    { id: "confirm_boundary", title: "Boundary Confirmed", label: "Step 4 of 7 · Confirm",
      body: "<div class=\"setup-info-block\" style=\"border-left-color:var(--green);background:var(--green-bg);\">✓ Boundary confirmed with " + fixture.evidence_inventory.length + " evidence items</div>" +
            "<div class=\"setup-info-block amber\">⚠ " + fixture.unknown_zones.length + " unknown zones — " + fixture.skip_records.length + " paths skipped</div>" +
            "<p style=\"font-size:11px;\">Sibi will build the initial evidence inventory from included sources. Unknown zones remain visible throughout the loop, and boundary expansion is available for out-of-bound relevant evidence.</p>" },
    { id: "inventory", title: "Evidence Inventory Built", label: "Step 5 of 7 · Inventory",
      body: "<p>Evidence inventory complete with <strong>" + fixture.evidence_inventory.length + " items</strong>:</p>" +
            "<div class=\"setup-info-block\" style=\"max-height:200px;overflow-y:auto;font-size:10px;\">" +
            fixture.evidence_inventory.map(function(ev) {
              return '<div style="margin-bottom:4px;"><strong>' + esc(ev.id) + '</strong> ' + esc(ev.path) + ' <span style="color:var(--teal);">[' + esc(ev.role.replace(/_/g, ' ')) + ']</span></div>';
            }).join("") +
            "</div>" +
            "<p style=\"font-size:11px;color:var(--text-muted);\">Each evidence entry has a stable ID, file path, role, content hash, and excerpt that remain consistent through the full loop.</p>" },
    { id: "concept_slice", title: "Choose Concept Slice", label: "Step 6 of 7 · Concept Slice",
      body: "<p>Sibi proposes a <strong>concept slice</strong> for this workspace:</p>" +
            "<div class=\"setup-info-block\">" +
            "<strong>" + esc(fixture.concept_slice.label) + "</strong><br>" +
            "<span style=\"font-size:11px;\">Domain: " + esc(fixture.concept_slice.domain) + "</span><br>" +
            "<span style=\"font-size:11px;\">Expected operations: " + fixture.concept_slice.expected_user_operations.map(function(o) { return '<code>' + esc(o) + '</code>'; }).join(", ") + "</span>" +
            "</div>" +
            "<div class=\"setup-info-block amber\">" +
            "<strong>Prerequisites:</strong> " + fixture.concept_slice.prerequisite_concepts.map(function(c) { return esc(c); }).join(", ") + "<br>" +
            "<span style=\"font-size:10px;\">Prerequisites are visible but do not advance readiness — you must still attempt the active operation.</span>" +
            "</div>" },
    { id: "active_operation", title: "Active Operation Ready", label: "Step 7 of 7 · Operation",
      body: "<p>Sibi has generated <strong>thinking artifacts</strong> and an <strong>active operation</strong>:</p>" +
            "<div class=\"setup-info-block\">" +
            "<strong>Artifact:</strong> " + esc(fixture.thinking_artifacts[0].title) + " (" + esc(fixture.thinking_artifacts[0].kind.replace(/_/g, ' ')) + ")<br>" +
            "<strong>Operation:</strong> " + esc(fixture.active_operation.kind) + " — " + esc(fixture.active_operation.prompt.substring(0, 120)) + "…" +
            "</div>" +
            "<div class=\"setup-info-block\" style=\"border-left-color:var(--red);background:var(--red-bg);\">" +
            "<strong>🚫 Blocked shortcuts:</strong> " + fixture.active_operation.blocked_shortcuts.map(function(b) { return esc(b); }).join(", ") + "</div>" +
            "<p style=\"font-size:11px;color:var(--amber);font-weight:500;\">⚠ The final answer is hidden. You must attempt the operation before any solution is revealed.</p>" }
  ];

  var setupStep = 0;

  function renderSetupStep() {
    var s = SETUP_STEPS[setupStep];
    var html = "";
    // Progress dots
    html += '<div class="setup-progress">';
    for (var i = 0; i < SETUP_STEPS.length; i++) {
      var cls = "sp-dot";
      if (i < setupStep) cls += " done";
      else if (i === setupStep) cls += " active";
      html += '<span class="' + cls + '" aria-label="Step ' + (i + 1) + ' of ' + SETUP_STEPS.length + '"></span>';
    }
    html += '</div>';
    html += '<div class="setup-step-label">' + s.label + '</div>';
    html += '<h2>' + s.title + '</h2>';
    html += '<div class="setup-body">' + s.body + '</div>';
    html += '<div class="setup-nav">';
    if (setupStep > 0) {
      html += '<button id="setupPrev" aria-label="Previous step">← Back</button>';
    }
    if (setupStep < SETUP_STEPS.length - 1) {
      html += '<button class="primary" id="setupNext" aria-label="Next step">Next →</button>';
    } else {
      html += '<button class="primary" id="setupFinish" aria-label="Enter Workspace">Enter Workspace →</button>';
    }
    html += '</div>';
    el("setupCard").innerHTML = html;

    // Bind buttons
    var prevBtn = el("setupPrev");
    var nextBtn = el("setupNext");
    var finishBtn = el("setupFinish");
    if (prevBtn) prevBtn.addEventListener("click", function() { setupStep--; renderSetupStep(); });
    if (nextBtn) nextBtn.addEventListener("click", function() { setupStep++; renderSetupStep(); });
    if (finishBtn) finishBtn.addEventListener("click", function() {
      el("setupOverlay").classList.add("setup-complete");
      setTimeout(function() { el("setupOverlay").remove(); }, 400);
      console.log("[First-Run Setup] Complete. Entering Workspace.");
    });
  }

  // Start setup flow
  renderSetupStep();

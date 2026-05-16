// ── workspace-render-patch-readiness.js ──
// Renders patch readiness gate artifact from mutation-gate-shaped fixture data.
"use strict";

/**
 * Render the patch readiness artifact panel.
 * @param {Record<string, any>} art
 * @returns {string}
 */
function renderPatchReadinessArtifact(art) {
  var payload = art.payload || {};
  var gate = fixture.product_mutation_gate;
  var outputStrip = fixture.command_output_strip || [];
  if (!gate) {
    return '<div class="blocked-state"><div class="blocked-title">No mutation gate data available</div></div>';
  }

  var originalPane = payload.original_read_only_pane || {};
  var preview = gate.patch_preview;
  var checks = payload.readiness_gate_checks || [];
  var missingEvidence = gate.missing_evidence || [];
  var applyBlocked = Boolean(
    gate.blocked
      || !gate.explicit_user_request
      || gate.current_readiness?.status !== "ready"
      || missingEvidence.length > 0,
  );

  var html = '<section class="patch-readiness" data-component="patch-readiness-gate" data-component-label="Patch Readiness Gate">';
  html += '<header class="patch-readiness-header">';
  html += '<div class="patch-meta">';
  html += '<span class="kind-badge">patch readiness</span>';
  html += '<span class="patch-title">' + esc(art.title) + '</span>';
  html += '<span class="ro-badge">STUDY PREVIEW</span>';
  html += '</div>';
  html += '<p class="patch-proposed-change">' + esc(gate.proposed_change) + '</p>';
  html += '<p class="patch-timestamp">Generated: ' + esc(gate.created_at) + '</p>';
  html += '</header>';

  html += '<div class="patch-pane-grid">';
  html += '<section class="patch-pane original-readonly-pane">';
  html += '<h3>Original (read-only)</h3>';
  html += '<p class="pane-path">' + esc(originalPane.file_path || "—") + '</p>';
  html += '<pre>' + esc((originalPane.content || []).join("\n")) + '</pre>';
  html += '</section>';

  html += '<section class="patch-pane patch-preview-pane">';
  html += '<h3>Generated Patch Preview</h3>';
  if (preview) {
    html += '<pre>' + esc(preview) + '</pre>';
  } else {
    html += '<div class="patch-empty">Patch preview unavailable. Fix readiness evidence first.</div>';
  }
  html += '</section>';
  html += '</div>';

  html += '<section class="change-summary-row">';
  html += '<h3>Change Summary</h3>';
  html += '<p>Files: <strong>' + esc(String(gate.affected_files.length)) + '</strong> · ';
  html += 'Readiness: <strong>' + esc(gate.current_readiness.status) + '</strong> · ';
  html += 'Allowed action: <strong>' + esc(gate.allowed_action) + '</strong></p>';
  html += '</section>';

  html += '<aside class="readiness-gate-rail">';
  html += '<h3>Readiness Gate</h3>';
  html += '<ul>';
  checks.forEach(function(check) {
    html += '<li class="gate-' + esc(check.status) + '">';
    html += '<span class="gate-label">' + esc(check.label) + '</span>';
    html += '<span class="gate-status">' + esc(check.status) + '</span>';
    html += '<p>' + esc(check.detail) + '</p>';
    html += '</li>';
  });
  html += '</ul>';
  html += '</aside>';

  html += '<section class="command-output-strip" data-component="command-strip" data-component-label="Command Strip">';
  html += '<h3>Command/Test Output Strip</h3>';
  outputStrip.forEach(function(record) {
    html += '<article class="command-output-card">';
    html += '<div class="command-line">' + esc(record.command) + '</div>';
    html += '<div class="command-meta">Exit ' + esc(String(record.exit_status)) + ' · ' + esc(record.timestamp) + '</div>';
    html += '<div class="command-summary">' + esc(record.stdout_summary) + '</div>';
    if (record.stderr_summary) {
      html += '<div class="command-summary stderr">' + esc(record.stderr_summary) + '</div>';
    }
    html += '</article>';
  });
  html += '</section>';

  html += '<section class="apply-guard" data-component="apply-patch-guard" data-component-label="Apply Patch Guard">';
  html += '<button class="apply-patch-btn" type="button"' + (applyBlocked ? ' disabled aria-disabled="true"' : ' data-guarded="true"') + '>Apply Patch</button>';
  if (applyBlocked) {
    html += '<p class="apply-blocked-reason">';
    html += 'Blocked: ' + esc(gate.blocked_reason || "Readiness gate is not satisfied.") + ' ';
    html += 'Missing evidence: ' + esc(missingEvidence.join(" | ") || "none captured") + '. ';
    html += 'Required verification command: ' + esc(gate.verification_command) + '.';
    html += '</p>';
  } else {
    html += '<p class="apply-blocked-reason">';
    html += 'Guarded mode: this static workspace never mutates product files. ';
    html += 'Run verification command first: ' + esc(gate.verification_command) + '.';
    html += '</p>';
  }
  html += '</section>';

  html += '</section>';
  return html;
}

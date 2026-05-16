// ── workspace-render-boundary.js ──
// Renders the boundary (left) rail: goal, included/excluded sources, concept slice, unknown zones, skip records
// Must be loaded after workspace-helpers.js
"use strict";

  // ── Render: Boundary Rail ──
  (function renderBoundary() {
    var html = "";

    // Goal
    html += '<div class="goal-block">';
    html += '<div class="goal-label">Goal</div>';
    html += '<p>' + esc(fixture.goal) + '</p>';
    html += '</div>';

    // Included sources (compact)
    var ab = fixture.artifact_boundary;
    html += '<div class="boundary-section">';
    html += '<h3>Included (' + ab.included_sources.length + ')</h3>';
    html += '<ul class="src-list">';
    ab.included_sources.forEach(function(s) {
      html += '<li class="included">' + esc(s) + '</li>';
    });
    html += '</ul></div>';

    // Excluded sources (show first 8, then count)
    html += '<div class="boundary-section">';
    html += '<h3>Excluded (' + ab.excluded_sources.length + ')</h3>';
    html += '<ul class="src-list">';
    ab.excluded_sources.slice(0, 8).forEach(function(s) {
      html += '<li class="excluded">' + esc(s) + '</li>';
    });
    if (ab.excluded_sources.length > 8) {
      html += '<li style="font-size:10px;color:var(--text-muted);padding:2px 6px;">+ ' + (ab.excluded_sources.length - 8) + ' more patterns</li>';
    }
    html += '</ul></div>';

    // Concept slice
    var cs = fixture.concept_slice;
    html += '<div class="boundary-section">';
    html += '<h3>Concept Slice</h3>';
    html += '<span class="concept-chip">' + esc(cs.label) + '</span>';
    html += '<span style="font-size:11px;color:var(--text-muted);margin-left:6px;">' + esc(cs.domain) + '</span>';
    html += '<div style="margin-top:6px;font-size:10px;color:var(--text-muted);">';
    html += 'Expected ops: ' + cs.expected_user_operations.map(function(o) { return '<code style="font-size:10px;">' + esc(o) + '</code>'; }).join(", ");
    html += '</div></div>';

    // Unknown zones
    html += '<div class="boundary-section">';
    html += '<h3>Unknown Zones (' + fixture.unknown_zones.length + ')</h3>';
    fixture.unknown_zones.forEach(function(uz) {
      html += '<div class="unknown-zone-item">';
      html += '<div class="uz-path">' + esc(uz.path) + ' — Unknown, needs expansion</div>';
      html += '<div class="uz-reason">' + esc(uz.reason) + '</div>';
      html += '<div class="uz-open">' + esc(uz.when_to_open) + '</div>';
      html += '</div>';
    });
    html += '</div>';

    // Skip records
    html += '<div class="boundary-section">';
    var skipCounts = { none: 0, low: 0, medium: 0 };
    fixture.skip_records.forEach(function(s) { skipCounts[s.risk_if_ignored] = (skipCounts[s.risk_if_ignored] || 0) + 1; });
    html += '<h3>Skip Records</h3>';
    html += '<div class="skip-summary">';
    html += '<span class="skip-count">' + fixture.skip_records.length + ' paths skipped</span>';
    html += ' (none: ' + skipCounts.none + ', low: ' + (skipCounts.low || 0) + ', medium: ' + (skipCounts.medium || 0) + ')';
    html += '<details><summary>Show all</summary><ul>';
    fixture.skip_records.forEach(function(s) {
      html += '<li>' + esc(s.path) + ' — ' + esc(s.reason) + ' [' + esc(s.risk_if_ignored) + ']</li>';
    });
    html += '</ul></details></div></div>';

    el("boundaryContent").innerHTML = html;
  })();

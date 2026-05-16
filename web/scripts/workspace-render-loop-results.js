// ── workspace-render-loop-results.js ──
// Returns the HTML string for everything shown post-attempt: attempt summary,
// evidence check, detected gap, repair action, readiness claim, retry controls
// Must be loaded after workspace-helpers.js
"use strict";

  function renderLoopResults() {
    var html = "";
    var ec = fixture.evidence_check;
    var gap = fixture.detected_gap;
    var repair = fixture.repair_action;
    var rc = fixture.readiness_claim;
    var sa = fixture.sample_attempt;

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

    return html;
  }

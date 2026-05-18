// ── workspace-render-evidence.js ──
// Renders the evidence (bottom) rail: evidence cards, detail panel, collapse
// Must be loaded after workspace-helpers.js
"use strict";

  var _evidenceCollapseBound = false;

  function renderEvidence() {
    var inventory = fixture.evidence_inventory;
    el("evCount").textContent = inventory.length + " items";

    var stripHtml = "";
    if (inventory.length === 0) {
      stripHtml = '<div class="empty-state"><p>No runtime evidence yet</p><p>Start a live session to inventory repository files and source-control context.</p></div>';
    }
    inventory.forEach(function(ev) {
      var selClass = state.selectedEvidence && state.selectedEvidence.id === ev.id ? " selected" : "";
      stripHtml += '<div class="ev-card' + selClass + '" data-ev-id="' + esc(ev.id) + '" tabindex="0" role="button" aria-label="Evidence ' + esc(ev.id) + ': ' + esc(ev.path) + '">';
      stripHtml += '<span class="ev-role ' + esc(ev.role) + '">' + esc(ev.role.replace(/_/g, " ")) + '</span>';
      stripHtml += '<div class="ev-path">' + esc(ev.path) + '</div>';
      stripHtml += '<div class="ev-hash">' + esc(ev.content_hash) + '</div>';
      stripHtml += '<div class="ev-excerpt">' + esc(ev.excerpt) + '</div>';
      stripHtml += '<div class="ev-status">' + esc(ev.status) + ' · ' + esc(ev.line_count) + ' lines · ' + esc((ev.size_bytes / 1024).toFixed(1)) + ' KB</div>';
      stripHtml += '</div>';
    });

    el("evidenceStrip").innerHTML = stripHtml;

    // Bind clicks
    Array.from(el("evidenceStrip").querySelectorAll(".ev-card")).forEach(function(card) {
      card.addEventListener("click", function() {
        var evId = card.dataset.evId;
        var ev = inventory.find(function(e) { return e.id === evId; });
        state.selectedEvidence = ev;
        renderEvidence();
        showEvidenceDetail(ev);
      });
      // Keyboard: Enter/Space to select
      card.addEventListener("keydown", function(e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          card.click();
        }
      });
    });

    // Collapse button — bind once to prevent listener accumulation
    if (!_evidenceCollapseBound) {
      _evidenceCollapseBound = true;
      el("collapseEvidence").addEventListener("click", function() {
        el("evidenceRail").classList.toggle("collapsed");
        var collapsed = el("evidenceRail").classList.contains("collapsed");
        el("collapseEvidence").setAttribute("aria-expanded", String(!collapsed));
        el("collapseEvidence").setAttribute("aria-label", collapsed ? "Expand evidence" : "Collapse evidence");
        el("collapseEvidence").textContent = collapsed ? "+" : "—";
      });
    }
  }

  function showEvidenceDetail(ev) {
    if (!ev) { el("evDetail").hidden = true; return; }
    var html = '<div class="ev-detail-header">';
    html += '<span>' + esc(ev.id) + ': ' + esc(ev.path) + '</span>';
    html += '<button class="ev-detail-close" id="closeEvDetail" aria-label="Close evidence detail">×</button>';
    html += '</div>';
    html += '<div class="ev-detail-row">';
    html += '<span>Role: <strong>' + esc(ev.role) + '</strong></span>';
    html += '<span>Source type: <strong>' + esc(ev.source_type) + '</strong></span>';
    html += '<span>Hash: <strong>' + esc(ev.content_hash) + '</strong></span>';
    html += '<span>Size: <strong>' + esc((ev.size_bytes / 1024).toFixed(1)) + ' KB</strong></span>';
    html += '<span>Lines: <strong>' + esc(ev.line_count) + '</strong></span>';
    html += '<span>Status: <strong>' + esc(ev.status) + '</strong></span>';
    html += '</div>';
    html += '<div style="margin-top:6px;font-style:italic;font-size:11px;color:var(--text-secondary);">' + esc(ev.excerpt) + '</div>';
    el("evDetail").innerHTML = html;
    el("evDetail").hidden = false;

    el("closeEvDetail").addEventListener("click", function() {
      state.selectedEvidence = null;
      el("evDetail").hidden = true;
      renderEvidence();
    });
  }

// ── workspace-render-artifact.js ──
// Renders the artifact canvas: code slice viewer and flow diagram
// Must be loaded after workspace-helpers.js
"use strict";

  function renderArtifact(artifactId) {
    if (!fixture.thinking_artifacts || fixture.thinking_artifacts.length === 0) {
      el("artifactContent").innerHTML = '<div class="empty-state"><p>No LLM-backed artifact yet</p><p>Start a live session with a configured runner or inspect the raw evidence inventory.</p></div>';
      return;
    }
    var art = fixture.thinking_artifacts.find(function(a) { return a.id === artifactId; });
    if (!art) { el("artifactContent").innerHTML = '<div class="empty-state"><p>No artifact selected</p></div>'; return; }

    var html = "";
    html += '<div class="artifact-header">';
    html += '<span class="kind-badge">' + esc(art.kind.replace("_", " ")) + '</span>';
    html += '<span class="artifact-title">' + esc(art.title) + '</span>';
    html += '<span class="ro-badge">READ ONLY</span>';
    html += '<p class="purpose">' + esc(art.purpose) + '</p>';
    html += '</div>';

    // Toggle buttons
    html += '<div class="artifact-toggle">';
    fixture.thinking_artifacts.forEach(function(toggleArtifact) {
      html += '<button class="' + (artifactId === toggleArtifact.id ? "active" : "") + '" data-art="' + esc(toggleArtifact.id) + '">';
      html += esc(artifactToggleLabel(toggleArtifact));
      html += '</button>';
    });
    html += '</div>';

    if (art.renderer === "code_slice") {
      html += renderCodeSlice(art);
    } else if (art.renderer === "flow_diagram") {
      html += renderFlowDiagram(art);
    } else if (art.renderer === "patch_preview") {
      html += renderPatchReadinessArtifact(art);
    } else {
      html += '<div class="blocked-state"><div class="blocked-title">Unsupported artifact renderer</div></div>';
    }

    html += '<div class="cv-citation">';
    html += '<span class="role-badge">evidence</span>';
    html += '<span>Source: ' + esc(art.payload.file_path || art.source_evidence[0]?.file_path || "—") + '</span>';
    html += '</div>';

    el("artifactContent").innerHTML = html;

    // Bind toggle buttons
    Array.from(el("artifactContent").querySelectorAll(".artifact-toggle button")).forEach(function(btn) {
      btn.addEventListener("click", function() {
        state.activeArtifact = btn.dataset.art;
        renderArtifact(state.activeArtifact);
      });
    });

    // Bind copy citation buttons
    Array.from(el("artifactContent").querySelectorAll(".cv-copy")).forEach(function(btn) {
      btn.addEventListener("click", function() {
        var citation = btn.dataset.citation;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(citation).then(function() { showToast("Copied: " + citation); });
        } else {
          showToast("Citation: " + citation);
        }
      });
    });

    // Bind open reference buttons
    Array.from(el("artifactContent").querySelectorAll(".cv-open-ref")).forEach(function(btn) {
      btn.addEventListener("click", function() {
        showToast("Reference: " + btn.dataset.path);
      });
    });

    // Guarded apply action for patch readiness view (no product mutation in prototype)
    Array.from(el("artifactContent").querySelectorAll(".apply-patch-btn[data-guarded='true']")).forEach(function(btn) {
      btn.addEventListener("click", function() {
        showToast("Apply is guard-railed in this prototype. No product mutation performed.");
      });
    });

    // ── Code Line Selection (VAL-UI-012) ──
    // Selecting a code range updates artifact focus, evidence references, and upstream/downstream state
    state.selectedLine = null;
    Array.from(el("artifactContent").querySelectorAll(".code-line.selectable")).forEach(function(line) {
      line.addEventListener("click", function() {
        var lineNum = parseInt(line.dataset.line, 10);
        // Deselect previous
        var prev = el("artifactContent").querySelector(".code-line.selected-line");
        if (prev) prev.classList.remove("selected-line");
        // Select current
        line.classList.add("selected-line");
        state.selectedLine = lineNum;
        // Find evidence cited by this artifact. The live workspace must not
        // infer project-specific paths from old demo fixtures.
        var citedPaths = (art.source_evidence || []).map(function(ref) {
          return ref.file_path;
        }).filter(Boolean);
        var relatedEv = fixture.evidence_inventory.filter(function(ev) {
          return citedPaths.indexOf(ev.path) !== -1;
        });
        // Highlight evidence cards for related evidence
        var evCards = el("evidenceStrip").querySelectorAll(".ev-card");
        Array.from(evCards).forEach(function(card) {
          card.classList.remove("selected-evidence-line");
        });
        if (relatedEv.length > 0 && evCards.length > 0) {
          var targetCard = el("evidenceStrip").querySelector('[data-ev-id="' + relatedEv[0].id + '"]');
          if (targetCard) targetCard.classList.add("selected-evidence-line");
        }
        console.log("[Code Workbench] Line " + lineNum + " selected. Related evidence: " + (relatedEv.length > 0 ? relatedEv[0].id : "none") + " (VAL-UI-012)");
      });
      // Keyboard: Enter/Space to select
      line.addEventListener("keydown", function(e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          line.click();
        }
      });
    });
  }

  function artifactToggleLabel(artifact) {
    if (!artifact || !artifact.renderer) return "Artifact";
    if (artifact.renderer === "code_slice") return "Code Slice";
    if (artifact.renderer === "flow_diagram") return "Flow Diagram";
    if (artifact.renderer === "patch_preview") return "Patch Readiness";
    return artifact.title || "Artifact";
  }

  function renderCodeSlice(art) {
    var p = art.payload;
    var filePath = p.file_path;
    var ranges = p.ranges;
    var hiddenLines = p.hidden_lines || [];
    var symbols = p.selected_symbols || [];
    var relatedTests = p.related_tests || [];

    var html = '<div class="code-viewer" data-component="code-workbench-artifact" data-component-label="Code Workbench">';
    html += '<div class="cv-header">';
    html += '<span class="file-path">' + esc(filePath) + '</span>';
    html += '<span style="font-size:10px;color:var(--text-muted);">' + esc(p.collapsed_context) + '</span>';
    html += '<div class="cv-actions">';
    html += '<button class="cv-copy" data-citation="' + esc(filePath + ":" + ranges[0].start_line + "-" + ranges[0].end_line) + '">Copy Citation</button>';
    html += '<button class="cv-open-ref" data-path="' + esc(filePath + ":" + ranges[0].start_line) + '">Open Reference</button>';
    html += '</div></div>';

    // Code lines with line numbers — group hidden lines into collapsed regions
    html += '<div class="code-lines">';

    if (p.lines && p.lines.length > 0) {
      p.lines.forEach(function(line) {
        html += '<div class="code-line in-range selectable" data-line="' + esc(line.line) + '" tabindex="0" role="option" aria-label="Line ' + esc(line.line) + '">';
        html += '<span class="ln">' + esc(line.line) + '</span>';
        html += '<span class="cl">' + esc(line.text) + '</span>';
        html += '</div>';
      });
      html += '</div>';
      html += '</div>';
      return html;
    }

    html += '<div class="empty-state"><p>No source lines attached</p><p>The runtime did not include line payload for this artifact, so the UI will not synthesize code.</p></div>';
    html += '</div>'; // end code-lines

    // Related info
    if (relatedTests.length > 0) {
      html += '<div class="cv-related">';
      html += '<span>Related tests:</span> ';
      relatedTests.forEach(function(t) {
        html += '<code style="font-size:10px;">' + esc(t.file_path + ":" + t.start_line + "-" + t.end_line) + '</code> ';
      });
      html += '</div>';
    }

    // Symbols
    if (symbols.length > 0) {
      html += '<div class="cv-symbols">';
      symbols.forEach(function(s) {
        html += '<span class="sym-chip">' + esc(s) + '</span>';
      });
      html += '</div>';
    }

    html += '</div>'; // end code-viewer

    // Citation metadata
    html += '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">';
    ranges.forEach(function(r) {
      html += '<div class="cv-citation">';
      html += '<span class="role-badge">' + esc(r.role) + '</span>';
      html += '<span>' + esc(filePath + ":" + r.start_line + "-" + r.end_line) + '</span>';
      html += ' — <span style="font-size:10px;color:var(--text-secondary);">' + esc(r.label) + '</span>';
      html += '</div>';
    });
    html += '</div>';

    return html;
  }

  function renderFlowDiagram(art) {
    var p = art.payload;
    var nodes = p.nodes || [];
    var entryNode = p.entry_node;
    var terminalNodes = p.terminal_nodes || [];

    var html = '<div class="flow-diagram" data-component="call-data-diagram" data-component-label="Call/Data Diagram">';

    html += '<div class="artifact-header" style="margin-bottom:16px;">';
    html += '<span class="kind-badge">flow diagram</span>';
    html += '<span class="artifact-title" style="font-size:14px;">' + esc(art.title) + '</span>';
    html += '</div>';

    html += '<div class="flow-nodes">';
    nodes.forEach(function(node, idx) {
      var classes = [];
      if (node.id === entryNode) classes.push("entry");
      if (terminalNodes.indexOf(node.id) !== -1) classes.push("terminal");
      if (node.role === "process") classes.push("process");
      if (node.role === "data") classes.push("data");
      if (node.role === "output") classes.push("output");
      if (node.is_inferred) classes.push("inferred");

      html += '<div class="flow-node ' + classes.join(" ") + '">';
      html += '<div class="connector"></div>';
      html += '<div class="node-dot"></div>';
      html += '<div>';
      html += '<div class="node-label">' + esc(node.label) + '</div>';
      if (node.user_prompt) {
        html += '<span class="node-prompt">' + esc(node.user_prompt) + '</span>';
      }
      html += '</div>';
      html += '<span class="node-role">' + esc(node.role) + '</span>';
      if (node.evidence && node.evidence.length > 0) {
        html += '<span class="node-ev">' + node.evidence.map(function(e) { return esc(e); }).join(", ") + '</span>';
      }
      html += '</div>';
    });
    html += '</div>';

    // Edge legend
    html += '<div class="edge-legend">';
    html += '<span><span class="legend-dot"></span> Solid: direct evidence</span>';
    html += '<span><span class="legend-dot" style="border:1px dashed var(--text-muted);background:transparent;"></span> Dashed: inferred</span>';
    html += '<span>● Teal: entry node</span>';
    html += '<span>● Amber: terminal/output</span>';
    html += '</div>';

    // Edges summary
    html += '<div style="margin-top:12px;font-size:10px;color:var(--text-muted);">';
    html += '<strong>Edges:</strong> ';
    (p.edges || []).forEach(function(e) {
      html += e.from + ' → ' + e.to + ' [' + esc(e.relation) + (e.is_inferred ? ', inferred' : '') + '] ';
    });
    html += '</div>';

    html += '</div>'; // end flow-diagram
    return html;
  }

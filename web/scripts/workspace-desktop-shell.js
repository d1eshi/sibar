// ── workspace-desktop-shell.js ──
// Desktop shell prototype contract for dow-desktop-shell-path (VAL-DESKTOP-001)
// Reuses the same fixture identities while enforcing bounded read-only behavior.
(function() {
  "use strict";

  var fixture = window.deepOwnershipFixture;
  if (!fixture || !fixture.artifact_boundary || !fixture.loop_state) return;

  var boundary = fixture.artifact_boundary;

  function normalizePath(path) {
    return String(path || "").trim().replace(/\\/g, "/").replace(/^\.\/+/, "");
  }

  function stripGlob(pathPattern) {
    return String(pathPattern || "")
      .replace(/\/\*\*(\/.+)?$/, "")
      .replace(/\/\*$/, "")
      .replace(/\/\*\.[^/]+$/, "");
  }

  function startsWithin(candidatePath, boundaryPath) {
    if (!boundaryPath) return false;
    return candidatePath === boundaryPath || candidatePath.indexOf(boundaryPath + "/") === 0;
  }

  function inIncludedSources(path) {
    return boundary.included_sources.some(function(includedPath) {
      return startsWithin(path, normalizePath(includedPath));
    });
  }

  function inExcludedSources(path) {
    return boundary.excluded_sources.some(function(excludedPath) {
      return startsWithin(path, normalizePath(stripGlob(excludedPath)));
    });
  }

  function blockedRead(path, reason) {
    return {
      ok: false,
      blocked: true,
      requested_path: path,
      reason: reason
    };
  }

  function blockedAction(reason) {
    return {
      ok: false,
      blocked: true,
      reason: reason
    };
  }

  function snapshotId(loopId) {
    return "SNAP-" + String(loopId || "");
  }

  var contract = Object.freeze({
    shell_path: "dow-desktop-shell-path",
    assertion_id: "VAL-DESKTOP-001",
    fixture_id: fixture.fixture_id,
    loop_id: fixture.loop_state.id,
    snapshot_id: snapshotId(fixture.loop_state.id),
    filesystem_mode: "bounded_read_only",
    mutation_allowed: false,
    editor_plugin_required: false
  });

  window.sibiDesktopShell = Object.freeze({
    contract: contract,
    getIdentity: function() {
      return {
        fixture_id: contract.fixture_id,
        loop_id: contract.loop_id,
        snapshot_id: contract.snapshot_id
      };
    },
    readFile: function(path) {
      var normalizedPath = normalizePath(path);
      if (!normalizedPath) {
        return blockedRead(normalizedPath, "Desktop shell read path is required.");
      }

      if (
        normalizedPath.indexOf("..") !== -1 ||
        normalizedPath.charAt(0) === "/" ||
        normalizedPath.charAt(0) === "~"
      ) {
        return blockedRead(normalizedPath, "Desktop shell blocked out-of-bound read path.");
      }

      if (!inIncludedSources(normalizedPath) || inExcludedSources(normalizedPath)) {
        return blockedRead(normalizedPath, "Desktop shell blocked path outside bounded workspace sources.");
      }

      var bridge = window.__SIBI_DESKTOP_FS__;
      if (!bridge || typeof bridge.readTextFile !== "function") {
        return blockedRead(normalizedPath, "No desktop filesystem bridge is attached.");
      }

      var result = bridge.readTextFile(normalizedPath);
      if (!result || result.ok !== true) {
        return blockedRead(
          normalizedPath,
          result && result.reason ? String(result.reason) : "Desktop filesystem bridge rejected read."
        );
      }

      return {
        ok: true,
        blocked: false,
        requested_path: normalizedPath,
        content: String(result.content || "")
      };
    },
    requestProductMutation: function() {
      return blockedAction("Product mutation is blocked in desktop shell prototype path.");
    },
    requireEditorPlugin: function() {
      return blockedAction("Desktop shell path is editor-plugin independent.");
    }
  });

  window.__SIBI_WORKSPACE_IDENTITY__ = window.sibiDesktopShell.getIdentity();
})();

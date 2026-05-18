import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const html = readFileSync(join(process.cwd(), "web/workspace.html"), "utf8");
const live = readFileSync(join(process.cwd(), "web/scripts/workspace-live.js"), "utf8");
const composer = readFileSync(join(process.cwd(), "web/scripts/workspace-render-loop-composer.js"), "utf8");
const loop = readFileSync(join(process.cwd(), "web/scripts/workspace-render-loop.js"), "utf8");
const results = readFileSync(join(process.cwd(), "web/scripts/workspace-render-loop-results.js"), "utf8");

test("workspace page loads the live runtime bridge after loop renderers", () => {
  assert.doesNotMatch(html, /scripts\/workspace-fixture\.js/);
  assert.doesNotMatch(html, /scripts\/workspace-setup\.js/);
  assert.match(html, /scripts\/workspace-live\.js/);
  assert.ok(html.indexOf("scripts/workspace-render-loop.js") < html.indexOf("scripts/workspace-live.js"));
});

test("live bridge exposes Codex CLI auto runner and runtime endpoints", () => {
  assert.match(live, /id="useCodexAuto"/);
  assert.match(live, /value = "auto"/);
  assert.match(live, /runtime idle/);
  assert.match(live, /\/api\/workspace\/session/);
  assert.match(live, /\/api\/workspace\/attempt/);
});

test("live bridge applies runtime loops without inventing project facts", () => {
  assert.match(live, /loopToFixture\(loop, snapshot\)/);
  assert.match(live, /snapshot\.thinking_artifacts/);
  assert.match(composer, /No accepted LLM-backed operation yet/);
  assert.match(composer, /will not generate project facts/);
  assert.match(composer, /Array\.isArray\(op\.hints\)/);
  assert.doesNotMatch(composer, /detectLearningGapFromAnswer/);
  assert.doesNotMatch(composer, /HINT_REVEAL_CONTENT/);
  assert.match(composer, /if \(fixture\.sample_attempt\)/);
  assert.match(loop, /submitLiveWorkspaceAttempt/);
  assert.match(loop, /applyLiveWorkspace/);
  assert.doesNotMatch(loop, /TA-001/);
  assert.doesNotMatch(loop, /HINT_REVEAL_CONTENT/);
  assert.match(results, /if \(!sa \|\| !ec\)/);
});

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.cwd();
const appRoot = join(root, "apps", "sibar-research-workspace");

const workspaceHtml = readFileSync(join(appRoot, "index.html"), "utf8");
const workspaceCss = readFileSync(join(appRoot, "styles", "workspace.css"), "utf8");
const workspaceBaseCss = readFileSync(join(appRoot, "styles", "base.css"), "utf8");
const workspaceScript = readFileSync(join(appRoot, "scripts", "research-workspace.js"), "utf8");
const tauriConfig = JSON.parse(readFileSync(join(appRoot, "src-tauri", "tauri.conf.json"), "utf8"));
const tauriCargo = readFileSync(join(appRoot, "src-tauri", "Cargo.toml"), "utf8");
const tauriMain = readFileSync(join(appRoot, "src-tauri", "src", "main.rs"), "utf8");
const planDocPath = join(root, "docs", "specs", "deep-ownership-workspace", "13_tauri_second_app_product_plan.md");

const moduleUrl = pathToFileURL(join(appRoot, "scripts", "research-workspace.js")).href;
const LM_MODES = ["/map", "/read", "/explain", "/test", "/critic", "/repair", "/build", "/publish"];
const META_COPY_CANDIDATES = [
  /Ambition\s*→\s*Roadmap/,
];

function makeSimpleNode() {
  return {
    innerHTML: "",
    textContent: "",
    value: "",
    disabled: false,
    addEventListener: () => {},
    setAttribute: () => {},
  };
}

function createElementSpy(tagName) {
  return {
    tagName: tagName.toUpperCase(),
    nodeName: tagName.toUpperCase(),
    dataset: {},
    attributes: {},
    children: [],
    textContent: "",
    disabled: false,
    type: "button",
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener: () => {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
  };
}

const productTerms = [
  "Roadmap",
  "Learning Node",
  "Session",
  "Artifact",
  "Evidence",
  "Recall",
  "TODAY",
];

test("second app exposes the research workspace screen contract", () => {
  assert.match(workspaceHtml, /<h1>Researcher Workspace<\/h1>/);
  assert.match(workspaceHtml, /TODAY/);
  assert.match(workspaceHtml, /ROADMAP/);
  assert.match(workspaceHtml, /SESSION \/ READER/);
  assert.match(workspaceHtml, /LM GUIDE/);
  assert.match(workspaceHtml, /ARTIFACTS \/ EVIDENCE/);
  assert.match(workspaceHtml, /Compile source to roadmap/);
  assert.match(workspaceHtml, /Attempt reconstruction first/);
  assert.match(workspaceHtml, /\//); // command-like tool mode markers exist in HTML
});

test("product vocabulary is present in the second-app spec plane", () => {
  assert.ok(existsSync(planDocPath), `missing plan document at ${planDocPath}`);
  const planDoc = readFileSync(planDocPath, "utf8");
  const planDocNormalized = planDoc.toLowerCase();

  for (const term of productTerms) {
    assert.ok(planDoc.includes(term), `missing ${term} in plan document`);
  }
  const requiredPlanVocabulary = [
    "today-first",
    "source-to-roadmap",
    "bounded tool modes",
    "attempt-first reconstruction",
    "evidence checklist",
    "readiness",
    "focused static-contract tests",
    "apps/sibar-research-workspace",
  ];

  for (const term of requiredPlanVocabulary) {
    assert.ok(planDocNormalized.includes(term), `missing ${term} in plan document`);
  }
});

test("no chat-first generic landing UI appears in the Tauri slice", () => {
  assert.doesNotMatch(workspaceHtml, /\bchat\s*application\b/i);
  assert.doesNotMatch(workspaceHtml, /Send a message/i);
  assert.doesNotMatch(workspaceHtml, /chat interface/i);
  assert.doesNotMatch(workspaceHtml, /assistant\b/i);
});

test("workspace copy is work-surface oriented", () => {
  assert.doesNotMatch(workspaceHtml, /Sibar · Second App Slice/);
  assert.doesNotMatch(workspaceHtml, /evidence-driven readiness/);
  assert.doesNotMatch(workspaceHtml, /Source-to-roadmap compiler \+ current session loop/);
  assert.doesNotMatch(workspaceHtml, /Bounded tool modes, no generic chat surface/);
  assert.doesNotMatch(workspaceHtml, /full explanation/i);
  assert.doesNotMatch(workspaceScript, /full answer/i);

  for (const matcher of META_COPY_CANDIDATES) {
    assert.doesNotMatch(workspaceHtml, matcher);
  }
  assert.match(workspaceHtml, /Sibar \/ Research Workspace/);
  assert.match(workspaceHtml, /Mission status/);
  assert.match(workspaceHtml, /Session loop: Active reconstruction lane/);
  assert.match(workspaceHtml, /Active toolset: \/map \/read \/explain \/test \/critic \/repair \/build \/publish/);
});

test("source-to-roadmap compiler updates roadmap and emits source card payload", async () => {
  const workspaceModule = await import(moduleUrl);
  const sourceText = `
Karpathy Micrograd is excellent for building backprop from scratch.
A paper mentions tokenization, bigram language modeling, and attention.
`;
  const start = [
    { id: "foundations", title: "Math for ML", status: "understood" },
    { id: "micrograd", title: "Micrograd", status: "in_progress" },
    { id: "backprop", title: "Backprop from scratch", status: "understood" },
    { id: "mlp", title: "MLP training loop", status: "in_progress" },
    { id: "tokenization", title: "Tokenization", status: "unseen" },
    { id: "bigram", title: "Bigram LM", status: "unseen" },
    { id: "transformer", title: "Transformer block", status: "unseen" },
    { id: "scaling", title: "Scaling intuition", status: "unseen" },
    { id: "kernels", title: "Kernel / systems preview", status: "unseen" },
  ];

  const mapped = workspaceModule.compileSourceToRoadmap(sourceText, start);
  const statuses = new Map(mapped.roadmap.map((node) => [node.id, node.status]));

  assert.equal(Boolean(mapped.sourceCard), true);
  assert.equal(mapped.sourceCard.title.startsWith("Source card"), true);
  assert.equal(Array.isArray(mapped.sourceCard.claims), true);
  assert.equal(mapped.sourceCard.claims.length >= 2, true);
  assert.equal(Array.isArray(mapped.sourceCard.nextSessionOutputs), true);
  assert.equal(mapped.roadmapDeltas.length >= 1, true);
  assert.equal(mapped.unlockedNodes.length >= 3, true);
  assert.equal(statuses.get("micrograd"), "in_progress");
  assert.equal(statuses.get("tokenization"), "in_progress");
  assert.equal(statuses.get("bigram"), "in_progress");
  assert.equal(statuses.get("transformer"), "in_progress");
  assert.equal(mapped.inProgressCount >= 5, true);
});

test("attempt-only workflow exists and exposes hint ladder", async () => {
  const workspaceModule = await import(moduleUrl);
  const sample = workspaceModule.formatAttempt("I can derive gradients for a scalar MLP node.", 2);
  assert.equal(sample.startsWith("Attempt 3:"), true);
  assert.equal(sample.includes("gradients"), true);

  const normalized = workspaceModule.normalizeText("  Micrograd BACKPROP  ");
  assert.equal(normalized, "micrograd backprop");
});

test("mode actions create bounded scope effects without chat-like answer text", async () => {
  const workspaceModule = await import(moduleUrl);
  const baseRoadmap = [
    { id: "foundations", title: "Math for ML", status: "understood" },
    { id: "micrograd", title: "Micrograd", status: "in_progress" },
    { id: "backprop", title: "Backprop from scratch", status: "understood" },
    { id: "mlp", title: "MLP training loop", status: "in_progress" },
    { id: "tokenization", title: "Tokenization", status: "unseen" },
    { id: "bigram", title: "Bigram LM", status: "unseen" },
    { id: "transformer", title: "Transformer block", status: "unseen" },
  ];
  const state = {
    roadmap: baseRoadmap,
    attempts: [
      "I derived the micrograd chain rule and explained backward flow in plain words.",
    ],
    artifacts: [...workspaceModule.DEFAULT_ARTIFACTS],
    evidence: [...workspaceModule.DEFAULT_EVIDENCE],
    evidenceChecklist: [
      { id: "reconstruction", label: "Reconstruction attempt exists", required: true, complete: true },
      { id: "explanation", label: "Own-words explanation included", required: true, complete: true },
      { id: "recall", label: "Recall output created", required: true, complete: false },
    ],
    readinessLabel: "Evidence-backed candidate",
    readinessScore: 2,
    detectedGap: "No immediate gap",
    repairAction: "None",
    lastCompile: workspaceModule.compileSourceToRoadmap("Karpathy micrograd and bigram", baseRoadmap),
  };

  const mapAction = workspaceModule.describeModeAction("/map", state);
  const readAction = workspaceModule.describeModeAction("/read", state);
  const explainAction = workspaceModule.describeModeAction("/explain", state);
  const testAction = workspaceModule.describeModeAction("/test", state);
  const repairAction = workspaceModule.describeModeAction("/repair", state);
  const buildAction = workspaceModule.describeModeAction("/build", state);
  const publishAction = workspaceModule.describeModeAction("/publish", state);

  assert.equal(mapAction.scope, "roadmap");
  assert.equal(readAction.scope, "read");
  assert.equal(explainAction.scope, "scope");
  assert.equal(testAction.scope, "recall");
  assert.equal(repairAction.scope, "repair");
  assert.equal(buildAction.scope, "artifact");
  assert.equal(publishAction.scope, "evidence");

  assert.equal(mapAction.text.includes("Roadmap deltas"), true);
  assert.equal(testAction.text.includes("Created recall prompt"), true);
  assert.equal(repairAction.text.includes("Repair plan set"), true);
  assert.equal(buildAction.text.includes("Build scope pinned"), true);
  assert.equal(publishAction.blocked, undefined);
});

test("attempt evaluation advances evidence, roadmap, and publish status deterministically", async () => {
  const workspaceModule = await import(moduleUrl);
  const roadmap = [
    { id: "foundations", title: "Math for ML", status: "understood" },
    { id: "micrograd", title: "Micrograd", status: "in_progress" },
    { id: "backprop", title: "Backprop from scratch", status: "understood" },
    { id: "mlp", title: "MLP training loop", status: "in_progress" },
    { id: "tokenization", title: "Tokenization", status: "unseen" },
    { id: "bigram", title: "Bigram LM", status: "unseen" },
    { id: "transformer", title: "Transformer block", status: "unseen" },
  ];
  const state = {
    roadmap,
    attempts: [],
    artifacts: [...workspaceModule.DEFAULT_ARTIFACTS],
    evidence: [...workspaceModule.DEFAULT_EVIDENCE],
    evidenceChecklist: [
      { id: "reconstruction", label: "Reconstruction attempt exists", required: true, complete: false },
      { id: "explanation", label: "Own-words explanation included", required: true, complete: false },
      { id: "recall", label: "Recall output created", required: true, complete: false },
    ],
    readinessLabel: "No evidence yet",
    readinessScore: 0,
    detectedGap: "Attempt before scope actions",
    repairAction: "None",
    unlockedBySource: [],
    lastCompile: null,
  };

  const first = workspaceModule.evaluateAttemptForState(state, "I wrote a reconstruction and explained chain rule with math steps.");
  assert.equal(Boolean(first.entry), true);
  assert.equal(first.evaluation.readinessScore >= 2, true);
  assert.equal(state.evidence.some((entry) => entry.startsWith("Attempt reconstruction")), true);
  assert.equal(state.roadmap.find((node) => node.id === "micrograd").status, "built");

  const publishBeforeAttempt = workspaceModule.describeModeAction("/publish", state);
  assert.equal(publishBeforeAttempt.text.includes("Publish scope applied"), true);
  assert.equal(state.roadmap.find((node) => node.id === "micrograd").status, "published");
  assert.equal(state.artifacts.some((item) => item.includes("Published draft")), true);
});

test("final answer-like output is gated until attempts exist", async () => {
  const workspaceModule = await import(moduleUrl);
  const state = {
    roadmap: [
      { id: "foundations", title: "Math for ML", status: "understood" },
      { id: "micrograd", title: "Micrograd", status: "in_progress" },
    ],
    attempts: [],
    artifacts: [...workspaceModule.DEFAULT_ARTIFACTS],
    evidence: [...workspaceModule.DEFAULT_EVIDENCE],
    evidenceChecklist: [
      { id: "reconstruction", label: "Reconstruction attempt exists", required: true, complete: false },
      { id: "explanation", label: "Own-words explanation included", required: true, complete: false },
      { id: "recall", label: "Recall output created", required: true, complete: false },
    ],
    readinessLabel: "No evidence yet",
    readinessScore: 0,
    detectedGap: "Attempt before scope actions",
    repairAction: "None",
    lastCompile: null,
  };

  const gated = workspaceModule.describeModeAction("/explain", state);
  assert.equal(/attempt|unlock|withhold/.test(gated.text.toLowerCase()), true);
  assert.doesNotMatch(workspaceHtml, /full explanation/i);
  assert.doesNotMatch(workspaceScript, /full answer/i);
  assert.doesNotMatch(workspaceScript, /full explanation/i);

  state.attempts.push("I attempted a reconstruction for micrograd.");
  const open = workspaceModule.describeModeAction("/explain", state);
  assert.equal(open.text.includes("Hint-only explain scope"), true);
  assert.equal(open.text.includes("full"), false);
});

test("LM modes are defined once in markup and not duplicated by startup wiring", async () => {
  const markupModes = [...workspaceHtml.matchAll(/<button[^>]*data-mode="([^"]+)"[^>]*>/g)].map((match) => match[1]);
  assert.equal(markupModes.length, LM_MODES.length);
  assert.deepStrictEqual([...markupModes].sort(), [...LM_MODES].sort());

  const scriptModesMatch = workspaceScript.match(/const LM_MODES\s*=\s*\[(.*?)\];/s);
  assert.ok(scriptModesMatch);
  const scriptModes = [...scriptModesMatch[1].matchAll(/"([^"]+)"/g)].map((modeMatch) => modeMatch[1]);
  assert.equal(scriptModes.length, LM_MODES.length);
  assert.deepStrictEqual([...scriptModes].sort(), [...LM_MODES].sort());

  const workspaceModule = await import(moduleUrl);

  const modeButtons = LM_MODES.map((mode) => ({
    dataset: { mode },
    textContent: mode,
    setAttribute: () => {},
    addEventListener: () => {},
    type: "button",
  }));

  const modePanel = {
    appendCount: 0,
    querySelectorAll: () => modeButtons,
    appendChild: (button) => {
      modePanel.appendCount += 1;
      modeButtons.push(button);
      return button;
    },
  };

  const nodesById = new Map([
    ["roadmapList", makeSimpleNode()],
    ["artifactList", makeSimpleNode()],
    ["evidenceList", makeSimpleNode()],
    ["lmModes", modePanel],
    ["lmModeStatus", makeSimpleNode()],
    ["attemptHistory", makeSimpleNode()],
    ["sourceText", makeSimpleNode()],
    ["compileSource", makeSimpleNode()],
    ["compilerResult", makeSimpleNode()],
    ["attemptInput", makeSimpleNode()],
    ["submitAttempt", makeSimpleNode()],
    ["requestHint", makeSimpleNode()],
    ["attemptBadge", makeSimpleNode()],
    ["attemptFeedback", makeSimpleNode()],
  ]);

  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;

  try {
    // @ts-expect-error test shim
    globalThis.document = { getElementById: (id) => nodesById.get(id) || null };
    // @ts-expect-error test shim
    globalThis.window = { addEventListener: () => {} };

    workspaceModule.initResearchWorkspace({});
    assert.equal(modePanel.appendCount, 0);
    assert.equal(modeButtons.length, LM_MODES.length);
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

test("fallback LM modes are rendered as list items, not direct buttons", async () => {
  const workspaceModule = await import(moduleUrl);
  const modePanel = createElementSpy("ul");
  modePanel._children = [];
  modePanel.querySelectorAll = () =>
    modePanel._children.flatMap((child) => child.children.filter((childEntry) => childEntry.dataset?.mode));
  modePanel.appendChild = (node) => {
    modePanel._children.push(node);
    return node;
  };

  const nodesById = new Map([
    ["roadmapList", makeSimpleNode()],
    ["artifactList", makeSimpleNode()],
    ["evidenceList", makeSimpleNode()],
    ["lmModes", modePanel],
    ["lmModeStatus", makeSimpleNode()],
    ["attemptHistory", makeSimpleNode()],
    ["sourceText", makeSimpleNode()],
    ["compileSource", makeSimpleNode()],
    ["compilerResult", makeSimpleNode()],
    ["attemptInput", makeSimpleNode()],
    ["submitAttempt", makeSimpleNode()],
    ["requestHint", makeSimpleNode()],
    ["attemptBadge", makeSimpleNode()],
    ["attemptFeedback", makeSimpleNode()],
  ]);

  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;

  try {
    // @ts-expect-error test shim
    globalThis.document = {
      getElementById: (id) => nodesById.get(id) || null,
      createElement: (tagName) => {
        const created = createElementSpy(tagName);
        return created;
      },
    };
    // @ts-expect-error test shim
    globalThis.window = { addEventListener: () => {} };

    const workspace = workspaceModule.initResearchWorkspace({});
    const insertedNodes = modePanel._children;
    const buttons = insertedNodes.flatMap((li) => li.children).filter((node) => node.tagName === "BUTTON");

    assert.equal(insertedNodes.length, LM_MODES.length);
    assert.equal(buttons.length, LM_MODES.length);

    const allAreInListItems = insertedNodes.every(
      (child) => child.tagName === "LI" && Array.isArray(child.children) && child.children[0]?.tagName === "BUTTON",
    );
    assert.equal(allAreInListItems, true);

    workspace.setMode("/repair");
    const repairButton = buttons.find((button) => button.dataset.mode === "/repair");
    const pressedCount = buttons.filter((button) => button.attributes["aria-pressed"] === "true").length;
    assert.equal(pressedCount, 1);
    assert.equal(repairButton?.attributes["aria-pressed"], "true");
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

test("Tauri config and shell scaffold target the workspace frontend", () => {
  assert.equal(tauriConfig.build.beforeBuildCommand, "");
  assert.equal(tauriConfig.build.beforeDevCommand, "");
  assert.equal(tauriConfig.build.frontendDist, "../");
  assert.equal(tauriConfig.productName, "Sibar Research Workspace");
  assert.equal(tauriConfig.version, "0.1.0");
  assert.equal(tauriConfig.app.windows[0].title, "Sibar Research Workspace");
  assert.equal(tauriConfig.app.windows[0].width >= 1200, true);
  assert.equal(tauriConfig.package, undefined);
  assert.equal(existsSync(join(appRoot, "src-tauri", "build.rs")), true);
  assert.match(tauriCargo, /tauri-build/);
  assert.match(tauriCargo, /tauri = \{ version = "2.0.0"/);
  assert.match(tauriMain, /tauri::Builder/);
});

test("static stack is bounded and does not depend on runtime imports", () => {
  assert.doesNotMatch(workspaceHtml, /api\//);
  assert.doesNotMatch(workspaceHtml, /fetch\(/);
  assert.doesNotMatch(workspaceCss + workspaceBaseCss, /@import url/);
});

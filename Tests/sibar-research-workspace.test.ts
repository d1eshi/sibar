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
const currentSpecPath = join(root, "docs", "specs", "deep-ownership-workspace", "00_new_app_tauri_workspace.md");

const moduleUrl = pathToFileURL(join(appRoot, "scripts", "research-workspace.js")).href;
const LM_MODES = ["/map", "/read", "/explain", "/test", "/critic", "/repair", "/build", "/publish"];
const META_COPY_CANDIDATES = [
  /Ambition\s*→\s*Roadmap/,
];

function toDatasetKey(dataName) {
  return dataName
    .split("-")
    .map((value, index) => (index ? `${value[0]?.toUpperCase()}${value.slice(1)}` : value))
    .join("");
}

function collectButtonsFromHtml(html = "") {
  const buttonRegex = /<button\b([^>]*)>(.*?)<\/button>/gsi;
  const attrRegex = /([a-zA-Z0-9_-]+)=("([^"]*?)"|'([^']*?)'|([^\s>]+))/g;
  const buttons = [];
  let match;

  while ((match = buttonRegex.exec(html)) !== null) {
    const attrsText = match[1] || "";
    const label = (match[2] || "").replace(/<[^>]*>/g, "").trim();
    const dataset = {};
    const attributes = {};
    let found = false;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrsText)) !== null) {
      const attrName = attrMatch[1];
      const attrValue = attrMatch[3] ?? attrMatch[4] ?? attrMatch[2];
      attributes[attrName] = attrValue;
      if (!attrName.startsWith("data-")) continue;
      const key = toDatasetKey(attrName.slice(5));
      dataset[key] = attrValue;
      found = true;
    }

    const eventMap = {};
    const button = {
      tagName: "BUTTON",
      nodeName: "BUTTON",
      dataset,
      textContent: label,
      attributes,
      setAttribute(name, value) {
        this.attributes[name] = String(value);
      },
      getAttribute(name) {
        return this.attributes[name];
      },
      addEventListener(eventName, handler) {
        if (!eventMap[eventName]) eventMap[eventName] = [];
        eventMap[eventName].push(handler);
      },
      click() {
        (eventMap.click || []).forEach((handler) => handler({ currentTarget: button, target: button }));
      },
    };
    if (found) buttons.push(button);
  }

  return buttons;
}

function createHtmlAwareElement(tagName) {
  let innerHtml = "";
  let buttons = [];
  const element = {
    tagName: tagName.toUpperCase(),
    nodeName: tagName.toUpperCase(),
    dataset: {},
    attributes: {},
    children: [],
    textContent: "",
    value: "",
    disabled: false,
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener: () => {},
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    querySelectorAll(selector) {
      if (selector.includes("button[data-select-kind]")) {
        return buttons.filter((button) => button.dataset.selectKind);
      }
      if (selector.includes("button[data-mini-node-id]")) {
        return buttons.filter((button) => button.dataset.miniNodeId);
      }
      if (selector.includes("button[data-mode]")) {
        return buttons.filter((button) => button.dataset.mode);
      }
      if (selector.includes("li") && selector.includes("button[data-mode]")) {
        return buttons.filter((button) => button.dataset.mode);
      }
      return [];
    },
  };

  Object.defineProperty(element, "innerHTML", {
    get() {
      return innerHtml;
    },
    set(value) {
      innerHtml = String(value || "");
      buttons = collectButtonsFromHtml(innerHtml);
    },
    configurable: true,
  });

  return element;
}

function makeSimpleNode() {
  return {
    attributes: {},
    innerHTML: "",
    textContent: "",
    value: "",
    disabled: false,
    hidden: false,
    addEventListener: () => {},
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    querySelectorAll: () => [],
  };
}

function makeInteractiveNode(dataset = {}) {
  const eventMap = {};
  return {
    innerHTML: "",
    textContent: "",
    value: "",
    disabled: false,
    dataset: { ...dataset },
    attributes: {},
    addEventListener(eventName, handler) {
      if (!eventMap[eventName]) eventMap[eventName] = [];
      eventMap[eventName].push(handler);
    },
    click() {
      (eventMap.click || []).forEach((handler) => handler({ currentTarget: this, target: this }));
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    querySelectorAll: () => [],
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
    removeAttribute(name) {
      delete this.attributes[name];
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
  assert.match(workspaceHtml, /<strong>Sibar<\/strong>/);
  assert.match(workspaceHtml, /Today/);
  assert.match(workspaceHtml, /Backpropagation/);
  assert.match(workspaceHtml, /Discussion/);
  assert.match(workspaceHtml, /Learning tree focus/);
  assert.match(workspaceHtml, /Artifacts \/ Evidence/);
  assert.match(workspaceHtml, /Read/);
  assert.match(workspaceHtml, /Code/);
  assert.match(workspaceHtml, /Explain/);
  assert.match(workspaceHtml, /Compile source to roadmap/);
  assert.match(workspaceHtml, /Generate compiler contract payload/);
  assert.match(workspaceHtml, /Apply generated artifact/);
  assert.match(workspaceHtml, /Apply validated sample artifact/);
  assert.match(workspaceHtml, /Attempt reconstruction first/);
  assert.match(workspaceHtml, /Create Workspace/);
  assert.match(workspaceHtml, /What are you trying to build or understand\?/);
  assert.match(workspaceHtml, /Generate workspace/);
  assert.doesNotMatch(workspaceHtml, /Run Codex runner/);
  assert.match(workspaceHtml, /Proposed Workspace/);
  assert.match(workspaceHtml, /Ask/);
  assert.match(workspaceHtml, /Key insight/);
  assert.doesNotMatch(workspaceHtml, /LM GUIDE/);
  assert.doesNotMatch(workspaceHtml, /Slash command/i);
  assert.doesNotMatch(workspaceHtml, /data-mode="\/map"/);
});

test("create workspace intent compiles a core WorkspacePlan before opening the session", async () => {
  const workspaceModule = await import(moduleUrl);
  assert.equal(workspaceModule.WORKSPACE_INTENT_CORE_ENTRYPOINT, "src/pedagogoai/workspace-intent.ts");
  assert.equal(workspaceModule.WORKSPACE_INTENT_RUNNER_ENTRYPOINT, "src/pedagogoai/workspace-compiler-runner.ts");
  assert.equal(workspaceModule.WORKSPACE_INTENT_ADAPTER_KIND, "workspace-intent-ui-adapter");
  assert.equal(typeof workspaceModule.compileWorkspaceIntentWithRunner, "function");

  const ids = [
    "workspaceRoot",
    "workspaceIntentBuild",
    "workspaceIntentSource",
    "workspaceIntentWhy",
    "workspaceIntentKnown",
    "workspaceIntentUnknown",
    "workspaceIntentDesiredOutput",
    "generateWorkspace",
    "workspaceIntentPreview",
    "workspaceIntentPreviewTitle",
    "workspaceIntentOutputs",
    "workspaceIntentFirstSession",
    "workspaceIntentStatus",
    "openWorkspaceSession",
    "todayMission",
    "todayMissionField",
    "todayArc",
    "todayArcField",
    "roadmapList",
    "artifactList",
    "evidenceList",
    "lmModeStatus",
    "modeActionLog",
    "attemptHistory",
    "sourceText",
    "compileSource",
    "compilerResult",
    "attemptInput",
    "submitAttempt",
    "requestHint",
    "attemptBadge",
    "attemptFeedback",
    "activeNodeTitle",
    "activeNodeFocus",
    "activeNodeSource",
    "miniNodeList",
    "readerInstruction",
    "readerResourceList",
    "evidenceChecklist",
    "readinessSummary",
    "gapSummary",
    "repairActionText",
    "lmActiveNode",
    "lmActiveMiniNode",
    "lmRecommendedDecision",
    "lmDecisionAlternatives",
    "lmDecisionLockedReasons",
    "lmReaderMove",
  ];
  const nodesById = new Map(ids.map((id) => [id, createHtmlAwareElement(id)]));
  nodesById.set("generateWorkspace", makeInteractiveNode());
  nodesById.set("openWorkspaceSession", makeInteractiveNode());

  nodesById.get("workspaceIntentBuild").value = "quiero aprender embeddings, a no mas poder";
  nodesById.get("workspaceIntentSource").value = "";
  nodesById.get("workspaceIntentWhy").value = "";
  nodesById.get("workspaceIntentKnown").value = "";
  nodesById.get("workspaceIntentUnknown").value = "";
  nodesById.get("workspaceIntentDesiredOutput").value = "";

  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;

  try {
    // @ts-expect-error test shim
    globalThis.document = { getElementById: (id) => nodesById.get(id) || null };
    // @ts-expect-error test shim
    globalThis.window = { addEventListener: () => {} };

    const workspace = workspaceModule.initResearchWorkspace({});
    nodesById.get("generateWorkspace")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(workspace.state.workspaceIntentPlan.schema, "WorkspacePlan");
    assert.match(workspace.state.todayArc, /Embeddings/i);
    assert.equal(workspace.state.todayMission, "Convertirme en AI researcher-builder");
    assert.match(workspace.state.roadmap[0].id, /embeddings/i);
    assert.match(nodesById.get("workspaceIntentOutputs")?.innerHTML || "", /embeddings artifact/i);
    assert.match(nodesById.get("workspaceIntentFirstSession")?.textContent || "", /Session 01/);
    assert.equal(nodesById.get("openWorkspaceSession")?.disabled, false);
    assert.equal(nodesById.get("workspaceRoot")?.getAttribute("data-workspace-state"), "preview");

    nodesById.get("openWorkspaceSession")?.click();
    assert.equal(nodesById.get("workspaceRoot")?.getAttribute("data-workspace-state"), "session");
    assert.match(nodesById.get("activeNodeTitle")?.textContent || "", /Embeddings|embeddings/);
    assert.match(nodesById.get("readerInstruction")?.textContent || "", /scope map|constraints|success criteria|Read/);
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

test("create workspace intent can compile through native Tauri invoke", async () => {
  const workspaceModule = await import(moduleUrl);
  const previousWindow = globalThis.window;
  const calls = [];

  try {
    // @ts-expect-error test shim
    globalThis.window = {
      addEventListener: () => {},
      __TAURI__: {
        core: {
          invoke: async (command, payload) => {
            calls.push({ command, payload });
            assert.equal(command, "compile_workspace_intent");
            assert.equal(
              payload.payload.input.tryingToBuildOrUnderstand,
              "quiero aprender embeddings, a no mas poder",
            );
            return {
              job: {
                id: "job-test",
                request_id: "workspace-intent-test",
                status: "completed",
                status_history: ["queued", "running", "validating", "completed"],
                reason_code: null,
              },
              runner: {
                status: "completed",
                adapter: "fixture",
                command: "sibi-workspace-compiler",
                args: [],
                blocked_reason: null,
              },
              rust_intent: {
                user_intent: "quiero aprender embeddings, a no mas poder",
                source_bundle: {
                  paths: ["inline://workspace-intent-source"],
                  evidence: [],
                },
              },
              rust_workspace_plan: {
                objective: "Entender embeddings con un primer artifact reproducible.",
                bounded_objective: true,
                nodes: [
                  {
                    id: "embeddings-foundations",
                    title: "Embeddings foundations",
                    prerequisites: [],
                    concepts: ["embeddings"],
                    source_links: [
                      {
                        evidence_id: "evidence-workspace-intent-source",
                        rationale: "Intent inline evidence",
                      },
                    ],
                    artifact_requirement: {
                      id: "embedding-note",
                      path: "inline://workspace-intent-source",
                      requires: "Explain embeddings from the supplied intent.",
                      optional: false,
                      confidence: "high",
                    },
                    is_advanced: false,
                    locked: null,
                  },
                ],
                next_actions: [
                  {
                    label: "Start embeddings",
                    target_node_id: "embeddings-foundations",
                    visible: true,
                  },
                ],
                artifact_requirements: [],
                questions_if_blocked: [],
                ui_projection: {
                  title: "Embeddings",
                  summary: "First bounded embeddings session.",
                  badges: ["embeddings"],
                },
              },
            };
          },
        },
      },
    };

    const compiled = await workspaceModule.compileWorkspaceIntentWithRunner(
      {
        tryingToBuildOrUnderstand: "quiero aprender embeddings, a no mas poder",
        sourceInput: "",
      },
      { adapter: "fixture", runCodex: true },
    );

    assert.equal(calls.length, 1);
    assert.equal(compiled.runner.status, "completed");
    assert.equal(compiled.job.status, "completed");
    assert.equal(compiled.workspace_plan.compiled_by, "llm");
    assert.equal(compiled.workspace_plan.nodes[0].node_id, "embeddings-foundations");
    assert.match(compiled.preview.first_session, /Embeddings foundations/);
  } finally {
    globalThis.window = previousWindow;
  }
});

test("next actions are declared and wired to read, code, and explain actions", async () => {
  assert.match(workspaceHtml, /id="studyChoiceNow"[^>]*data-study-choice="read"/);
  assert.match(workspaceHtml, /id="studyChoiceBuild"[^>]*data-study-choice="build"[^>]*data-action-mode="\/build"/);
  assert.match(workspaceHtml, /id="studyChoiceExplain"[^>]*data-study-choice="explain"[^>]*data-action-mode="\/explain"/);

  const workspaceModule = await import(moduleUrl);
  const modeButtons = LM_MODES.map((mode) => makeInteractiveNode({ mode }));
  const modePanel = {
    querySelectorAll: () => modeButtons,
    appendChild: () => {},
  };
  const ids = [
    "todayMission",
    "todayMissionField",
    "todayArc",
    "todayArcField",
    "contractPayload",
    "contractStatus",
    "buildContractPayload",
    "applyGeneratedArtifact",
    "applySampleArtifact",
    "roadmapList",
    "artifactList",
    "evidenceList",
    "lmModeStatus",
    "modeActionLog",
    "attemptHistory",
    "sourceText",
    "compileSource",
    "compilerResult",
    "attemptInput",
    "submitAttempt",
    "requestHint",
    "attemptBadge",
    "attemptFeedback",
    "sourceCard",
    "sourceCardTitle",
    "sourceClaims",
    "sourceSuggested",
    "sourceNextSession",
    "activeNodeTitle",
    "activeNodeFocus",
    "activeNodeSource",
    "conceptConfusion",
    "miniNodeList",
    "readerInstruction",
    "readerResourceList",
    "evidenceChecklist",
    "readinessSummary",
    "gapSummary",
    "repairActionText",
    "lmActiveNode",
    "lmActiveMiniNode",
    "lmRecommendedDecision",
    "lmDecisionAlternatives",
    "lmDecisionLockedReasons",
    "lmReaderMove",
  ];
  const nodesById = new Map(ids.map((id) => [id, createHtmlAwareElement(id)]));
  nodesById.set("lmModes", modePanel);
  nodesById.set("studyChoiceNow", makeInteractiveNode({ studyChoice: "read" }));
  nodesById.set("studyChoiceBuild", makeInteractiveNode({ studyChoice: "build", actionMode: "/build" }));
  nodesById.set("studyChoiceExplain", makeInteractiveNode({ studyChoice: "explain", actionMode: "/explain" }));

  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;

  try {
    // @ts-expect-error test shim
    globalThis.document = { getElementById: (id) => nodesById.get(id) || null };
    // @ts-expect-error test shim
    globalThis.window = { addEventListener: () => {} };

    const workspace = workspaceModule.initResearchWorkspace({});

    nodesById.get("studyChoiceNow")?.click();
    assert.equal(workspace.state.mode, "/read");
    assert.match(nodesById.get("attemptFeedback")?.textContent || "", /Reader focus for/);
    assert.match(nodesById.get("modeActionLog")?.innerHTML || "", /\[read\]/);

    nodesById.get("studyChoiceBuild")?.click();
    assert.equal(workspace.state.mode, "/build");
    assert.match(nodesById.get("attemptFeedback")?.textContent || "", /Build scope pinned/);
    assert.equal(workspace.state.artifacts.some((item) => item.includes("Build requirement")), true);

    nodesById.get("studyChoiceExplain")?.click();
    assert.equal(workspace.state.mode, "/explain");
    assert.match(nodesById.get("attemptFeedback")?.textContent || "", /Explain is scoped and withheld|Hint-only explain scope/);
    assert.match(nodesById.get("modeActionLog")?.innerHTML || "", /\[scope\]/);
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

test("product vocabulary is present in the current Tauri workspace spec", () => {
  assert.ok(existsSync(currentSpecPath), `missing current spec document at ${currentSpecPath}`);
  const currentSpec = readFileSync(currentSpecPath, "utf8");
  const currentSpecNormalized = currentSpec.toLowerCase();

  for (const term of productTerms) {
    assert.ok(currentSpec.includes(term), `missing ${term} in current spec document`);
  }
  const requiredSpecVocabulary = [
    "workspace nativo de formación investigadora",
    "source-to-roadmap compiler",
    "ambición → ruta → nodo → sesión → artifact → evidencia → revisión",
    "no evidence = no mastery",
    "TODAY",
    "ROADMAP",
    "SESSION / READER",
    "LM GUIDE",
  ];

  for (const term of requiredSpecVocabulary) {
    assert.ok(currentSpecNormalized.includes(term.toLowerCase()), `missing ${term} in current spec document`);
  }
});

test("spec pack reading order marks the current source and derived plan", () => {
  const specPackReadme = readFileSync(join(root, "docs/specs/deep-ownership-workspace/README.md"), "utf8");
  assert.match(specPackReadme, /00_new_app_tauri_workspace\.md` is the current source spec/);
  assert.match(specPackReadme, /13_tauri_second_app_product_plan\.md` is the derived\/historical plan/);
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
  assert.match(workspaceHtml, /Scope: Selected fragment in "Backpropagation"/);
  assert.match(workspaceHtml, /Session output/);
  assert.match(workspaceHtml, /Context notes/);
  assert.match(workspaceHtml, /Ask about the selected fragment/);
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

test("roadmap compiler contract request and artifact are validatable and importable", async () => {
  const workspaceModule = await import(moduleUrl);
  const sourceText = "Tokenization and transformer attention examples with scaling data.";
  const baseState = {
    roadmap: workspaceModule.DEFAULT_ROADMAP.map((node) => ({ ...node })),
    todayMission: "Frontier AI researcher",
    todayArc: "Neural Nets from Scratch",
    activeNodeId: "tokenization",
    activeSessionId: "session-1",
    activeMiniNodeId: "token-boundaries",
    maxActiveSessions: 1,
    maxVisibleChoices: 3,
  };

  const request = workspaceModule.buildRoadmapCompilerRequest({
    learnerIntent: { mission: baseState.todayMission, arc: baseState.todayArc },
    sourceBundle: {
      id: "source-001",
      title: "Scaling paper",
      raw_text: sourceText,
      extracted_signals: ["tokenization", "transformer"],
    },
    learnerState: baseState,
    policy: { maxActiveSessions: 1, maxVisibleChoices: 3 },
    roadmap: baseState.roadmap,
  });
  const artifactPack = workspaceModule.buildRoadmapArtifactFromRequest(request, baseState.roadmap);
  const validation = workspaceModule.validateRoadmapArtifact(artifactPack, request);

  assert.equal(request.schema.includes("RoadmapCompilerRequest"), true);
  assert.equal(artifactPack.schema, "RoadmapArtifact");
  assert.equal(Array.isArray(artifactPack.learning_nodes), true);
  assert.equal(artifactPack.session_plan?.schema, "SessionPlan");
  assert.equal(Array.isArray(artifactPack.decision?.alternatives), true);
  assert.equal(validation.schema, "ValidationReport");
  assert.equal(validation.valid, true);

  const applyState = {
    roadmap: workspaceModule.DEFAULT_ROADMAP.map((node) => ({ ...node })),
    attempts: [],
    artifacts: [],
    evidence: [],
    evidenceChecklist: [],
    todayMission: "Override mission",
    todayArc: "Override arc",
    activeNodeId: "backprop",
    activeSessionId: "session-1",
    maxActiveSessions: 1,
    maxVisibleChoices: 3,
  };
  const applied = workspaceModule.applyRoadmapArtifact(applyState, artifactPack);
  assert.equal(applied.applied, true);
  assert.equal(applyState.todayMission, baseState.todayMission);
  assert.equal(applyState.todayArc, baseState.todayArc);
  assert.equal(Array.isArray(applyState.roadmap), true);
  assert.equal(applyState.activeNodeId, "backprop");
  assert.equal(applyState.maxActiveSessions, 1);
});

test("applied roadmap artifacts preserve imported mini-nodes and reader sources", async () => {
  const workspaceModule = await import(moduleUrl);
  const artifact = {
    schema: "RoadmapArtifact",
    version: workspaceModule.ROADMAP_CONTRACT_VERSION,
    artifact_id: "artifact_imported_attention",
    mission: { schema: "Mission", id: workspaceModule.MISSION_ID, title: "Imported Researcher", arc_id: workspaceModule.ARC_ID },
    arcs: [{ schema: "Arc", id: workspaceModule.ARC_ID, mission_id: workspaceModule.MISSION_ID, title: "Imported Attention Arc" }],
    tracks: [
      {
        schema: "Track",
        id: "track-imported",
        arc_id: workspaceModule.ARC_ID,
        title: "Imported attention path",
        node_ids: ["attention-routing"],
      },
    ],
    learning_nodes: [
      {
        schema: "LearningNode",
        id: "attention-routing",
        title: "Attention routing",
        status: "in_progress",
        track_id: "track-imported",
        mission_id: workspaceModule.MISSION_ID,
        prerequisites: [],
        locked_reasons: [],
        focus: "Imported artifact decomposes attention routing into reader-sized concepts.",
        recommended_decision: "Start with query-key scoring, then inspect value mixing.",
        reader_move: "Open the imported paper source and reconstruct the score table.",
        mini_nodes: [
          {
            schema: "MiniNode",
            id: "attention-routing::routing-query",
            node_id: "attention-routing",
            title: "Routing query key value",
            goal: "Map queries, keys, and values to one attention score.",
            reader_prompt: "Trace QK scoring for two tokens and name the value vector that moves.",
            resources: [
              {
                kind: "paper",
                title: "Attention Is All You Need",
                source: "Vaswani et al. 2017",
                action: "Read scaled dot-product attention, then rewrite one score calculation.",
              },
            ],
          },
          {
            schema: "MiniNode",
            id: "attention-routing::masking-choice",
            node_id: "attention-routing",
            title: "Masking choice",
            goal: "Explain why future positions are hidden in autoregressive routing.",
            reader_prompt: "Draw a 3-token mask and explain one blocked edge.",
            resources: [
              {
                kind: "direct-reading",
                title: "Causal mask worked example",
                source: "Imported source bundle",
                action: "Read the mask table and reconstruct it from memory.",
              },
            ],
          },
        ],
        sources: [
          {
            schema: "Source",
            id: "attention-routing::routing-query::source-0",
            title: "Attention Is All You Need",
            source: "Vaswani et al. 2017",
            medium: "paper",
            action: "Read scaled dot-product attention, then rewrite one score calculation.",
          },
        ],
        updated_at: "2026-05-19T00:00:00.000Z",
      },
    ],
    session_plan: {
      schema: "SessionPlan",
      max_active_sessions: 1,
      max_visible_choices: 3,
      active_session_id: "session-imported",
      sessions: [
        {
          schema: "Session",
          id: "session-imported",
          status: "active",
          selected_node_id: "attention-routing",
          visible_choices: ["attention-routing"],
          locked_reasons: [],
        },
      ],
    },
    decision: {
      schema: "Decision",
      recommended_next_node_id: "attention-routing",
      alternatives: [],
      why_not_others: [],
    },
    request_id: "req_imported_attention",
    generated_at: "2026-05-19T00:00:00.000Z",
    provenance: {
      source: "test-import",
      generated_by: "unit-test",
      generated_at: "2026-05-19T00:00:00.000Z",
      request_id: "req_imported_attention",
    },
  };
  const state = {
    roadmap: [],
    attempts: [],
    artifacts: [],
    evidence: [],
    evidenceChecklist: [],
    todayMission: "Default mission",
    todayArc: "Default arc",
    activeNodeId: "attention-routing",
    activeMiniNodeId: "routing-query",
    activeSessionId: "session-1",
    maxActiveSessions: 1,
    maxVisibleChoices: 3,
    expandedTreeNodes: {
      [workspaceModule.MISSION_ID]: true,
      [workspaceModule.ARC_ID]: true,
      "track-imported": true,
      "attention-routing": true,
    },
    lastCompile: null,
  };

  const applied = workspaceModule.applyRoadmapArtifact(state, artifact);
  assert.equal(applied.applied, true);

  const plan = workspaceModule.buildNodeStudyPlan("attention-routing", state.roadmap);
  assert.equal(plan.defaultMiniNodeId, "routing-query");
  assert.equal(plan.miniNodes.length, 2);
  assert.equal(plan.miniNodes[0].resources[0].kind, "paper");
  assert.equal(plan.miniNodes[0].resources[0].title, "Attention Is All You Need");

  const root = {
    activeNodeTitle: makeSimpleNode(),
    activeNodeFocus: makeSimpleNode(),
    activeNodeSource: makeSimpleNode(),
    miniNodeList: createHtmlAwareElement("ul"),
    readerInstruction: makeSimpleNode(),
    readerResourceList: createHtmlAwareElement("ul"),
    lmActiveNode: makeSimpleNode(),
    lmActiveMiniNode: makeSimpleNode(),
    lmRecommendedDecision: makeSimpleNode(),
    lmDecisionAlternatives: makeSimpleNode(),
    lmDecisionLockedReasons: makeSimpleNode(),
    lmReaderMove: makeSimpleNode(),
  };
  workspaceModule.renderNodeReader(root, state);

  assert.match(root.miniNodeList.innerHTML, /Routing query key value/);
  assert.match(root.readerResourceList.innerHTML, /Attention Is All You Need/);
  assert.match(root.activeNodeFocus.textContent, /Imported artifact decomposes attention routing/);

  const roadmapEl = createHtmlAwareElement("ul");
  workspaceModule.renderRoadmap(
    state.roadmap,
    roadmapEl,
    state.activeNodeId,
    `${state.activeNodeId}::${state.activeMiniNodeId}`,
    state.expandedTreeNodes,
    { missionTitle: state.todayMission, arcTitle: state.todayArc, tracks: state.tracks },
  );

  assert.match(roadmapEl.innerHTML, /Imported attention path/);
  assert.match(roadmapEl.innerHTML, /Routing query key value/);
  assert.match(roadmapEl.innerHTML, /Attention Is All You Need/);
});

test("attempt-only workflow exists and exposes hint ladder", async () => {
  const workspaceModule = await import(moduleUrl);
  const sample = workspaceModule.formatAttempt("I can derive gradients for a scalar MLP node.", 2);
  assert.equal(sample.startsWith("Attempt 3:"), true);
  assert.equal(sample.includes("gradients"), true);

  const normalized = workspaceModule.normalizeText("  Micrograd BACKPROP  ");
  assert.equal(normalized, "micrograd backprop");
});

test("roadmap node selection expands reader mini-nodes and contextual LM guidance", async () => {
  const workspaceModule = await import(moduleUrl);
  const plan = workspaceModule.buildNodeStudyPlan("backprop", workspaceModule.DEFAULT_ROADMAP);

  assert.equal(plan.displayTitle, "Backpropagation");
  assert.equal(plan.miniNodes.length, 5);
  assert.equal(plan.defaultMiniNodeId, "chain-rule");
  assert.equal(plan.miniNodes.some((node) => node.resources.some((resource) => resource.kind === "paper")), true);
  assert.equal(plan.miniNodes.some((node) => node.resources.some((resource) => resource.kind === "direct-reading")), true);

  const state = {
    roadmap: workspaceModule.DEFAULT_ROADMAP.map((node) => ({ ...node })),
    attempts: ["I attempted a chain rule reconstruction for backprop."],
    artifacts: [...workspaceModule.DEFAULT_ARTIFACTS],
    evidence: [...workspaceModule.DEFAULT_EVIDENCE],
    evidenceChecklist: [],
    readinessLabel: "Attempt logged",
    readinessScore: 1,
    detectedGap: "recall not present",
    repairAction: "None",
    activeNodeId: "backprop",
    activeMiniNodeId: "chain-rule",
    lastCompile: null,
  };

  const readAction = workspaceModule.describeModeAction("/read", state);
  assert.equal(readAction.scope, "read");
  assert.match(readAction.text, /Backpropagation \/ Chain rule trace/);
  assert.match(readAction.text, /Rumelhart, Hinton, Williams/);

  const helpAction = workspaceModule.requestConceptHelpForState(state);
  assert.equal(state.conceptHelpRequested, true);
  assert.match(helpAction.text, /Profundicemos mas/);
  assert.match(helpAction.readerFocus, /output-to-weight path/);
  assert.match(state.repairAction, /Deepen Chain rule trace/);
});

test("workspace initialization renders dynamic reader and LM context from active selection", async () => {
  const workspaceModule = await import(moduleUrl);
  const modeButtons = LM_MODES.map((mode) => ({
    dataset: { mode },
    textContent: mode,
    setAttribute: () => {},
    addEventListener: () => {},
    type: "button",
  }));
  const modePanel = {
    querySelectorAll: () => modeButtons,
    appendChild: () => {},
  };
  const ids = [
    "todayMission",
    "todayMissionField",
    "todayArc",
    "todayArcField",
    "contractPayload",
    "contractStatus",
    "buildContractPayload",
    "applyGeneratedArtifact",
    "applySampleArtifact",
    "roadmapList",
    "artifactList",
    "evidenceList",
    "lmModeStatus",
    "modeActionLog",
    "attemptHistory",
    "sourceText",
    "compileSource",
    "compilerResult",
    "attemptInput",
    "submitAttempt",
    "requestHint",
    "attemptBadge",
    "attemptFeedback",
    "sourceCard",
    "sourceCardTitle",
    "sourceClaims",
    "sourceSuggested",
    "sourceNextSession",
    "activeNodeTitle",
    "activeNodeFocus",
    "activeNodeSource",
    "conceptConfusion",
    "miniNodeList",
    "readerInstruction",
    "readerResourceList",
    "evidenceChecklist",
    "readinessSummary",
    "gapSummary",
    "repairActionText",
    "lmActiveNode",
    "lmActiveMiniNode",
    "lmRecommendedDecision",
    "lmDecisionAlternatives",
    "lmDecisionLockedReasons",
    "lmReaderMove",
  ];
  const nodesById = new Map(ids.map((id) => [id, makeSimpleNode()]));
  nodesById.set("lmModes", modePanel);

  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;

  try {
    // @ts-expect-error test shim
    globalThis.document = { getElementById: (id) => nodesById.get(id) || null };
    // @ts-expect-error test shim
    globalThis.window = { addEventListener: () => {} };

    const workspace = workspaceModule.initResearchWorkspace({});

    assert.match(nodesById.get("activeNodeTitle")?.textContent || "", /Backpropagation/);
    assert.match(nodesById.get("miniNodeList")?.innerHTML || "", /Chain rule trace/);
    assert.match(nodesById.get("readerResourceList")?.innerHTML || "", /Rumelhart, Hinton, Williams/);
    assert.equal(nodesById.get("lmActiveNode")?.textContent, "Backpropagation");
    assert.equal(nodesById.get("lmActiveMiniNode")?.textContent, "Chain rule trace");

    workspace.selectMiniNode("gradient-accumulation");
    assert.match(nodesById.get("readerResourceList")?.innerHTML || "", /Reverse accumulation/);
    assert.equal(nodesById.get("lmActiveMiniNode")?.textContent, "Gradient accumulation");

    workspace.selectNode("transformer");
    assert.match(nodesById.get("activeNodeTitle")?.textContent || "", /Transformer/);
    assert.match(nodesById.get("miniNodeList")?.innerHTML || "", /Attention intuition/);
    assert.equal(nodesById.get("lmActiveNode")?.textContent, "Transformer / Attention");
    assert.match(nodesById.get("lmDecisionAlternatives")?.textContent || "", /Micrograd|MLP|Tokenization/);
    assert.match(nodesById.get("lmDecisionLockedReasons")?.textContent || "", /none|Requires/);
    assert.equal((nodesById.get("todayMission")?.textContent || ""), "Frontier AI researcher");
    assert.equal((nodesById.get("todayArc")?.textContent || ""), "Neural Nets from Scratch");
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

test("tree selection updates reader and LM context through rerender", async () => {
  const workspaceModule = await import(moduleUrl);
  const modeButtons = LM_MODES.map((mode) => ({
    dataset: { mode },
    textContent: mode,
    setAttribute: () => {},
    addEventListener: () => {},
    type: "button",
  }));
  const modePanel = {
    querySelectorAll: () => modeButtons,
    appendChild: () => {},
  };
  const ids = [
    "todayMission",
    "todayMissionField",
    "todayArc",
    "todayArcField",
    "contractPayload",
    "contractStatus",
    "buildContractPayload",
    "applyGeneratedArtifact",
    "applySampleArtifact",
    "roadmapList",
    "artifactList",
    "evidenceList",
    "lmModeStatus",
    "modeActionLog",
    "attemptHistory",
    "sourceText",
    "compileSource",
    "compilerResult",
    "attemptInput",
    "submitAttempt",
    "requestHint",
    "attemptBadge",
    "attemptFeedback",
    "sourceCard",
    "sourceCardTitle",
    "sourceClaims",
    "sourceSuggested",
    "sourceNextSession",
    "activeNodeTitle",
    "activeNodeFocus",
    "activeNodeSource",
    "conceptConfusion",
    "miniNodeList",
    "readerInstruction",
    "readerResourceList",
    "evidenceChecklist",
    "readinessSummary",
    "gapSummary",
    "repairActionText",
    "lmActiveNode",
    "lmActiveMiniNode",
    "lmRecommendedDecision",
    "lmDecisionAlternatives",
    "lmDecisionLockedReasons",
    "lmReaderMove",
  ];
  const nodesById = new Map(ids.map((id) => [id, createHtmlAwareElement(id)]));
  nodesById.set("lmModes", modePanel);

  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;

  try {
    // @ts-expect-error test shim
    globalThis.document = { getElementById: (id) => nodesById.get(id) || null };
    // @ts-expect-error test shim
    globalThis.window = { addEventListener: () => {} };

    const workspace = workspaceModule.initResearchWorkspace({});
    const roadmap = nodesById.get("roadmapList");
    const miniNodeList = nodesById.get("miniNodeList");
    const modeActionLog = nodesById.get("modeActionLog");
    const lmReaderMove = nodesById.get("lmReaderMove");
    const activeNodeSource = nodesById.get("activeNodeSource");
    const activeNodeTitle = nodesById.get("activeNodeTitle");
    const lmActiveMiniNode = nodesById.get("lmActiveMiniNode");

    const roadmapButtons = roadmap.querySelectorAll("button[data-select-kind]");
    const tokenizationNode = roadmapButtons.find((button) => button.dataset.selectKind === "node" && button.dataset.nodeId === "tokenization");
    assert.ok(tokenizationNode, "tokenization roadmap node should be present");
    tokenizationNode.click();

    assert.match(activeNodeTitle?.textContent || "", /Tokenization/);
    assert.match(modeActionLog?.innerHTML || "", /Active node selected: tokenization/);

    const miniButtons = miniNodeList.querySelectorAll("button[data-mini-node-id]");
    const vocabMini = miniButtons.find((button) => button.dataset.miniNodeId === "vocab-design");
    assert.ok(vocabMini, "vocab-design mini-node should be present");
    vocabMini.click();
    assert.equal(lmActiveMiniNode?.textContent, "Vocabulary design");
    assert.match(workspace.state.lastAction?.text || "", /Reader focused: Tokenization \/ Vocabulary design/);

    const sourceButtons = roadmap.querySelectorAll("button[data-select-kind]");
    const secondTokenSource = sourceButtons.find((button) =>
      button.dataset.selectKind === "source" && button.dataset.sourceNode === "tokenization" && button.dataset.sourceIndex === "1"
    );
    assert.ok(secondTokenSource, "tokenization secondary source should be selectable");
    const beforeSourceSelection = activeNodeSource?.textContent;
    secondTokenSource.click();

    const afterSourceSelection = activeNodeSource?.textContent || "";
    assert.notEqual(beforeSourceSelection, afterSourceSelection);
    assert.equal(workspace.state.activeSourceSelection?.sourceIndex, 1);
    assert.match(lmReaderMove?.textContent || "", /Current resource:/);
    assert.match(modeActionLog?.innerHTML || "", /Source selected:/);
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

test("first roadmap tree click collapses when expansion state is missing", async () => {
  const workspaceModule = await import(moduleUrl);
  const modeButtons = LM_MODES.map((mode) => ({
    dataset: { mode },
    textContent: mode,
    setAttribute: () => {},
    addEventListener: () => {},
    type: "button",
  }));
  const modePanel = {
    querySelectorAll: () => modeButtons,
    appendChild: () => {},
  };
  const nodesById = new Map([
    ["roadmapList", createHtmlAwareElement("div")],
    ["artifactList", createHtmlAwareElement("ul")],
    ["evidenceList", createHtmlAwareElement("ul")],
    ["lmModes", modePanel],
    ["lmModeStatus", createHtmlAwareElement("div")],
    ["modeActionLog", createHtmlAwareElement("ul")],
    ["attemptHistory", createHtmlAwareElement("div")],
    ["sourceText", createHtmlAwareElement("textarea")],
    ["compileSource", createHtmlAwareElement("button")],
    ["activeNodeTitle", createHtmlAwareElement("div")],
    ["activeNodeSource", createHtmlAwareElement("div")],
    ["miniNodeList", createHtmlAwareElement("ul")],
    ["readerResourceList", createHtmlAwareElement("ul")],
    ["lmActiveNode", createHtmlAwareElement("div")],
    ["lmActiveMiniNode", createHtmlAwareElement("div")],
    ["lmDecisionAlternatives", createHtmlAwareElement("div")],
    ["lmDecisionLockedReasons", createHtmlAwareElement("div")],
    ["lmReaderMove", createHtmlAwareElement("div")],
  ]);

  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;

  try {
    // @ts-expect-error test shim
    globalThis.document = { getElementById: (id) => nodesById.get(id) || null };
    // @ts-expect-error test shim
    globalThis.window = { addEventListener: () => {} };

    const workspace = workspaceModule.initResearchWorkspace({});
    workspace.state.expandedTreeNodes = {};
    workspace.rerender();

    const roadmap = nodesById.get("roadmapList");
    let trackButton = roadmap.querySelectorAll("button[data-select-kind]").find((button) => button.dataset.selectKind === "container" && button.dataset.nodeId === "track-foundations");
    assert.ok(trackButton, "track node should be present");
    assert.equal(trackButton.getAttribute("aria-expanded"), "true");

    trackButton.click();
    const roadmapButtonsAfter = roadmap.querySelectorAll("button[data-select-kind]");
    const collapsedTrackButton = roadmapButtonsAfter.find((button) => button.dataset.selectKind === "container" && button.dataset.nodeId === "track-foundations");
    assert.ok(collapsedTrackButton, "track node should remain in DOM");
    assert.equal(collapsedTrackButton.getAttribute("aria-expanded"), "false");
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

test("roadmap explorer respects artifact metadata for mission, arc, and tracks", async () => {
  const workspaceModule = await import(moduleUrl);
  const modeButtons = LM_MODES.map((mode) => ({
    dataset: { mode },
    textContent: mode,
    setAttribute: () => {},
    addEventListener: () => {},
    type: "button",
  }));
  const modePanel = {
    querySelectorAll: () => modeButtons,
    appendChild: () => {},
  };

  const nodesById = new Map([
    ["roadmapList", createHtmlAwareElement("div")],
    ["artifactList", createHtmlAwareElement("ul")],
    ["evidenceList", createHtmlAwareElement("ul")],
    ["lmModes", modePanel],
    ["lmModeStatus", createHtmlAwareElement("div")],
    ["modeActionLog", createHtmlAwareElement("ul")],
    ["activeNodeTitle", createHtmlAwareElement("div")],
    ["miniNodeList", createHtmlAwareElement("ul")],
    ["lmActiveNode", createHtmlAwareElement("div")],
    ["lmActiveMiniNode", createHtmlAwareElement("div")],
    ["lmReaderMove", createHtmlAwareElement("div")],
    ["lmDecisionAlternatives", createHtmlAwareElement("div")],
    ["lmDecisionLockedReasons", createHtmlAwareElement("div")],
    ["activeNodeSource", createHtmlAwareElement("div")],
  ]);

  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;

  try {
    // @ts-expect-error test shim
    globalThis.document = { getElementById: (id) => nodesById.get(id) || null };
    // @ts-expect-error test shim
    globalThis.window = { addEventListener: () => {} };

    const workspace = workspaceModule.initResearchWorkspace({});
    const baseArtifact = workspaceModule.importSampleRoadmapArtifact();
    const customArtifact = {
      ...baseArtifact,
      mission: { ...baseArtifact.mission, title: "Researcher Frontier" },
      arcs: [{ ...baseArtifact.arcs[0], title: "Core Arc (from artifact)" }],
      tracks: [{ id: "track-custom", title: "Foundations only", node_ids: ["foundations"], status: "ready" }],
    };

    const applied = workspace.applyRoadmapArtifact(workspace.state, customArtifact);
    assert.equal(applied.applied, true);
    assert.equal(workspace.state.todayMission, "Researcher Frontier");
    assert.equal(workspace.state.todayArc, "Core Arc (from artifact)");
    workspace.rerender();

    const markup = nodesById.get("roadmapList").innerHTML;
    assert.match(markup, /Researcher Frontier/);
    assert.match(markup, /Core Arc \(from artifact\)/);
    assert.match(markup, /Foundations only/);
    assert.match(markup, /Math for ML/);
    assert.equal(markup.includes("Micrograd"), false);
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
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

test("discussion panel replaces the visible command mode grid", async () => {
  const markupModes = [...workspaceHtml.matchAll(/<button[^>]*data-mode="([^"]+)"[^>]*>/g)].map((match) => match[1]);
  assert.equal(markupModes.length, 0);
  assert.doesNotMatch(workspaceHtml, /id="lmModes"/);
  assert.match(workspaceHtml, /id="modeActionLog"/);

  const scriptModesMatch = workspaceScript.match(/const LM_MODES\s*=\s*\[(.*?)\];/s);
  assert.ok(scriptModesMatch);
  const scriptModes = [...scriptModesMatch[1].matchAll(/"([^"]+)"/g)].map((modeMatch) => modeMatch[1]);
  assert.deepStrictEqual([...scriptModes].sort(), [...LM_MODES].sort());

  const workspaceModule = await import(moduleUrl);
  const nodesById = new Map([
    ["roadmapList", makeSimpleNode()],
    ["artifactList", makeSimpleNode()],
    ["evidenceList", makeSimpleNode()],
    ["lmModeStatus", makeSimpleNode()],
    ["modeActionLog", makeSimpleNode()],
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

    const workspace = workspaceModule.initResearchWorkspace({});
    assert.deepStrictEqual(workspace.wiredModes, []);
    assert.equal(nodesById.get("lmModeStatus")?.textContent, "Context: Roadmap");
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

test("optional discussion action controls do not synthesize a slash command grid", async () => {
  const workspaceModule = await import(moduleUrl);
  const modeButtons = [
    makeInteractiveNode({ mode: "/read" }),
    makeInteractiveNode({ mode: "/build" }),
    makeInteractiveNode({ mode: "/explain" }),
  ];
  modeButtons[0].textContent = "Read";
  modeButtons[1].textContent = "Code";
  modeButtons[2].textContent = "Explain";

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
    ["modeActionLog", makeSimpleNode()],
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

    const workspace = workspaceModule.initResearchWorkspace({});
    assert.equal(modePanel.appendCount, 0);
    assert.deepStrictEqual([...workspace.wiredModes].sort(), ["/build", "/explain", "/read"]);

    modeButtons[1].click();
    assert.equal(workspace.state.mode, "/build");
    assert.equal(nodesById.get("lmModeStatus")?.textContent, "Context: Code");
    assert.equal(modeButtons.length, 3);
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

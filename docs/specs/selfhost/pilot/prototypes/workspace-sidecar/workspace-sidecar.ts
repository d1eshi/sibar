type EvidenceCitation = {
  file_path: string;
  start_line: number;
  end_line: number;
  excerpt: string;
};

type ConceptNode = {
  id: string;
  label: string;
  kind: string;
  why_it_matters: string;
  prerequisite_concepts: string[];
  source_paths: string[];
  evidence: EvidenceCitation[];
};

type WorkspaceFixture = {
  generated_at: string;
  generated_by: string;
  manifest: {
    label: string;
    owner_intent: string;
    included_paths: string[];
    excluded_paths: string[];
    concepts: { concept_id: string; label: string }[];
  };
  runtime_transcript: string[];
  artifact_session: {
    artifact_session_id: string;
    label: string;
    learning_goal: string;
    included_paths: string[];
    excluded_paths: string[];
  };
  concept_graph: {
    nodes: ConceptNode[];
    edges: { id: string; from: string; to: string; relation: string; label: string; evidence: EvidenceCitation[] }[];
  };
  ownership: {
    autopsy_step: {
      prompt: string;
      selected_id: string;
      concept_id?: string;
      bounded_evidence: EvidenceCitation[];
    };
    sample_answer: string;
    gap_answer: string;
  };
  practice: { prompt: string; due_after: string; difficulty: string; expected_evidence: string[] }[];
  readiness: {
    summary: { readiness: string; statement: string; confidence: string };
    recommended_next_action: { action: string; claim: string };
    open_gaps: { title: string; claim: string; repair_action: string }[];
  };
  study_panel: {
    evidence_index: EvidenceCitation[];
    learning_gaps: { concept_label: string; suspected_misconception: string; repair_action: string }[];
  };
};

const fixture = (window as unknown as { workspaceFixture: WorkspaceFixture }).workspaceFixture;

const repoList = byID("repoList");
const runtimeStatus = byID("runtimeStatus");
const capturedSummary = byID("capturedSummary");
const graphSummary = byID("graphSummary");
const nodeList = byID("nodeList");
const detailTitle = byID("detailTitle");
const detailText = byID("detailText");
const evidencePanel = byID("evidencePanel");
const questionText = byID("questionText");
const answerInput = byID("answerInput") as HTMLTextAreaElement;
const answerResult = byID("answerResult");
const practiceText = byID("practiceText");
const readinessText = byID("readinessText");
const timeline = byID("timeline");
const pathInput = byID("pathInput") as HTMLInputElement;
const pathResult = byID("pathResult");

function byID(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element;
}

function escapeHTML(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shortPath(path: string): string {
  return path.replace(/^.*\/sibar\//, "").replace(/^\.?\//, "");
}

function cleanText(value: string): string {
  return value.replaceAll(/\/Users\/[^\s]+\/sibar\//g, "");
}

function firstSentence(value: string): string {
  return value.split(/(?<=\.)\s+/)[0] || value;
}

function pathMatches(pattern: string, path: string): boolean {
  const normalizedPattern = pattern.replace(/^\.?\//, "");
  const normalizedPath = path.replace(/^\.?\//, "");
  if (normalizedPattern.includes("*")) {
    const escaped = normalizedPattern
      .split("*")
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    return new RegExp(`^${escaped}`).test(normalizedPath);
  }
  if (normalizedPattern.endsWith("/")) return normalizedPath.startsWith(normalizedPattern);
  return normalizedPath === normalizedPattern || normalizedPath.startsWith(`${normalizedPattern}/`);
}

function isIncludedPath(path: string): boolean {
  return fixture.manifest.included_paths.some((entry) => pathMatches(entry, path));
}

function isExcludedPath(path: string): boolean {
  return fixture.manifest.excluded_paths.some((entry) => pathMatches(entry, path));
}

function renderRepoList(): void {
  const entries = fixture.manifest.included_paths.map((path, index) => `
    <button class="repo-item${index === 0 ? " active" : ""}" type="button" data-path="${escapeHTML(path)}">
      ${escapeHTML(path)}
      <small>included evidence path</small>
    </button>
  `);
  repoList.innerHTML = entries.join("");
  repoList.querySelectorAll<HTMLButtonElement>(".repo-item").forEach((button) => {
    button.addEventListener("click", () => {
      repoList.querySelectorAll(".repo-item").forEach((entry) => entry.classList.remove("active"));
      button.classList.add("active");
      pathInput.value = button.dataset.path || "";
      checkPath();
    });
  });
}

function renderTimeline(): void {
  timeline.innerHTML = fixture.runtime_transcript.map((entry, index) => `
    <div class="step">
      <div class="dot">${index + 1}</div>
      <p>${escapeHTML(cleanText(entry))}</p>
    </div>
  `).join("");
}

function scanSlice(): void {
  graphSummary.textContent = `${fixture.concept_graph.nodes.length} concepts and ${fixture.concept_graph.edges.length} evidence-backed relations were produced from the bounded repo slice.`;
  nodeList.innerHTML = fixture.concept_graph.nodes.map((node, index) => `
    <div class="node-card${index === 0 ? " active" : ""}" data-node-id="${escapeHTML(node.id)}" role="button" tabindex="0">
      <b>${escapeHTML(node.label)}</b>
      <span>${escapeHTML(node.kind)} · ${escapeHTML(shortPath(node.source_paths[0] || "no source"))}</span>
    </div>
  `).join("");
  nodeList.querySelectorAll<HTMLElement>(".node-card").forEach((card) => {
    card.addEventListener("click", () => selectNode(card.dataset.nodeId || ""));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") selectNode(card.dataset.nodeId || "");
    });
  });
  selectNode(fixture.concept_graph.nodes[0]?.id || "");
}

function selectNode(nodeID: string): void {
  const node = fixture.concept_graph.nodes.find((entry) => entry.id === nodeID);
  if (!node) return;
  nodeList.querySelectorAll(".node-card").forEach((entry) => {
    entry.classList.toggle("active", (entry as HTMLElement).dataset.nodeId === nodeID);
  });
  detailTitle.textContent = node.label;
  detailText.textContent = node.why_it_matters;
  evidencePanel.innerHTML = node.evidence.map(renderEvidence).join("");
}

function renderEvidence(citation: EvidenceCitation): string {
  const lineRange = citation.start_line === citation.end_line
    ? `${citation.start_line}`
    : `${citation.start_line}-${citation.end_line}`;
  return `
    <div class="evidence">
      <code>${escapeHTML(shortPath(citation.file_path))}:${lineRange}</code>
      <p>${escapeHTML(cleanText(citation.excerpt))}</p>
    </div>
  `;
}

function askOwnership(): void {
  questionText.textContent = fixture.ownership.autopsy_step.prompt;
  evidencePanel.innerHTML = fixture.ownership.autopsy_step.bounded_evidence.map(renderEvidence).join("");
  detailTitle.textContent = `Ownership prompt: ${fixture.ownership.autopsy_step.concept_id || fixture.ownership.autopsy_step.selected_id}`;
  detailText.textContent = "Sibi asks before explaining, then checks the user's answer against bounded evidence.";
}

function evaluateAnswer(): void {
  const answer = answerInput.value.trim();
  if (!answer) {
    renderAnswerResult("rejected", "No answer yet", "Write what you think the selected slice does before asking Sibi to explain it.");
    return;
  }

  const lower = answer.toLowerCase();
  const mentionsEvidence = fixture.manifest.included_paths.some((path) =>
    lower.includes(path.toLowerCase()) || lower.includes(shortPath(path).split("/").at(-1)!.toLowerCase())
  );
  const declaresUncertainty = /\b(no se|no sé|not sure|uncertain|cannot trace|can't trace|confused)\b/i.test(answer);
  const mentionsBoundary = /\b(boundary|included|excluded|evidence|manifest|command|payload|handleRequest)\b/i.test(answer);

  if (declaresUncertainty || !mentionsBoundary) {
    const gap = fixture.study_panel.learning_gaps[0];
    renderAnswerResult(
      "gap",
      "Gap: needs evidence-producing repair",
      gap
        ? cleanText(`${gap.suspected_misconception} Repair: ${gap.repair_action}`)
        : "The answer does not yet expose enough reasoning to support readiness.",
    );
    renderPractice();
    return;
  }

  if (!mentionsEvidence) {
    renderAnswerResult(
      "gap",
      "Evidence gap",
      "The explanation may be plausible, but this prototype needs at least one in-bound file citation before Sibi can claim readiness.",
    );
    renderPractice();
    return;
  }

  renderAnswerResult(
    "ready",
    "Readiness: bounded and evidence-backed",
    "This answer names the command/evidence boundary and cites in-scope files. Sibi can treat it as ready to explain this slice, not whole-repo ownership.",
  );
}

function renderAnswerResult(kind: "ready" | "gap" | "rejected", title: string, body: string): void {
  answerResult.className = `answer-result ${kind}`;
  answerResult.innerHTML = `<b>${escapeHTML(title)}</b><p>${escapeHTML(body)}</p>`;
}

function renderPractice(): void {
  const challenge = fixture.practice[0];
  if (!challenge) return;
  practiceText.innerHTML = `
    ${escapeHTML(cleanText(challenge.prompt))}
    <ul class="compact-list">
      <li>Due: ${escapeHTML(challenge.due_after)}</li>
      <li>Difficulty: ${escapeHTML(challenge.difficulty)}</li>
      <li>${escapeHTML(cleanText(firstSentence(challenge.expected_evidence[0] || "Evidence required.")))}</li>
    </ul>
  `;
}

function renderReadiness(): void {
  readinessText.innerHTML = `
    <b>${escapeHTML(fixture.readiness.summary.readiness)}</b><br>
    ${escapeHTML(fixture.readiness.summary.statement)}
    <ul class="compact-list">
      <li>Confidence: ${escapeHTML(fixture.readiness.summary.confidence)}</li>
      <li>Next: ${escapeHTML(cleanText(fixture.readiness.recommended_next_action.action))}</li>
    </ul>
  `;
  if (fixture.readiness.open_gaps[0]) {
    practiceText.textContent = cleanText(fixture.readiness.open_gaps[0].repair_action);
  }
}

function checkPath(): void {
  const value = pathInput.value.trim();
  if (!value) {
    pathResult.className = "answer-result rejected";
    pathResult.textContent = "Enter a path.";
    return;
  }
  const excluded = isExcludedPath(value);
  const included = isIncludedPath(value);
  if (excluded) {
    pathResult.className = "answer-result rejected";
    pathResult.innerHTML = `<b>Rejected</b><p>${escapeHTML(value)} matches an excluded path and cannot support evidence.</p>`;
    return;
  }
  if (included) {
    pathResult.className = "answer-result ready";
    pathResult.innerHTML = `<b>Accepted</b><p>${escapeHTML(value)} is inside the self-hosted artifact boundary.</p>`;
    return;
  }
  pathResult.className = "answer-result gap";
  pathResult.innerHTML = `<b>Outside slice</b><p>${escapeHTML(value)} is not in the included paths for this artifact session.</p>`;
}

function init(): void {
  runtimeStatus.textContent = "runtime-backed";
  capturedSummary.textContent = `${fixture.manifest.label}. Fixture generated ${new Date(fixture.generated_at).toLocaleString()} by ${cleanText(fixture.generated_by)}.`;
  renderRepoList();
  renderTimeline();
  checkPath();
  byID("scanBtn").addEventListener("click", scanSlice);
  byID("questionBtn").addEventListener("click", askOwnership);
  byID("readinessBtn").addEventListener("click", renderReadiness);
  byID("answerBtn").addEventListener("click", evaluateAnswer);
  byID("sampleReadyBtn").addEventListener("click", () => {
    answerInput.value = fixture.ownership.sample_answer;
    evaluateAnswer();
  });
  byID("sampleGapBtn").addEventListener("click", () => {
    answerInput.value = fixture.ownership.gap_answer;
    evaluateAnswer();
  });
  byID("checkPathBtn").addEventListener("click", checkPath);
  pathInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") checkPath();
  });
}

init();

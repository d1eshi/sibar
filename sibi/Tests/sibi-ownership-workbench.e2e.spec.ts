import { expect, test, type Page } from "@playwright/test";

type EvidencePackForMock = Record<string, unknown>;

type FocusCitation = {
  evidenceId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  symbol?: string;
};

type LiveProposalMockState = {
  requestCount: number;
};

function evidencePackFromPostData(rawPostData: string | null): EvidencePackForMock {
  if (rawPostData == null || rawPostData.trim() === "") return {};
  try {
    return JSON.parse(rawPostData) as EvidencePackForMock;
  } catch {
    return {};
  }
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizePackPath(value: unknown): string {
  return String(value ?? "").replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
}

function makePackedCitation(candidate: Record<string, unknown>, filePathFallback: string): FocusCitation | null {
  const evidenceId = String((candidate as { evidenceId?: unknown }).evidenceId ?? "").trim();
  const filePath = normalizePackPath((candidate as { filePath?: unknown }).filePath ?? filePathFallback);
  const startLine = Number((candidate as { startLine?: unknown }).startLine);
  const endLine = Number((candidate as { endLine?: unknown }).endLine);
  const symbol = typeof (candidate as { symbol?: unknown }).symbol === "string"
    ? String((candidate as { symbol?: unknown }).symbol)
    : undefined;

  if (
    evidenceId.length > 0 &&
    filePath.length > 0 &&
    Number.isInteger(startLine) &&
    Number.isInteger(endLine) &&
    startLine > 0 &&
    endLine >= startLine
  ) {
    return { evidenceId, filePath, startLine, endLine, ...(symbol == null ? {} : { symbol }) };
  }

  return null;
}

function pickBestCitation(
  candidates: Array<{ source: string; citation: FocusCitation }>,
  selectedFilePath: string,
): FocusCitation | null {
  const normalizedSelectedPath = normalizePackPath(selectedFilePath);
  const isCompact = (citation: FocusCitation): boolean => citation.endLine - citation.startLine + 1 <= 20;

  const selected = candidates.filter(({ citation }) => citation.filePath === normalizedSelectedPath);
  const selectedCompact = selected.filter(({ citation }) => isCompact(citation));
  const compactAny = candidates.filter(({ citation }) => isCompact(citation));

  const prioritySelectedCompact = selectedCompact.filter(
    ({ source }) => source === "symbol" || source === "import" || source === "export",
  );
  if (prioritySelectedCompact.length > 0) {
    return prioritySelectedCompact[0].citation;
  }

  const selectedCompactExcerpt = selectedCompact.find(({ source }) => source === "excerpt");
  if (selectedCompactExcerpt != null) {
    return selectedCompactExcerpt.citation;
  }

  if (compactAny.length > 0) {
    return compactAny[0].citation;
  }

  if (selected.length > 0) {
    return selected[0].citation;
  }

  if (candidates.length > 0) {
    return candidates[0].citation;
  }

  return null;
}

function pickCandidateCitation(
  pack: EvidencePackForMock,
  selectedFilePath: string,
): FocusCitation {
  const fallbackFilePath = String((pack as { selectedFilePath?: unknown }).selectedFilePath ?? selectedFilePath);
  const selectedCandidates: Array<{ source: string; citation: FocusCitation }> = [];

  for (const candidate of asArray((pack as { symbols?: unknown[] }).symbols)) {
    const citation = makePackedCitation(candidate as Record<string, unknown>, fallbackFilePath);
    if (citation == null) continue;
    selectedCandidates.push({ source: "symbol", citation });
  }

  for (const candidate of asArray((pack as { imports?: unknown[] }).imports)) {
    const citation = makePackedCitation(candidate as Record<string, unknown>, fallbackFilePath);
    if (citation == null) continue;
    selectedCandidates.push({ source: "import", citation });
  }

  for (const candidate of asArray((pack as { exports?: unknown[] }).exports) as Array<Record<string, unknown>>) {
    const citation = makePackedCitation(candidate, fallbackFilePath);
    if (citation == null) continue;
    selectedCandidates.push({ source: "export", citation });
  }

  for (const candidate of asArray((pack as { excerpts?: unknown[] }).excerpts) as Array<Record<string, unknown>>) {
    const citation = makePackedCitation(candidate, fallbackFilePath);
    if (citation == null) continue;
    selectedCandidates.push({ source: "excerpt", citation });
  }

  const bestDirect = pickBestCitation(selectedCandidates, selectedFilePath);
  if (bestDirect != null) {
    return bestDirect;
  }

  const relationGroups: Array<Array<Record<string, unknown>>> = [
    ...asArray((pack as { nearbyTests?: unknown[] }).nearbyTests).map((entry) => [entry as Record<string, unknown>]),
    ...asArray((pack as { nearbyDocs?: unknown[] }).nearbyDocs).map((entry) => [entry as Record<string, unknown>]),
    ...asArray((pack as { callerCandidates?: unknown[] }).callerCandidates).map((entry) => [entry as Record<string, unknown>]),
    ...asArray((pack as { searchResults?: unknown[] }).searchResults).map((entry) => [entry as Record<string, unknown>]),
    ...asArray((pack as { projectSignals?: unknown[] }).projectSignals).map((entry) => [entry as Record<string, unknown>]),
  ];
  const relationCandidates: Array<{ source: string; citation: FocusCitation }> = [];

  for (const relationGroup of relationGroups) {
    for (const entry of relationGroup) {
      for (const citation of asArray((entry as { citations?: unknown[] }).citations) as Array<Record<string, unknown>>) {
        const packedCitation = makePackedCitation(citation, fallbackFilePath);
        if (packedCitation == null) continue;
        relationCandidates.push({ source: "relation", citation: packedCitation });
      }
    }
  }

  const relationMapped = pickBestCitation(relationCandidates, selectedFilePath);
  if (relationMapped != null) {
    return relationMapped;
  }

  const fallbackEvidenceId = String((asArray((pack as { evidenceIds?: unknown[] }).evidenceIds)[0] ?? "")).trim();
  const fallbackExcerpt = asArray((pack as { excerpts?: unknown[] }).excerpts)[0] as { filePath?: unknown } | undefined;
  const fallbackFile = normalizePackPath(String(fallbackExcerpt?.filePath ?? selectedFilePath));

  return {
    evidenceId: fallbackEvidenceId.length > 0 ? fallbackEvidenceId : `${fallbackFile}:1-1:playwright-fallback`,
    filePath: fallbackFile,
    startLine: 1,
    endLine: 1,
  };
}

function claimTextFromPack(_pack: EvidencePackForMock, citation: FocusCitation): string {
  const safeFilePath = String(citation.filePath)
    .replace(/ownership complete/gi, "ownership closure")
    .replace(/production-ready/gi, "production qualified")
    .replace(/readiness/gi, "completeness")
    .replace(/ready/gi, "prepared")
    .replace(/owned/gi, "held");
  return `Focus citation ${safeFilePath}:${citation.startLine}-${citation.endLine}.`;
}

function makeObservedClaim(id: string, kind: string, text: string, citation: FocusCitation) {
  return {
    id,
    kind,
    text,
    confidence: "observed",
    citations: [citation],
  };
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 16);
}

async function expectNoArrowArtifacts(page: Page): Promise<void> {
  await expect(page.getByText(/\barrow\b/i)).toHaveCount(0);
  await expect(page.locator(".sc-arrow")).toHaveCount(0);
}

async function selectLiveReviewPath(page: Page, path: string): Promise<void> {
  await page.getByLabel("Select review path").selectOption(path);
}

function buildLanguageProposalPayload(
  evidencePack: EvidencePackForMock,
  attemptPromptSeed: string,
): Record<string, unknown> {
  const selectedFilePath = String((evidencePack as { selectedFilePath?: unknown }).selectedFilePath ?? "sibi/src/App.tsx");
  const citation = pickCandidateCitation(evidencePack, selectedFilePath);
  const claimText = claimTextFromPack(evidencePack, citation);

  return {
    schema: "sibi-language-proposal.v1",
    providerId: "playwright-route",
    generatedAt: "2026-01-01T00:00:00.000Z",
    selectedFilePath,
    boundaryCandidates: [makeObservedClaim("e2e-boundary", "boundary_candidate", `Boundary review: ${claimText}`, citation)],
    reviewQueueCopy: [makeObservedClaim("e2e-review", "review_queue_copy", `Queue review: ${claimText}`, citation)],
    attemptPrompt: makeObservedClaim("e2e-attempt", "attempt_prompt", `${attemptPromptSeed} ${claimText}`, citation),
    possibleGapLabels: [makeObservedClaim("e2e-gap", "gap_label", `Gap check: ${claimText}`, citation)],
    smallestRepairCopy: makeObservedClaim("e2e-repair", "smallest_repair", `Smallest repair: ${claimText}`, citation),
  };
}

async function installLanguageProposalMock(
  page: Page,
  attemptPromptSeed = "Generated ownership question for this live file.",
): Promise<LiveProposalMockState> {
  const state: LiveProposalMockState = {
    requestCount: 0,
  };

  await page.route("**/__sibi/language-proposal", async (route) => {
    state.requestCount += 1;
    const rawPostData = route.request().postData();
    const evidencePack = evidencePackFromPostData(rawPostData);

    const selectedFilePath = String((evidencePack as { selectedFilePath?: unknown }).selectedFilePath ?? "sibi/src/App.tsx");
    const payload = buildLanguageProposalPayload(evidencePack, attemptPromptSeed);

    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify(payload),
    });
  });

  return state;
}

async function installLanguageProposalBlockedMock(
  page: Page,
  reason = "Gemini API key is not configured.",
): Promise<void> {
  await page.route("**/__sibi/language-proposal", async (route) => {
    const evidencePack = evidencePackFromPostData(route.request().postData());
    const evidenceIds = asArray((evidencePack as { evidenceIds?: unknown[] }).evidenceIds);
    await route.fulfill({
      contentType: "application/json",
      status: 503,
      body: JSON.stringify({
        code: "blocked_llm_unavailable",
        providerId: "gemini-first",
        reason,
        runtimeTrace: {
          providerId: "gemini-first",
          model: "gemini-2.5-flash",
          prompt: "Prompt omitted for blocked mock.",
          evidenceIdCount: evidenceIds.length,
        },
      }),
    });
  });
}

test("capture screen shows PR ingestion route and enters the guided workbench", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installLanguageProposalMock(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Local ownership intake" })).toBeVisible();
  await expect(page.getByLabel("Pull request provider")).toBeDisabled();
  await expect(page.getByLabel("Pull request URL (coming soon)")).toBeDisabled();
  await expect(page.getByLabel("Pull request URL (coming soon)")).toHaveValue("https://github.com/d1eshi/sibar/pull/18");
  await expect(page.getByRole("button", { name: "Paste diff" })).toBeDisabled();
  await expect(page.getByText(/MVP intake scope:/)).toBeVisible();
  await expect(page.getByText(/PR URL and paste-diff are not wired yet/)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Source root" })).toHaveValue("sibi/demo/react-fastapi-todo");
  await expect(page.getByRole("heading", { name: "Ownership route" })).toBeVisible();

  await page.getByRole("button", { name: "Analyze ownership" }).click();

  await expect(page).toHaveURL(/\?workbench=1&sourceRoot=sibi%2Fdemo%2Freact-fastapi-todo$/);
  const liveOwnership = page.getByLabel("Live ownership review");
  await expect(liveOwnership).toBeVisible();
  const generatedAttempt = page.getByLabel("Generated attempt-first language");
  await expect(generatedAttempt).toBeVisible();
  await expect(page.getByLabel("Live code panel")).toContainText("sibi/demo/react-fastapi-todo/src/App.tsx");
  await expect(liveOwnership).not.toContainText("Provider contract");
  await expect(liveOwnership).not.toContainText("Question batch");
  await expect(liveOwnership).not.toContainText("Selected files");
  await expect(liveOwnership).not.toContainText("Focus candidates");
  await expect(liveOwnership.locator("dt", { hasText: "Provider" })).toHaveCount(0);
  await expect(liveOwnership.locator("dt", { hasText: "Model" })).toHaveCount(0);
});

test("verified default workbench shows ownership report after a local answer", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installLanguageProposalMock(page);
  await page.goto("/?workbench=1&sourceRoot=sibi");

  const liveOwnership = page.getByLabel("Live ownership review");
  const reportPanel = page.getByLabel("Ownership report");
  const generatedAttempt = page.getByLabel("Generated attempt-first language");

  await expect(generatedAttempt).toBeVisible();
  await expect(liveOwnership).toContainText("Can you defend this boundary?");
  await expect(reportPanel).toContainText("Live report snapshot");
  await expect(reportPanel).not.toContainText("Status: limited · study mode · non-final.");
  await page.getByLabel("Your answer").fill("Boundary ownership is anchored to the selected file's focused code and verified references.");
  await expect(page.getByRole("button", { name: "Submit answer" })).toBeEnabled();
  await page.getByRole("button", { name: "Submit answer" }).click();

  await expect(reportPanel).toContainText("State:");
  await expect(reportPanel).toContainText("Report id:");
  await expect(reportPanel).toContainText("Recall condition");
  await expect(reportPanel).toContainText("Next action");
  await expect(reportPanel).toContainText("Return condition");
  await expect(reportPanel).toContainText("Evidence refs");
  const reportSummary = reportPanel.getByText("Take away report JSON");
  await expect(reportSummary).toBeVisible();
  await reportSummary.click();
  await expect(reportPanel).toContainText('"reportId"');
});

test("explicit workbench query sourceRoot stays preserved", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installLanguageProposalMock(page);
  await page.goto("/?workbench=1&sourceRoot=sibi");

  await expect(page).toHaveURL(/\?workbench=1&sourceRoot=sibi$/);
  const liveOwnership = page.getByLabel("Live ownership review");
  await expect(liveOwnership).toBeVisible();
  const generatedAttempt = page.getByLabel("Generated attempt-first language");
  await expect(generatedAttempt).toBeVisible();
  await expect(liveOwnership).not.toContainText("Workspace evidence");
  await expect(liveOwnership).not.toContainText("Provider contract");
  await expect(liveOwnership).not.toContainText("Question batch");
  await expect(liveOwnership).not.toContainText("Selected files");
  await expect(liveOwnership).not.toContainText("Focus candidates");
  await expect(liveOwnership.locator("dt", { hasText: "Provider" })).toHaveCount(0);
  await expect(liveOwnership.locator("dt", { hasText: "Model" })).toHaveCount(0);
});

test("malicious sourceRoot traversal is normalized to the safe demo default", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installLanguageProposalMock(page);
  await page.goto("/?workbench=1&sourceRoot=sibi%2F..%2Fengine");

  const liveOwnership = page.getByLabel("Live ownership review");
  await expect(liveOwnership).toBeVisible();
  await expect(liveOwnership.locator("dt", { hasText: "Provider" })).toHaveCount(0);
  await expect(liveOwnership.locator("dt", { hasText: "Model" })).toHaveCount(0);
  await expect(page.getByLabel("Live code panel")).toContainText("sibi/demo/react-fastapi-todo/src/App.tsx");
});

test("demo sourceRoot opens review surfaces with React/FastAPI project signals in lab", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installLanguageProposalMock(page);
  await page.goto("/?workbench=1&sourceRoot=sibi%2Fdemo%2Freact-fastapi-todo&view=lab");

  const liveOwnership = page.getByLabel("Live ownership review");
  await expect(liveOwnership).toBeVisible();
  const projectSignals = page.getByRole("list", { name: "Project signals" });
  await expect(projectSignals).toBeVisible();
  await expect(projectSignals).toContainText("react");
  await expect(projectSignals).toContainText("FastAPI");
  await expect(page.getByLabel("Live code panel")).toContainText("sibi/demo/react-fastapi-todo/src/App.tsx");
  await expect(page.getByText("Workspace evidence")).toBeVisible();
});

test("demo artifact flow advances question queue and moves code focus artifacts", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const selectedFilePath = "sibi/demo/react-fastapi-todo/src/App.tsx";
  const capturedCitations: FocusCitation[] = [];

  function citationMatching(
    pack: EvidencePackForMock,
    filePath: string,
    matcher: (candidate: Record<string, unknown>) => boolean,
  ): FocusCitation {
    const candidates = [
      ...asArray((pack as { imports?: unknown[] }).imports),
      ...asArray((pack as { symbols?: unknown[] }).symbols),
      ...asArray((pack as { exports?: unknown[] }).exports),
      ...asArray((pack as { excerpts?: unknown[] }).excerpts),
    ] as Array<Record<string, unknown>>;

    for (const candidate of candidates) {
      const citation = makePackedCitation(candidate, filePath);
      if (citation == null || normalizePackPath(citation.filePath) !== normalizePackPath(filePath)) continue;
      if (citation.endLine !== citation.startLine) continue;
      if (matcher(candidate)) return citation;
    }

    throw new Error(`Expected a single-line citation for ${filePath}.`);
  }

  await page.route("**/__sibi/language-proposal", async (route) => {
    const evidencePack = evidencePackFromPostData(route.request().postData());
    const selectedFile = String((evidencePack as { selectedFilePath?: unknown }).selectedFilePath ?? selectedFilePath);
    const importCitation = citationMatching(evidencePack, selectedFile, (candidate) =>
      String((candidate as { text?: unknown }).text ?? "").includes('import * as React from "react"'),
    );
    const addTodoCitation = citationMatching(evidencePack, selectedFile, (candidate) =>
      String((candidate as { name?: unknown }).name ?? "").includes("addTodo") ||
      String((candidate as { text?: unknown }).text ?? "").includes("const addTodo"),
    );
    const toggleTodoCitation = citationMatching(evidencePack, selectedFile, (candidate) =>
      String((candidate as { name?: unknown }).name ?? "").includes("toggleTodo") ||
      String((candidate as { text?: unknown }).text ?? "").includes("const toggleTodo"),
    );
    capturedCitations.splice(0, capturedCitations.length, importCitation, addTodoCitation, toggleTodoCitation);

    const claim = (id: string, kind: string, text: string, citation: FocusCitation) => ({
      id,
      kind,
      text,
      confidence: "inferred",
      citations: [citation],
    });

    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        schema: "sibi-language-proposal.v1",
        providerId: "playwright-artifact-flow",
        generatedAt: "2026-01-01T00:00:00.000Z",
        selectedFilePath: selectedFile,
        boundaryCandidates: [
          claim("artifact-boundary", "boundary_candidate", "Trace this React todo artifact from local code.", importCitation),
        ],
        reviewQueueCopy: [
          claim("artifact-review", "review_queue_copy", "Queue should inspect import, add, and toggle artifacts.", addTodoCitation),
        ],
        attemptPrompt: claim(
          "artifact-question-import",
          "attempt_prompt",
          "Explain how the React import anchors the first UI artifact.",
          importCitation,
        ),
        possibleGapLabels: [
          claim("artifact-gap", "gap_label", "Compare UI handlers before claiming the full todo flow.", toggleTodoCitation),
        ],
        smallestRepairCopy: claim(
          "artifact-repair",
          "smallest_repair",
          "Inspect the next handler artifact before broadening the claim.",
          addTodoCitation,
        ),
        questions: [
          claim("artifact-question-add", "question", "Explain how the add handler changes todo state.", addTodoCitation),
          claim("artifact-question-toggle", "question", "Explain how the toggle handler changes todo state.", toggleTodoCitation),
        ],
        runtimeTrace: {
          providerId: "playwright-artifact-flow",
          model: "playwright",
          prompt: "Artifact flow queue fixture",
          evidenceIdCount: Array.isArray((evidencePack as { evidenceIds?: unknown[] }).evidenceIds)
            ? ((evidencePack as { evidenceIds?: unknown[] }).evidenceIds ?? []).length
            : 0,
        },
      }),
    });
  });

  await page.goto("/?workbench=1&sourceRoot=sibi%2Fdemo%2Freact-fastapi-todo&view=lab");

  const liveOwnership = page.getByLabel("Live ownership review");
  const generatedAttempt = page.getByLabel("Generated attempt-first language");
  const queueProgress = page.getByLabel("Question queue progress", { exact: true });
  const liveCodeFocusSummary = page.getByTestId("live-code-focus-summary");
  const codeFocusTarget = page.locator('[data-annotation-target="active-code-focus"]');
  const activeArtifactLineNumber = () =>
    page.evaluate(() =>
      document.querySelector(".codeReviewArtifact")?.closest("[data-live-code-line-number]")?.getAttribute("data-live-code-line-number") ??
      null,
    );
  const activeFocusedLineNumbers = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll(".liveCodeLine.focused"))
        .map((line) => Number(line.getAttribute("data-live-code-line-number")))
        .filter((lineNumber) => Number.isInteger(lineNumber)),
    );

  await expect(liveOwnership).toContainText("playwright-artifact-flow");
  await expect(generatedAttempt).toBeVisible();
  await expect(queueProgress).toContainText("0/3");
  await expect(page.locator(".ownershipQueueList")).toContainText("active");
  expect(capturedCitations).toHaveLength(3);

  const firstLine = capturedCitations[0].startLine;
  const secondLine = capturedCitations[1].startLine;
  expect(firstLine).not.toBe(secondLine);
  await expect(liveCodeFocusSummary).toContainText(`line ${firstLine}`);
  await expect(page.getByLabel(`Code line ${firstLine} focused`)).toBeVisible();
  await expect(codeFocusTarget).toHaveAttribute("data-live-code-line-number", String(firstLine));
  await expect(page.getByLabel("Code review artifact")).toContainText("Active artifact");
  const initialArtifactLine = await activeArtifactLineNumber();
  expect(initialArtifactLine).toBe(String(firstLine));

  await page.getByLabel("Live boundary attempt").fill(
    "The first artifact is the React import line; it establishes this component's UI runtime boundary before handler evidence.",
  );
  await page.getByRole("button", { name: "Submit live attempt" }).click();

  await expect(queueProgress).toContainText("1/3");
  await expect(page.locator(".ownershipQueueList")).toContainText("attempted");
  await expect(page.locator(".ownershipQueueList")).toContainText("active");
  await expect(generatedAttempt).toContainText("addTodo");
  await expect(page.getByTestId("live-attempt-focus-chip")).toContainText(selectedFilePath);
  await expect(liveCodeFocusSummary).toContainText("Question focus:");
  await expect.poll(activeArtifactLineNumber).not.toBe(initialArtifactLine);
  const movedArtifactLine = await activeArtifactLineNumber();
  expect(Number(movedArtifactLine)).toBeGreaterThan(firstLine);
  await expect.poll(activeFocusedLineNumbers).toContain(secondLine);
  await expect(page.getByLabel("Code review artifact")).toContainText(/Complete artifact|Gap artifact|Blocked artifact/);
});

test("default live workbench keeps the user review rail to question and answer", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installLanguageProposalBlockedMock(page, "Gemini API key is not configured.");
  await page.goto("/?workbench=1&sourceRoot=sibi");

  const liveOwnership = page.getByLabel("Live ownership review");
  const generatedAttempt = page.getByLabel("Generated attempt-first language");

  await expect(generatedAttempt).toBeVisible();
  await expect(generatedAttempt).toContainText("Can you defend this boundary?");
  await expect(liveOwnership).not.toContainText("Review unavailable");
  await expect(liveOwnership).not.toContainText("Active task source");
  await expect(liveOwnership).not.toContainText("Ownership plan");
  await expect(liveOwnership).not.toContainText("Evidence to inspect");
  await expect(liveOwnership).not.toContainText("Self-confidence");
  await expect(liveOwnership).not.toContainText("Queue status");
  await expect(liveOwnership).toContainText("Local planner limited");
  await expect(liveOwnership).toContainText("Status: limited · study mode · non-final.");
  await expect(liveOwnership).toContainText("Gemini API key is not configured.");
  await expect(page.getByLabel("Your answer")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit answer" })).toBeVisible();
  const reportPanel = page.getByLabel("Limited planner status");
  await expect(reportPanel).toBeVisible();
  await expect(reportPanel).toContainText("Limited study status");
  await expect(reportPanel).toContainText("Next review action");
  await expect(reportPanel).toContainText("Next reattempt condition");
  await expect(reportPanel).toContainText("Study evidence refs");
  await expect(reportPanel).not.toContainText("Report id:");
  await expect(reportPanel).not.toContainText("Evidence refs:");
  await expect(reportPanel).not.toContainText("Take away report JSON");
  await page.getByLabel("Your answer").fill("Ownership attempt reflects local evidence focus.");
  await expect(page.getByRole("button", { name: "Submit answer" })).toBeEnabled();
});

test("rejected live language proposals show proposal-specific diagnostics", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/__sibi/language-proposal", async (route) => {
    const evidencePack = JSON.parse(route.request().postData() ?? "{}");
    const excerpt = Array.isArray(evidencePack.excerpts) ? evidencePack.excerpts[0] : null;
    const evidenceId = String(excerpt?.evidenceId ?? evidencePack.evidenceIds?.[0] ?? "");
    const selectedFilePath = String(evidencePack.selectedFilePath ?? "sibi/src/App.tsx");
    const citation = {
      evidenceId,
      filePath: String(excerpt?.filePath ?? selectedFilePath),
      startLine: Number(excerpt?.startLine ?? 1),
      endLine: Number(excerpt?.endLine ?? 1),
    };
    const claim = (id: string, kind: string, text: string) => ({
      id,
      kind,
      text,
      confidence: "inferred",
      citations: [citation],
    });

    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        schema: "sibi-language-proposal.v1",
        providerId: "playwright-route",
        generatedAt: "2026-01-01T00:00:00.000Z",
        selectedFilePath: "sibi/src/NotTheSelectedFile.tsx",
        boundaryCandidates: [claim("rejected-boundary", "boundary_candidate", `Review ${selectedFilePath}.`)],
        reviewQueueCopy: [claim("rejected-review", "review_queue_copy", `Review ${evidenceId}.`)],
        attemptPrompt: claim("rejected-attempt", "attempt_prompt", `Explain ${selectedFilePath}.`),
        possibleGapLabels: [claim("rejected-gap", "gap_label", `Verify ${evidenceId}.`)],
        smallestRepairCopy: claim("rejected-repair", "smallest_repair", `Inspect ${evidenceId}.`),
      }),
    });
  });

  await page.goto("/?workbench=1&sourceRoot=sibi");

  const diagnostic = page.getByLabel("Ownership review unavailable");
  await expect(diagnostic).toBeVisible();
  await expect(diagnostic).toContainText("Sibar rejected an unverified review artifact");
  await expect(diagnostic).not.toContainText("blocked_llm_unavailable");
});

test("intercepted live workbench opens real repo tree and generated attempt-first language", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  let citedEvidenceId: string | null = null;
  let granularFocusEvidenceId: string | null = null;
  const selectedFilePath = "sibi/src/App.tsx";
  const selectedFileContents = [
    'import * as React from "react";',
    "",
    'import { CodeDiffPanel } from "./ownershipWorkbench/components/CodeDiffPanel";',
    ...Array.from({ length: 37 }, (_, index) => `const filler${index + 1} = ${index + 1};`),
  ].join("\n");
  await page.route("**/__sibi/file-content?**", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.searchParams.get("path") !== selectedFilePath) {
      await route.continue();
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        sourceRoot: "sibi",
        path: selectedFilePath,
        contents: selectedFileContents,
        lineCount: 40,
        sizeBytes: selectedFileContents.length,
        generatedAt: "2026-01-01T00:00:00.000Z",
      }),
    });
  });

  await page.route("**/__sibi/language-proposal", async (route) => {
    const evidencePack = evidencePackFromPostData(route.request().postData());
    const citation = pickCandidateCitation(evidencePack, selectedFilePath);
    citedEvidenceId = citation.evidenceId;
    granularFocusEvidenceId = citation.evidenceId;
    const claim = (id: string, kind: string, text: string) => ({
      id,
      kind,
      text,
      confidence: "inferred",
      citations: [citation],
    });

    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        schema: "sibi-language-proposal.v1",
        providerId: "playwright-route",
        generatedAt: "2026-01-01T00:00:00.000Z",
        selectedFilePath,
        boundaryCandidates: [
          claim("route-boundary", "boundary_candidate", `Review ${selectedFilePath} as the live ownership anchor.`),
        ],
        reviewQueueCopy: [claim("route-review", "review_queue_copy", `Route-generated review copy cites ${citation.evidenceId}.`)],
        attemptPrompt: claim(
          "route-attempt",
          "attempt_prompt",
          `Attempt-first prompt from route interception for ${selectedFilePath}.`,
        ),
        possibleGapLabels: [claim("route-gap", "gap_label", `Next gap: verify relation evidence after ${citation.evidenceId}.`)],
        smallestRepairCopy: claim(
          "route-repair",
          "smallest_repair",
          `Smallest repair: inspect cited evidence ${citation.evidenceId} before ownership claims.`,
        ),
      }),
    });
  });

  await page.goto("/?workbench=1&sourceRoot=sibi&view=lab");

  const treeHost = page.locator(".treeHost");
  const fileTreeContainer = page.locator(".treeHost > file-tree-container");
  await expect(treeHost).toBeVisible();
  await expect(fileTreeContainer).toHaveCount(1);

  const treeHostHeight = await treeHost.evaluate((element) => element.getBoundingClientRect().height);
  const fileTreeContainerHeight = await fileTreeContainer.evaluate((element) => element.getBoundingClientRect().height);
  expect(treeHostHeight).toBeGreaterThan(0);
  expect(fileTreeContainerHeight).toBeGreaterThan(0);

  const selectedTreeItem = await page.waitForFunction(
    (path: string) => {
      const host = document.querySelector(".treeHost > file-tree-container") as HTMLElement | null;
      const selectedItem = host?.shadowRoot?.querySelector(
        `[role="treeitem"][data-item-path="${CSS.escape(path)}"]`,
      ) as HTMLElement | null;
      if (host == null || selectedItem == null) return null;
      const hostRect = host.getBoundingClientRect();
      const itemRect = selectedItem.getBoundingClientRect();
      return {
        ariaSelected: selectedItem.getAttribute("aria-selected"),
        itemY: itemRect.y,
        itemBottom: itemRect.y + itemRect.height,
        hostY: hostRect.y,
        hostBottom: hostRect.y + hostRect.height,
      };
    },
    selectedFilePath,
  );
  const selectedTreeItemState = await selectedTreeItem.jsonValue<{
    ariaSelected: string | null;
    itemY: number;
    itemBottom: number;
    hostY: number;
    hostBottom: number;
  } | null>();
  expect(selectedTreeItemState).not.toBeNull();
  if (selectedTreeItemState == null) throw new Error("Expected selected tree item to exist.");
  expect(selectedTreeItemState.ariaSelected).toBe("true");
  expect(selectedTreeItemState.itemY).toBeGreaterThanOrEqual(selectedTreeItemState.hostY - 1);
  expect(selectedTreeItemState.itemBottom).toBeLessThanOrEqual(selectedTreeItemState.hostBottom + 1);

  await expect(page.getByLabel("Live code panel")).toContainText("sibi/src/App.tsx");
  await expect(page.getByLabel("Live ownership review")).toContainText(/files available for local ownership evidence/);
  const generatedAttempt = page.getByLabel("Generated attempt-first language");
  await expect(generatedAttempt).toBeVisible();
  await expect(generatedAttempt).not.toContainText(/1\)\s*Describe the local project structure/i);
  await expect(generatedAttempt).not.toContainText(/2\)\s*What responsibility does/i);
  await expect(generatedAttempt).not.toContainText(/3\)\s*Explain what/i);
    await expect(generatedAttempt).not.toContainText(/4\)\s*Use the repair\/refactor/i);
    await expect(generatedAttempt).toContainText(/What ownership boundary does|Explain why .*ownership boundary/i);
  await expect(generatedAttempt).toContainText("sibi/src/App.tsx");
  await expect(generatedAttempt).toContainText(/line 1/i);
  const firstQueueTitle = page.locator(".ownershipQueueList strong").first();
  await expect(firstQueueTitle).toContainText(/ownership boundary/i);
  await expect(firstQueueTitle).not.toContainText(/1\)\s*Describe the local project structure/i);
  await expect(generatedAttempt).not.toContainText("Attempt-first prompt from route interception for");
  await expect(generatedAttempt).not.toContainText("Considering this is");
  await expect(page.getByTestId("live-attempt-focus-chip")).toContainText("sibi/src/App.tsx");
  await expect(page.getByTestId("live-attempt-focus-chip")).toContainText("line 1");
  await expect(page.getByLabel("Live boundary attempt")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit live attempt" })).toBeVisible();
  await expect(page.getByLabel("Live boundary attempt")).toBeVisible();
  await page.getByLabel("Live boundary attempt").fill("Ownership attempt is tracked from generated evidence.");
  await expect(page.getByRole("button", { name: "Submit live attempt" })).toBeEnabled();
  await expect(page.getByTestId("live-code-line-highlight")).toHaveCount(1);
  await expect(page.getByLabel("Code line 1 focused")).toBeVisible();
  await expect(page.locator('[data-annotation-target="active-code-focus"]')).toHaveCount(1);
  await expect(page.getByLabel("Code review artifact")).toContainText("Sibar review focus");
  await expect(page.getByLabel("Sibi review artifact")).toHaveCount(0);
  await expect(page.getByLabel("Tree review artifact")).toHaveCount(0);
  await expectNoArrowArtifacts(page);
  const liveCodeFocusSummary = page.getByTestId("live-code-focus-summary");
  await expect(liveCodeFocusSummary).toContainText("Question focus: line 1");
  await expect(liveCodeFocusSummary).toContainText("sibi/src/App.tsx:1-1:");
  await expect(liveCodeFocusSummary).not.toContainText("Question focus: lines 1-40");
  await expect(liveCodeFocusSummary).not.toContainText(`Question focus: lines 1-40 from ${citedEvidenceId}`);
  await expect(page.getByText("session boundary fixture")).toHaveCount(0);
  await expect(page.getByText("src/api/session.ts")).toHaveCount(0);
  expect(citedEvidenceId).toMatch(/^sibi\/src\/App\.tsx:/);
  expect(granularFocusEvidenceId).toMatch(/^sibi\/src\/App\.tsx:/);
});

test("live language proposal route is de-duplicated for a stable workbench load", async ({ page }) => {
  const attemptPromptSeed = "Generated ownership question for stable queue load.";
  const languageProposalState = await installLanguageProposalMock(page, attemptPromptSeed);
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(languageProposalState.requestCount).toBe(0);

  await page.goto("/?workbench=1&sourceRoot=sibi");
  const generatedAttempt = page.getByLabel("Generated attempt-first language");

  await expect(generatedAttempt).toBeVisible();
  await expect(generatedAttempt).not.toContainText(/1\)\s*Describe the local project structure/i);
  await expect(generatedAttempt).not.toContainText(/2\)\s*What responsibility does/i);
  await expect(generatedAttempt).not.toContainText(/3\)\s*Explain what/i);
    await expect(generatedAttempt).not.toContainText(/4\)\s*Use the repair\/refactor/i);
    await expect(generatedAttempt).toContainText(/What ownership boundary does|Explain why .*ownership boundary/i);
  await expect(generatedAttempt).toContainText("sibi/src/App.tsx");
  await expect(generatedAttempt).toContainText(/line 1/i);
  await expect(generatedAttempt).not.toContainText(attemptPromptSeed);
  await expect(generatedAttempt).not.toContainText("Considering this is");

  await page.waitForLoadState("networkidle");
  expect(languageProposalState.requestCount).toBe(1);
});

test("live ownership task loop stays readable on desktop and narrow viewports", async ({ page }) => {
  const attemptPromptSeed = "Generated ownership question for responsive check.";
  await installLanguageProposalMock(page, attemptPromptSeed);

  const viewports = [
    { width: 1440, height: 900 },
    { width: 390, height: 900 },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/?workbench=1&sourceRoot=sibi");

    const generatedAttempt = page.getByLabel("Generated attempt-first language");
    const liveAttemptTextarea = page.getByLabel("Your answer");
    const liveOwnership = page.getByLabel("Live ownership review");

    await expect(generatedAttempt).not.toContainText(/1\)\s*Describe the local project structure/i);
    await expect(generatedAttempt).not.toContainText(/2\)\s*What responsibility does/i);
    await expect(generatedAttempt).not.toContainText(/3\)\s*Explain what/i);
    await expect(generatedAttempt).not.toContainText(/4\)\s*Use the repair\/refactor/i);
    await expect(generatedAttempt).toContainText(/What ownership boundary does|Explain why .*ownership boundary/i);
    await expect(generatedAttempt).toContainText("sibi/src/App.tsx");
    await expect(generatedAttempt).toContainText(/line 1/i);
    await expect(generatedAttempt).not.toContainText(attemptPromptSeed);
    await expect(generatedAttempt).not.toContainText("Considering this is");
    await expect(liveAttemptTextarea).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit answer" })).toBeVisible();
    await expect(liveOwnership).not.toContainText("Active task source");
    await expect(liveOwnership).not.toContainText("Evidence to inspect");
    await expect(liveOwnership).not.toContainText("Self-confidence");
    await expect(liveOwnership).not.toContainText("Queue status");
    await expect(page.getByLabel("Code review artifact")).toBeVisible();
    await expect(page.getByLabel("Sibi review artifact")).toHaveCount(0);
    await expect(page.getByLabel("Tree review artifact")).toHaveCount(0);
    await expectNoArrowArtifacts(page);
    await assertNoHorizontalOverflow(page);
    await liveAttemptTextarea.scrollIntoViewIfNeeded();
  }
});

test("intercepted live workbench submits an attempt and records readiness memory", async ({ page }) => {
  const languageProposalState = await installLanguageProposalMock(
    page,
    "Attempt evidence-check submission for the live boundary.",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(languageProposalState.requestCount).toBe(0);

  await page.goto("/?workbench=1&sourceRoot=sibi");

  await expect(page.getByLabel("Live boundary readiness gate")).toHaveCount(0);
  await page
    .getByLabel("Your answer")
    .fill("The 204 null branch needs caller consumer handling so privileged failure paths do not run.");
  await expect(page.getByLabel("Live self confidence")).toHaveCount(0);
  await page.getByRole("button", { name: "Submit answer" }).click();

  await expect(page.getByLabel("Code review artifact")).toContainText(/Complete artifact|Gap artifact|Blocked artifact/);
  await expect(page.getByLabel("Sibi review artifact")).toHaveCount(0);
});

test("live readiness memory resets when same file receives a semantic proposal change", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const semanticPath = "sibi/docs/specs/sibi-ownership-workbench/01_product_slice.md";
  const alternatePath = "sibi/docs/specs/sibi-ownership-workbench/02_ui_tree_code_panels.md";
  const concreteLineContextPattern = /\blines?\s+\d+(?:\s*-\s*\d+)?\b/i;
  let semanticEvidencePackKey = "";
  let semanticCallCountAtFirstVisit = 0;
  const evidencePackToVariant = new Map<string, number>();
  const evidencePackCallCount = new Map<string, number>();

  await page.route("**/__sibi/language-proposal", async (route) => {
    const evidencePack = evidencePackFromPostData(route.request().postData());
    const evidenceIds = asArray((evidencePack as { evidenceIds?: unknown[] }).evidenceIds)
      .map((value) => String(value ?? ""))
      .filter((value) => value.length > 0);
    const selectedFilePath = String((evidencePack as { selectedFilePath?: unknown }).selectedFilePath ?? "unknown");
    const normalizedFilePath = normalizePackPath(selectedFilePath);
    const evidencePackKey = `${normalizedFilePath}|${[...evidenceIds].sort().join("|")}`;
    const observedCount = (evidencePackCallCount.get(evidencePackKey) ?? 0) + 1;
    evidencePackCallCount.set(evidencePackKey, observedCount);
    if (normalizedFilePath === normalizePackPath(semanticPath) && evidencePackKey.length > 0) {
      semanticEvidencePackKey = evidencePackKey;
    }

    const variant = evidencePackToVariant.has(evidencePackKey)
      ? (evidencePackToVariant.get(evidencePackKey) ?? 0)
      : normalizedFilePath === normalizePackPath(alternatePath)
        ? 1
        : 0;

    if (!evidencePackToVariant.has(evidencePackKey)) {
      evidencePackToVariant.set(evidencePackKey, variant);
    }

    const citation = pickCandidateCitation(evidencePack, selectedFilePath);
    const attemptPromptSeed =
      variant === 0
        ? `Submit initial semantic live attempt for ${selectedFilePath}.`
        : `Submit alternate semantic live attempt for ${selectedFilePath}.`;

    const attemptReviewText =
      variant === 0
        ? `Initial review copy cites ${citation.evidenceId}.`
        : `Alternate review copy cites ${citation.evidenceId} using a new semantic context.`;
    const claim = (id: string, kind: string, text: string) => ({
      id,
      kind,
      text,
      confidence: "inferred",
      citations: [citation],
    });

    const boundaryText =
      variant === 0
        ? `Review ${selectedFilePath} for the first semantic live ownership boundary.`
        : `Review ${selectedFilePath} for the alternate semantic live ownership boundary.`;

    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        schema: "sibi-language-proposal.v1",
        providerId: "playwright-route",
        generatedAt: "2026-01-01T00:00:00.000Z",
        selectedFilePath,
        boundaryCandidates: [
          claim(`semantic-boundary-${variant}`, "boundary_candidate", boundaryText),
        ],
        reviewQueueCopy: [
          claim(`semantic-review-${variant}`, "review_queue_copy", attemptReviewText),
        ],
        attemptPrompt: claim(
          `semantic-attempt-${variant}`,
          "attempt_prompt",
          attemptPromptSeed,
        ),
        possibleGapLabels: [
          claim(
            `semantic-gap-${variant}`,
            "gap_label",
            variant === 0 ? `Semantic gap for ${selectedFilePath}.` : `Alternate semantic gap for ${selectedFilePath}.`,
          ),
        ],
        smallestRepairCopy: claim(
          `semantic-repair-${variant}`,
          "smallest_repair",
          `Smallest repair for variant ${variant} cites ${citation.evidenceId}.`,
        ),
      }),
    });
  });

  await page.goto("/?workbench=1&sourceRoot=sibi&view=lab");

  await selectLiveReviewPath(page, semanticPath);
  await expect(page.getByLabel("Live code panel")).toContainText(semanticPath);
  await page
    .getByLabel("Live boundary attempt")
    .fill("The first semantic proposal has enough detail to record one readiness memory event.");
  await page.getByRole("button", { name: "Submit live attempt" }).click();

  const readiness = page.getByLabel("Live readiness gate output");
  await expect(readiness).toContainText("Memory events: 1");
  expect(semanticEvidencePackKey).not.toBe("");
  semanticCallCountAtFirstVisit = evidencePackCallCount.get(semanticEvidencePackKey) ?? 0;
  expect(semanticCallCountAtFirstVisit).toBeGreaterThan(0);

  await selectLiveReviewPath(page, alternatePath);
  await expect(page.getByLabel("Live code panel")).toContainText(alternatePath);
  await expect(page.getByLabel("Generated attempt-first language")).not.toContainText(/1\)\s*Describe the local project structure/i);
  await expect(page.getByLabel("Generated attempt-first language")).not.toContainText(/2\)\s*What responsibility does/i);
  await expect(page.getByLabel("Generated attempt-first language")).not.toContainText(/3\)\s*Explain what/i);
  await expect(page.getByLabel("Generated attempt-first language")).not.toContainText(/4\)\s*Use the repair\/refactor/i);
  await expect(page.getByLabel("Generated attempt-first language")).toContainText(
    /What ownership boundary does|Explain why .*ownership boundary/i,
  );
  await expect(page.getByLabel("Generated attempt-first language")).toContainText("sibi/docs/specs/sibi-ownership-workbench/02_ui_tree_code_panels.md");
  await expect(page.getByLabel("Generated attempt-first language")).toContainText(concreteLineContextPattern);
  await expect(page.getByLabel("Generated attempt-first language")).not.toContainText("alternate semantic live attempt");
  await expect(page.getByLabel("Generated attempt-first language")).not.toContainText("initial semantic live attempt");
  await expect(page.getByLabel("Generated attempt-first language")).not.toContainText("Considering this is");
  await selectLiveReviewPath(page, semanticPath);
  await expect(page.getByLabel("Live code panel")).toContainText(semanticPath);
  await expect(page.getByLabel("Generated attempt-first language")).not.toContainText(/1\)\s*Describe the local project structure/i);
  await expect(page.getByLabel("Generated attempt-first language")).not.toContainText(/2\)\s*What responsibility does/i);
  await expect(page.getByLabel("Generated attempt-first language")).not.toContainText(/3\)\s*Explain what/i);
  await expect(page.getByLabel("Generated attempt-first language")).not.toContainText(/4\)\s*Use the repair\/refactor/i);
  await expect(page.getByLabel("Generated attempt-first language")).toContainText(
    /What ownership boundary does|Explain why .*ownership boundary/i,
  );
  await expect(page.getByLabel("Generated attempt-first language")).toContainText("sibi/docs/specs/sibi-ownership-workbench/01_product_slice.md");
  await expect(page.getByLabel("Generated attempt-first language")).toContainText(concreteLineContextPattern);
  await expect(page.getByLabel("Generated attempt-first language")).not.toContainText("alternate semantic live attempt");
  await expect(page.getByLabel("Generated attempt-first language")).not.toContainText("initial semantic live attempt");
  await expect(page.getByLabel("Generated attempt-first language")).not.toContainText("Considering this is");
  await expect(readiness).toContainText("Readiness gate: not_attempted");
  await expect(readiness).toContainText("Memory events: 0");
  expect(evidencePackCallCount.get(semanticEvidencePackKey) ?? 0).toBe(semanticCallCountAtFirstVisit);
});

test("live lab view exposes runtime evidence and language proposal JSON", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/__sibi/language-proposal", async (route) => {
    const evidencePack = JSON.parse(route.request().postData() ?? "{}");
    const excerpt = Array.isArray(evidencePack.excerpts) ? evidencePack.excerpts[0] : null;
    const evidenceId = String(excerpt?.evidenceId ?? evidencePack.evidenceIds?.[0] ?? "");
    const selectedFilePath = String(evidencePack.selectedFilePath ?? "unknown");
    const citation = {
      evidenceId,
      filePath: String(excerpt?.filePath ?? selectedFilePath),
      startLine: Number(excerpt?.startLine ?? 1),
      endLine: Number(excerpt?.endLine ?? 1),
    };
    const claim = (id: string, kind: string, text: string) => ({
      id,
      kind,
      text,
      confidence: "inferred",
      citations: [citation],
    });

    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        schema: "sibi-language-proposal.v1",
        providerId: "playwright-route",
        generatedAt: "2026-01-01T00:00:00.000Z",
        selectedFilePath,
        boundaryCandidates: [claim("lab-boundary", "boundary_candidate", `Review ${selectedFilePath}.`)],
        reviewQueueCopy: [claim("lab-review", "review_queue_copy", `Lab review cites ${evidenceId}.`)],
        attemptPrompt: claim("lab-attempt", "attempt_prompt", `Lab attempt prompt for ${selectedFilePath}.`),
        possibleGapLabels: [claim("lab-gap", "gap_label", `Lab gap cites ${evidenceId}.`)],
        smallestRepairCopy: claim("lab-repair", "smallest_repair", `Lab repair cites ${evidenceId}.`),
        runtimeTrace: {
          providerId: "gemini-first",
          model: "playwright",
          prompt: "Return only JSON matching schema sibi-language-proposal.v1.",
          evidenceIdCount: Array.isArray(evidencePack.evidenceIds) ? evidencePack.evidenceIds.length : 0,
          rawResponse: { text: "playwright language response" },
        },
      }),
    });
  });

  await page.goto("/?workbench=1&sourceRoot=sibi&view=lab");

  const lab = page.getByLabel("Live runtime lab");
  await expect(lab).toBeVisible();
  await expect(lab).toContainText('"evidencePack"');
  await expect(lab).toContainText('"projectSignals"');
  await expect(lab).toContainText('"repoSearchStatus"');
  await expect(lab).toContainText('"runtimeTrace"');
  await expect(lab).toContainText("Return only JSON matching schema");
  await expect(lab).toContainText('"liveBoundary"');
  await expect(lab).toContainText('"liveReadinessHistory"');
  await expect(lab).toContainText('"liveMemoryProjection"');
  await expect(lab).toContainText('"liveMemoryExport"');
  await expect(lab).toContainText('"liveRuntimeUserExpectation"');
  await expect(page.getByLabel("Live boundary readiness gate")).toBeVisible();
  await expect(page.getByLabel("Live readiness gate output")).toBeVisible();

  const liveOwnership = page.getByLabel("Live ownership review");
  const labFacts = liveOwnership.locator("dl.labFacts.compact");
  await expect(labFacts).toBeVisible();
  await expect(labFacts).toContainText("Provider");
  await expect(labFacts).toContainText("playwright-route");
  await expect(labFacts).toContainText("Model");
  await expect(labFacts).toContainText("playwright");
  await expect(liveOwnership).toContainText("Provider contract");
  await expect(liveOwnership).toContainText("Question batch");
  await expect(liveOwnership).toContainText("Selected files");
  await expect(liveOwnership).toContainText("Focus candidates");
});

test("fixture workbench starts a guided ownership session without lab traces", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?workbench=1&fixture=1");

  await expect(page.getByLabel("Guided ownership review session")).toBeVisible();
  await expect(page.getByLabel("Repo inventory status")).toBeVisible();
  await expect(page.getByLabel("Current Sibar question")).toContainText("Repasá `src/api/session.ts`");
  await expect(page.getByLabel("Ownership derivation lab")).toHaveCount(0);

  const harnessBox = await page.locator(".ownershipPanel").boundingBox();
  const codeBox = await page.locator(".codePanel").boundingBox();
  expect(harnessBox?.width).toBeGreaterThan(430);
  expect(codeBox?.width).toBeGreaterThan(500);
});

test("fixture workbench exposes highest-risk boundary section in the compact review panel", async ({ page }) => {
  await page.goto("/?workbench=1&fixture=1");

  await expect(page.getByRole("heading", { level: 3, name: "Highest-risk boundary" })).toBeVisible();
  await expect(page.getByText("Responsibility claim:")).toBeVisible();
  await expect(page.getByText(/Open questions/)).toBeVisible();
  await expect(page.getByText(/Risk score/)).toBeVisible();
});

test("file-tree projection shows deterministic non-owned reasons", async ({ page }) => {
  await page.goto("/?workbench=1&fixture=1");

  await expect(page.locator(".fileTreePanel")).toContainText("gap: missing caller");
  await expect(page.locator(".fileTreePanel")).toContainText("questionable");
  await expect(page.locator(".fileTreePanel")).toContainText("gap: missing deletion path");
});

test("empty submit advances to the relation question and records no-answer gap", async ({ page }) => {
  await page.goto("/?workbench=1&fixture=1");

  await page.getByRole("button", { name: "Submit attempt" }).click();

  await expect(page.getByLabel("Current Sibar question")).toContainText("src/api/session.test.ts");
  await expect(page.getByLabel("Session observations")).toContainText("no answer");
});

test("valid submit advances to the relation question without recording a gap", async ({ page }) => {
  await page.goto("/?workbench=1&fixture=1");

  await page
    .getByLabel("Tu respuesta")
    .fill("The 204 branch returns null instead of JSON, so callers need to handle the new null contract.");
  await page.getByRole("button", { name: "Submit attempt" }).click();

  await expect(page.getByLabel("Current Sibar question")).toContainText("src/api/session.test.ts");
  await expect(page.getByText("Respuesta aceptada. Sibar avanza al siguiente check.")).toBeVisible();
  await expect(page.getByLabel("Session observations")).toHaveCount(0);
});

test("mark unknown advances to the next check", async ({ page }) => {
  await page.goto("/?workbench=1&fixture=1");

  await page.getByRole("button", { name: "Mark unknown" }).click();

  await expect(page.getByLabel("Current Sibar question")).toContainText("src/api/session.test.ts");
  await expect(page.getByLabel("Session observations")).toContainText("no answer");
});

test("inconclusive relation answer advances and records a caller/test gap", async ({ page }) => {
  await page.goto("/?workbench=1&fixture=1");

  await page.getByRole("button", { name: "Submit attempt" }).click();
  await page.getByLabel("Tu respuesta").fill("The test exists but I cannot connect it yet.");
  await page.getByRole("button", { name: "Submit attempt" }).click();

  await expect(page.getByLabel("Current Sibar question")).toContainText("src/runtime/consumer.ts");
  await expect(page.getByLabel("Session observations")).toContainText("could not connect caller/test");
  await expect(page.getByLabel("Minimal context hint ladder")).toBeVisible();
});

test("lab query alone opens live workbench without fixture traces", async ({ page }) => {
  await installLanguageProposalMock(page, "Live lab-only route query opens without fixture traces.");
  await page.goto("/?view=lab");

  await expect(page.getByLabel("Live ownership review")).toBeVisible();
  await expect(page.getByLabel("Guided ownership review session")).toHaveCount(0);
  await expect(page.getByLabel("Ownership derivation lab")).toHaveCount(0);
});

test("explicit fixture lab query keeps derivation traces available", async ({ page }) => {
  await page.goto("/?workbench=1&fixture=1&view=lab");

  await expect(page.getByLabel("Guided ownership review session")).toBeVisible();
  await expect(page.getByLabel("Ownership derivation lab")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Local trace lab" })).toBeVisible();
});

test("relation navigation preview appears in code panel and updates by selected file", async ({ page }) => {
  await page.goto("/?workbench=1&fixture=1&view=lab");

  const relationSection = page.getByLabel("Relation navigation preview");
  await expect(relationSection).toBeVisible();
  await expect(relationSection).toContainText(
    /Live content check|Checking live content availability|missing: unable to load live content/,
  );
  await expect(relationSection).toContainText("possible test");
  await expect(relationSection).toContainText("possible caller");

  await page.getByRole("button", { name: "Submit attempt" }).click();
  await page.getByLabel("Tu respuesta").fill("The test exists but I cannot connect it yet.");
  await page.getByRole("button", { name: "Submit attempt" }).click();

  await expect(page.getByLabel("Current Sibar question")).toContainText("src/runtime/consumer.ts");
  await expect(page.locator(".codePanel h1")).toContainText("src/runtime/consumer.ts");
  await expect(relationSection).toBeVisible();
  await expect(relationSection).toContainText("src/api/session.ts");
  await expect(relationSection).toContainText("src/api/session.test.ts");
});

test("relation evidence extraction is visible and updates with explicit gap reasons", async ({ page }) => {
  await page.goto("/?workbench=1&fixture=1&view=lab");

  const extractionSection = page.getByLabel("Relation evidence extraction");
  await expect(extractionSection).toBeVisible();
  await expect(extractionSection).toContainText("Observed:");
  await expect(extractionSection).toContainText("Active file imports");
  await expect(extractionSection).toContainText("Runtime candidates");
  await expect(extractionSection).toContainText("src/api/session.test.ts");
  await expect(extractionSection).toContainText("src/runtime/consumer.ts");

  await page.getByRole("button", { name: "Submit attempt" }).click();
  await expect(page.locator(".codePanel h1")).toContainText("src/api/session.test.ts");
  await expect(extractionSection).toContainText("Candidate callers:");
  await expect(extractionSection).not.toContainText("missing runtime contract");
  await expect(extractionSection).toContainText("Candidate tests:");
  await expect(extractionSection).toContainText("src/api/session.ts");
  await expect(extractionSection).toContainText("src/runtime/consumer.ts");

  await page.getByRole("button", { name: "Submit attempt" }).click();
  await expect(page.locator(".codePanel h1")).toContainText("src/runtime/consumer.ts");
  await expect(extractionSection).not.toContainText("missing runtime contract");
  await expect(extractionSection).not.toContainText("Relation gaps");
});

test("lab mode renders cognitive daily readout and updates from attempts", async ({ page }) => {
  await page.goto("/?workbench=1&fixture=1&view=lab");

  const readout = page.getByLabel("Cognitive daily readout");

  await expect(readout).toBeVisible();
  await expect(readout).toContainText("Ownership signals");
  await expect(readout).toContainText("Cognitive debt metric");
  await expect(readout).toContainText("Ready count: 0");
  await expect(readout).toContainText("No transfer attempt recorded yet.");

  await completeReviewSession(page);
  await page
    .getByLabel("Final boundary attempt")
    .fill("I do not know why this contract is safe yet.");
  await page.getByLabel("Self confidence").fill("95");
  await page.getByRole("button", { name: "Submit attempt" }).click();

  await expect(readout).toContainText("Outstanding gaps:");

  await page.getByRole("button", { name: "Retry after repair" }).click();
  await page
    .getByLabel("Final boundary attempt")
    .fill(
      "The `createSession` branch returns null for 204, and callers must guard with `if (!session)` before any privileged work.",
    );
  await page.getByLabel("Self confidence").fill("60");
  await page.getByRole("button", { name: "Submit attempt" }).click();

  await expect(readout).toContainText("Ready count: 1");
  await expect(readout).toContainText("Top 3 follow-up actions");

  await page.getByLabel("Transfer answer").fill("I cannot map this invariant to the related boundary yet.");
  await page.getByRole("button", { name: "Submit transfer answer" }).click();

  await expect(readout).toContainText("fail");
  await expect(readout).toContainText("Load hotspots");
  await expect(readout).toContainText(
    "Retry transfer using one invariant and one guard phrase from the related boundary.",
  );
});

test("line/range selection updates selection summary when code lines expose selectors", async ({ page }) => {
  await page.goto("/?workbench=1&fixture=1");

  const codeLines = page.locator(".codeViewport button");
  const firstLineButton = codeLines.first();
  const lineSelectable = (await codeLines.count()) > 0;
  if (!lineSelectable) {
    test.skip(true, "Code viewport line selectors are not exposed in this environment.");
  }

  await firstLineButton.click();
  await expect(page.getByText(/Current selection detail: /)).toBeVisible();
});

async function completeReviewSession(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Submit attempt" }).click();
  await expect(page.getByLabel("Current Sibar question")).toContainText("session.test.ts");

  await page
    .getByLabel("Tu respuesta")
    .fill(
      "The `src/api/session.ts` contract returns null for 204, and `src/api/session.test.ts` verifies this behavior.",
    );
  await page.getByRole("button", { name: "Submit attempt" }).click();
  await expect(page.getByLabel("Current Sibar question")).toContainText("runtime/consumer.ts");

  await page
    .getByLabel("Tu respuesta")
    .fill(
      "In `src/runtime/consumer.ts`, `createSession` from `src/api/session.ts` can return null, so the caller must guard and keep auth flow safe.",
    );
  await page.getByRole("button", { name: "Submit attempt" }).click();
  await expect(page.getByRole("heading", { name: "Session complete", level: 2 })).toBeVisible();
  await expect(page.getByText("Readiness gate: Not yet attempted.")).toBeVisible();
}

test("readiness attempt can be submitted after guided questions with anti-overconfidence block", async ({ page }) => {
  await page.goto("/?workbench=1&fixture=1");

  await completeReviewSession(page);
  await page
    .getByLabel("Final boundary attempt")
    .fill(
      "Null returns and the call must block privileged work when missing.",
    );
  await page.getByLabel("Self confidence").fill("95");
  await page.getByRole("button", { name: "Submit attempt" }).click();

  await expect(page.getByText("Readiness gate: repair-needed")).toBeVisible();
  await expect(page.getByText("Evidence fit:")).toBeVisible();
  await expect(page.getByText(/Evidence anchors:/)).toBeVisible();
  await expect(page.getByText("Smallest repair")).toBeVisible();
});

test("repair path exposes fix guidance and allows re-attempt", async ({ page }) => {
  await page.goto("/?workbench=1&fixture=1");

  await completeReviewSession(page);
  await page
    .getByLabel("Final boundary attempt")
    .fill(
      "Null returns and the call must block privileged work when missing.",
    );
  await page.getByLabel("Self confidence").fill("95");
  await page.getByRole("button", { name: "Submit attempt" }).click();
  await expect(page.getByRole("button", { name: "Retry after repair" })).toBeEnabled();

  await page.getByRole("button", { name: "Retry after repair" }).click();
  await page
    .getByLabel("Final boundary attempt")
    .fill(
      "The createSession branch returns null from 204; callers must guard with `if (!session)` before any privileged request so unauthenticated path stays safe.",
    );
  await page.getByLabel("Self confidence").fill("60");
  await page.getByRole("button", { name: "Submit attempt" }).click();

  await expect(page.getByText("Readiness gate: ready")).toBeVisible();
  await expect(page.getByText(/Transfer probe required/)).toBeVisible();
  await expect(
    page.locator('[aria-label="Current queue focus"] .stateBadge'),
  ).toHaveText("questionable");
  await page.getByLabel("Transfer answer").fill("Could be same boundary semantics if needed.");
  await page.getByRole("button", { name: "Submit transfer answer" }).click();
  await expect(page.getByText(/Transfer outcome: transfer_fail/i)).toBeVisible();
  await expect(page.locator('[aria-label="Current queue focus"] .stateBadge')).toHaveText("questionable");

  await page
    .getByLabel("Transfer answer")
    .fill(
      "In consumer.ts, this same guard still holds: if (!session) then return unauthenticated; keep the session-null invariant and privileged branch unchanged.",
    );
  await page.getByRole("button", { name: "Submit transfer answer" }).click();
  await expect(page.getByText(/Transfer outcome: transfer_pass/i)).toBeVisible();
  await expect(page.getByText("Continuity: 87%")).toBeVisible();
  await expect(page.getByText("Debt signal: 13%")).toBeVisible();
  await expect(
    page.locator('[aria-label="Current queue focus"] .stateBadge'),
  ).toHaveText("owned");
});

test("transfer skip keeps boundary non-owned and exposes explicit follow-up tasks", async ({ page }) => {
  await page.goto("/?workbench=1&fixture=1");

  await completeReviewSession(page);
  await page
    .getByLabel("Final boundary attempt")
    .fill(
      "The createSession branch can return null; callers must guard with `if (!session)` before any privileged request so unauthenticated path stays safe.",
    );
  await page.getByLabel("Self confidence").fill("60");
  await page.getByRole("button", { name: "Submit attempt" }).click();

  await expect(page.getByText("Readiness gate: ready")).toBeVisible();
  await page.getByRole("button", { name: "Skip transfer" }).click();
  await expect(page.getByText(/Transfer outcome: transfer_skip/i)).toBeVisible();
  await expect(page.locator('[aria-label="Current queue focus"] .stateBadge')).toHaveText("questionable");
  await expect(page.getByText("Recovery tasks")).toBeVisible();
  await expect(page.getByText("Mark this as a local follow-up before ownership is consolidated.")).toBeVisible();
});

test("repeated transfer failures expose a deterministic workspace handoff candidate and user authorization", async ({ page }) => {
  await page.goto("/?workbench=1&fixture=1");

  await completeReviewSession(page);
  await page
    .getByLabel("Final boundary attempt")
    .fill(
      "The createSession branch returns null from 204; callers must guard with `if (!session)` before any privileged request so unauthenticated path stays safe.",
    );
  await page.getByLabel("Self confidence").fill("60");
  await page.getByRole("button", { name: "Submit attempt" }).click();
  await expect(page.getByText("Readiness gate: ready")).toBeVisible();
  await expect(page.getByLabel("Workspace handoff candidate")).toHaveCount(0);
  await expect(page.getByLabel("Workspace handoff artifact")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Submit transfer answer" })).toBeVisible();

  await page
    .getByLabel("Transfer answer")
    .fill("I cannot map this invariant to the related consumer boundary right now.");
  await page.getByRole("button", { name: "Submit transfer answer" }).click();
  await expect(page.getByText(/Transfer outcome: transfer_fail/i)).toBeVisible();
  await expect(page.getByLabel("Workspace handoff candidate")).toHaveCount(0);
  await expect(page.getByLabel("Workspace handoff artifact")).toHaveCount(0);

  await page
    .getByLabel("Transfer answer")
    .fill("I still cannot justify the same invariant in the consumer boundary.");
  await page.getByRole("button", { name: "Submit transfer answer" }).click();
  await expect(page.getByText(/Transfer outcome: transfer_fail/i)).toBeVisible();
  await expect(page.getByLabel("Workspace handoff candidate")).toBeVisible();
  await expect(page.getByRole("button", { name: "Authorize workspace handoff" })).toBeEnabled();
  await expect(page.getByLabel("Workspace handoff artifact")).toHaveCount(0);

  await page.getByRole("button", { name: "Authorize workspace handoff" }).click();

  const handoffArtifact = page.getByLabel("Workspace handoff artifact");
  await expect(handoffArtifact).toBeVisible();
  await expect(handoffArtifact.getByText("Workspace handoff artifact")).toBeVisible();
  await expect(handoffArtifact.getByText("Source: diff")).toBeVisible();
  await expect(handoffArtifact.getByText("Read path")).toBeVisible();
  await expect(handoffArtifact.getByText("Required evidence")).toBeVisible();
  await expect(handoffArtifact.getByText("Blocking IDs")).toBeVisible();
  await expect(handoffArtifact.getByText("Blocked reasons")).toBeVisible();
  await expect(handoffArtifact.getByText("Suggested workspace seed:")).toBeVisible();
});

test("ownership memory records failed and retried attempts with export evidence refs", async ({ page }) => {
  await page.goto("/?workbench=1&fixture=1&view=lab");

  await completeReviewSession(page);
  await page
    .getByLabel("Final boundary attempt")
    .fill("I do not know.");
  await page.getByLabel("Self confidence").fill("95");
  await page.getByRole("button", { name: "Submit attempt" }).click();
  await expect(page.getByText("Readiness gate: blocked")).toBeVisible();

  await page.getByRole("button", { name: "Retry after repair" }).click();
  await page.getByLabel("Final boundary attempt").fill("Still not sure.");
  await page.getByLabel("Self confidence").fill("95");
  await page.getByRole("button", { name: "Submit attempt" }).click();
  await expect(page.getByText("Readiness gate: blocked")).toBeVisible();

  await page.getByRole("button", { name: "Retry after repair" }).click();
  await page
    .getByLabel("Final boundary attempt")
    .fill(
      "The createSession branch returns null from 204; callers must guard with `if (!session)` before privileged work and unauthenticated paths stop there.",
    );
  await page.getByLabel("Self confidence").fill("60");
  await page.getByRole("button", { name: "Submit attempt" }).click();
  await expect(page.getByText("Readiness gate: ready")).toBeVisible();

  const memoryPanel = page.getByLabel("Ownership memory store");
  await expect(memoryPanel).toBeVisible();
  await expect(memoryPanel).toContainText("4 events");
  await expect(memoryPanel).toContainText("Boundary history");
  await expect(memoryPanel).toContainText("evidence_refs:");
  await expect(memoryPanel).toContainText("revisit-calibration");

  await memoryPanel.getByText("Export bundle with evidence refs").click();
  await expect(memoryPanel.locator("pre")).toContainText("\"event_count\": 4");
  await expect(memoryPanel.locator("pre")).toContainText("memory-boundary-01-observation-observation-1");
  await expect(memoryPanel.locator("pre")).toContainText("\"evidence_refs\"");
});

test("lab mode renders agent-flow manifest and diagnostics", async ({ page }) => {
  await page.goto("/?workbench=1&fixture=1&view=lab");

  await expect(page.getByLabel("Agent-flow manifest")).toBeVisible();
  await expect(page.getByLabel("Agent action validation")).toBeVisible();
  await expect(page.getByLabel("Agent action validation")).toContainText("agent_action_allowed");
  await expect(page.getByLabel("Agent action validation")).toContainText("agent_action_rejected");
  await expect(page.getByLabel("Agent action validation")).toContainText("private_action_blocked");
  const manifestSection = page.getByLabel("Agent-flow manifest");
  const registrySection = manifestSection.getByLabel("Control authorization registry");
  const controlClaims = registrySection.getByRole("listitem");
  const voiceClaim = controlClaims.filter({ hasText: "agent-flow-control-voice" });
  const jarvisClaim = controlClaims.filter({ hasText: "agent-flow-control-jarvis" });

  await expect(voiceClaim).toHaveCount(1);
  await expect(jarvisClaim).toHaveCount(1);
  await expect(voiceClaim.filter({ hasText: "safePreconditions: Bind to post-v0.1 policy, Explicit opt-in required" })).toHaveCount(1);
  await expect(jarvisClaim.filter({ hasText: "safePreconditions: Bind to post-v0.1 policy, Explicit opt-in required" })).toHaveCount(1);
  await expect(voiceClaim.filter({ hasText: "postV01=true" })).toHaveCount(1);
  await expect(jarvisClaim.filter({ hasText: "postV01=true" })).toHaveCount(1);
  await expect(voiceClaim.filter({ hasText: "optInRequired=true" })).toHaveCount(1);
  await expect(jarvisClaim.filter({ hasText: "optInRequired=true" })).toHaveCount(1);
  await expect(controlClaims.filter({ hasText: "policy=post-v0.1+opt-in" })).toHaveCount(2);
});

test("agent-flow diagnostics are hidden in fixture default view", async ({ page }) => {
  await page.goto("/?workbench=1&fixture=1");

  await expect(page.getByLabel("Agent-flow manifest")).toHaveCount(0);
  await expect(page.getByLabel("Agent action validation")).toHaveCount(0);
});

test("lab mode renders Gemini evidence extraction panel and hides it in fixture default view", async ({ page }) => {
  await page.goto("/?workbench=1&fixture=1&view=lab");

  const geminiSection = page.getByLabel("Gemini evidence extraction");
  await expect(geminiSection).toBeVisible();
  await expect(geminiSection).toContainText("Gemini evidence extraction");
  await expect(geminiSection).toContainText("Provider: Gemini-first");
  await expect(geminiSection).toContainText("Overall disposition:");
  await expect(geminiSection).toContainText("Verified:");

  await page.goto("/?workbench=1&fixture=1");
  await expect(page.getByLabel("Gemini evidence extraction")).toHaveCount(0);
});

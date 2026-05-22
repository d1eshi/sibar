import { expect, test, type Page } from "@playwright/test";

test("default workbench starts a guided ownership session without lab traces", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(page.getByLabel("Guided ownership review session")).toBeVisible();
  await expect(page.getByLabel("Repo inventory status")).toBeVisible();
  await expect(page.getByLabel("Current Sibi question")).toContainText("Repasá `src/api/session.ts`");
  await expect(page.getByLabel("Ownership derivation lab")).toHaveCount(0);

  const harnessBox = await page.locator(".ownershipPanel").boundingBox();
  const codeBox = await page.locator(".codePanel").boundingBox();
  expect(harnessBox?.width).toBeGreaterThan(430);
  expect(codeBox?.width).toBeGreaterThan(500);
});

test("default workbench exposes highest-risk boundary section in the compact review panel", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 3, name: "Highest-risk boundary" })).toBeVisible();
  await expect(page.getByText("Responsibility claim:")).toBeVisible();
  await expect(page.getByText(/Open questions/)).toBeVisible();
  await expect(page.getByText(/Risk score/)).toBeVisible();
});

test("file-tree projection shows deterministic non-owned reasons", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".fileTreePanel")).toContainText("gap: missing caller");
  await expect(page.locator(".fileTreePanel")).toContainText("questionable");
  await expect(page.locator(".fileTreePanel")).toContainText("gap: missing deletion path");
});

test("empty submit advances to the relation question and records no-answer gap", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Submit attempt" }).click();

  await expect(page.getByLabel("Current Sibi question")).toContainText("src/api/session.test.ts");
  await expect(page.getByLabel("Session observations")).toContainText("no answer");
});

test("valid submit advances to the relation question without recording a gap", async ({ page }) => {
  await page.goto("/");

  await page
    .getByLabel("Tu respuesta")
    .fill("The 204 branch returns null instead of JSON, so callers need to handle the new null contract.");
  await page.getByRole("button", { name: "Submit attempt" }).click();

  await expect(page.getByLabel("Current Sibi question")).toContainText("src/api/session.test.ts");
  await expect(page.getByText("Respuesta aceptada. Sibi avanza al siguiente check.")).toBeVisible();
  await expect(page.getByLabel("Session observations")).toHaveCount(0);
});

test("mark unknown advances to the next check", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Mark unknown" }).click();

  await expect(page.getByLabel("Current Sibi question")).toContainText("src/api/session.test.ts");
  await expect(page.getByLabel("Session observations")).toContainText("no answer");
});

test("inconclusive relation answer advances and records a caller/test gap", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Submit attempt" }).click();
  await page.getByLabel("Tu respuesta").fill("The test exists but I cannot connect it yet.");
  await page.getByRole("button", { name: "Submit attempt" }).click();

  await expect(page.getByLabel("Current Sibi question")).toContainText("src/runtime/consumer.ts");
  await expect(page.getByLabel("Session observations")).toContainText("could not connect caller/test");
  await expect(page.getByLabel("Minimal context hint ladder")).toBeVisible();
});

test("lab query keeps derivation traces available", async ({ page }) => {
  await page.goto("/?view=lab");

  await expect(page.getByLabel("Guided ownership review session")).toBeVisible();
  await expect(page.getByLabel("Ownership derivation lab")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Local trace lab" })).toBeVisible();
});

test("relation navigation preview appears in code panel and updates by selected file", async ({ page }) => {
  await page.goto("/?view=lab");

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

  await expect(page.getByLabel("Current Sibi question")).toContainText("src/runtime/consumer.ts");
  await expect(page.locator(".codePanel h1")).toContainText("src/runtime/consumer.ts");
  await expect(relationSection).toBeVisible();
  await expect(relationSection).toContainText("src/api/session.ts");
  await expect(relationSection).toContainText("src/api/session.test.ts");
});

test("relation evidence extraction is visible and updates with explicit gap reasons", async ({ page }) => {
  await page.goto("/?view=lab");

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

test("line/range selection updates selection summary when code lines expose selectors", async ({ page }) => {
  await page.goto("/");

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
  await expect(page.getByLabel("Current Sibi question")).toContainText("session.test.ts");

  await page
    .getByLabel("Tu respuesta")
    .fill(
      "The `src/api/session.ts` contract returns null for 204, and `src/api/session.test.ts` verifies this behavior.",
    );
  await page.getByRole("button", { name: "Submit attempt" }).click();
  await expect(page.getByLabel("Current Sibi question")).toContainText("runtime/consumer.ts");

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
  await page.goto("/");

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
  await page.goto("/");

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
  await page.goto("/");

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
  await page.goto("/");

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

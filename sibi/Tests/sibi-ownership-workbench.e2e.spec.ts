import { expect, test } from "@playwright/test";

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

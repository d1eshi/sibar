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

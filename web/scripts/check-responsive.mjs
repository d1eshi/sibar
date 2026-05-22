import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const requireFromHere = createRequire(import.meta.url);

function loadPlaywright() {
  try {
    return requireFromHere("playwright");
  } catch (error) {
    const bundledModulesDir = path.join(
      homedir(),
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules",
    );
    const modulesDir = process.env.RESPONSIVE_CHECK_NODE_MODULES
      ?? (existsSync(path.join(bundledModulesDir, "playwright")) ? bundledModulesDir : null);

    if (!modulesDir) {
      throw new Error(
        "Playwright is required. Install it locally or set RESPONSIVE_CHECK_NODE_MODULES to a node_modules directory.",
        { cause: error },
      );
    }
    return createRequire(path.join(modulesDir, "responsive-check.cjs"))("playwright");
  }
}

const { chromium } = loadPlaywright();

const url = process.argv.find((arg) => arg.startsWith("http")) ?? "http://localhost:4173/";
const screenshotIndex = process.argv.indexOf("--screenshots");
const screenshotDir = screenshotIndex === -1 ? null : process.argv[screenshotIndex + 1] ?? "responsive-screenshots";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1180, height: 820 },
  { name: "desktop", width: 1440, height: 950 },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

if (screenshotDir) await mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const failures = [];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });

  try {
    await page.goto(url, { waitUntil: "networkidle" });

    const report = await page.evaluate(() => {
      const requiredSelectors = [
        ".poster-navbar",
        ".poster-hero",
        ".poster-artifacts",
        ".demo-mockup",
        ".poster-footer-cta",
      ];

      const rectFor = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          width: rect.width,
        };
      };

      const textOverflow = [...document.querySelectorAll("a, button, h1, h2, h3, strong, p, li, span")]
        .filter((element) => {
          const style = window.getComputedStyle(element);
          if (style.display === "none" || style.visibility === "hidden") return false;
          if (!element.textContent.trim()) return false;
          return element.scrollWidth > element.clientWidth + 2;
        })
        .slice(0, 8)
        .map((element) => ({
          selector: element.className || element.tagName.toLowerCase(),
          text: element.textContent.trim().replace(/\s+/g, " ").slice(0, 80),
        }));

      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        required: Object.fromEntries(requiredSelectors.map((selector) => [selector, rectFor(selector)])),
        textOverflow,
      };
    });

    assert(report.documentWidth <= report.viewportWidth + 1, `horizontal overflow: ${report.documentWidth}px > ${report.viewportWidth}px`);

    for (const [selector, rect] of Object.entries(report.required)) {
      assert(rect, `${selector} is missing`);
      assert(rect.width > 0 && rect.height > 0, `${selector} has no rendered size`);
      assert(rect.left >= -1, `${selector} overflows left`);
      assert(rect.right <= viewport.width + 1, `${selector} overflows right`);
    }

    assert(report.required[".poster-navbar"].bottom <= report.required[".poster-hero"].top + 2, "navbar overlaps hero");
    assert(report.required[".poster-hero"].bottom <= report.required[".poster-artifacts"].top + 2, "hero overlaps artifacts");
    assert(report.required[".poster-artifacts"].bottom <= report.required[".poster-footer-cta"].top + 2, "artifacts overlap footer");
    assert(report.textOverflow.length === 0, `text overflow: ${JSON.stringify(report.textOverflow)}`);

    if (screenshotDir) {
      await page.screenshot({
        fullPage: true,
        path: path.join(screenshotDir, `${viewport.name}-${viewport.width}.png`),
      });
    }

    console.log(`ok ${viewport.name} ${viewport.width}x${viewport.height}`);
  } catch (error) {
    failures.push(`${viewport.name} ${viewport.width}x${viewport.height}: ${error.message}`);
  } finally {
    await page.close();
  }
}

await browser.close();

if (failures.length) {
  console.error(failures.map((failure) => `not ok ${failure}`).join("\n"));
  process.exit(1);
}

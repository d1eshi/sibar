import test from "node:test";
import assert from "node:assert/strict";

import { assertHttpUrl, extractReadableArticle } from "../src/article-workspace.ts";

test("extractReadableArticle prefers article content over page chrome", () => {
  const article = extractReadableArticle({
    url: "https://example.com/learning-loop",
    html: `
      <html>
        <head><title>Learning Loop</title></head>
        <body>
          <nav>This navigation should not become reader content even when it is long enough to be tempting.</nav>
          <article>
            <h1>Learning Loop</h1>
            <p>Sibi keeps source-grounded notes close to the artifact so the learner can preserve evidence, confusion, and future practice context.</p>
            <p>Each saved selection becomes an atomic note that can later feed ownership checks, repair prompts, and readiness signals.</p>
          </article>
        </body>
      </html>
    `,
  });

  assert.equal(article.title, "Learning Loop");
  assert.equal(article.host, "example.com");
  assert.equal(article.paragraphs.length, 2);
  assert.match(article.paragraphs[0], /source-grounded notes/);
  assert.doesNotMatch(article.paragraphs.join(" "), /navigation/);
});

test("assertHttpUrl rejects non-web protocols", () => {
  assert.throws(() => assertHttpUrl("file:///tmp/article.html"), /Only http and https/);
  assert.equal(assertHttpUrl("https://example.com").hostname, "example.com");
});

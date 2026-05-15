import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { assertHttpUrl, extractReadableArticle } from "./article-workspace.ts";

const root = process.cwd();
const port = Number(process.env.PORT ?? 4177);
const demoPath = join(root, "docs", "demo", "article-workspace.html");

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/" || url.pathname === "/article-workspace") {
    const html = await readFile(demoPath, "utf8");
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  if (url.pathname === "/api/read") {
    try {
      const articleUrl = assertHttpUrl(url.searchParams.get("url") ?? "");
      const response = await fetch(articleUrl, {
        headers: {
          "accept": "text/html,application/xhtml+xml",
          "user-agent": "SibiArticleWorkspace/0.1",
        },
      });
      if (!response.ok) {
        return json(response.status, { error: `Article fetch failed with HTTP ${response.status}.` });
      }
      const html = await response.text();
      return json(200, { article: extractReadableArticle({ url: articleUrl.href, html }) });
    } catch (error) {
      return json(400, { error: error instanceof Error ? error.message : "Could not read article." });
    }
  }

  return new Response("Not found", { status: 404 });
}

const server = createServer((incoming, outgoing) => {
  const request = new Request(`http://${incoming.headers.host}${incoming.url}`, {
    method: incoming.method,
    headers: incoming.headers as HeadersInit,
  });

  void handle(request).then(async (response) => {
    outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  }).catch((error) => {
    outgoing.writeHead(500, { "content-type": "application/json; charset=utf-8" });
    outgoing.end(JSON.stringify({ error: error instanceof Error ? error.message : "Server error." }));
  });
});

server.listen(port, () => {
  console.log(`Sibi article workspace: http://localhost:${port}/article-workspace`);
});

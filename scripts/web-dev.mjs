import { join, normalize } from "node:path";

import { GET as readArticle } from "../web/api/read.mjs";

const root = join(process.cwd(), "web");
const port = Number(process.env.PORT ?? 4180);

function staticPath(pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const normalized = normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, "");
  return join(root, normalized);
}

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/read") {
      return readArticle(request);
    }

    if (url.pathname === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }

    const file = Bun.file(staticPath(url.pathname));
    if (await file.exists()) return new Response(file);

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Sibar reader dev: http://localhost:${server.port}`);

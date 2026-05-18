import { join, normalize } from "node:path";

import { GET as readArticle } from "../web/api/read.mjs";
import { handleRequest } from "../src/runtime.ts";

const root = join(process.cwd(), "web");
const port = Number(process.env.PORT ?? 4180);

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

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

    if (url.pathname === "/api/runtime" && request.method === "POST") {
      const payload = await readJson(request);
      return jsonResponse(handleRequest(payload));
    }

    if (url.pathname === "/api/workspace/session" && request.method === "POST") {
      const payload = await readJson(request);
      return jsonResponse(handleRequest({
        command: "start_workspace_session",
        payload: {
          root_path: process.cwd(),
          workspace_url: `http://127.0.0.1:${port}/workspace.html`,
          ...payload,
        },
      }));
    }

    if (url.pathname === "/api/workspace/attempt" && request.method === "POST") {
      const payload = await readJson(request);
      return jsonResponse(handleRequest({
        command: "submit_workspace_attempt",
        payload: {
          workspace_url: `http://127.0.0.1:${port}/workspace.html`,
          ...payload,
        },
      }));
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

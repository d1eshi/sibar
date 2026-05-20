import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

import { runRustWorkspaceCompiler } from "../../src/pedagogoai/workspace-compiler-runner.ts";

const repoRoot = process.cwd();
const appRoot = join(process.cwd(), "apps", "sibar-research-workspace");
const port = Number(process.env.PORT ?? 4190);

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function readBody(request: import("node:http").IncomingMessage): Promise<unknown> {
  return new Promise((resolveBody) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        resolveBody({});
        return;
      }
      try {
        resolveBody(JSON.parse(raw));
      } catch {
        resolveBody({});
      }
    });
  });
}

function sendJson(response: import("node:http").ServerResponse, payload: unknown, status = 200): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function staticPath(pathname: string): string {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, "");
  if (safePath.startsWith("/src/")) {
    return join(repoRoot, safePath);
  }
  return join(appRoot, safePath);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || `localhost:${port}`}`);

  if (url.pathname === "/api/workspace-intent/compiler" && request.method === "POST") {
    const payload = await readBody(request) as {
      input?: unknown;
      adapter?: "fixture" | "codex-exec";
      runCodex?: boolean;
      fixturePath?: string;
    };
    const result = runRustWorkspaceCompiler(payload.input as never, {
      adapter: payload.adapter || "codex-exec",
      runCodex: payload.runCodex === true,
      fixturePath: payload.fixturePath,
      rootPath: process.cwd(),
    });
    sendJson(response, result, result.runner.status === "failed" ? 500 : 200);
    return;
  }

  if (request.method !== "GET") {
    response.writeHead(405);
    response.end("Method not allowed");
    return;
  }

  const filePath = staticPath(url.pathname);
  if (!existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": contentTypes[extname(filePath)] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`Sibar research workspace dev: http://localhost:${port}`);
});

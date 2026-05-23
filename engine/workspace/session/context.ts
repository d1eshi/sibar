import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { basename, extname, join, relative, resolve, sep } from "node:path";

import type {
  ArtifactBoundary,
  EvidenceInventoryEntry,
  EvidenceRole,
  EvidenceSourceType,
  SkipRecord,
  UnknownZone,
} from "../../pedagogy/core/evidence-types.ts";
import {
  now,
  type ArtifactSession,
  type RuntimeWorkspaceSession,
} from "../../runtime/contracts.ts";

const DEFAULT_SKIP_DIRS = new Set([
  ".git",
  ".build",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo",
  "coverage",
  ".swiftpm",
  "DerivedData",
  ".cache",
]);

const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".swift",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
  ".yaml",
]);

export type WorkspaceContext = {
  root_path: string;
  file_inventory: Array<{
    path: string;
    role: EvidenceRole;
    source_type: EvidenceSourceType;
    size_bytes: number;
    line_count: number;
    excerpt: string;
  }>;
  source_control: RuntimeWorkspaceSession["source_control"];
};

export type WorkspaceInventory = {
  boundary: ArtifactBoundary;
  evidence: EvidenceInventoryEntry[];
  skip_records: SkipRecord[];
  unknown_zones: UnknownZone[];
  context: WorkspaceContext;
};

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function repoRelative(rootPath: string, absolutePath: string): string {
  const rel = relative(rootPath, absolutePath).split(sep).join("/");
  return rel || ".";
}

function isInside(candidate: string, root: string): boolean {
  return candidate === root || candidate.startsWith(root.endsWith(sep) ? root : `${root}${sep}`);
}

function isExcluded(path: string, excludedPaths: string[]): boolean {
  return excludedPaths.some((excluded) => isInside(path, excluded));
}

function roleForPath(relativePath: string): { role: EvidenceRole; source_type: EvidenceSourceType } {
  const lower = relativePath.toLowerCase();
  if (/(\btest\b|tests\/|__tests__|\.test\.|\.spec\.)/.test(lower)) {
    return { role: "behavior_oracle", source_type: "behavior_oracle" };
  }
  if (/^(docs\/|readme|changelog|agents\.md)/.test(lower)) {
    return { role: "intent", source_type: "intent" };
  }
  if (/(package\.json|tsconfig\.json|bun\.lock|pnpm-lock\.yaml|vercel\.json)$/.test(lower)) {
    return { role: "interface", source_type: "interface" };
  }
  if (/(engine\/|src\/|scripts\/|web\/)/.test(lower) || /\.(ts|tsx|js|jsx|mjs|swift|html|css)$/.test(lower)) {
    return { role: "implementation", source_type: "implementation" };
  }
  return { role: "unknown", source_type: "implementation" };
}

function excerpt(content: string): string {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .join(" ")
    .slice(0, 800);
}

function evidencePriority(entry: EvidenceInventoryEntry): number {
  if (entry.path === "package.json" || entry.path === "README.md" || entry.path === "AGENTS.md") return 0;
  if (entry.path.startsWith("engine/")) return 1;
  if (entry.path.startsWith("src/")) return 2;
  if (entry.role === "behavior_oracle") return 3;
  if (entry.path.startsWith("web/")) return 4;
  if (entry.path.startsWith("scripts/")) return 5;
  if (entry.path.startsWith("docs/")) return 6;
  if (entry.role === "interface") return 7;
  return 9;
}

function readTextEvidence(rootPath: string, absolutePath: string): EvidenceInventoryEntry | null {
  const stats = statSync(absolutePath);
  if (!stats.isFile() || stats.size > 256 * 1024) return null;
  const extension = extname(absolutePath).toLowerCase();
  const name = basename(absolutePath).toLowerCase();
  if (!TEXT_EXTENSIONS.has(extension) && !["readme", "agents.md", "changelog"].some((prefix) => name.startsWith(prefix))) {
    return null;
  }

  let content: string;
  try {
    content = readFileSync(absolutePath, "utf8");
  } catch {
    return null;
  }
  if (content.includes("\u0000")) return null;

  const path = repoRelative(rootPath, absolutePath);
  const classified = roleForPath(path);
  return {
    id: `EV-LIVE-${hashContent(path).slice(0, 8)}`,
    path,
    source_type: classified.source_type,
    size_bytes: stats.size,
    extension: extension || basename(absolutePath),
    role: classified.role,
    content_hash: hashContent(content),
    excerpt: excerpt(content),
    status: "inspected",
    line_count: content.split(/\r?\n/).length,
  };
}

function walkIncludedFiles(rootPath: string, includedPaths: string[], excludedPaths: string[]): string[] {
  const found: string[] = [];
  const visit = (dir: string): void => {
    if (isExcluded(dir, excludedPaths)) return;
    const entries = readdirSync(dir, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolute = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!DEFAULT_SKIP_DIRS.has(entry.name)) visit(absolute);
        continue;
      }
      if (entry.isFile()) found.push(absolute);
    }
  };

  for (const includedPath of includedPaths) {
    if (!existsSync(includedPath) || isExcluded(includedPath, excludedPaths)) continue;
    const stats = statSync(includedPath);
    if (stats.isDirectory()) visit(includedPath);
    if (stats.isFile()) found.push(includedPath);
  }

  return found
    .sort((left, right) => repoRelative(rootPath, left).localeCompare(repoRelative(rootPath, right)));
}

function git(rootPath: string, args: string[]): string {
  try {
    return execFileSync("git", args, {
      cwd: rootPath,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
      maxBuffer: 256 * 1024,
    }).trim();
  } catch {
    return "";
  }
}

export function collectSourceControl(rootPath: string): RuntimeWorkspaceSession["source_control"] {
  const gitRoot = git(rootPath, ["rev-parse", "--show-toplevel"]);
  const available = Boolean(gitRoot);
  return {
    available,
    branch: available ? git(rootPath, ["branch", "--show-current"]) || null : null,
    head: available ? git(rootPath, ["rev-parse", "--short", "HEAD"]) || null : null,
    status_short: available ? git(rootPath, ["status", "--short"]) : "",
    recent_log: available ? git(rootPath, ["log", "--oneline", "-8"]) : "",
    diff_stat: available ? git(rootPath, ["diff", "--stat"]) : "",
    diff_name_status: available ? git(rootPath, ["diff", "--name-status"]) : "",
  };
}

export function buildWorkspaceInventory(artifactSession: ArtifactSession): WorkspaceInventory {
  const rootPath = realpathSync(resolve(artifactSession.root_path));
  const includedPaths = artifactSession.included_paths.map((entry) => realpathSync(resolve(entry)));
  const excludedPaths = artifactSession.excluded_paths
    .filter((entry) => existsSync(entry))
    .map((entry) => realpathSync(resolve(entry)));
  const files = walkIncludedFiles(rootPath, includedPaths, excludedPaths);
  const evidence = files
    .map((file) => readTextEvidence(rootPath, file))
    .filter((entry): entry is EvidenceInventoryEntry => entry !== null)
    .sort((left, right) => evidencePriority(left) - evidencePriority(right) || left.path.localeCompare(right.path))
    .slice(0, 80);
  const evidenceRoles = Array.from(new Set(evidence.map((entry) => entry.role)));
  const sourceControl = collectSourceControl(rootPath);
  const boundary: ArtifactBoundary = {
    root_path: rootPath,
    source_type: "repository",
    included_sources: includedPaths.map((entry) => repoRelative(rootPath, entry)),
    excluded_sources: excludedPaths.map((entry) => repoRelative(rootPath, entry)),
    evidence_roles: evidenceRoles.length > 0 ? evidenceRoles : ["unknown"],
    entrypoints: evidence
      .filter((entry) => entry.role === "interface" || /(^|\/)(index|main|runtime|app)\./i.test(entry.path))
      .slice(0, 12)
      .map((entry) => entry.path),
    tests_as_oracles: evidence
      .filter((entry) => entry.role === "behavior_oracle")
      .slice(0, 16)
      .map((entry) => entry.path),
  };

  return {
    boundary,
    evidence,
    skip_records: [
      { id: "SKIP-LIVE-GIT", path: ".git", reason: "version_control", risk_if_ignored: "none" },
      { id: "SKIP-LIVE-DEPS", path: "node_modules", reason: "dependency_directory", risk_if_ignored: "none" },
      { id: "SKIP-LIVE-BUILD", path: "dist/build/.next/coverage", reason: "build_output", risk_if_ignored: "low" },
    ],
    unknown_zones: evidence.length === 0
      ? [{
          id: "UZ-LIVE-001",
          path: ".",
          reason: "No readable in-bound files were inventoried.",
          risk_if_ignored: "The LLM runner has no cited project evidence to inspect.",
          when_to_open: "Open the boundary or include readable source files before asking for project facts.",
        }]
      : [],
    context: {
      root_path: rootPath,
      source_control: sourceControl,
      file_inventory: evidence.slice(0, 40).map((entry) => ({
        path: entry.path,
        role: entry.role,
        source_type: entry.source_type,
        size_bytes: entry.size_bytes,
        line_count: entry.line_count ?? 0,
        excerpt: entry.excerpt,
      })),
    },
  };
}

/**
 * Supply-chain guard: scans mission-relevant repository surfaces for
 * npm/npx reliance, unpinned dlx, package-lock execution reliance,
 * destructive cleanup commands, remote static assets, and unjustified
 * new dependencies.
 *
 * Usage: pnpm run guard:supply-chain
 *
 * Exit 0 when clean. Exit 1 when violations are found.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { relative, resolve, basename } from "node:path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(import.meta.dirname ?? process.cwd(), "..", "..");
const GUARD_FILE = resolve(import.meta.dirname ?? process.cwd(), basename(import.meta.filename ?? "guard-supply-chain.ts"));

/** Baseline devDependencies present when pnpm migration started. */
const BASELINE_DEV_DEPENDENCIES = new Set([
  "@types/node",
  "typescript",
]);

/** Baseline dependencies (empty for this project). */
const BASELINE_DEPENDENCIES: Set<string> = new Set();

/** Files the guard scans for command-string violations (individual files). */
const SCAN_FILES = [
  "package.json",
  "docs/specs/README.md",
  "docs/specs/selfhost/00_spec_audit_matrix.md",
  "docs/specs/selfhost/01_selfhost_boundary.md",
  "docs/specs/selfhost/02_evaluation_contract.md",
  "docs/specs/selfhost/03_product_improvement_loop.md",
  "docs/specs/selfhost/04_selfhost_gap_detection_benchmark.md",
  "docs/specs/selfhost/05_public_demo_prototype.md",
  "docs/iterations/01_typescript_runtime_port.md",
  "docs/iterations/02_runtime_moat_audit.md",
  "docs/iterations/03_swift_bridge_candidate_audit.md",
  "docs/iterations/README.md",
  "docs/triage/iteration-spec-adaptation.md",
  "docs/triage/source-triage.md",
  "docs/triage/standalone-swift-app-audit.md",
  "docs/triage/swift-bridge-candidate-audit.md",
];

/** Directories to scan recursively for .html and .ts files. */
const SCAN_DIRS = [
  "docs/specs/selfhost/pilot/prototypes",
  "docs/demo",
  "src/scripts",
];

// Patterns that must NOT appear in mission-owned files.
// Each pattern is tested against every line of scanned files.
const FORBIDDEN_PATTERNS: Array<{ label: string; re: RegExp }> = [
  {
    label: "npm command",
    re: /\bnpm\s+(?:ci|install|run|test|exec|start|build|i|add|uninstall|remove|upgrade|update)\b/,
  },
  { label: "npx command", re: /\bnpx\s+/ },
  { label: "package-lock reliance", re: /\bpackage-lock(?:\.json)?\b/ },
  { label: "destructive rm", re: /\brm\b/ },
  { label: "destructive rm -rf", re: /\brm\s+-rf\b/ },
  { label: "destructive rm -r", re: /\brm\s+-r\b/ },
  { label: "destructive rmdir", re: /\brmdir\b/ },
  { label: "remote CDN script", re: /<script\s[^>]*src\s*=\s*"https?:\/\// },
  { label: "remote stylesheet", re: /<link\s[^>]*href\s*=\s*"https?:\/\/(?!fonts\.googleapis)[^"]*"/ },
  { label: "remote font", re: /https?:\/\/fonts\.googleapis\.com/ },
];

// ---------------------------------------------------------------------------
// Violation type
// ---------------------------------------------------------------------------

interface Violation {
  file: string;
  pattern: string;
  line?: number;
  excerpt?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rel(p: string): string {
  return relative(REPO_ROOT, p);
}

function readText(p: string): string {
  return readFileSync(p, "utf8");
}

function fileExists(p: string): boolean {
  return existsSync(p);
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

/**
 * Detect unpinned/unauthorized pnpm dlx usage in a line.
 * Allowed: `pnpm dlx lavish-axi@0.1.10` (pinned, authorized).
 * Rejected: any other `pnpm dlx ...` (unpinned or unauthorized package).
 */
function checkDlxLine(line: string): boolean {
  // Find all "pnpm dlx" occurrences
  const dlxRe = /\bpnpm\s+dlx\s+\S+/g;
  let match: RegExpExecArray | null;
  while ((match = dlxRe.exec(line)) !== null) {
    const fullMatch = match[0];
    // Allow only lavish-axi@0.1.10
    if (!/\bpnpm\s+dlx\s+lavish-axi@0\.1\.10\b/.test(fullMatch)) {
      return true; // violation
    }
  }
  return false;
}

/**
 * Check package.json scripts for npm/npx commands and unjustified dependencies.
 */
function checkPackageJsonScripts(): Violation[] {
  const violations: Violation[] = [];
  const pkgPath = resolve(REPO_ROOT, "package.json");
  if (!fileExists(pkgPath)) return violations;

  const pkg = JSON.parse(readText(pkgPath)) as {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  // --- Scripts ---
  if (pkg.scripts) {
    for (const [name, cmd] of Object.entries(pkg.scripts)) {
      if (/\bnpx\s+/.test(cmd)) {
        violations.push({
          file: rel(pkgPath),
          pattern: `npx in script "${name}"`,
          excerpt: cmd,
        });
      }
      if (/\bnpm\s+(?:ci|install|run|test|exec|start|build|i|add|uninstall|remove|upgrade|update)\b/.test(cmd)) {
        violations.push({
          file: rel(pkgPath),
          pattern: `npm command in script "${name}"`,
          excerpt: cmd,
        });
      }
    }
  }

  // --- Unjustified new dependencies ---
  if (pkg.dependencies) {
    for (const dep of Object.keys(pkg.dependencies)) {
      if (!BASELINE_DEPENDENCIES.has(dep)) {
        violations.push({
          file: rel(pkgPath),
          pattern: `unjustified new dependency: "${dep}"`,
        });
      }
    }
  }
  if (pkg.devDependencies) {
    for (const dep of Object.keys(pkg.devDependencies)) {
      if (!BASELINE_DEV_DEPENDENCIES.has(dep)) {
        violations.push({
          file: rel(pkgPath),
          pattern: `unjustified new devDependency: "${dep}"`,
        });
      }
    }
  }

  return violations;
}

/**
 * Check a single file for forbidden command-string patterns.
 */
function checkFilePatterns(filePath: string): Violation[] {
  const violations: Violation[] = [];
  if (!fileExists(filePath)) return violations;

  const content = readText(filePath);
  const lines = content.split("\n");

  for (const { label, re } of FORBIDDEN_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) {
        violations.push({
          file: rel(filePath),
          pattern: label,
          line: i + 1,
          excerpt: lines[i].trim().slice(0, 120),
        });
      }
    }
  }

  // Separately check for unpinned dlx (needs context-aware matching)
  for (let i = 0; i < lines.length; i++) {
    if (checkDlxLine(lines[i])) {
      violations.push({
        file: rel(filePath),
        pattern: "unpinned or unauthorized dlx",
        line: i + 1,
        excerpt: lines[i].trim().slice(0, 120),
      });
    }
  }

  return violations;
}

/**
 * Walk a directory recursively, yielding files with the given extension.
 */
function* walkDir(dir: string, ext: string): Generator<string> {
  try {
    for (const entry of readdirSync(dir)) {
      const full = resolve(dir, entry);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) {
        yield* walkDir(full, ext);
      } else if (st.isFile() && full.endsWith(ext)) {
        yield full;
      }
    }
  } catch {
    // Skip directories we can't read
  }
}

/**
 * Scan prototype HTML files recursively.
 */
function checkPrototypeFiles(): Violation[] {
  const violations: Violation[] = [];
  const protoDir = resolve(REPO_ROOT, "docs/specs/selfhost/pilot/prototypes");
  if (!fileExists(protoDir)) return violations;

  for (const file of walkDir(protoDir, ".html")) {
    violations.push(...checkFilePatterns(file));
  }
  return violations;
}

/**
 * Scan demo HTML files (public static demo).
 */
function checkDemoFiles(): Violation[] {
  const violations: Violation[] = [];
  const demoDir = resolve(REPO_ROOT, "docs/demo");
  if (!fileExists(demoDir)) return violations;

  for (const file of walkDir(demoDir, ".html")) {
    violations.push(...checkFilePatterns(file));
  }
  return violations;
}

/**
 * Scan script TS files, excluding the guard itself.
 */
function checkScriptFiles(): Violation[] {
  const violations: Violation[] = [];
  const scriptsDir = resolve(REPO_ROOT, "src/scripts");
  if (!fileExists(scriptsDir)) return violations;

  for (const file of walkDir(scriptsDir, ".ts")) {
    // Skip the guard file itself to avoid self-detection
    if (resolve(file) === GUARD_FILE) continue;
    violations.push(...checkFilePatterns(file));
  }
  return violations;
}

/**
 * Check that pnpm is the declared package manager and pnpm-lock.yaml exists.
 */
function checkLockfileGuidance(): Violation[] {
  const violations: Violation[] = [];

  // Check if package.json has a packageManager field pointing to pnpm
  const pkgPath = resolve(REPO_ROOT, "package.json");
  if (fileExists(pkgPath)) {
    const pkg = JSON.parse(readText(pkgPath)) as { packageManager?: string };
    if (!pkg.packageManager || !pkg.packageManager.startsWith("pnpm@")) {
      violations.push({
        file: rel(pkgPath),
        pattern: "missing or non-pnpm packageManager field",
      });
    }
  }

  // Check pnpm-lock.yaml exists
  const pnpmLockPath = resolve(REPO_ROOT, "pnpm-lock.yaml");
  if (!fileExists(pnpmLockPath)) {
    violations.push({
      file: rel(REPO_ROOT),
      pattern: "pnpm-lock.yaml is missing",
    });
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function runGuard(): { violations: Violation[]; exitCode: number } {
  const allViolations: Violation[] = [];

  // 1. package.json scripts & dependencies
  allViolations.push(...checkPackageJsonScripts());

  // 2. Lockfile guidance
  allViolations.push(...checkLockfileGuidance());

  // 3. Scan listed spec/docs files
  for (const relPath of SCAN_FILES) {
    const fullPath = resolve(REPO_ROOT, relPath);
    if (fileExists(fullPath)) {
      allViolations.push(...checkFilePatterns(fullPath));
    }
  }

  // 4. Scan prototype files recursively
  allViolations.push(...checkPrototypeFiles());

  // 5. Scan demo files recursively
  allViolations.push(...checkDemoFiles());

  // 6. Scan script files (excluding guard itself)
  allViolations.push(...checkScriptFiles());

  // Deduplicate by file+pattern+line
  const seen = new Set<string>();
  const unique = allViolations.filter((v) => {
    const key = `${v.file}:${v.pattern}:${v.line ?? 0}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { violations: unique, exitCode: unique.length > 0 ? 1 : 0 };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("guard-supply-chain.ts") ||
    process.argv[1].endsWith("guard-supply-chain"));

if (isMain) {
  const { violations, exitCode } = runGuard();

  if (violations.length === 0) {
    console.log("✅ Supply-chain guard passed — no violations found.");
  } else {
    console.error(`❌ Supply-chain guard found ${violations.length} violation(s):\n`);
    for (const v of violations) {
      console.error(`  ${v.file}${v.line ? `:${v.line}` : ""}  [${v.pattern}]`);
      if (v.excerpt) console.error(`    ${v.excerpt}`);
    }
    console.error("");
  }

  process.exit(exitCode);
}

// Exports for testing
export { runGuard, checkPackageJsonScripts, checkFilePatterns, checkLockfileGuidance, checkDlxLine, checkDemoFiles, FORBIDDEN_PATTERNS, BASELINE_DEV_DEPENDENCIES, BASELINE_DEPENDENCIES, REPO_ROOT, SCAN_FILES, SCAN_DIRS };
export type { Violation };

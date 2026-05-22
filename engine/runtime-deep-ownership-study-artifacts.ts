import { dirname, isAbsolute, relative, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";

import type { EvidenceRef } from "./pedagogy/core/evidence-types.ts";
import type { StudyArtifactWriteResult } from "./runtime-deep-ownership-intelligence-types.ts";

export type StudyArtifactWriteInput = {
  id?: string;
  artifact_path: string;
  study_directory: string;
  content: string;
  source_evidence: EvidenceRef[];
  product_paths?: string[];
  created_at?: string;
};

type StudyPathResolution = {
  blocked: boolean;
  violation_reason: string | null;
  canonical_path: string | null;
  relative_path: string | null;
  canonical_study_directory: string | null;
};

function createUniqueDefaultId(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function hasRawParentTraversal(candidatePath: string): boolean {
  return candidatePath
    .split(/[\\/]+/)
    .some((segment) => segment === "..");
}

function isWithinPath(basePath: string, candidatePath: string): boolean {
  const rel = relative(basePath, candidatePath);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function nearestExistingAncestor(path: string): string | null {
  let current = resolve(path);
  const seen = new Set<string>();

  while (!existsSync(current)) {
    if (seen.has(current)) return null;
    seen.add(current);
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }

  return current;
}

function resolveStudyPath(
  artifactPath: string,
  studyDirectory: string,
): StudyPathResolution {
  const requestedPath = String(artifactPath || "").trim();
  if (!requestedPath) {
    return {
      blocked: true,
      violation_reason: "Study artifact path must be a non-empty string.",
      canonical_path: null,
      relative_path: null,
      canonical_study_directory: null,
    };
  }

  if (hasRawParentTraversal(requestedPath)) {
    return {
      blocked: true,
      violation_reason: `Study artifact path '${requestedPath}' contains parent-directory traversal.`,
      canonical_path: null,
      relative_path: null,
      canonical_study_directory: null,
    };
  }

  const absoluteStudyDirectory = resolve(studyDirectory);
  if (!existsSync(absoluteStudyDirectory) || !statSync(absoluteStudyDirectory).isDirectory()) {
    return {
      blocked: true,
      violation_reason: `Study directory '${studyDirectory}' is missing or not a directory.`,
      canonical_path: null,
      relative_path: null,
      canonical_study_directory: null,
    };
  }

  const canonicalStudyDirectory = realpathSync(absoluteStudyDirectory);
  const targetPath = isAbsolute(requestedPath)
    ? resolve(requestedPath)
    : resolve(canonicalStudyDirectory, requestedPath);

  if (!isWithinPath(canonicalStudyDirectory, targetPath)) {
    return {
      blocked: true,
      violation_reason: `Study artifact path '${requestedPath}' escapes the study directory.`,
      canonical_path: null,
      relative_path: null,
      canonical_study_directory: canonicalStudyDirectory,
    };
  }

  const existingAncestor = nearestExistingAncestor(targetPath);
  if (!existingAncestor) {
    return {
      blocked: true,
      violation_reason: `Unable to resolve an existing parent for '${requestedPath}'.`,
      canonical_path: null,
      relative_path: null,
      canonical_study_directory: canonicalStudyDirectory,
    };
  }

  const canonicalAncestor = realpathSync(existingAncestor);
  if (!isWithinPath(canonicalStudyDirectory, canonicalAncestor)) {
    return {
      blocked: true,
      violation_reason: `Study artifact path '${requestedPath}' escapes via symlink or parent alias.`,
      canonical_path: null,
      relative_path: null,
      canonical_study_directory: canonicalStudyDirectory,
    };
  }

  if (existsSync(targetPath) && lstatSync(targetPath).isSymbolicLink()) {
    const canonicalTarget = realpathSync(targetPath);
    if (!isWithinPath(canonicalStudyDirectory, canonicalTarget)) {
      return {
        blocked: true,
        violation_reason: `Study artifact path '${requestedPath}' resolves through an out-of-scope symlink.`,
        canonical_path: null,
        relative_path: null,
        canonical_study_directory: canonicalStudyDirectory,
      };
    }
  }

  return {
    blocked: false,
    violation_reason: null,
    canonical_path: targetPath,
    relative_path: relative(canonicalStudyDirectory, targetPath),
    canonical_study_directory: canonicalStudyDirectory,
  };
}

export function writeStudyArtifact(input: StudyArtifactWriteInput): StudyArtifactWriteResult {
  const resolved = resolveStudyPath(input.artifact_path, input.study_directory);
  if (resolved.blocked) {
    return { blocked: true, violation_reason: resolved.violation_reason, record: null };
  }

  const canonicalPath = resolved.canonical_path!;
  const canonicalStudyDirectory = resolved.canonical_study_directory!;
  for (const productPath of input.product_paths ?? []) {
    const canonicalProductPath = existsSync(productPath)
      ? realpathSync(productPath)
      : resolve(productPath);
    if (isWithinPath(canonicalProductPath, canonicalPath)) {
      return {
        blocked: true,
        violation_reason: `Study artifact path '${canonicalPath}' overlaps product path '${productPath}'.`,
        record: null,
      };
    }
  }

  mkdirSync(dirname(canonicalPath), { recursive: true });
  writeFileSync(canonicalPath, input.content, "utf8");

  return {
    blocked: false,
    violation_reason: null,
    record: {
      id: input.id ?? createUniqueDefaultId("STUDY-ARTIFACT"),
      relative_path: resolved.relative_path!,
      canonical_path: canonicalPath,
      study_directory: canonicalStudyDirectory,
      study_only: true,
      source_evidence: input.source_evidence,
      cited_evidence_ids: input.source_evidence.map((entry) => entry.evidence_id),
      created_at: input.created_at ?? new Date().toISOString(),
    },
  };
}

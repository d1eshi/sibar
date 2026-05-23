import { isAbsolute, normalize, relative, resolve } from "node:path";

import type {
  ArtifactBoundary,
} from "../pedagogy/core/evidence-types.ts";
import type {
  DeepOwnershipFixture,
  ValidationIssue,
} from "../pedagogy/core/loop-types.ts";

function issue(field: string, message: string): ValidationIssue {
  return { field, message, severity: "error" };
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

function toAbsolutePath(candidatePath: string, rootPath: string): string {
  return isAbsolute(candidatePath)
    ? resolve(candidatePath)
    : resolve(rootPath, candidatePath);
}

function normalizeExcludedBase(excludedPath: string): string {
  return excludedPath
    .replace(/\/\*\*(\/.+)?$/, "")
    .replace(/\/\*$/, "")
    .replace(/\/\*\.\w+$/, "");
}

/**
 * Check whether a path is within the declared artifact boundary.
 */
export function isPathInBoundary(
  candidatePath: string,
  boundary: ArtifactBoundary,
): boolean {
  const rootPath = resolve(boundary.root_path);
  const candidateAbsolutePath = toAbsolutePath(candidatePath, rootPath);

  for (const includedPath of boundary.included_sources) {
    const includedAbsolutePath = resolve(rootPath, includedPath);
    if (isWithinPath(includedAbsolutePath, candidateAbsolutePath)) {
      return true;
    }
  }

  return false;
}

/**
 * Validate that all evidence inventory paths are within the declared boundary
 * and not in excluded sources.
 */
export function validateBoundaryEnforcement(
  fixture: DeepOwnershipFixture,
  rootPath: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const includedAbsolutePaths = fixture.artifact_boundary.included_sources.map((includedPath) =>
    resolve(rootPath, includedPath)
  );

  for (const entry of fixture.evidence_inventory) {
    const entryAbsolutePath = resolve(rootPath, entry.path);
    const included = includedAbsolutePaths.some((includedPath) =>
      isWithinPath(includedPath, entryAbsolutePath)
    );

    if (!included) {
      issues.push(issue(
        `evidence_inventory[${entry.id}]`,
        `Evidence path '${entry.path}' is outside the declared artifact boundary included_sources`,
      ));
    }
  }

  if (fixture.out_of_bound_refs && fixture.out_of_bound_refs.length > 0) {
    for (const ref of fixture.out_of_bound_refs) {
      issues.push(issue(
        "out_of_bound_refs",
        `Out-of-bound evidence ref '${ref.evidence_id}' at ${ref.file_path}:${ref.start_line} was not blocked`,
      ));
    }
  }

  for (const artifact of fixture.thinking_artifacts) {
    for (const ref of artifact.source_evidence) {
      const refAbsolutePath = resolve(rootPath, ref.file_path);
      const included = includedAbsolutePaths.some((includedPath) =>
        isWithinPath(includedPath, refAbsolutePath)
      );
      if (!included) {
        issues.push(issue(
          `thinking_artifacts[${artifact.id}].source_evidence`,
          `Evidence ref '${ref.evidence_id}' at ${ref.file_path}:${ref.start_line} is outside the declared boundary`,
        ));
      }
    }
  }

  return issues;
}

/**
 * Check whether a given file path escapes the declared artifact boundary
 * via raw parent-directory traversal, absolute paths outside root, or excluded paths.
 */
export function checkBoundaryEscape(
  candidatePath: string,
  rootPath: string,
  boundary: ArtifactBoundary,
): { blocked: boolean; reason?: string } {
  if (hasRawParentTraversal(candidatePath)) {
    return { blocked: true, reason: `Path '${candidatePath}' contains parent-directory traversal` };
  }

  const normalizedRootPath = resolve(normalize(rootPath));
  const candidateAbsolutePath = toAbsolutePath(candidatePath, normalizedRootPath);

  if (!isWithinPath(normalizedRootPath, candidateAbsolutePath)) {
    return {
      blocked: true,
      reason: `Absolute path '${candidatePath}' escapes declared root '${rootPath}'`,
    };
  }

  for (const excludedPath of boundary.excluded_sources) {
    const excludedBasePath = normalizeExcludedBase(excludedPath);
    const excludedAbsolutePath = resolve(normalizedRootPath, excludedBasePath);
    if (isWithinPath(excludedAbsolutePath, candidateAbsolutePath)) {
      return { blocked: true, reason: `Path '${candidatePath}' matches excluded pattern '${excludedPath}'` };
    }
  }

  return { blocked: false };
}

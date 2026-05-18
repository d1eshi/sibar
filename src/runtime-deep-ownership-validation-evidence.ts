import {
  RECOGNIZED_EVIDENCE_ROLES,
  type EvidenceInventoryEntry,
  type EvidenceRole,
} from "./runtime-deep-ownership-evidence-types.ts";
import type { ValidationIssue } from "./runtime-deep-ownership-loop-types.ts";

export function issue(field: string, message: string): ValidationIssue {
  return { field, message, severity: "error" };
}

export function warning(field: string, message: string): ValidationIssue {
  return { field, message, severity: "warning" };
}

/**
 * Validate that an EvidenceRef has all required fields: evidence_id, file_path,
 * start_line, end_line, excerpt, and a recognized role.
 */
export function validateEvidenceRef(ref: unknown, context: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!ref || typeof ref !== "object") {
    issues.push(issue(context, "Evidence ref is not an object"));
    return issues;
  }
  const r = ref as Record<string, unknown>;

  if (!r.evidence_id || typeof r.evidence_id !== "string") {
    issues.push(issue(`${context}.evidence_id`, "Missing or invalid evidence_id"));
  }
  if (!r.file_path || typeof r.file_path !== "string") {
    issues.push(issue(`${context}.file_path`, "Missing or invalid file_path"));
  }
  if (typeof r.start_line !== "number" || (r.start_line as number) < 0) {
    issues.push(issue(`${context}.start_line`, "Missing or invalid start_line"));
  }
  if (typeof r.end_line !== "number" || (r.end_line as number) < (r.start_line as number)) {
    issues.push(issue(`${context}.end_line`, "Missing or invalid end_line"));
  }
  if (!r.excerpt || typeof r.excerpt !== "string" || r.excerpt.trim().length === 0) {
    issues.push(issue(`${context}.excerpt`, "Missing or empty excerpt"));
  }
  if (!r.role || !RECOGNIZED_EVIDENCE_ROLES.includes(r.role as EvidenceRole)) {
    issues.push(issue(`${context}.role`, `Unrecognized or missing role '${r.role}'`));
  }
  return issues;
}

/**
 * Validate that an evidence ID has the expected stable format.
 */
export function validateEvidenceId(entry: EvidenceInventoryEntry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!/^EV-\d{3}$/.test(entry.id)) {
    issues.push(issue("id", `Evidence ID ${entry.id} does not match expected format EV-NNN`));
  }
  return issues;
}

/**
 * Validate that an evidence entry has all required fields and valid role.
 */
export function validateEvidenceEntry(entry: unknown, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const e = entry as EvidenceInventoryEntry;
  if (!e || typeof e !== "object") {
    issues.push(issue(`evidence_inventory[${index}]`, "Entry is not an object"));
    return issues;
  }

  if (!e.id || typeof e.id !== "string") {
    issues.push(issue(`evidence_inventory[${index}].id`, "Missing or invalid evidence ID"));
  } else {
    issues.push(...validateEvidenceId(e));
  }

  if (!e.path || typeof e.path !== "string") {
    issues.push(issue(`evidence_inventory[${index}].path`, "Missing or invalid path"));
  }

  if (!e.role || !RECOGNIZED_EVIDENCE_ROLES.includes(e.role)) {
    issues.push(issue(
      `evidence_inventory[${index}].role`,
      `Unrecognized role '${e.role}'. Must be one of: ${RECOGNIZED_EVIDENCE_ROLES.join(", ")}`,
    ));
  }

  if (!e.content_hash || typeof e.content_hash !== "string") {
    issues.push(issue(`evidence_inventory[${index}].content_hash`, "Missing or invalid content_hash"));
  }

  if (!e.source_type || typeof e.source_type !== "string") {
    issues.push(issue(`evidence_inventory[${index}].source_type`, "Missing or invalid source_type"));
  }

  if (typeof e.size_bytes !== "number" || e.size_bytes <= 0) {
    issues.push(issue(`evidence_inventory[${index}].size_bytes`, "Missing or invalid size_bytes"));
  }

  return issues;
}

/**
 * Validate that skip records have required fields and valid reasons.
 */
export function validateSkipRecord(record: unknown, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const r = record as {
    id: string;
    path: string;
    reason: string;
    risk_if_ignored: string;
  };
  if (!r || typeof r !== "object") {
    issues.push(issue(`skip_records[${index}]`, "Skip record is not an object"));
    return issues;
  }

  if (!r.id || typeof r.id !== "string") {
    issues.push(issue(`skip_records[${index}].id`, "Missing or invalid skip record ID"));
  }

  if (!r.path || typeof r.path !== "string") {
    issues.push(issue(`skip_records[${index}].path`, "Missing or invalid path in skip record"));
  }

  if (!r.reason || typeof r.reason !== "string") {
    issues.push(issue(`skip_records[${index}].reason`, "Missing or invalid reason in skip record"));
  }

  if (!r.risk_if_ignored || !["none", "low", "medium", "high"].includes(r.risk_if_ignored)) {
    issues.push(issue(`skip_records[${index}].risk_if_ignored`, `Invalid risk_if_ignored '${r.risk_if_ignored}'`));
  }

  return issues;
}

/**
 * Validate that unknown zones have required fields.
 */
export function validateUnknownZone(zone: unknown, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const z = zone as {
    id: string;
    path: string;
    reason: string;
    when_to_open: string;
    risk_if_ignored: string;
  };
  if (!z || typeof z !== "object") {
    issues.push(issue(`unknown_zones[${index}]`, "Unknown zone is not an object"));
    return issues;
  }

  if (!z.id || typeof z.id !== "string") {
    issues.push(issue(`unknown_zones[${index}].id`, "Missing or invalid unknown zone ID"));
  }

  if (!z.path || typeof z.path !== "string") {
    issues.push(issue(`unknown_zones[${index}].path`, "Missing or invalid path in unknown zone"));
  }

  if (!z.reason || typeof z.reason !== "string" || z.reason.trim().length === 0) {
    issues.push(issue(`unknown_zones[${index}].reason`, "Missing or empty reason in unknown zone"));
  }

  if (!z.when_to_open || typeof z.when_to_open !== "string" || z.when_to_open.trim().length === 0) {
    issues.push(issue(`unknown_zones[${index}].when_to_open`, "Missing or empty when_to_open in unknown zone"));
  }

  if (!z.risk_if_ignored || typeof z.risk_if_ignored !== "string" || z.risk_if_ignored.trim().length === 0) {
    issues.push(issue(`unknown_zones[${index}].risk_if_ignored`, "Missing or empty risk_if_ignored in unknown zone"));
  }

  return issues;
}

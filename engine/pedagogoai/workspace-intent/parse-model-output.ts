import type { WorkspacePlan } from "./contracts.ts";

type BalancedCandidate = {
  value: string;
  startIndex: number;
};

function parseCandidate(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractFencedJson(raw: string): string[] {
  const matches = [...raw.matchAll(/```(?:json)?\n([\s\S]*?)```/gi)];
  return matches
    .map((entry) => entry[1].trim())
    .filter((candidate) => candidate.length > 0);
}

function extractTopLevelJsonCandidates(raw: string): string[] {
  const candidates: BalancedCandidate[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "{") {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
      continue;
    }
    if (char === "}") {
      if (depth === 0) continue;
      depth -= 1;
      if (depth === 0 && start >= 0) {
        candidates.push({ startIndex: start, value: raw.slice(start, index + 1) });
        start = -1;
      }
    }
  }

  return candidates
    .sort((a, b) => a.startIndex - b.startIndex)
    .map((candidate) => candidate.value);
}

function parseFromCandidates(candidates: string[]): WorkspacePlan | null {
  for (const candidate of candidates) {
    const parsed = parseCandidate(candidate);
    if (!parsed) continue;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as WorkspacePlan;
    }
  }
  return null;
}

export function parseModelOutput(raw: string): WorkspacePlan {
  const trimmed = String(raw ?? "").trim();

  if (!trimmed) {
    throw new Error("model_output_empty");
  }

  const direct = parseCandidate(trimmed);
  if (direct && typeof direct === "object" && !Array.isArray(direct)) {
    return direct as WorkspacePlan;
  }

  const fenced = parseFromCandidates(extractFencedJson(raw));
  if (fenced) return fenced;

  const balanced = parseFromCandidates(extractTopLevelJsonCandidates(raw));
  if (balanced) return balanced;

  throw new Error("model_output_invalid_or_unclosed_json");
}

export function parseModelOutputStrict(raw: string): WorkspacePlan {
  try {
    return parseModelOutput(raw);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("model_output_parse_error");
  }
}

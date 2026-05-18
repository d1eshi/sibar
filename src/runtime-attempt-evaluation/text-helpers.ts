import type { ThinkingArtifact, UserOperation } from "../runtime-deep-ownership.ts";

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "not",
  "are",
  "has",
  "its",
]);

export function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_-]+/)
    .filter((token) => token.length > 2)
    .filter((token) => !STOP_WORDS.has(token));
}

export function scoreKeywordMatch(text: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;

  let matched = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      matched += 1;
    }
  }
  return matched / keywords.length;
}

export function extractArtifactTerminology(
  artifact: ThinkingArtifact,
  operation: UserOperation,
): Set<string> {
  const terms = new Set<string>();
  const sources = [
    artifact.title,
    artifact.purpose,
    operation.prompt,
    ...artifact.success_criteria,
    ...operation.success_criteria,
    ...artifact.source_evidence.map((ref) => ref.excerpt),
  ];

  for (const source of sources) {
    for (const term of extractKeywords(source)) {
      terms.add(term);
    }
  }

  return terms;
}

export function isTechnicalTerm(term: string): boolean {
  const technicalPatterns = [
    /^[a-z]+_[a-z]+$/,
    /^(api|cli|ui|db|io|id|os|vm|ai|ml|rl)$/i,
    /^(repo|path|file|line|hash|ref|id|url)$/i,
    /^(async|await|promise|callback|stream|pipe)$/i,
    /^(import|export|require|module|package)$/i,
  ];

  return technicalPatterns.some((pattern) => pattern.test(term)) || term.length > 7;
}

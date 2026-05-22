const FILE_TREE_SNIPPET_PREFIXES = [
  "gap: missing caller",
  "gap: missing deletion path",
  "blocked: prerequisite",
  "questionable",
] as const;

const FILE_TREE_SNIPPET_MAX_LENGTH = 26;

export function makeReasonSnippet(reason?: string): string {
  if (!reason) return "";
  const trimmed = reason.trim();
  const requiredPrefix = FILE_TREE_SNIPPET_PREFIXES.find((prefix) => trimmed.startsWith(prefix));

  if (requiredPrefix) {
    return requiredPrefix.length <= FILE_TREE_SNIPPET_MAX_LENGTH
      ? trimmed.length <= FILE_TREE_SNIPPET_MAX_LENGTH
        ? trimmed
        : requiredPrefix
      : trimmed;
  }

  return trimmed.length > FILE_TREE_SNIPPET_MAX_LENGTH
    ? `${trimmed.slice(0, FILE_TREE_SNIPPET_MAX_LENGTH - 3)}...`
    : trimmed;
}

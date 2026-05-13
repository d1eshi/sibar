import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { extname, isAbsolute, resolve } from "node:path";

export const CODE_SELECTION_MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_SELECTED_LINES = 80;
const CONTEXT_LINES = 8;
const MAX_SELECTED_BYTES = 32 * 1024;
const MAX_SURROUNDING_BYTES = 48 * 1024;

export type CodeSelectionInput = {
  project_path?: string | null;
  file_path: string;
  start_line: number;
  end_line?: number | null;
};

export type RuntimeCodeSelection = {
  file_path: string;
  project_path?: string | null;
  language: string;
  start_line: number;
  end_line: number;
  selected_text: string;
  surrounding_text: string;
};

export class CodeSelectionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function detectLanguage(filePath: string): string {
  switch (extname(filePath).toLowerCase()) {
    case ".swift": return "swift";
    case ".ts":
    case ".tsx": return "typescript";
    case ".js":
    case ".jsx": return "javascript";
    case ".py": return "python";
    case ".rs": return "rust";
    case ".go": return "go";
    case ".md":
    case ".mdx": return "markdown";
    case ".json": return "json";
    case ".yaml":
    case ".yml": return "yaml";
    case ".html": return "html";
    case ".css": return "css";
    default: return "text";
  }
}

export function readCodeSelection(input: CodeSelectionInput): RuntimeCodeSelection {
  const rawFilePath = String(input.file_path || "").trim();
  if (!rawFilePath) {
    throw new CodeSelectionError("invalid_payload", "prepare_code_question requires file_path.");
  }

  const startLine = Number(input.start_line);
  const endLine = input.end_line == null ? startLine : Number(input.end_line);
  if (!Number.isInteger(startLine) || startLine < 1) {
    throw new CodeSelectionError("invalid_range", "start_line must be an integer greater than 0.");
  }
  if (!Number.isInteger(endLine) || endLine < startLine) {
    throw new CodeSelectionError("invalid_range", "end_line must be greater than or equal to start_line.");
  }
  if (endLine - startLine + 1 > MAX_SELECTED_LINES) {
    throw new CodeSelectionError("range_too_large", "Selected code ranges are limited to 80 lines.");
  }

  const projectRoot = normalizeOptionalPath(input.project_path);
  const absolutePath = isAbsolute(rawFilePath) ? resolve(rawFilePath) : resolve(projectRoot || process.cwd(), rawFilePath);
  if (!existsSync(absolutePath)) {
    throw new CodeSelectionError("missing_file", `File ${absolutePath} does not exist.`);
  }

  const stat = statSync(absolutePath);
  if (stat.isDirectory()) {
    throw new CodeSelectionError("directory_path", `File path ${absolutePath} is a directory.`);
  }
  if (!stat.isFile()) {
    throw new CodeSelectionError("invalid_file", `File path ${absolutePath} is not a regular file.`);
  }
  if (stat.size > CODE_SELECTION_MAX_FILE_BYTES) {
    throw new CodeSelectionError("file_too_large", "Code selection files are limited to 2 MB.");
  }

  const realFilePath = realpathSync(absolutePath);
  const realProjectRoot = projectRoot ? realpathSync(projectRoot) : null;
  if (realProjectRoot && !isWithinRoot(realFilePath, realProjectRoot)) {
    throw new CodeSelectionError("outside_project", "file_path must be inside project_path.");
  }

  const buffer = readFileSync(realFilePath);
  if (buffer.includes(0)) {
    throw new CodeSelectionError("binary_file", "Binary files are not supported for code questions.");
  }

  const contents = buffer.toString("utf8");
  if (contents.includes("\uFFFD")) {
    throw new CodeSelectionError("binary_file", "File is not valid UTF-8 text.");
  }

  const lines = contents.split(/\r?\n/);
  const selectedLines = lines.slice(startLine - 1, endLine);
  const selectedText = selectedLines.join("\n");
  if (!selectedText.trim()) {
    throw new CodeSelectionError("empty_selection", "Selected lines are empty.");
  }
  if (Buffer.byteLength(selectedText, "utf8") > MAX_SELECTED_BYTES) {
    throw new CodeSelectionError("selection_too_large", "Selected text is limited to 32 KB.");
  }

  const surroundingStart = Math.max(1, startLine - CONTEXT_LINES);
  const surroundingEnd = Math.min(lines.length, endLine + CONTEXT_LINES);
  const surroundingText = surroundingWithSelectedText(
    lines.slice(surroundingStart - 1, surroundingEnd).join("\n"),
    selectedText,
  );

  return {
    file_path: realFilePath,
    project_path: realProjectRoot,
    language: detectLanguage(realFilePath),
    start_line: startLine,
    end_line: endLine,
    selected_text: selectedText,
    surrounding_text: surroundingText,
  };
}

function normalizeOptionalPath(value: string | null | undefined): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const resolved = resolve(value.trim());
  if (!existsSync(resolved)) {
    throw new CodeSelectionError("missing_project", `Project path ${resolved} does not exist.`);
  }
  if (!statSync(resolved).isDirectory()) {
    throw new CodeSelectionError("invalid_project", "project_path must be a directory.");
  }
  return resolved;
}

function isWithinRoot(filePath: string, rootPath: string): boolean {
  return filePath === rootPath || filePath.startsWith(rootPath.endsWith("/") ? rootPath : `${rootPath}/`);
}

function capByBytes(value: string, maxBytes: number): string {
  if (Buffer.byteLength(value, "utf8") <= maxBytes) return value;
  let capped = value;
  while (Buffer.byteLength(capped, "utf8") > maxBytes) {
    capped = capped.slice(0, Math.floor(capped.length * 0.9));
  }
  return capped;
}

function surroundingWithSelectedText(context: string, selectedText: string): string {
  const capped = capByBytes(context, MAX_SURROUNDING_BYTES);
  if (capped.includes(selectedText)) return capped;
  return selectedText;
}

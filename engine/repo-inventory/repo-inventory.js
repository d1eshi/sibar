import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export const DETERMINISTIC_GENERATED_AT = "1970-01-01T00:00:00.000Z";

const DEFAULT_SKIP_NAMES = new Set([
  ".cache",
  ".eslintcache",
  ".git",
  ".next",
  ".parcel-cache",
  ".pnpm-store",
  ".turbo",
  ".vite",
  ".vite-cache",
  ".vitepress",
  ".venv",
  ".vercel",
  "__pycache__",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "temp",
  "target",
]);

const SOURCE_EXTENSIONS = new Set([".css", ".html", ".js", ".jsx", ".mjs", ".ts", ".tsx", ".py"]);

const DOC_EXTENSIONS = new Set([".md", ".mdx", ".txt"]);
const DOC_PATH_HINTS = ["/docs/", "\\docs\\", "/doc/", "\\doc\\"];

const TEST_PATH_HINTS = [
  "/tests/",
  "\\tests\\",
  "/test/",
  "\\test\\",
  "/__tests__/",
  "\\__tests__\\",
];

const CONFIG_FILENAMES = new Set([
  ".env.example",
  "pyproject.toml",
  "requirements.txt",
  "package.json",
  "playwright.config.ts",
  "tsconfig.json",
  "vite.config.js",
  "vite.config.ts",
]);
const CONFIG_PATH_HINTS = ["/config/", "\\config\\"];

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function toRepoPath(filePath) {
  return toPosixPath(filePath);
}

function normalizeSourceRootLabel(sourceRootLabel) {
  const normalized = toPosixPath(String(sourceRootLabel ?? ""));
  return normalized.replace(/\/+$/, "").replace(/^\.?\//, "");
}

function normalizeExtension(filePath) {
  return path.extname(filePath).toLowerCase();
}

function normalizeText(contents) {
  return contents.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function compareInventoryPath(left, right) {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

function countLines(contents) {
  const normalized = normalizeText(contents);
  if (normalized.length === 0) {
    return 0;
  }

  const lines = normalized.split("\n");
  if (lines.at(-1) === "") {
    lines.pop();
  }

  return lines.length;
}

function makeExcerpt(contents) {
  const normalized = normalizeText(contents);
  return normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join("\n")
    .slice(0, 360);
}

function containsPathHint(filePath, hints) {
  const normalized = filePath.toLowerCase();
  return hints.some((hint) => normalized.includes(hint));
}

export function classifyRepoInventoryRole(filePath) {
  const normalizedPath = filePath.toLowerCase();
  const basename = path.posix.basename(normalizedPath);
  const extension = normalizeExtension(normalizedPath);

  if (containsPathHint(normalizedPath, TEST_PATH_HINTS) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(normalizedPath)) {
    return "test";
  }

  if (CONFIG_FILENAMES.has(basename) || containsPathHint(normalizedPath, CONFIG_PATH_HINTS) || /\.config\.[cm]?[jt]s$/.test(normalizedPath)) {
    return "config";
  }

  if (DOC_EXTENSIONS.has(extension) || containsPathHint(normalizedPath, DOC_PATH_HINTS)) {
    return "doc";
  }

  if (SOURCE_EXTENSIONS.has(extension)) {
    return "source";
  }

  return "unknown";
}

function shouldSkipEntry(entryName, skipNames) {
  return skipNames.has(entryName.toLowerCase());
}

function buildFileTreeNode(file) {
  return {
    path: file.path,
    kind: "file",
    fileCount: 1,
    totalSizeBytes: file.sizeBytes,
  };
}

function buildTreeNode(pathLabel, childNodes) {
  const children = childNodes.toSorted((left, right) => compareInventoryPath(left.path, right.path));
  return {
    path: pathLabel,
    kind: "directory",
    fileCount: children.reduce((sum, child) => sum + child.fileCount, 0),
    totalSizeBytes: children.reduce((sum, child) => sum + child.totalSizeBytes, 0),
    children,
  };
}

function buildTree(files, sourceRootLabel) {
  const root = { files: [], directories: new Map() };
  const sourceRootParts = sourceRootLabel ? sourceRootLabel.split("/") : [];

  for (const file of files) {
    const parts = file.path.split("/");
    const startsWithSourceRoot = sourceRootParts.length > 0 && parts.slice(0, sourceRootParts.length).join("/") === sourceRootLabel;
    const directoryStartIndex = startsWithSourceRoot ? sourceRootParts.length : 0;
    let cursor = root;

    for (const directoryName of parts.slice(directoryStartIndex, -1)) {
      if (!cursor.directories.has(directoryName)) {
        cursor.directories.set(directoryName, { files: [], directories: new Map() });
      }
      cursor = cursor.directories.get(directoryName);
    }

    cursor.files.push(file);
  }

  function materialize(name, node, parentPath) {
    const currentPath = parentPath ? `${parentPath}/${name}` : name;
    const directoryEntries = Array.from(node.directories.entries()).toSorted(([left], [right]) =>
      compareInventoryPath(left, right),
    );
    const directoryNodes = directoryEntries.map(([childName, child]) => materialize(childName, child, currentPath));
    const fileNodes = node.files.map(buildFileTreeNode);

    return buildTreeNode(currentPath, [...directoryNodes, ...fileNodes]);
  }

  const childNodes = [
    ...Array.from(root.directories.entries())
      .toSorted(([left], [right]) => compareInventoryPath(left, right))
      .map(([name, node]) => materialize(name, node, sourceRootLabel)),
    ...root.files.map(buildFileTreeNode),
  ];

  return buildTreeNode(sourceRootLabel, childNodes);
}

function normalizeSkipNames(skipNames) {
  return new Set(skipNames.map((name) => String(name).toLowerCase()));
}

function prefixWithSourceRootLabel(filePath, sourceRootLabel) {
  if (!sourceRootLabel) {
    return filePath;
  }

  return `${sourceRootLabel}/${filePath}`;
}

async function collectFiles(sourceRoot, relativeDirectory, options) {
  const absoluteDirectory = path.join(sourceRoot, relativeDirectory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.toSorted((left, right) => compareInventoryPath(left.name, right.name))) {
    if (shouldSkipEntry(entry.name, options.skipNames)) {
      continue;
    }

    const relativePath = toRepoPath(path.join(relativeDirectory, entry.name));
    const absolutePath = path.join(sourceRoot, relativePath);

    if (entry.isDirectory()) {
      const nestedFiles = await collectFiles(sourceRoot, relativePath, options);
      files.push(...nestedFiles);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const fileStat = await stat(absolutePath);
    if (fileStat.size > options.maxFileSizeBytes) {
      continue;
    }

    const contents = await readFile(absolutePath, "utf8");
    const fileName = toRepoPath(relativePath);

    files.push({
      path: fileName,
      extension: normalizeExtension(fileName),
      sizeBytes: fileStat.size,
      lineCount: countLines(contents),
      role: classifyRepoInventoryRole(fileName),
      excerpt: makeExcerpt(contents),
    });
  }

  return files;
}

export async function repoInventory(sourceRoot, options = {}) {
  const absoluteSourceRoot = path.resolve(sourceRoot);
  const sourceRootStat = await stat(absoluteSourceRoot);

  if (!sourceRootStat.isDirectory()) {
    throw new Error(`repo_inventory sourceRoot must be a directory: ${sourceRoot}`);
  }

  const skipNames = normalizeSkipNames(options.skipNames ?? [...DEFAULT_SKIP_NAMES]);
  const files = await collectFiles(absoluteSourceRoot, "", {
    skipNames,
    maxFileSizeBytes: options.maxFileSizeBytes ?? 256 * 1024,
  });

  const sortedFiles = files.toSorted((left, right) => compareInventoryPath(left.path, right.path));
  const rootLabelCandidate = path.relative(process.cwd(), absoluteSourceRoot);
  const sourceRootLabel = options.sourceRootLabel ?? (rootLabelCandidate || path.basename(absoluteSourceRoot));
  const normalizedSourceRootLabel = normalizeSourceRootLabel(sourceRootLabel);
  const filesWithSourceRootLabel = sortedFiles.map((entry) => ({
    ...entry,
    path: prefixWithSourceRootLabel(entry.path, normalizedSourceRootLabel),
  }));

  return {
    sourceRoot: normalizedSourceRootLabel,
    generatedAt: options.generatedAt ?? DETERMINISTIC_GENERATED_AT,
    files: filesWithSourceRootLabel,
    tree: buildTree(filesWithSourceRootLabel, normalizedSourceRootLabel),
  };
}

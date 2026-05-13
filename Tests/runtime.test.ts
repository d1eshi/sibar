import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { handleRequest } from "../src/runtime.ts";

function withTempHome(): void {
  process.env.SIBI_RUNTIME_HOME = mkdtempSync(join(tmpdir(), "sibar-runtime-"));
}

type Success<T> = { ok: true; data: T };

function expectSuccess<T>(value: unknown): Success<T> {
  const result = value as Success<T> | { ok: false; error: { message: string } };
  assert.equal(result.ok, true);
  return result as Success<T>;
}

test("runtime session flow stays in TypeScript", () => {
  withTempHome();

  const declared = expectSuccess<{ session_id: string }>(handleRequest({
    command: "declare_intent",
    payload: {
      project_label: "demo",
      statement: "Need to move shell decisions into TS runtime",
      uncertainty: "I need a stable bridge contract",
      expected_work_area: "runtime boundary",
      desired_help: "generate_questions",
    },
  }));

  const generated = expectSuccess<{ questions: Array<{ question_id: string }> }>(handleRequest({
    command: "generate_questions",
    payload: { session_id: declared.data.session_id },
  }));
  assert.ok(generated.data.questions.length >= 1);

  const answered = expectSuccess<{ session_summary: { session_id: string; learning_signals: unknown[] } }>(handleRequest({
    command: "answer_question",
    payload: {
      session_id: declared.data.session_id,
      question_id: generated.data.questions[0].question_id,
      answer:
        "The runtime owns the boundary because the command router captures intent, prepares questions, stores evidence, and returns the response contract.",
    },
  }));

  assert.equal(answered.data.session_summary.session_id, declared.data.session_id);
  assert.ok(answered.data.session_summary.learning_signals.length >= 2);

  const summary = expectSuccess<{ session_summary: { session_id: string } }>(handleRequest({
    command: "get_session_summary",
    payload: { session_id: declared.data.session_id },
  }));
  assert.equal(summary.data.session_summary.session_id, declared.data.session_id);
});

test("prepare_code_question reads bounded source and answer_question persists evidence", () => {
  withTempHome();
  const projectPath = mkdtempSync(join(tmpdir(), "sibar-code-"));
  const filePath = join(projectPath, "Example.ts");
  writeFileSync(filePath, [
    "export class Example {",
    "  save() {",
    "    persistState();",
    "  }",
    "}",
  ].join("\n"));

  const prepared = expectSuccess<{
    session_id: string;
    selection: { language: string; start_line: number; end_line: number; selected_text: string; surrounding_text: string };
    question: { question_id: string; prompt: string; answer_style: string; evidence_basis: string[] };
  }>(handleRequest({
    command: "prepare_code_question",
    payload: {
      project_label: "demo",
      project_path: projectPath,
      file_path: filePath,
      start_line: 2,
      end_line: 3,
    },
  }));

  assert.equal(prepared.data.selection.language, "typescript");
  assert.equal(prepared.data.selection.start_line, 2);
  assert.equal(prepared.data.selection.end_line, 3);
  assert.match(prepared.data.selection.selected_text, /persistState/);
  assert.match(prepared.data.question.prompt, /Example.ts:2-3/);
  assert.equal(prepared.data.question.answer_style, "risk_analysis");
  assert.ok(prepared.data.question.evidence_basis.some((entry) => entry.includes("line_range=2-3")));

  assert.ok(prepared.data.selection.surrounding_text.includes(prepared.data.selection.selected_text));

  const answered = expectSuccess<{
    session_summary: {
      learning_signals: Array<{ evidence: string[] }>;
      ownership_questions: Array<{ answer?: string }>;
    };
  }>(handleRequest({
    command: "answer_question",
    payload: {
      session_id: prepared.data.session_id,
      question_id: prepared.data.question.question_id,
      answer:
        "This fragment owns persistence because it calls the state writer, so changing it could break saved state flow.",
    },
  }));
  assert.ok(answered.data.session_summary.learning_signals.length >= 2);
  assert.equal(answered.data.session_summary.ownership_questions[0].answer?.startsWith("This fragment owns persistence"), true);
});

test("prepare_code_question rejects invalid ranges and unsafe or unreadable files", () => {
  withTempHome();
  const projectPath = mkdtempSync(join(tmpdir(), "sibar-project-"));
  const missingPath = join(projectPath, "missing.ts");
  const directoryPath = join(projectPath, "directory.ts");
  mkdirSync(directoryPath);
  const binaryPath = join(projectPath, "binary.ts");
  writeFileSync(binaryPath, Buffer.from([0, 1, 2, 3]));
  const invalidTextPath = join(projectPath, "invalid.ts");
  writeFileSync(invalidTextPath, Buffer.from([0xc3, 0x28]));
  const hugePath = join(projectPath, "huge.ts");
  writeFileSync(hugePath, Buffer.alloc(2 * 1024 * 1024 + 1, "a"));
  const outsidePath = join(mkdtempSync(join(tmpdir(), "sibar-outside-")), "outside.ts");
  writeFileSync(outsidePath, "export const value = 1;\n");
  const symlinkPath = join(projectPath, "linked-outside.ts");
  symlinkSync(outsidePath, symlinkPath);

  for (const [filePath, code] of [
    [missingPath, "missing_file"],
    [directoryPath, "directory_path"],
    [binaryPath, "binary_file"],
    [invalidTextPath, "binary_file"],
    [hugePath, "file_too_large"],
    [symlinkPath, "outside_project"],
  ]) {
    const result = handleRequest({
      command: "prepare_code_question",
      payload: {
        project_label: "demo",
        project_path: projectPath,
        file_path: filePath,
        start_line: 1,
      },
    }) as { ok: false; error: { code: string } };
    assert.equal(result.ok, false);
    assert.equal(result.error.code, code);
  }

  const filePath = join(projectPath, "large.ts");
  writeFileSync(filePath, Array.from({ length: 90 }, (_, index) => `const line${index} = ${index};`).join("\n"));
  const tooLarge = handleRequest({
    command: "prepare_code_question",
    payload: {
      project_label: "demo",
      project_path: projectPath,
      file_path: filePath,
      start_line: 1,
      end_line: 81,
    },
  }) as { ok: false; error: { code: string } };
  assert.equal(tooLarge.ok, false);
  assert.equal(tooLarge.error.code, "range_too_large");
});

test("prepare_code_question keeps selected text inside surrounding_text after byte capping", () => {
  withTempHome();
  const projectPath = mkdtempSync(join(tmpdir(), "sibar-context-"));
  const filePath = join(projectPath, "Context.ts");
  writeFileSync(filePath, [
    "x".repeat(60 * 1024),
    "const selectedResponsibility = computeOwnership();",
  ].join("\n"));

  const prepared = expectSuccess<{
    selection: { selected_text: string; surrounding_text: string };
  }>(handleRequest({
    command: "prepare_code_question",
    payload: {
      project_label: "demo",
      project_path: projectPath,
      file_path: filePath,
      start_line: 2,
      end_line: 2,
    },
  }));

  assert.ok(prepared.data.selection.surrounding_text.includes(prepared.data.selection.selected_text));
});

test("create_artifact_session stores a bounded artifact session", () => {
  withTempHome();
  const projectPath = mkdtempSync(join(tmpdir(), "sibar-artifact-"));
  const sourceDir = join(projectPath, "src");
  const docsDir = join(projectPath, "docs");
  mkdirSync(sourceDir);
  mkdirSync(docsDir);
  writeFileSync(join(sourceDir, "Runtime.ts"), "export const value = 1;\n");

  const created = expectSuccess<{
    artifact_session: {
      artifact_session_id: string;
      label: string;
      root_path: string;
      source_type: string;
      learning_goal: string;
      confidence: string;
      included_paths: string[];
      excluded_paths: string[];
      created_at: string;
    };
  }>(handleRequest({
    command: "create_artifact_session",
    payload: {
      label: "Sibi runtime",
      root_path: projectPath,
      source_type: "local_path",
      learning_goal: "Understand runtime boundaries",
      confidence: "medium",
      included_paths: ["src"],
      excluded_paths: ["docs"],
    },
  }));

  assert.equal(created.data.artifact_session.label, "Sibi runtime");
  assert.equal(created.data.artifact_session.learning_goal, "Understand runtime boundaries");
  assert.equal(created.data.artifact_session.confidence, "medium");
  assert.deepEqual(created.data.artifact_session.included_paths, [realpathSync(sourceDir)]);
  assert.deepEqual(created.data.artifact_session.excluded_paths, [realpathSync(docsDir)]);
  assert.match(created.data.artifact_session.created_at, /\d{4}-\d{2}-\d{2}T/);
});

test("artifact sessions are resumable from runtime state", () => {
  withTempHome();
  const projectPath = mkdtempSync(join(tmpdir(), "sibar-artifact-reload-"));
  writeFileSync(join(projectPath, "README.md"), "# Demo\n");

  const created = expectSuccess<{
    artifact_session: { artifact_session_id: string; root_path: string; included_paths: string[] };
  }>(handleRequest({
    command: "create_artifact_session",
    payload: {
      label: "Reloadable",
      root_path: projectPath,
      source_type: "repository",
      learning_goal: "Reload the boundary",
      confidence: "high",
      included_paths: ["."],
      excluded_paths: [],
    },
  }));

  const reloaded = expectSuccess<{
    artifact_session: { artifact_session_id: string; root_path: string; included_paths: string[]; learning_goal: string };
  }>(handleRequest({
    command: "get_artifact_session",
    payload: { artifact_session_id: created.data.artifact_session.artifact_session_id },
  }));

  assert.deepEqual(reloaded.data.artifact_session, {
    ...created.data.artifact_session,
    learning_goal: "Reload the boundary",
  });
});

test("create_artifact_session rejects outside paths and symlink escapes", () => {
  withTempHome();
  const projectPath = mkdtempSync(join(tmpdir(), "sibar-artifact-root-"));
  const sourceDir = join(projectPath, "src");
  mkdirSync(sourceDir);
  const outsidePath = join(mkdtempSync(join(tmpdir(), "sibar-artifact-outside-")), "outside.ts");
  writeFileSync(outsidePath, "export const outside = true;\n");
  const symlinkPath = join(projectPath, "linked-outside.ts");
  symlinkSync(outsidePath, symlinkPath);

  for (const includedPath of [outsidePath, "linked-outside.ts"]) {
    const result = handleRequest({
      command: "create_artifact_session",
      payload: {
        label: "Rejected",
        root_path: projectPath,
        source_type: "local_path",
        learning_goal: "Reject escapes",
        confidence: "low",
        included_paths: [includedPath],
        excluded_paths: [],
      },
    }) as { ok: false; error: { code: string } };
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "outside_artifact");
  }
});

test("prepare_code_question respects artifact includes and excludes", () => {
  withTempHome();
  const projectPath = mkdtempSync(join(tmpdir(), "sibar-artifact-selection-"));
  const sourceDir = join(projectPath, "src");
  const excludedDir = join(sourceDir, "generated");
  const otherDir = join(projectPath, "other");
  mkdirSync(sourceDir);
  mkdirSync(excludedDir);
  mkdirSync(otherDir);
  const allowedPath = join(sourceDir, "Allowed.ts");
  const excludedPath = join(excludedDir, "Generated.ts");
  const outsideIncludedPath = join(otherDir, "Other.ts");
  writeFileSync(allowedPath, "export const allowed = true;\n");
  writeFileSync(excludedPath, "export const generated = true;\n");
  writeFileSync(outsideIncludedPath, "export const other = true;\n");

  const created = expectSuccess<{ artifact_session: { artifact_session_id: string } }>(handleRequest({
    command: "create_artifact_session",
    payload: {
      label: "Selection",
      root_path: projectPath,
      source_type: "local_path",
      learning_goal: "Bound file selection",
      confidence: "medium",
      included_paths: ["src"],
      excluded_paths: ["src/generated"],
    },
  }));

  const allowed = expectSuccess<{ selection: { file_path: string } }>(handleRequest({
    command: "prepare_code_question",
    payload: {
      artifact_session_id: created.data.artifact_session.artifact_session_id,
      file_path: allowedPath,
      start_line: 1,
    },
  }));
  assert.equal(allowed.data.selection.file_path, realpathSync(allowedPath));

  for (const [filePath, code] of [
    [excludedPath, "excluded_artifact_path"],
    [outsideIncludedPath, "outside_artifact"],
  ]) {
    const result = handleRequest({
      command: "prepare_code_question",
      payload: {
        artifact_session_id: created.data.artifact_session.artifact_session_id,
        file_path: filePath,
        start_line: 1,
      },
    }) as { ok: false; error: { code: string } };
    assert.equal(result.ok, false);
    assert.equal(result.error.code, code);
  }
});

test("prepare_code_question requires artifact_session_id for artifact boundaries", () => {
  withTempHome();
  const projectPath = mkdtempSync(join(tmpdir(), "sibar-artifact-alias-"));
  const sourceDir = join(projectPath, "src");
  const otherDir = join(projectPath, "other");
  mkdirSync(sourceDir);
  mkdirSync(otherDir);
  writeFileSync(join(sourceDir, "Allowed.ts"), "export const allowed = true;\n");
  const otherPath = join(otherDir, "Other.ts");
  writeFileSync(otherPath, "export const other = true;\n");

  const created = expectSuccess<{ artifact_session: { artifact_session_id: string } }>(handleRequest({
    command: "create_artifact_session",
    payload: {
      label: "Alias check",
      root_path: projectPath,
      source_type: "local_path",
      learning_goal: "Avoid ambiguous ids",
      confidence: "medium",
      included_paths: ["src"],
      excluded_paths: [],
    },
  }));

  const prepared = expectSuccess<{ selection: { file_path: string } }>(handleRequest({
    command: "prepare_code_question",
    payload: {
      session_id: created.data.artifact_session.artifact_session_id,
      project_path: projectPath,
      file_path: otherPath,
      start_line: 1,
    },
  }));
  assert.equal(prepared.data.selection.file_path, realpathSync(otherPath));
});

test("sibi-code-question keeps JSON stdout", () => {
  const runtimeHome = mkdtempSync(join(tmpdir(), "sibar-runtime-"));
  const projectPath = mkdtempSync(join(tmpdir(), "sibar-cli-"));
  const filePath = join(projectPath, "Cli.ts");
  writeFileSync(filePath, "export const value = 1;\n");

  const result = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      resolve("scripts/sibi-code-question"),
      JSON.stringify({
        project_label: "demo",
        project_path: projectPath,
        file_path: filePath,
        start_line: 1,
      }),
    ],
    {
      cwd: resolve("."),
      env: {
        ...process.env,
        SIBI_RUNTIME_HOME: runtimeHome,
      },
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).ok, true);
  assert.equal(result.stderr, "");
});

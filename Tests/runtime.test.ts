import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
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

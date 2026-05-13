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
      answer: "The runtime owns the boundary because the command router captures intent, prepares questions, stores evidence, and returns the response contract.",
    },
  }));

  assert.equal(answered.data.session_summary.session_id, declared.data.session_id);
  assert.ok(answered.data.session_summary.learning_signals.length >= 2);
});

test("capture_resource works without a session", () => {
  withTempHome();

  const captured = expectSuccess<{ resource: { project_label: string } }>(handleRequest({
    command: "capture_resource",
    payload: {
      url: "https://example.com/runtime",
      notes: "runtime notes",
      project_label: "demo",
    },
  }));

  assert.equal(captured.data.resource.project_label, "demo");
});

test("append_note without active note creates and reuses active note", () => {
  withTempHome();

  const first = expectSuccess<{ note: { note_id: string; entries: unknown[]; instruction?: string } }>(handleRequest({
    command: "append_note",
    payload: {
      text: "Memory distribution for the sibar-agent runtime",
      instruction: "como mejoro la distribucion de memoria para el agente sibar-agent",
    },
  }));

  const second = expectSuccess<{ note: { note_id: string; entries: unknown[]; instruction?: string } }>(handleRequest({
    command: "append_note",
    payload: { text: "Second continuous note about architecture" },
  }));

  assert.equal(second.data.note.note_id, first.data.note.note_id);
  assert.equal(second.data.note.entries.length, 2);
  assert.equal(second.data.note.instruction, "como mejoro la distribucion de memoria para el agente sibar-agent");
});

test("start_note creates another note id", () => {
  withTempHome();

  const first = expectSuccess<{ note: { note_id: string } }>(handleRequest({
    command: "append_note",
    payload: { text: "Initial runtime note" },
  }));

  const next = expectSuccess<{ note: { note_id: string } }>(handleRequest({
    command: "start_note",
    payload: { instruction: "new goal" },
  }));

  assert.notEqual(next.data.note.note_id, first.data.note.note_id);
});

test("notes infer youtube source type and deterministic topics", () => {
  withTempHome();

  const appended = expectSuccess<{ note: { context: { source_type: string }; detected_topics: string[] } }>(handleRequest({
    command: "append_note",
    payload: {
      text: "Theo explains TypeScript runtime architecture",
      context: {
        url: "https://www.youtube.com/watch?v=abc123",
        source_title: "Theo video",
      },
    },
  }));

  assert.equal(appended.data.note.context.source_type, "video");
  assert.deepEqual(appended.data.note.detected_topics.sort(), ["architecture", "runtime", "typescript"]);
});

test("text-only append creates active note and repeats append to same note", () => {
  withTempHome();

  const first = expectSuccess<{ note: { note_id: string; entries: unknown[] } }>(handleRequest({
    command: "append_note",
    payload: { text: "plain shell note about runtime" },
  }));

  const second = expectSuccess<{ note: { note_id: string; entries: unknown[] } }>(handleRequest({
    command: "append_note",
    payload: { text: "another text-only note about runtime" },
  }));

  assert.equal(second.data.note.note_id, first.data.note.note_id);
  assert.equal(second.data.note.entries.length, 2);
});

test("instruction-like text becomes note metadata and topics", () => {
  withTempHome();

  const appended = expectSuccess<{ note: { title: string; instruction?: string; detected_topics: string[] } }>(handleRequest({
    command: "append_note",
    payload: { text: "como mejoro la distribucion de memory para el agent sibar-agent runtime" },
  }));

  assert.equal(appended.data.note.instruction, "como mejoro la distribucion de memory para el agent sibar-agent runtime");
  assert.equal(appended.data.note.title, "como mejoro la distribucion de memory para el agent sibar-agent runtime");
  assert.deepEqual(appended.data.note.detected_topics.sort(), ["agent", "memory", "runtime"]);
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
      answer: "This fragment owns persistence because it calls the state writer, so changing it could break saved state flow.",
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

  const outside = handleRequest({
    command: "prepare_code_question",
    payload: {
      project_label: "demo",
      project_path: projectPath,
      file_path: outsidePath,
      start_line: 1,
    },
  }) as { ok: false; error: { code: string } };
  assert.equal(outside.ok, false);
  assert.equal(outside.error.code, "outside_project");

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

test("prepare_code_review creates deterministic runtime plan and answer_question persists evidence", () => {
  withTempHome();
  const projectPath = resolve(".");

  const prepared = expectSuccess<{
    session_id: string;
    review_plan: {
      reviewed_files: Array<{ file_path: string; language: string; relevance: string; rationale: string }>;
      active_file: { file_path: string; language: string };
      highlighted_range: { start_line: number; end_line: number };
      selection: { file_path: string; selected_text: string; surrounding_text: string };
      excerpt: string;
      rationale: string;
    };
    reviewed_files: Array<{ file_path: string }>;
    active_file: { file_path: string };
    selection: { selected_text: string; surrounding_text: string };
    excerpt: string;
    question: { question_id: string; prompt: string; answer_style: string; evidence_basis: string[] };
  }>(handleRequest({
    command: "prepare_code_review",
    payload: {
      project_label: "sibi",
      project_path: projectPath,
      objective: "Review the Build-to-Learn TypeScript runtime command boundary.",
    },
  }));

  assert.ok(prepared.data.reviewed_files.length <= 6);
  assert.ok(prepared.data.reviewed_files.some((entry) => entry.file_path.endsWith("src/runtime.ts")));
  assert.ok(prepared.data.reviewed_files.some((entry) => entry.file_path.endsWith("src/runtime-support.ts")));
  assert.equal(prepared.data.active_file.file_path, prepared.data.review_plan.active_file.file_path);
  assert.equal(prepared.data.review_plan.active_file.language, "typescript");
  assert.ok(prepared.data.review_plan.highlighted_range.start_line >= 1);
  assert.ok(prepared.data.review_plan.highlighted_range.end_line >= prepared.data.review_plan.highlighted_range.start_line);
  assert.ok(prepared.data.selection.selected_text.trim().length > 0);
  assert.equal(prepared.data.excerpt, prepared.data.selection.selected_text);
  assert.equal(prepared.data.review_plan.excerpt, prepared.data.selection.selected_text);
  assert.ok(prepared.data.selection.surrounding_text.includes(prepared.data.selection.selected_text));
  assert.match(prepared.data.review_plan.rationale, /Build-to-Learn runtime/);
  assert.match(prepared.data.question.prompt, /runtime command surface/);
  assert.equal(prepared.data.question.answer_style, "risk_analysis");
  assert.ok(prepared.data.question.evidence_basis.some((entry) => entry.includes("highlighted_range=")));

  const answered = expectSuccess<{
    session_summary: {
      review_plan?: { active_file: { file_path: string } };
      ownership_questions: Array<{ answer?: string }>;
    };
  }>(handleRequest({
    command: "answer_question",
    payload: {
      session_id: prepared.data.session_id,
      question_id: prepared.data.question.question_id,
      answer: "The runtime must preserve the JSON command and response contract because it owns session state, question preparation, and answer evidence; boundary drift would first break command decoding or response rendering.",
    },
  }));

  assert.equal(answered.data.session_summary.review_plan?.active_file.file_path, prepared.data.active_file.file_path);
  assert.equal(answered.data.session_summary.ownership_questions[0].answer?.startsWith("The runtime must preserve"), true);
});

test("prepare_code_review rejects oversized active files before line-range read", () => {
  withTempHome();
  const projectPath = mkdtempSync(join(tmpdir(), "sibar-review-large-"));
  const sourceDir = join(projectPath, "src");
  mkdirSync(sourceDir, { recursive: true });
  writeFileSync(join(sourceDir, "runtime.ts"), "x".repeat(2 * 1024 * 1024 + 1));

  const prepared = handleRequest({
    command: "prepare_code_review",
    payload: {
      project_label: "sibi",
      project_path: projectPath,
      objective: "Review the Build-to-Learn TypeScript runtime command boundary.",
    },
  }) as { ok: false; error: { code: string } };

  assert.equal(prepared.ok, false);
  assert.equal(prepared.error.code, "file_too_large");
});

test("prepare_code_review validates project path and objective", () => {
  withTempHome();
  const projectPath = mkdtempSync(join(tmpdir(), "sibar-review-"));
  const filePath = join(projectPath, "file.txt");
  writeFileSync(filePath, "not a directory");

  const missingProject = handleRequest({
    command: "prepare_code_review",
    payload: { project_label: "demo", objective: "Review runtime boundary" },
  }) as { ok: false; error: { code: string } };
  assert.equal(missingProject.ok, false);
  assert.equal(missingProject.error.code, "invalid_payload");

  const emptyObjective = handleRequest({
    command: "prepare_code_review",
    payload: { project_label: "demo", project_path: projectPath, objective: "  " },
  }) as { ok: false; error: { code: string } };
  assert.equal(emptyObjective.ok, false);
  assert.equal(emptyObjective.error.code, "invalid_payload");

  const invalidProject = handleRequest({
    command: "prepare_code_review",
    payload: { project_label: "demo", project_path: filePath, objective: "Review runtime boundary" },
  }) as { ok: false; error: { code: string } };
  assert.equal(invalidProject.ok, false);
  assert.equal(invalidProject.error.code, "invalid_project");
});

test("sibi-code-question keeps JSON stdout without requiring a native shell", () => {
  const runtimeHome = mkdtempSync(join(tmpdir(), "sibar-runtime-"));
  const projectPath = mkdtempSync(join(tmpdir(), "sibar-cli-"));
  const filePath = join(projectPath, "Cli.ts");
  writeFileSync(filePath, "export const value = 1;\n");

  const result = spawnSync(process.execPath, [
    "--no-warnings",
    "--experimental-strip-types",
    resolve("scripts/sibi-code-question"),
    JSON.stringify({
      project_label: "demo",
      project_path: projectPath,
      file_path: filePath,
      start_line: 1,
    }),
  ], {
    cwd: resolve("."),
    env: {
      ...process.env,
      SIBI_RUNTIME_HOME: runtimeHome,
    },
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).ok, true);
  assert.equal(result.stderr, "");
});

test("prepare_reading_question creates bounded Socratic reading session", () => {
  withTempHome();

  const prepared = expectSuccess<{
    session_id: string;
    selection: { source_title?: string; source_url?: string; document_path?: string; selected_text: string };
    question: { question_id: string; prompt: string; answer_style: string; evidence_basis: string[] };
  }>(handleRequest({
    command: "prepare_reading_question",
    payload: {
      project_label: "demo",
      source_title: "Memory Long Text Horizon",
      source_url: "https://example.com/paper",
      document_path: "/tmp/memory-paper.pdf",
      selected_text: "  Memory Long Text Horizon is a benchmark   for testing long-context retention. ",
      user_note: "definition is fuzzy",
    },
  }));

  assert.equal(prepared.data.selection.source_title, "Memory Long Text Horizon");
  assert.equal(prepared.data.selection.document_path, "/tmp/memory-paper.pdf");
  assert.equal(prepared.data.selection.selected_text, "Memory Long Text Horizon is a benchmark for testing long-context retention.");
  assert.match(prepared.data.question.prompt, /Before I explain it/);
  assert.equal(prepared.data.question.answer_style, "study_request");
  assert.ok(prepared.data.question.evidence_basis.some((entry) => entry.includes("Memory Long Text Horizon")));
  assert.ok(prepared.data.question.evidence_basis.includes("source_title=Memory Long Text Horizon"));
  assert.ok(prepared.data.question.evidence_basis.includes("source_url=https://example.com/paper"));
  assert.ok(prepared.data.question.evidence_basis.includes("document_path=/tmp/memory-paper.pdf"));
  assert.ok(prepared.data.question.evidence_basis.some((entry) => entry.includes("original_selected_text=  Memory Long Text Horizon is a benchmark   for testing long-context retention. ")));

  const answered = expectSuccess<{ session_summary: { session_id: string; ownership_questions: Array<{ answer?: string }> } }>(handleRequest({
    command: "answer_question",
    payload: {
      session_id: prepared.data.session_id,
      question_id: prepared.data.question.question_id,
      answer: "It seems to claim that long-context systems need to retain relevant facts over a horizon, but the measurement term is unclear.",
    },
  }));
  assert.equal(answered.data.session_summary.session_id, prepared.data.session_id);
  assert.equal(answered.data.session_summary.ownership_questions[0].answer?.startsWith("It seems"), true);
});

test("prepare_reading_question rejects empty and oversized selections", () => {
  withTempHome();

  const empty = handleRequest({
    command: "prepare_reading_question",
    payload: { project_label: "demo", source_url: "https://example.com", selected_text: "  " },
  }) as { ok: false; error: { code: string } };
  assert.equal(empty.ok, false);
  assert.equal(empty.error.code, "empty_selection");

  const oversized = handleRequest({
    command: "prepare_reading_question",
    payload: { project_label: "demo", selected_text: "x".repeat(8001) },
  }) as { ok: false; error: { code: string } };
  assert.equal(oversized.ok, false);
  assert.equal(oversized.error.code, "selection_too_large");
});

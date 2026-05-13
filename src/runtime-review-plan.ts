import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, join } from "node:path";

import { CODE_SELECTION_MAX_FILE_BYTES, CodeSelectionError, readCodeSelection, type RuntimeCodeSelection } from "./code-selection.ts";
import { createPreparedQuestionSession } from "./runtime-prepared-question.ts";
import {
  excerptPrefix,
  fail,
  toOperationState,
  type ReviewedFile,
  type RuntimeQuestion,
  type RuntimeReviewPlan,
  type RuntimeSuccess,
} from "./runtime-support.ts";

const RUNTIME_REVIEW_FILES = [
  {
    path: "src/runtime.ts",
    relevance: "primary" as const,
    rationale: "Runtime command router owns the Build-to-Learn session flow and response envelope.",
  },
  {
    path: "src/runtime-support.ts",
    relevance: "primary" as const,
    rationale: "Runtime support types define command responses, questions, review plans, and session summaries.",
  },
  {
    path: "src/runtime-prepared-question.ts",
    relevance: "primary" as const,
    rationale: "Prepared question sessions connect bounded context to ownership questions and evidence.",
  },
  {
    path: "src/code-selection.ts",
    relevance: "supporting" as const,
    rationale: "Code selection normalization enforces explicit bounded artifact context.",
  },
  {
    path: "src/reading-selection.ts",
    relevance: "supporting" as const,
    rationale: "Reading selection provides the same attempt-first loop for non-code fragments.",
  },
  {
    path: "src/pedagogy/pipeline.ts",
    relevance: "supporting" as const,
    rationale: "Pedagogy pipeline maps intent and gaps into questions and verification signals.",
  },
  {
    path: "scripts/sibi-code-question",
    relevance: "supporting" as const,
    rationale: "CLI helper demonstrates a concrete explicit code-selection runtime payload.",
  },
];

export function prepareCodeReviewCommand(payload: Record<string, unknown>): RuntimeSuccess<{
  session_id: string;
  review_plan: RuntimeReviewPlan;
  reviewed_files: ReviewedFile[];
  active_file: ReviewedFile;
  selection: RuntimeCodeSelection;
  excerpt: string;
  question: RuntimeQuestion;
  operation_state: { message: string };
}> {
  const projectLabel = String(payload.project_label || "").trim() || "code review";
  const objective = String(payload.objective || payload.user_objective || "").trim();
  if (!objective) {
    fail("invalid_payload", "prepare_code_review requires objective.");
  }

  const rawProjectPath = String(payload.project_path || "").trim();
  if (!rawProjectPath) {
    fail("invalid_payload", "prepare_code_review requires project_path.");
  }
  if (!existsSync(rawProjectPath)) {
    fail("missing_project", `Project path ${rawProjectPath} does not exist.`);
  }
  if (!statSync(rawProjectPath).isDirectory()) {
    fail("invalid_project", "project_path must be a directory.");
  }

  const projectPath = realpathSync(rawProjectPath);
  const reviewedFiles = runtimeReviewedFiles(projectPath);
  if (reviewedFiles.length === 0) {
    fail("missing_review_files", "No TypeScript runtime review files were found in project_path.");
  }

  const activeFile = reviewedFiles[0];
  const highlightedRange = findReviewLineRange(activeFile.file_path, objective);
  const selection = readCodeSelection({
    project_path: projectPath,
    file_path: activeFile.file_path,
    start_line: highlightedRange.start_line,
    end_line: highlightedRange.end_line,
  });
  const lineLabel = selection.start_line === selection.end_line
    ? `${selection.start_line}`
    : `${selection.start_line}-${selection.end_line}`;
  const objectivePrefix = excerptPrefix(objective, 96);
  const evidence = [
    `objective=${objective}`,
    `active_file=${activeFile.file_path}`,
    `highlighted_range=${selection.start_line}-${selection.end_line}`,
    `excerpt=${excerptPrefix(selection.selected_text)}`,
    `reviewed_files=${reviewedFiles.map((entry) => entry.file_path).join(",")}`,
  ];
  const rationale = `Start at ${basename(activeFile.file_path)}:${lineLabel} because this is the narrowest command surface for the requested Build-to-Learn runtime review.`;

  const reviewPlan: RuntimeReviewPlan = {
    project_label: projectLabel,
    project_path: projectPath,
    objective,
    reviewed_files: reviewedFiles,
    active_file: activeFile,
    highlighted_range: {
      start_line: selection.start_line,
      end_line: selection.end_line,
    },
    selection,
    excerpt: selection.selected_text,
    rationale,
  };

  const { session, question } = createPreparedQuestionSession({
    projectLabel,
    projectPath,
    observedTools: ["typescript-runtime", "guided-code-review"],
    intentStatement: `Review Build-to-Learn runtime boundary: ${objectivePrefix}`,
    intentUncertainty: "User needs a bounded runtime review plan before implementation.",
    expectedWorkArea: "Build-to-Learn runtime boundary",
    question: {
      prompt: `Before reviewing the files: at ${basename(activeFile.file_path)}:${lineLabel}, what contract do you think this runtime command surface must preserve, and what would break first if that boundary drifted?`,
      target_area: "Build-to-Learn runtime boundary",
      why_it_matters: "Guided review should prove ownership of the runtime command contract before adding native surfaces or editor integrations.",
      evidence_basis: evidence,
      answer_style: "risk_analysis",
    },
    signalReason: "Runtime prepared a deterministic guided code review plan for the Build-to-Learn runtime boundary.",
    signalEvidence: evidence,
    codeSelection: selection,
    reviewPlan,
  });

  return {
    ok: true,
    data: {
      session_id: session.session_id,
      review_plan: reviewPlan,
      reviewed_files: reviewedFiles,
      active_file: activeFile,
      selection,
      excerpt: selection.selected_text,
      question,
      operation_state: toOperationState("Code review plan prepared."),
    },
  };
}

function runtimeReviewedFiles(projectPath: string): ReviewedFile[] {
  return RUNTIME_REVIEW_FILES
    .map((candidate) => {
      const filePath = join(projectPath, candidate.path);
      if (!existsSync(filePath) || !statSync(filePath).isFile()) return null;
      return {
        file_path: realpathSync(filePath),
        project_path: projectPath,
        language: candidate.path.endsWith(".ts") ? "typescript" : "javascript",
        relevance: candidate.relevance,
        rationale: candidate.rationale,
      };
    })
    .filter((entry): entry is ReviewedFile => entry !== null)
    .slice(0, 6);
}

function findReviewLineRange(filePath: string, objective: string): { start_line: number; end_line: number } {
  const stat = statSync(filePath);
  if (stat.size > CODE_SELECTION_MAX_FILE_BYTES) {
    throw new CodeSelectionError("file_too_large", "Code selection files are limited to 2 MB.");
  }

  const contents = readFileSync(filePath, "utf8");
  const lines = contents.split(/\r?\n/);
  const terms = reviewSearchTerms(filePath, objective);
  const matchIndex = lines.findIndex((line) => terms.some((term) => line.toLowerCase().includes(term)));
  const centerLine = matchIndex >= 0 ? matchIndex + 1 : 1;
  return {
    start_line: Math.max(1, centerLine - 2),
    end_line: Math.min(lines.length, centerLine + 4),
  };
}

function reviewSearchTerms(filePath: string, objective: string): string[] {
  const terms = ["handlerequest", "runtimecommand", "preparecodequestion", "runtimequestion", "prepare_code_question", "answer_question"];
  const objectiveTerms = objective
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((term) => term.length >= 5 && ["typescript", "runtime", "command", "review", "artifact", "evidence", "question"].includes(term));
  if (filePath.endsWith("runtime.ts")) return ["preparecodequestioncommand", "handlerequest", ...objectiveTerms, ...terms];
  if (filePath.endsWith("runtime-support.ts")) return ["runtimecommand", "runtimequestion", ...objectiveTerms, ...terms];
  if (filePath.endsWith("runtime-prepared-question.ts")) return ["createpreparedquestionsession", "learning_signal", ...objectiveTerms, ...terms];
  return [...objectiveTerms, ...terms];
}

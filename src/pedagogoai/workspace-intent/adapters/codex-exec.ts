import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import type { WorkspaceIntent, WorkspacePlan } from "../contracts.ts";
import { parseModelOutputStrict } from "../parse-model-output.ts";
import { buildWorkspaceIntentPrompt } from "../prompts.ts";
import { validateWorkspacePlan } from "../validate.ts";

export type CodexExecOptions = {
  command?: string;
  model?: string;
  timeoutMs?: number;
  workingDirectory?: string;
  outputPath?: string;
  codexReasoningEffort?: string;
};

export function generateWorkspacePlanFromCodex(
  intent: WorkspaceIntent,
  options: CodexExecOptions = {},
): WorkspacePlan {
  const command = options.command ?? "codex";
  const explicitModel = options.model ?? process.env.SIBI_CODEX_MODEL;
  const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs! > 0 ? options.timeoutMs! : 30_000;
  const workingDirectory = options.workingDirectory ?? process.cwd();
  const outputPath = options.outputPath ?? join(mkdtempSync(join(tmpdir(), "sibar-workspace-intent-")), "output.json");

  const args = [
    "exec",
    "--cd",
    workingDirectory,
    ...(explicitModel ? ["--model", explicitModel] : []),
    "--output-last-message",
    outputPath,
    "-",
  ];
  const prompt = buildWorkspaceIntentPrompt(intent);

  const result = spawnSync(command, args, {
    encoding: "utf8",
    input: prompt,
    timeout: timeoutMs,
    env: {
      ...process.env,
      SIBI_CODEX_REASONING: options.codexReasoningEffort ?? process.env.SIBI_CODEX_REASONING ?? "medium",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (result.error) {
    throw new Error(`codex_exec_error: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `codex_exec_error: exit ${result.status} ${String(result.stderr ?? "").trim()}`,
    );
  }

  const raw = (() => {
    try {
      return readFileSync(outputPath, "utf8");
    } catch {
      return result.stdout;
    }
  })();

  let parsed: WorkspacePlan;
  try {
    parsed = parseModelOutputStrict(raw);
  } catch (error) {
    throw new Error(`codex_exec_parse_failed: ${String(error)}`);
  }

  const validated = validateWorkspacePlan(parsed, intent);
  if (!validated.ok) {
    const messages = validated.issues.map((entry) => `${entry.code}: ${entry.message}`).join("; ");
    throw new Error(`codex_exec_validation_failed: ${messages}`);
  }

  return validated.plan!;
}

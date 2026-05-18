import { handleRequest, runFromSTDIO } from "./runtime.ts";
import type { RuntimeRequest, RuntimeResponse } from "./runtime-support.ts";

function printUsage(): void {
  console.log("Usage:");
  console.log("  node --experimental-strip-types src/sibi.ts runtime < request.json");
  console.log("  node --experimental-strip-types src/sibi.ts command '{\"command\":\"get_session_summary\",\"payload\":{}}'");
  console.log("  node --experimental-strip-types src/sibi.ts explain \"Explain this project A-Z\" [--root /path/to/project]");
  console.log("  node --experimental-strip-types src/sibi.ts start-workspace-session \\");
  console.log("    --goal \"Explain this project A-Z\" --root /path/to/project \\");
  console.log("    [--codex-command auto]");
}

type WorkspaceSessionCLIArgs = {
  goal: string;
  rootPath: string;
  codexCommand?: string;
};

type WorkspaceSessionResult = {
  workspace_session_id: string;
  runner_status: string;
  runner: {
    status: "completed" | "blocked";
    blocked_reason?: string;
    accepted_signal_count?: number;
    rejected_signal_count?: number;
  };
  snapshot: {
    loop_state: string;
  };
};

function printJSONError(message: string): never {
  console.error(`Sibi CLI error: ${message}`);
  process.exit(1);
}

function parseStartWorkspaceSessionArgs(argv: string[]): WorkspaceSessionCLIArgs {
  let goal = "";
  let rootPath = process.cwd();
  let codexCommand: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    if (arg === "--goal") {
      if (!value) printJSONError("--goal requires a value.");
      goal = value;
      index += 1;
      continue;
    }

    if (arg === "--root") {
      if (!value) printJSONError("--root requires a value.");
      rootPath = value;
      index += 1;
      continue;
    }

    if (arg === "--codex-command") {
      if (!value) printJSONError("--codex-command requires a value.");
      codexCommand = value;
      index += 1;
      continue;
    }

    printJSONError(`Unknown argument: ${arg}`);
  }

  if (!goal.trim()) {
    printJSONError("--goal is required.");
  }

  return {
    goal: goal.trim(),
    rootPath,
    codexCommand,
  };
}

function runWorkspaceSessionCommand(rawArgs: string[]): void {
  const args = parseStartWorkspaceSessionArgs(rawArgs);
  const request: RuntimeRequest = {
    command: "start_workspace_session",
    payload: {
      goal: args.goal,
      root_path: args.rootPath,
      codex_command: args.codexCommand ?? "auto",
    },
  };

  const response = handleRequest(request) as RuntimeResponse<{
    workspace_session: {
      workspace_session_id: string;
      runner: WorkspaceSessionResult["runner"];
    };
    snapshot: {
      loop_state: string;
    };
  }>;

  if (!response.ok) {
    printJSONError(`${response.error.code}: ${response.error.message}`);
  }

  const output: WorkspaceSessionResult = {
    workspace_session_id: response.data.workspace_session.workspace_session_id,
    runner_status: response.data.workspace_session.runner.status,
    runner: response.data.workspace_session.runner,
    snapshot: {
      loop_state: response.data.snapshot.loop_state,
    },
  };

  console.log(JSON.stringify(output));
}

function runExplainCommand(rawArgs: string[]): void {
  if (rawArgs[0]?.startsWith("--")) {
    runWorkspaceSessionCommand(rawArgs);
    return;
  }

  const [goal, ...rest] = rawArgs;
  runWorkspaceSessionCommand(["--goal", goal ?? "Explain this project A-Z", ...rest]);
}

async function main(): Promise<void> {
  const [mode, ...rest] = process.argv.slice(2);

  if (!mode || mode === "runtime") {
    await runFromSTDIO();
    return;
  }

  if (mode === "command") {
    const raw = rest[0];
    if (!raw) {
      printJSONError("command mode requires a JSON payload argument.");
    }
    const request = JSON.parse(raw) as Parameters<typeof handleRequest>[0];
    console.log(JSON.stringify(handleRequest(request), null, 2));
    return;
  }

  if (mode === "start-workspace-session" || mode === "start_workspace_session") {
    runWorkspaceSessionCommand(rest);
    return;
  }

  if (mode === "explain") {
    runExplainCommand(rest);
    return;
  }

  printUsage();
  process.exit(1);
}

main();

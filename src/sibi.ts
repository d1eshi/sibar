import { handleRequest, runFromSTDIO } from "./runtime.ts";

function printUsage(): void {
  console.log("Usage:");
  console.log("  node --experimental-strip-types src/sibi.ts runtime < request.json");
  console.log("  node --experimental-strip-types src/sibi.ts command '{\"command\":\"get_session_summary\",\"payload\":{}}'");
}

async function main(): Promise<void> {
  const [mode, raw] = process.argv.slice(2);

  if (!mode || mode === "runtime") {
    await runFromSTDIO();
    return;
  }

  if (mode === "command" && raw) {
    const request = JSON.parse(raw) as Parameters<typeof handleRequest>[0];
    console.log(JSON.stringify(handleRequest(request), null, 2));
    return;
  }

  printUsage();
  process.exitCode = 1;
}

await main();

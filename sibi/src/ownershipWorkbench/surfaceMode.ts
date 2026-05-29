import type { WorkbenchSurfaceMode } from "./types";

export function getWorkbenchSurfaceMode(search: string): WorkbenchSurfaceMode {
  const params = new URLSearchParams(search);
  return params.get("view") === "lab" || params.get("lab") === "1" ? "lab" : "default";
}

export function getWorkbenchFixtureMode(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get("fixture") === "1";
}

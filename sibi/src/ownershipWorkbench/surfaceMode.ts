import type { WorkbenchSurfaceMode } from "./types";

export function getWorkbenchSurfaceMode(search: string): WorkbenchSurfaceMode {
  const params = new URLSearchParams(search);
  return params.get("view") === "lab" || params.get("lab") === "1" ? "lab" : "default";
}

type WorkspaceStorageMode = "localStorage" | "supabase";

type PublicRuntimeConfig = {
  readonly storageMode: WorkspaceStorageMode;
  readonly isSupabaseSyncRequested: boolean;
  readonly isSupabaseConfigured: boolean;
  readonly effectiveStorageMode: "localStorage";
};

function readEnvValue(key: string): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>;
  const value = env[key];

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readStorageMode(): WorkspaceStorageMode {
  return readEnvValue("VITE_WORKSPACE_STORAGE_MODE") === "supabase"
    ? "supabase"
    : "localStorage";
}

function readBooleanFlag(key: string): boolean {
  return readEnvValue(key) === "true";
}

export const publicRuntimeConfig: PublicRuntimeConfig = {
  storageMode: readStorageMode(),
  isSupabaseSyncRequested: readBooleanFlag("VITE_WORKSPACE_SUPABASE_SYNC_ENABLED"),
  isSupabaseConfigured:
    Boolean(readEnvValue("VITE_SUPABASE_URL")) &&
    Boolean(readEnvValue("VITE_SUPABASE_ANON_KEY")),
  effectiveStorageMode: "localStorage",
};

export function shouldUseLocalWorkspaceStorage(config = publicRuntimeConfig) {
  return config.effectiveStorageMode === "localStorage";
}

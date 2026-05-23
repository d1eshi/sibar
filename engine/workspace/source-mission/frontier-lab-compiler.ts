import type {
  MissionPreview,
  SourceIntentInput,
  SourceIntakeDiagnosticSeverity,
  SourceIntakeResult,
  SourceInputKind,
  SourceSignal,
  SourceSlice,
} from "./contracts.ts";
import {
  SOURCE_MISSION_SCHEMA_VERSION,
} from "./contracts.ts";
import {
  FRONTIER_LAB_BLOG_URL,
  frontierLabMissionPreview,
  frontierLabSourceIntake,
  frontierLabSourceSignals,
  frontierLabSourceSlices,
} from "./frontier-lab-fixture.ts";
import { buildMissionUiProjection } from "./ui-projection.ts";
import type { MissionUiProjection } from "./ui-projection.ts";
import type { validateSourceMissionMVPFlow } from "./validate.ts";

type ValidateSourceMissionMVPFlow = typeof validateSourceMissionMVPFlow;
type SourceMissionMVPFlowValidation = ReturnType<ValidateSourceMissionMVPFlow>;
type SourceMissionMVPFlowPayload = NonNullable<SourceMissionMVPFlowValidation["value"]>;

export type FrontierLabMissionCompileDiagnostic = {
  code: string;
  message: string;
  severity: SourceIntakeDiagnosticSeverity;
  path?: string;
};

export type FrontierLabMissionCompileSuccess = {
  ok: true;
  diagnostics: FrontierLabMissionCompileDiagnostic[];
  source_intent_input: SourceIntentInput;
  source_intake_result: SourceIntakeResult;
  source_signals: SourceSignal[];
  source_slices: SourceSlice[];
  mission_preview: MissionPreview;
  ui_projection?: MissionUiProjection;
};

export type FrontierLabMissionCompileFailure = {
  ok: false;
  diagnostics: FrontierLabMissionCompileDiagnostic[];
};

export type FrontierLabMissionCompileResult =
  | FrontierLabMissionCompileSuccess
  | FrontierLabMissionCompileFailure;

export type FrontierLabMissionUrlInput = {
  url: string;
  user_reason: string;
  optional_goal?: string;
  optional_constraints?: string[];
  created_at?: string;
};

export type FrontierLabMissionSourceInput = {
  source: string;
  user_reason: string;
  optional_goal?: string;
  optional_constraints?: string[];
  created_at?: string;
};

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function canonicalFrontierLabBlogUrl(input: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return null;
  }

  const canonical = new URL(FRONTIER_LAB_BLOG_URL);
  const inputPath = parsed.pathname.replace(/\/+$/, "");
  const canonicalPath = canonical.pathname.replace(/\/+$/, "");

  if (
    parsed.protocol !== canonical.protocol ||
    parsed.hostname.toLowerCase() !== canonical.hostname.toLowerCase() ||
    inputPath !== canonicalPath
  ) {
    return null;
  }

  return FRONTIER_LAB_BLOG_URL;
}

function inferSourceInputKind(source: string): "url" | "pasted_text" {
  try {
    const parsed = new URL(source);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return "url";
  } catch {
    return "pasted_text";
  }

  return "pasted_text";
}

const frontierLabPastedTextMarkerGroups = [
  [/jax\s+tutorials?/i],
  [/scaling\s+book/i],
  [/transformers?/i, /\bjax\b/i, /\bflax\b/i, /\boptax\b/i],
  [/chinchilla/i, /\bmoe\b|mixture[-\s]?of[-\s]?experts/i],
  [/\bpallas\b/i, /ragged_dot|ragged\s+dot/i],
] as const;

function hasFrontierLabSourceMarkers(value: string): boolean {
  return frontierLabPastedTextMarkerGroups.every((group) =>
    group.every((marker) => marker.test(value))
  );
}

function compileDiagnosticsFromValidation(
  issues: SourceMissionMVPFlowValidation["issues"],
): FrontierLabMissionCompileDiagnostic[] {
  return issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    severity: "error",
    path: issue.path,
  }));
}

function loadValidateSourceMissionMVPFlow(): ValidateSourceMissionMVPFlow | null {
  const nodeProcess = (globalThis as {
    process?: {
      getBuiltinModule?: (name: string) => {
        createRequire?: (filename: string) => (specifier: string) => unknown;
      };
    };
  }).process;
  const createRequire = nodeProcess?.getBuiltinModule?.("module")?.createRequire;
  if (!createRequire) return null;

  const require = createRequire(import.meta.url);
  const validationModule = require("./validate.ts") as {
    validateSourceMissionMVPFlow?: ValidateSourceMissionMVPFlow;
  };

  return validationModule.validateSourceMissionMVPFlow ?? null;
}

function validateCompiledFlow(payload: SourceMissionMVPFlowPayload): SourceMissionMVPFlowValidation {
  const validator = loadValidateSourceMissionMVPFlow();
  if (validator) return validator(payload);

  const issues: SourceMissionMVPFlowValidation["issues"] = [];
  if (payload.source_intent_input.version !== SOURCE_MISSION_SCHEMA_VERSION) {
    issues.push({
      code: "source_intent_input_version_mismatch",
      message: "Unsupported SourceIntentInput version.",
      path: "version",
      value: payload.source_intent_input.version,
    });
  }
  if (!payload.source_intent_input.user_reason.trim()) {
    issues.push({
      code: "source_intent_input_user_reason",
      message: "user_reason is required.",
      path: "user_reason",
    });
  }
  if (payload.source_intake_result.source_intent_id !== payload.source_intent_input.id) {
    issues.push({
      code: "source_mission_flow_intent_link",
      message: "source_intake_result.source_intent_id must match source_intent_input.id.",
      path: "source_intake_result.source_intent_id",
    });
  }

  return {
    ok: issues.length === 0,
    issues,
    value: issues.length === 0 ? payload : null,
  };
}

export function compileFrontierLabMissionFromIntent(
  input: SourceIntentInput,
): FrontierLabMissionCompileResult {
  const sourceInputKind = input.source_input.kind;
  if (sourceInputKind !== "url" && sourceInputKind !== "pasted_text" && sourceInputKind !== "selected_text") {
    return {
      ok: false,
      diagnostics: [
        {
          code: "frontier_lab.unsupported_source_kind",
          message: `Frontier lab compiler only supports url, pasted_text, or selected_text inputs; received ${input.source_input.kind}.`,
          severity: "error",
          path: "source_input.kind",
        },
      ],
    };
  }

  const canonicalUrl = sourceInputKind === "url"
    ? canonicalFrontierLabBlogUrl(input.source_input.value)
    : null;
  if (sourceInputKind === "url" && !canonicalUrl) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "frontier_lab.unsupported_url",
          message: `Unsupported frontier lab source URL: ${input.source_input.value}`,
          severity: "error",
          path: "source_input.value",
        },
      ],
    };
  }
  if ((sourceInputKind === "pasted_text" || sourceInputKind === "selected_text")
    && !hasFrontierLabSourceMarkers(input.source_input.value)
  ) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "frontier_lab.insufficient_source_markers",
          message:
            "Pasted frontier-lab source text must include explicit JAX tutorials, Scaling Book, transformer/JAX/Flax/Optax, Chinchilla/MoE, and Pallas/ragged_dot markers.",
          severity: "error",
          path: "source_input.value",
        },
      ],
    };
  }

  const sourceIntentInput: SourceIntentInput = {
    ...cloneData(input),
    source_input: {
      kind: sourceInputKind,
      value: canonicalUrl ?? input.source_input.value,
    },
  };
  const baseSourceIntake = cloneData(frontierLabSourceIntake);
  const sourceIntakeCanonicalUrl: Pick<SourceIntakeResult, "canonical_url"> =
    canonicalUrl ? { canonical_url: canonicalUrl } : {};
  const sourceIntakeResult: SourceIntakeResult = {
    schema: baseSourceIntake.schema,
    version: baseSourceIntake.version,
    id: baseSourceIntake.id,
    source_id: baseSourceIntake.source_id,
    title: baseSourceIntake.title,
    author: baseSourceIntake.author,
    published_at: baseSourceIntake.published_at,
    fetched_at: baseSourceIntake.fetched_at,
    raw_text_ref: baseSourceIntake.raw_text_ref,
    readable_text_ref: baseSourceIntake.readable_text_ref,
    extraction_status: baseSourceIntake.extraction_status,
    ...sourceIntakeCanonicalUrl,
    source_kind: sourceInputKind,
    source_intent_id: sourceIntentInput.id,
    diagnostics: [
      {
        code: sourceInputKind === "url" ? "fixture.source_static" : "fixture.static_text_markers",
        message: sourceInputKind === "url"
          ? "Static fixture built from Practical Next Steps source facts."
          : `Static fixture accepted from ${sourceInputKind} because all frontier-lab source markers were present.`,
        severity: "info",
        source_ref: "frontier-lab-blog#practical-next-steps",
      },
    ],
  };
  const sourceSignals = cloneData(frontierLabSourceSignals);
  const sourceSlices = cloneData(frontierLabSourceSlices).map((slice) => ({
    ...slice,
    source_id: sourceIntakeResult.source_id,
  }));
  const missionPreview = cloneData(frontierLabMissionPreview);
  const validation = validateCompiledFlow({
    source_intent_input: sourceIntentInput,
    source_intake_result: sourceIntakeResult,
    source_signals: sourceSignals,
    mission_preview: missionPreview,
  });

  if (!validation.ok) {
    return {
      ok: false,
      diagnostics: compileDiagnosticsFromValidation(validation.issues),
    };
  }

  const uiProjection = buildMissionUiProjection({
    source_intent_input: sourceIntentInput,
    source_intake_result: sourceIntakeResult,
    source_signals: sourceSignals,
    source_slices: sourceSlices,
    mission_preview: missionPreview,
  });

  return {
    ok: true,
    diagnostics: [
      {
        code: sourceInputKind === "url" ? "frontier_lab.static_adapter" : "frontier_lab.static_text_adapter",
        message: sourceInputKind === "url"
          ? "Compiled deterministic frontier-lab mission from supported URL and static source facts."
          : `Compiled deterministic frontier-lab mission from ${sourceInputKind} markers and static source facts.`,
        severity: "info",
      },
    ],
    source_intent_input: sourceIntentInput,
    source_intake_result: sourceIntakeResult,
    source_signals: sourceSignals,
    source_slices: sourceSlices,
    mission_preview: missionPreview,
    ui_projection: uiProjection,
  };
}

export function compileFrontierLabMissionFromSource(
  input: FrontierLabMissionSourceInput,
): FrontierLabMissionCompileResult {
  const sourceInputKind: SourceInputKind = inferSourceInputKind(input.source);

  return compileFrontierLabMissionFromIntent({
    schema: "SourceIntentInput",
    version: SOURCE_MISSION_SCHEMA_VERSION,
    id: "INTENT-FRONTIER-LAB-BLOG-COMPILED",
    created_at: input.created_at ?? new Date(0).toISOString(),
    source_input: {
      kind: sourceInputKind,
      value: input.source,
    },
    user_reason: input.user_reason,
    optional_goal: input.optional_goal,
    optional_constraints: input.optional_constraints,
  });
}

export function compileFrontierLabMissionFromUrl(
  input: FrontierLabMissionUrlInput,
): FrontierLabMissionCompileResult {
  return compileFrontierLabMissionFromIntent({
    schema: "SourceIntentInput",
    version: SOURCE_MISSION_SCHEMA_VERSION,
    id: "INTENT-FRONTIER-LAB-BLOG-COMPILED",
    created_at: input.created_at ?? new Date(0).toISOString(),
    source_input: {
      kind: "url",
      value: input.url,
    },
    user_reason: input.user_reason,
    optional_goal: input.optional_goal,
    optional_constraints: input.optional_constraints,
  });
}

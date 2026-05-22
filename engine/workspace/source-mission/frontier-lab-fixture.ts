import { buildMissionSessionBridge } from "./bridge.ts";
import type { MissionSessionBridgeOutput } from "./bridge.ts";
import {
  SOURCE_MISSION_SCHEMA_VERSION,
  type MissionPreview,
  type SourceIntentInput,
  type SourceIntakeResult,
  type SourceSignal,
  type SourceSlice,
} from "./contracts.ts";

export const FRONTIER_LAB_BLOG_URL =
  "https://vladfeinberg.com/2026/05/10/how-to-land-a-job-at-a-frontier-lab.html";

export const FRONTIER_LAB_JAX_TUTORIALS_URL =
  "https://docs.jax.dev/en/latest/notebooks/thinking_in_jax.html";

export const FRONTIER_LAB_SCALING_BOOK_URL = "https://jax-ml.github.io/scaling-book/";

export const frontierLabSourceIntent: SourceIntentInput = {
  schema: "SourceIntentInput",
  version: SOURCE_MISSION_SCHEMA_VERSION,
  id: "INTENT-FRONTIER-LAB-BLOG-001",
  created_at: "2026-05-22T00:00:00.000Z",
  source_input: {
    kind: "url",
    value: FRONTIER_LAB_BLOG_URL,
  },
  user_reason:
    "Turn the blog's practical next steps into a bounded first learning path for frontier lab preparation.",
  optional_goal: "Start with source-backed JAX and scaling foundations before implementation-heavy work.",
  optional_constraints: ["keep the first queue small", "defer advanced systems work until foundations are mapped"],
};

export const frontierLabSourceIntake: SourceIntakeResult = {
  schema: "SourceIntakeResult",
  version: SOURCE_MISSION_SCHEMA_VERSION,
  id: "INTAKE-FRONTIER-LAB-BLOG-001",
  source_id: "SOURCE-FRONTIER-LAB-BLOG-001",
  source_kind: "url",
  canonical_url: FRONTIER_LAB_BLOG_URL,
  title: "How to Land a Job at a Frontier Lab",
  author: "Vlad Feinberg",
  published_at: "2026-05-10T00:00:00.000Z",
  fetched_at: "2026-05-22T00:00:00.000Z",
  raw_text_ref: "frontier-lab-blog/raw.txt",
  readable_text_ref: "frontier-lab-blog/readable.txt",
  extraction_status: "completed",
  diagnostics: [
    {
      code: "fixture.source_static",
      message: "Static fixture built from Practical Next Steps source facts.",
      severity: "info",
      source_ref: "frontier-lab-blog#practical-next-steps",
    },
  ],
  source_intent_id: frontierLabSourceIntent.id,
};

export const frontierLabSourceSignals: SourceSignal[] = [
  {
    schema: "SourceSignal",
    version: SOURCE_MISSION_SCHEMA_VERSION,
    id: "SIG-FRONTIER-JAX-TUTORIALS",
    kind: "resource",
    label: "JAX tutorials",
    source_excerpt_ref: "frontier-lab-blog#jax-tutorials",
    confidence: "high",
    user_relevance: "explicit",
  },
  {
    schema: "SourceSignal",
    version: SOURCE_MISSION_SCHEMA_VERSION,
    id: "SIG-FRONTIER-SCALING-BOOK",
    kind: "resource",
    label: "Scaling Book",
    source_excerpt_ref: "frontier-lab-blog#scaling-book",
    confidence: "high",
    user_relevance: "explicit",
  },
  {
    schema: "SourceSignal",
    version: SOURCE_MISSION_SCHEMA_VERSION,
    id: "SIG-FRONTIER-TRANSFORMER-10M",
    kind: "exercise",
    label: "~10M transformer in Colab with JAX, Flax, and Optax",
    source_excerpt_ref: "frontier-lab-blog#transformer-10m",
    confidence: "high",
    user_relevance: "explicit",
  },
  {
    schema: "SourceSignal",
    version: SOURCE_MISSION_SCHEMA_VERSION,
    id: "SIG-FRONTIER-CHINCHILLA-MOE",
    kind: "claim",
    label: "Chinchilla dense-vs-MoE derivation",
    source_excerpt_ref: "frontier-lab-blog#chinchilla-dense-moe",
    confidence: "high",
    user_relevance: "explicit",
  },
  {
    schema: "SourceSignal",
    version: SOURCE_MISSION_SCHEMA_VERSION,
    id: "SIG-FRONTIER-PALLAS-KERNEL",
    kind: "exercise",
    label: "Pallas kernel faster than ragged_dot for F > D",
    source_excerpt_ref: "frontier-lab-blog#pallas-ragged-dot",
    confidence: "high",
    user_relevance: "explicit",
  },
];

export const frontierLabSourceSlices: SourceSlice[] = [
  {
    slice_id: "SLICE-FRONTIER-JAX-SCALING-FOUNDATIONS",
    source_id: frontierLabSourceIntake.source_id,
    label: "JAX tutorials and Scaling Book first step",
    excerpt_ref: "frontier-lab-blog#slice-jax-scaling-foundations",
    excerpt:
      "The Practical Next Steps section points readers first to JAX tutorials and the Scaling Book before deeper implementation work.",
    source_signal_ids: ["SIG-FRONTIER-JAX-TUTORIALS", "SIG-FRONTIER-SCALING-BOOK"],
  },
  {
    slice_id: "SLICE-FRONTIER-TRANSFORMER-PRACTICE",
    source_id: frontierLabSourceIntake.source_id,
    label: "Small transformer implementation practice",
    excerpt_ref: "frontier-lab-blog#slice-transformer-practice",
    excerpt:
      "The blog says to code a roughly 10M transformer with only JAX, Flax, and Optax in free Colab using a TPU, hard-code digits/space/+/=, and train quickly on a T4 GPU with fixed-length padding.",
    source_signal_ids: ["SIG-FRONTIER-TRANSFORMER-10M"],
  },
  {
    slice_id: "SLICE-FRONTIER-SCALING-LAW-DERIVATION",
    source_id: frontierLabSourceIntake.source_id,
    label: "Chinchilla dense-vs-MoE derivation",
    excerpt_ref: "frontier-lab-blog#slice-chinchilla-derivation",
    excerpt:
      "The source asks the reader to derive Chinchilla-style scaling behavior while comparing dense models with MoE variants.",
    source_signal_ids: ["SIG-FRONTIER-CHINCHILLA-MOE"],
  },
  {
    slice_id: "SLICE-FRONTIER-PALLAS-KERNEL",
    source_id: frontierLabSourceIntake.source_id,
    label: "Pallas kernel systems target",
    excerpt_ref: "frontier-lab-blog#slice-pallas-kernel",
    excerpt:
      "A later systems exercise is to write a Pallas kernel that beats ragged_dot in the F greater than D regime.",
    source_signal_ids: ["SIG-FRONTIER-PALLAS-KERNEL"],
  },
];

export const frontierLabMissionPreview: MissionPreview = {
  schema: "MissionPreview",
  version: SOURCE_MISSION_SCHEMA_VERSION,
  mission_title: "Frontier lab practical next steps",
  mission_rationale:
    "Convert the blog's practical recommendations into a small source-backed queue that starts with JAX and scaling foundations.",
  user_goal: "Build a bounded preparation path from the blog without expanding it into a full curriculum.",
  source_summary:
    "The source names JAX tutorials, the Scaling Book, a small JAX transformer exercise, a dense-vs-MoE scaling derivation, and later Pallas kernel work.",
  proposed_tracks: [
    {
      id: "TRK-FRONTIER-JAX-FOUNDATIONS",
      title: "JAX and scaling foundations",
      rationale: "Start by mapping the two explicit foundation resources before implementation-heavy sessions.",
      source_signal_ids: ["SIG-FRONTIER-JAX-TUTORIALS", "SIG-FRONTIER-SCALING-BOOK"],
      status: "recommended",
    },
    {
      id: "TRK-FRONTIER-IMPLEMENTATION",
      title: "Implementation practice",
      rationale: "Keep the compact transformer build as the first applied follow-up after the foundation map.",
      source_signal_ids: ["SIG-FRONTIER-TRANSFORMER-10M"],
      status: "optional",
    },
    {
      id: "TRK-FRONTIER-DEFERRED-SYSTEMS",
      title: "Deferred scaling and systems work",
      rationale: "Keep derivation and kernel work visible without making it part of the immediate queue.",
      source_signal_ids: ["SIG-FRONTIER-CHINCHILLA-MOE", "SIG-FRONTIER-PALLAS-KERNEL"],
      status: "deferred",
    },
  ],
  first_sessions: [
    {
      id: "SES-FRONTIER-JAX-SCALING-001",
      track_id: "TRK-FRONTIER-JAX-FOUNDATIONS",
      title: "Map the JAX and Scaling Book starting points",
      source_slice_refs: ["SIG-FRONTIER-JAX-TUTORIALS", "SIG-FRONTIER-SCALING-BOOK"],
      operation:
        "Explain how the JAX tutorials and Scaling Book serve as the first practical step, with cited source evidence.",
      recommended_artifacts: ["technical note", "recall card"],
      status: "now",
    },
    {
      id: "SES-FRONTIER-TRANSFORMER-002",
      track_id: "TRK-FRONTIER-IMPLEMENTATION",
      title: "Scope the 10M transformer practice build",
      source_slice_refs: ["SIG-FRONTIER-TRANSFORMER-10M"],
      operation:
        "Trace the minimal implementation scope for a roughly 10M transformer from the source slice before coding.",
      recommended_artifacts: ["technical note", "implementation sketch"],
      status: "next",
      prerequisite_note: "Complete the JAX and Scaling Book source map first.",
    },
    {
      id: "SES-FRONTIER-SYSTEMS-003",
      track_id: "TRK-FRONTIER-DEFERRED-SYSTEMS",
      title: "Park scaling-law and Pallas targets",
      source_slice_refs: ["SIG-FRONTIER-CHINCHILLA-MOE", "SIG-FRONTIER-PALLAS-KERNEL"],
      operation:
        "Explain why the Chinchilla derivation and Pallas kernel are later targets, using only the source-backed queue evidence.",
      recommended_artifacts: ["technical note"],
      status: "later",
      prerequisite_note: "Use this only after the foundation and transformer scoping sessions are stable.",
    },
  ],
  open_questions: [
    "Should the next accepted mission brief keep Pallas locked until the user completes the transformer scoping artifact?",
  ],
  confidence: "high",
};

export function buildFrontierLabMissionSessionBridge(
  sessionId = frontierLabMissionPreview.first_sessions[0].id,
): MissionSessionBridgeOutput {
  const proposedSession = frontierLabMissionPreview.first_sessions.find((session) => session.id === sessionId);
  if (!proposedSession) {
    throw new Error(`Unknown frontier lab fixture session id: ${sessionId}`);
  }

  const result = buildMissionSessionBridge({
    mission_preview: frontierLabMissionPreview,
    proposed_session: proposedSession,
    source_signals: frontierLabSourceSignals,
    source_slices: frontierLabSourceSlices,
    source_intake: frontierLabSourceIntake,
    user_reason: frontierLabSourceIntent.user_reason,
  });

  if (!result.ok) {
    throw new Error(`Frontier lab fixture bridge failed: ${result.diagnostics.map((entry) => entry.code).join(", ")}`);
  }

  return result.value;
}

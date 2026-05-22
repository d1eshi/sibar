import type { WorkspaceIntent, WorkspacePlan } from "./contracts.ts";

export const WORKSPACE_INTENT_FIXTURE: WorkspaceIntent = {
  intent_id: "INTENT-OWNERSHIP-001",
  workspace_title: "Inspect repository ownership from scoped docs and tests",
  global_ambition: "Trace evidence-backed ownership claims for a scoped runtime slice.",
  source_summary: "Scoped exploration of runtime workspace context, ownership loop contracts, and loop artifacts.",
  known_skills: [
    "TypeScript",
    "Repository forensics",
    "Test evidence tracing",
  ],
  unknowns: ["ownership boundary drift", "test evidence sufficiency"],
  desired_outputs: [
    "Bounded ownership map",
    "Evidence-backed summary of ownership assertions",
  ],
  horizon: "short",
  source_bundle: {
    bundle_id: "BUNDLE-SIBI-WI-001",
    title: "Evidence bundle for a scoped workspace plan",
    source_summary: "Focused sources for one workspace slice; not the entire repository.",
    source_refs: [
      {
        ref_id: "SRC-OWNERSHIP-GUIDE",
        path: "docs/specs/deep-ownership-workspace/README.md",
        role: "source_truth",
        summary: "Scope and constraints for deep ownership behavior.",
      },
      {
        ref_id: "SRC-WORKSPACE-SESSION",
        path: "engine/workspace/session/session.ts",
        role: "intent",
        summary: "Entry point for runtime session commands and contract fields.",
      },
      {
        ref_id: "SRC-WORKSPACE-TESTS",
        path: "Tests/workspace-live-session.test.ts",
        role: "example",
        summary: "Deterministic session and reproduction behavior tests.",
      },
    ],
  },
};

export const WORKSPACE_PLAN_FIXTURE: WorkspacePlan = {
  plan_id: "PLAN-SIBI-WI-001",
  title: WORKSPACE_INTENT_FIXTURE.workspace_title,
  goal: WORKSPACE_INTENT_FIXTURE.global_ambition,
  source_summary: "Builds on a small runtime slice and links artifacts to evidence-backed source refs.",
  source_bundle: WORKSPACE_INTENT_FIXTURE.source_bundle,
  unknowns: ["ownership boundary drift", "test evidence sufficiency"],
  learning_nodes: [
    {
      node_id: "NODE-001",
      title: "Identify scope boundaries",
      objective: "Extract project-learning boundaries from a bounded input slice.",
      source_refs: ["SRC-OWNERSHIP-GUIDE", "SRC-WORKSPACE-SESSION"],
      depends_on: [],
      expected_outcome: "Defined scope constraints and boundaries for the exercise.",
    },
    {
      node_id: "NODE-002",
      title: "Trace evidence for ownership claims",
      objective: "Collect evidence-backed claims from source and tests in scope.",
      source_refs: ["SRC-WORKSPACE-SESSION", "SRC-WORKSPACE-TESTS"],
      depends_on: ["NODE-001"],
      expected_outcome: "Evidence-backed claims and unresolved risks are identified.",
    },
  ],
  artifact_targets: [
    {
      artifact_id: "ART-001",
      node_id: "NODE-001",
      title: "Scope summary artifact",
      artifact_type: "notes",
      source_refs: ["SRC-OWNERSHIP-GUIDE", "SRC-WORKSPACE-SESSION"],
      description: "Write a compact scope document with explicit boundaries.",
    },
    {
      artifact_id: "ART-002",
      node_id: "NODE-002",
      title: "Evidence trace artifact",
      artifact_type: "code",
      source_refs: ["SRC-WORKSPACE-SESSION", "SRC-WORKSPACE-TESTS"],
      description: "Map each claim to a source reference and cite gaps.",
    },
  ],
  first_session: {
    session_id: "SES-001",
    title: "Boundary-first walkthrough",
    learning_node_ids: ["NODE-001"],
    artifact_target_ids: ["ART-001"],
    sequence_position: 1,
  },
  anti_overload_decision: {
    decision: "proceed",
    bounded: true,
    rationale: "Keep first session to one node and one artifact to avoid overload.",
    max_session_nodes: 1,
    max_total_artifacts: 2,
  },
  open_questions_for_user: [
    {
      question_id: "Q-OWNERSHIP-BOUNDARY",
      prompt: "Which files are required to confirm ownership boundaries and why?",
      target_unknowns: ["ownership boundary drift"],
      source_refs: ["SRC-OWNERSHIP-GUIDE", "SRC-WORKSPACE-SESSION"],
    },
    {
      question_id: "Q-TEST-EVIDENCE",
      prompt: "What evidence from tests confirms traceability and risk signals?",
      target_unknowns: ["test evidence sufficiency"],
      source_refs: ["SRC-WORKSPACE-TESTS"],
    },
  ],
  sessions: [
    {
      session_id: "SES-001",
      title: "Boundary-first walkthrough",
      learning_node_ids: ["NODE-001"],
      artifact_target_ids: ["ART-001"],
      sequence_position: 1,
    },
    {
      session_id: "SES-002",
      title: "Evidence collection and validation",
      learning_node_ids: ["NODE-002"],
      artifact_target_ids: ["ART-002"],
      sequence_position: 2,
    },
  ],
  open_questions: [
    {
      question_id: "Q-OPEN-LEGACY-001",
      prompt: "Legacy questions are kept for compatibility.",
      target_unknowns: ["ownership boundary drift"],
      source_refs: ["SRC-OWNERSHIP-GUIDE"],
    },
  ],
  intent_id: "INTENT-OWNERSHIP-001",
};

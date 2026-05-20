// Generated from the real TypeScript runtime. Do not edit by hand unless regenerating the prototype fixture.
window.workspaceFixture = {
  "generated_at": "2026-05-15T01:36:38.444Z",
  "generated_by": "src/runtime.ts TypeScript runtime via handleRequest",
  "manifest": {
    "artifact_id": "sibar.selfhost.mvp.first-slice",
    "label": "SIBAR Self-Hosted MVP First Slice",
    "owner_intent": "Verify that the user can trace bounded repo evidence and a user answer through gap detection, repair generation, re-evaluation, and readiness constraints.",
    "included_paths": [
      "src/runtime-concept-graph.ts",
      "src/runtime-gap-detection.ts",
      "src/runtime-readiness.ts",
      "src/runtime-practice.ts",
      "src/runtime-memory.ts",
      "src/runtime-support.ts",
      "Tests/concept-graph.test.ts",
      "Tests/gap-detection.test.ts",
      "Tests/readiness-report.test.ts",
      "Tests/practice-challenges.test.ts"
    ],
    "excluded_paths": [
      "node_modules/",
      ".build/",
      "docs/missions/*/handoffs/",
      "Sources/"
    ],
    "concepts": [
      {
        "concept_id": "artifact_boundary",
        "label": "Artifact boundary"
      },
      {
        "concept_id": "concept_graph_generation",
        "label": "Concept graph generation"
      },
      {
        "concept_id": "gap_detection",
        "label": "Gap detection"
      },
      {
        "concept_id": "repair_practice_generation",
        "label": "Repair practice generation"
      },
      {
        "concept_id": "readiness_report_generation",
        "label": "Readiness report generation"
      }
    ]
  },
  "runtime_transcript": [
    "Artifact session created in TypeScript runtime.",
    "Concept graph built from bounded artifact evidence.",
    "Autopsy step prepared.",
    "Great! Your answer shows confident understanding with system-level connections. Moving this concept forward.",
    "Practice challenges generated from learning gaps.",
    "Readiness report generated from persisted understanding memory.",
    "Study panel snapshot projected from runtime-owned state."
  ],
  "artifact_session": {
    "artifact_session_id": "94bbe59d-6352-4fc0-aa40-ca3775d4cff4",
    "label": "SIBAR Self-Hosted MVP First Slice",
    "root_path": ".",
    "source_type": "local_path",
    "learning_goal": "Verify that the user can trace bounded repo evidence and a user answer through gap detection, repair generation, re-evaluation, and readiness constraints.",
    "confidence": "medium",
    "included_paths": [
      "src/runtime-concept-graph.ts",
      "src/runtime-gap-detection.ts",
      "src/runtime-readiness.ts",
      "src/runtime-practice.ts",
      "src/runtime-memory.ts",
      "src/runtime-support.ts",
      "Tests/concept-graph.test.ts",
      "Tests/gap-detection.test.ts",
      "Tests/readiness-report.test.ts",
      "Tests/practice-challenges.test.ts"
    ],
    "excluded_paths": [
      "node_modules",
      ".build",
      "Sources"
    ],
    "created_at": "2026-05-15T01:36:38.414Z"
  },
  "concept_graph": {
    "artifact_session_id": "94bbe59d-6352-4fc0-aa40-ca3775d4cff4",
    "generated_at": "2026-05-15T01:36:38.431Z",
    "scope": {
      "root_path": ".",
      "included_paths": [
        "src/runtime-concept-graph.ts",
        "src/runtime-gap-detection.ts",
        "src/runtime-readiness.ts",
        "src/runtime-practice.ts",
        "src/runtime-memory.ts",
        "src/runtime-support.ts",
        "Tests/concept-graph.test.ts",
        "Tests/gap-detection.test.ts",
        "Tests/readiness-report.test.ts",
        "Tests/practice-challenges.test.ts"
      ],
      "excluded_paths": [
        "node_modules",
        ".build",
        "Sources"
      ]
    },
    "nodes": [
      {
        "id": "entry-point",
        "label": "Runtime entry point",
        "kind": "runtime",
        "source_paths": [
          "src/runtime-concept-graph.ts"
        ],
        "why_it_matters": "This is where an external caller crosses into the artifact's runtime behavior.",
        "prerequisite_concepts": [],
        "evidence": [
          {
            "file_path": "src/runtime-concept-graph.ts",
            "start_line": 57,
            "end_line": 57,
            "excerpt": "linePattern: /\\b(runFromSTDIO|handleRequest|main\\(|start|listen|spawnSync|command)\\b/,"
          }
        ]
      },
      {
        "id": "runtime-boundary",
        "label": "Command boundary and payload contract",
        "kind": "architecture",
        "source_paths": [
          "src/runtime-concept-graph.ts"
        ],
        "why_it_matters": "This boundary decides which commands are accepted and what shape the runtime returns.",
        "prerequisite_concepts": [
          "entry-point"
        ],
        "evidence": [
          {
            "file_path": "src/runtime-concept-graph.ts",
            "start_line": 57,
            "end_line": 57,
            "excerpt": "linePattern: /\\b(runFromSTDIO|handleRequest|main\\(|start|listen|spawnSync|command)\\b/,"
          }
        ]
      },
      {
        "id": "state-persistence",
        "label": "Runtime state persistence",
        "kind": "data_flow",
        "source_paths": [
          "src/runtime-memory.ts"
        ],
        "why_it_matters": "Later learning steps depend on state that can be saved and reloaded.",
        "prerequisite_concepts": [
          "runtime-boundary"
        ],
        "evidence": [
          {
            "file_path": "src/runtime-memory.ts",
            "start_line": 15,
            "end_line": 15,
            "excerpt": "import { getArtifactSession, readState } from \"./runtime-state.ts\";"
          }
        ]
      },
      {
        "id": "core-policy",
        "label": "Core learning policy",
        "kind": "algorithm",
        "source_paths": [
          "src/runtime-concept-graph.ts"
        ],
        "why_it_matters": "Policy code determines how the artifact turns evidence into learning actions.",
        "prerequisite_concepts": [
          "runtime-boundary"
        ],
        "evidence": [
          {
            "file_path": "src/runtime-concept-graph.ts",
            "start_line": 78,
            "end_line": 78,
            "excerpt": "id: \"core-policy\","
          }
        ]
      },
      {
        "id": "artifact-data-flow",
        "label": "Artifact data flow",
        "kind": "data_flow",
        "source_paths": [
          "src/runtime-concept-graph.ts"
        ],
        "why_it_matters": "This flow explains how bounded artifact inputs become reusable runtime outputs.",
        "prerequisite_concepts": [
          "entry-point",
          "state-persistence"
        ],
        "evidence": [
          {
            "file_path": "src/runtime-concept-graph.ts",
            "start_line": 4,
            "end_line": 4,
            "excerpt": "import { getArtifactSession, readState, writeState } from \"./runtime-state.ts\";"
          }
        ]
      },
      {
        "id": "test-coverage",
        "label": "Runtime behavior tests",
        "kind": "testing",
        "source_paths": [
          "Tests/concept-graph.test.ts"
        ],
        "why_it_matters": "Tests show which behavior is expected to stay stable as the artifact changes.",
        "prerequisite_concepts": [
          "runtime-boundary"
        ],
        "evidence": [
          {
            "file_path": "Tests/concept-graph.test.ts",
            "start_line": 7,
            "end_line": 7,
            "excerpt": "import { handleRequest } from \"../src/runtime.ts\";"
          }
        ]
      },
      {
        "id": "failure-modes",
        "label": "Failure modes and rejected inputs",
        "kind": "risk",
        "source_paths": [
          "src/runtime-concept-graph.ts"
        ],
        "why_it_matters": "Rejected inputs and errors mark the places most likely to break trust if loosened.",
        "prerequisite_concepts": [
          "runtime-boundary"
        ],
        "evidence": [
          {
            "file_path": "src/runtime-concept-graph.ts",
            "start_line": 111,
            "end_line": 111,
            "excerpt": "linePattern: /\\b(fail\\(|throw new|catch|reject|outside|invalid|missing|error\\.code)\\b/,"
          }
        ]
      }
    ],
    "edges": [
      {
        "id": "entry-routes-command-boundary",
        "from": "entry-point",
        "to": "runtime-boundary",
        "relation": "calls",
        "label": "Entry point routes requests into the runtime command boundary.",
        "evidence": [
          {
            "file_path": "src/runtime-concept-graph.ts",
            "start_line": 57,
            "end_line": 57,
            "excerpt": "linePattern: /\\b(runFromSTDIO|handleRequest|main\\(|start|listen|spawnSync|command)\\b/,"
          }
        ]
      },
      {
        "id": "command-boundary-persists-state",
        "from": "runtime-boundary",
        "to": "state-persistence",
        "relation": "persists",
        "label": "Runtime command handling writes durable state for later commands.",
        "evidence": [
          {
            "file_path": "src/runtime-memory.ts",
            "start_line": 15,
            "end_line": 15,
            "excerpt": "import { getArtifactSession, readState } from \"./runtime-state.ts\";"
          }
        ]
      },
      {
        "id": "policy-depends-on-boundary",
        "from": "core-policy",
        "to": "runtime-boundary",
        "relation": "depends_on",
        "label": "Learning policy depends on the command boundary to supply bounded payloads.",
        "evidence": [
          {
            "file_path": "src/runtime-concept-graph.ts",
            "start_line": 78,
            "end_line": 78,
            "excerpt": "id: \"core-policy\","
          }
        ]
      },
      {
        "id": "tests-cover-runtime-boundary",
        "from": "test-coverage",
        "to": "runtime-boundary",
        "relation": "tests",
        "label": "Tests exercise the runtime command boundary as the observable contract.",
        "evidence": [
          {
            "file_path": "Tests/concept-graph.test.ts",
            "start_line": 7,
            "end_line": 7,
            "excerpt": "import { handleRequest } from \"../src/runtime.ts\";"
          }
        ]
      },
      {
        "id": "failure-modes-risk-boundary",
        "from": "failure-modes",
        "to": "runtime-boundary",
        "relation": "risks",
        "label": "Failure-mode checks show where invalid inputs could weaken the boundary.",
        "evidence": [
          {
            "file_path": "src/runtime-concept-graph.ts",
            "start_line": 111,
            "end_line": 111,
            "excerpt": "linePattern: /\\b(fail\\(|throw new|catch|reject|outside|invalid|missing|error\\.code)\\b/,"
          }
        ]
      }
    ]
  },
  "ownership": {
    "autopsy_step": {
      "autopsy_step_id": "05ab6f10-1711-4f8f-b4c9-0ce1213dc8c2",
      "artifact_session_id": "94bbe59d-6352-4fc0-aa40-ca3775d4cff4",
      "session_id": "665cc30d-585c-4507-986f-eef8be5ed380",
      "question_id": "29708cdf-c315-48da-a417-e9f9c575b52d",
      "target_type": "concept",
      "selected_id": "runtime-boundary",
      "concept_id": "runtime-boundary",
      "prompt": "Before any explanation, use the evidence below to predict what this concept is responsible for. Concept: Command boundary and payload contract. Explain what you think it does and name one thing that could break if your model is wrong.",
      "bounded_evidence": [
        {
          "file_path": "src/runtime-concept-graph.ts",
          "start_line": 57,
          "end_line": 57,
          "excerpt": "linePattern: /\\b(runFromSTDIO|handleRequest|main\\(|start|listen|spawnSync|command)\\b/,"
        }
      ],
      "evidence_basis": [
        "runtime-concept-graph.ts:57-57 linePattern: /\\b(runFromSTDIO|handleRequest|main\\(|start|listen|spawnSync|command)\\b/,"
      ],
      "next_action": "collect_user_attempt",
      "created_at": "2026-05-15T01:36:38.437Z"
    },
    "sample_answer": "I think the self-hosted slice uses src/runtime-concept-graph.ts to build bounded evidence, src/runtime-support.ts to define the artifact evidence contracts, and Tests/concept-graph.test.ts to verify included and excluded paths. That is enough to explain this slice, not the whole repo.",
    "verified_result": {
      "session_id": "665cc30d-585c-4507-986f-eef8be5ed380",
      "question": {
        "question_id": "29708cdf-c315-48da-a417-e9f9c575b52d",
        "created_at": "2026-05-15T01:36:38.436Z",
        "session_id": "665cc30d-585c-4507-986f-eef8be5ed380",
        "detected_layer": 1,
        "required_layer": 4,
        "prompt": "Before any explanation, use the evidence below to predict what this concept is responsible for. Concept: Command boundary and payload contract. Explain what you think it does and name one thing that could break if your model is wrong.",
        "target_area": "Command boundary and payload contract",
        "why_it_matters": "The user should expose their current mental model before Sibi compares it to artifact evidence.",
        "evidence_basis": [
          "runtime-concept-graph.ts:57-57 linePattern: /\\b(runFromSTDIO|handleRequest|main\\(|start|listen|spawnSync|command)\\b/,"
        ],
        "answer_style": "short_explanation",
        "max_followups": 1,
        "answer": "I think the self-hosted slice uses src/runtime-concept-graph.ts to build bounded evidence, src/runtime-support.ts to define the artifact evidence contracts, and Tests/concept-graph.test.ts to verify included and excluded paths. That is enough to explain this slice, not the whole repo.",
        "answer_quality": "verified"
      },
      "confirmed_concept_state": {
        "concept_id": "runtime-boundary",
        "concept_label": "Command boundary and payload contract",
        "session_id": "665cc30d-585c-4507-986f-eef8be5ed380",
        "question_id": "29708cdf-c315-48da-a417-e9f9c575b52d",
        "status": "confirmed",
        "expected_layer": 4,
        "observed_layer": 4,
        "confidence": "high",
        "evidence": [
          {
            "file_path": "src/runtime-concept-graph.ts",
            "start_line": 57,
            "end_line": 57,
            "excerpt": "linePattern: /\\b(runFromSTDIO|handleRequest|main\\(|start|listen|spawnSync|command)\\b/,"
          }
        ],
        "answer_evidence": [
          "prompt=Before any explanation, use the evidence below to predict what this concept is responsible for. Concept: Command boundary and payload contract. Explain what you think it does and name one thing that could break if your model is wrong.",
          "answer=I think the self-hosted slice uses src/runtime-concept-graph.ts to build bounded evidence, src/runtime-support.ts to define the artifact evidence contracts, and Tests/concept-graph.test.ts to verify included and excluded paths. That is enough to explain this slice, not the whole repo."
        ],
        "repair_action": "Keep Command boundary and payload contract available for later spaced review; do not claim full readiness from one answer.",
        "updated_at": "2026-05-15T01:36:38.438Z"
      },
      "session_summary": {
        "session_id": "665cc30d-585c-4507-986f-eef8be5ed380",
        "project_label": "SIBAR Self-Hosted MVP First Slice",
        "started_at": "2026-05-15T01:36:38.436Z",
        "ended_at": "2026-05-15T01:36:38.438Z",
        "declared_intent": {
          "intent_id": "b032aea5-7d74-4748-9adf-32cc59e81825",
          "created_at": "2026-05-15T01:36:38.436Z",
          "project_label": "SIBAR Self-Hosted MVP First Slice",
          "project_path": ".",
          "statement": "Attempt an autopsy step for concept runtime-boundary.",
          "uncertainty": "User must predict or trace the artifact evidence before receiving an explanation.",
          "expected_work_area": "Command boundary and payload contract",
          "desired_help": "generate_questions"
        },
        "observed_tools": [
          "typescript-runtime",
          "artifact-concept-graph",
          "autopsy-step"
        ],
        "learning_signals": [
          {
            "signal_id": "9c33729a-e588-46a1-b8c3-b66120c74a3b",
            "created_at": "2026-05-15T01:36:38.436Z",
            "source": "ownership_question",
            "project_label": "SIBAR Self-Hosted MVP First Slice",
            "project_path": ".",
            "concept_or_area": "Command boundary and payload contract",
            "reason": "Runtime prepared an attempt-first autopsy step from persisted concept graph evidence.",
            "evidence": [
              "runtime-concept-graph.ts:57-57 linePattern: /\\b(runFromSTDIO|handleRequest|main\\(|start|listen|spawnSync|command)\\b/,"
            ],
            "severity": "important",
            "confidence": "high"
          },
          {
            "signal_id": "077396d0-4baf-4df4-828b-5e703cc30e81",
            "created_at": "2026-05-15T01:36:38.438Z",
            "source": "ownership_question",
            "project_label": "SIBAR Self-Hosted MVP First Slice",
            "project_path": ".",
            "concept_or_area": "Command boundary and payload contract",
            "reason": "Great! Your answer shows confident understanding with system-level connections. Moving this concept forward.",
            "evidence": [
              "Before any explanation, use the evidence below to predict what this concept is responsible for. Concept: Command boundary and payload contract. Explain what you think it does and name one thing that could break if your model is wrong.",
              "I think the self-hosted slice uses src/runtime-concept-graph.ts to build bounded evidence, src/runtime-support.ts to define the artifact evidence contracts, and Tests/concept-graph.test.ts to verify included and excluded paths. That is enough to explain this slice, not the whole repo."
            ],
            "severity": "later",
            "confidence": "high"
          }
        ],
        "ownership_questions": [
          {
            "question_id": "29708cdf-c315-48da-a417-e9f9c575b52d",
            "created_at": "2026-05-15T01:36:38.436Z",
            "session_id": "665cc30d-585c-4507-986f-eef8be5ed380",
            "detected_layer": 1,
            "required_layer": 4,
            "prompt": "Before any explanation, use the evidence below to predict what this concept is responsible for. Concept: Command boundary and payload contract. Explain what you think it does and name one thing that could break if your model is wrong.",
            "target_area": "Command boundary and payload contract",
            "why_it_matters": "The user should expose their current mental model before Sibi compares it to artifact evidence.",
            "evidence_basis": [
              "runtime-concept-graph.ts:57-57 linePattern: /\\b(runFromSTDIO|handleRequest|main\\(|start|listen|spawnSync|command)\\b/,"
            ],
            "answer_style": "short_explanation",
            "max_followups": 1,
            "answer": "I think the self-hosted slice uses src/runtime-concept-graph.ts to build bounded evidence, src/runtime-support.ts to define the artifact evidence contracts, and Tests/concept-graph.test.ts to verify included and excluded paths. That is enough to explain this slice, not the whole repo.",
            "answer_quality": "verified"
          }
        ],
        "export_state": "ready_for_review"
      },
      "operation_state": {
        "message": "Great! Your answer shows confident understanding with system-level connections. Moving this concept forward."
      }
    },
    "gap_answer": "I am not sure how the boundary rejects excluded paths. I know commands route through runtime, but I cannot trace the artifact evidence filtering yet.",
    "gap_result": {
      "session_id": "42a68851-cc27-433e-a51c-610389dcb14c",
      "question": {
        "question_id": "33803571-bfb3-4cac-8fd7-ce06bba93142",
        "created_at": "2026-05-15T01:36:38.438Z",
        "session_id": "42a68851-cc27-433e-a51c-610389dcb14c",
        "detected_layer": 1,
        "required_layer": 4,
        "prompt": "Before any explanation, use the evidence below to predict what this concept is responsible for. Concept: Artifact data flow. Explain what you think it does and name one thing that could break if your model is wrong.",
        "target_area": "Artifact data flow",
        "why_it_matters": "The user should expose their current mental model before Sibi compares it to artifact evidence.",
        "evidence_basis": [
          "runtime-concept-graph.ts:4-4 import { getArtifactSession, readState, writeState } from \"./runtime-state.ts\";"
        ],
        "answer_style": "short_explanation",
        "max_followups": 1,
        "answer": "I am not sure how the boundary rejects excluded paths. I know commands route through runtime, but I cannot trace the artifact evidence filtering yet.",
        "answer_quality": "partial"
      },
      "learning_gap": {
        "id": "99af6012-45c8-4d6a-9b69-ff8b52165cfd",
        "artifact_session_id": "94bbe59d-6352-4fc0-aa40-ca3775d4cff4",
        "session_id": "42a68851-cc27-433e-a51c-610389dcb14c",
        "question_id": "33803571-bfb3-4cac-8fd7-ce06bba93142",
        "concept_id": "artifact-data-flow",
        "concept_label": "Artifact data flow",
        "expected_layer": 4,
        "observed_layer": 1,
        "observed_answer_or_uncertainty": "I am not sure how the boundary rejects excluded paths. I know commands route through runtime, but I cannot trace the artifact evidence filtering yet.",
        "artifact_evidence": [
          {
            "file_path": "src/runtime-concept-graph.ts",
            "start_line": 4,
            "end_line": 4,
            "excerpt": "import { getArtifactSession, readState, writeState } from \"./runtime-state.ts\";"
          }
        ],
        "answer_evidence": [
          "prompt=Before any explanation, use the evidence below to predict what this concept is responsible for. Concept: Artifact data flow. Explain what you think it does and name one thing that could break if your model is wrong.",
          "answer=I am not sure how the boundary rejects excluded paths. I know commands route through runtime, but I cannot trace the artifact evidence filtering yet."
        ],
        "suspected_misconception": "The answer may explain Artifact data flow in isolation but does not yet connect it to the cited artifact evidence, boundary, or change risk.",
        "severity": "important",
        "confidence": "medium",
        "repair_action": "Ask the user to trace Artifact data flow from one cited line to the nearest boundary or downstream effect.",
        "created_at": "2026-05-15T01:36:38.439Z"
      },
      "session_summary": {
        "session_id": "42a68851-cc27-433e-a51c-610389dcb14c",
        "project_label": "SIBAR Self-Hosted MVP First Slice",
        "started_at": "2026-05-15T01:36:38.438Z",
        "ended_at": "2026-05-15T01:36:38.439Z",
        "declared_intent": {
          "intent_id": "6c59b770-eb24-4ce1-b70e-7c703ef7fc1f",
          "created_at": "2026-05-15T01:36:38.438Z",
          "project_label": "SIBAR Self-Hosted MVP First Slice",
          "project_path": ".",
          "statement": "Attempt an autopsy step for concept artifact-data-flow.",
          "uncertainty": "User must predict or trace the artifact evidence before receiving an explanation.",
          "expected_work_area": "Artifact data flow",
          "desired_help": "generate_questions"
        },
        "observed_tools": [
          "typescript-runtime",
          "artifact-concept-graph",
          "autopsy-step"
        ],
        "learning_signals": [
          {
            "signal_id": "bb2ec4e2-f422-4244-872a-8d5917eb8d40",
            "created_at": "2026-05-15T01:36:38.438Z",
            "source": "ownership_question",
            "project_label": "SIBAR Self-Hosted MVP First Slice",
            "project_path": ".",
            "concept_or_area": "Artifact data flow",
            "reason": "Runtime prepared an attempt-first autopsy step from persisted concept graph evidence.",
            "evidence": [
              "runtime-concept-graph.ts:4-4 import { getArtifactSession, readState, writeState } from \"./runtime-state.ts\";"
            ],
            "severity": "important",
            "confidence": "high"
          },
          {
            "signal_id": "73fc3db3-f223-4cea-b55e-b6b62ba731e1",
            "created_at": "2026-05-15T01:36:38.439Z",
            "source": "ownership_question",
            "project_label": "SIBAR Self-Hosted MVP First Slice",
            "project_path": ".",
            "concept_or_area": "Artifact data flow",
            "reason": "Good explanation in isolation. Let's connect this to the broader system with a follow-up question.",
            "evidence": [
              "Before any explanation, use the evidence below to predict what this concept is responsible for. Concept: Artifact data flow. Explain what you think it does and name one thing that could break if your model is wrong.",
              "I am not sure how the boundary rejects excluded paths. I know commands route through runtime, but I cannot trace the artifact evidence filtering yet."
            ],
            "severity": "important",
            "confidence": "medium"
          }
        ],
        "ownership_questions": [
          {
            "question_id": "33803571-bfb3-4cac-8fd7-ce06bba93142",
            "created_at": "2026-05-15T01:36:38.438Z",
            "session_id": "42a68851-cc27-433e-a51c-610389dcb14c",
            "detected_layer": 1,
            "required_layer": 4,
            "prompt": "Before any explanation, use the evidence below to predict what this concept is responsible for. Concept: Artifact data flow. Explain what you think it does and name one thing that could break if your model is wrong.",
            "target_area": "Artifact data flow",
            "why_it_matters": "The user should expose their current mental model before Sibi compares it to artifact evidence.",
            "evidence_basis": [
              "runtime-concept-graph.ts:4-4 import { getArtifactSession, readState, writeState } from \"./runtime-state.ts\";"
            ],
            "answer_style": "short_explanation",
            "max_followups": 1,
            "answer": "I am not sure how the boundary rejects excluded paths. I know commands route through runtime, but I cannot trace the artifact evidence filtering yet.",
            "answer_quality": "partial"
          }
        ],
        "export_state": "ready_for_review"
      },
      "operation_state": {
        "message": "Good explanation in isolation. Let's connect this to the broader system with a follow-up question."
      }
    }
  },
  "practice": [
    {
      "id": "practice-99af6012-45c8-4d6a-9b69-ff8b52165cfd",
      "artifact_session_id": "94bbe59d-6352-4fc0-aa40-ca3775d4cff4",
      "session_id": "42a68851-cc27-433e-a51c-610389dcb14c",
      "concept_id": "artifact-data-flow",
      "gap_id": "99af6012-45c8-4d6a-9b69-ff8b52165cfd",
      "challenge_type": "explain_flow_without_looking",
      "prompt": "Explain Artifact data flow without looking first, then check against src/runtime-concept-graph.ts:4-4 and mark what was missing.",
      "expected_evidence": [
        "gap_id=99af6012-45c8-4d6a-9b69-ff8b52165cfd",
        "concept_id=artifact-data-flow",
        "produce=written explanation, trace, prediction, or test idea that directly repairs the detected gap",
        "counts=must cite artifact evidence and address suspected misconception: The answer may explain Artifact data flow in isolation but does not yet connect it to the cited artifact evidence, boundary, or change risk.",
        "artifact=src/runtime-concept-graph.ts:4-4 excerpt=import { getArtifactSession, readState, writeState } from \"./runtime-state.ts\";"
      ],
      "difficulty": "medium",
      "due_after": "24h",
      "revisit_after": "2026-05-16T01:36:38.440Z",
      "completion_state": "pending",
      "created_at": "2026-05-15T01:36:38.440Z"
    }
  ],
  "readiness": {
    "artifact_session_id": "94bbe59d-6352-4fc0-aa40-ca3775d4cff4",
    "label": "SIBAR Self-Hosted MVP First Slice",
    "generated_at": "2026-05-15T01:36:38.442Z",
    "summary": {
      "readiness": "not ready yet",
      "statement": "1 open gap(s) keep this artifact from being ready to own.",
      "confidence": "medium",
      "evidence_ids": [
        "E2",
        "E1"
      ]
    },
    "ready_areas": [
      {
        "claim_id": "ready-runtime-boundary",
        "title": "Command boundary and payload contract",
        "claim": "Command boundary and payload contract is ready to modify with guardrails based on a confirmed answer and cited artifact evidence.",
        "readiness": "ready to modify with guardrails",
        "confidence": "high",
        "evidence_ids": [
          "E1"
        ]
      }
    ],
    "risky_areas": [
      {
        "claim_id": "risk-99af6012-45c8-4d6a-9b69-ff8b52165cfd",
        "title": "Artifact data flow",
        "claim": "Do not modify Artifact data flow without guardrails until this gap is repaired.",
        "readiness": "not ready yet",
        "confidence": "medium",
        "evidence_ids": [
          "E2"
        ]
      }
    ],
    "verified_concepts": [
      {
        "claim_id": "verified-runtime-boundary",
        "concept_id": "runtime-boundary",
        "concept_label": "Command boundary and payload contract",
        "title": "Command boundary and payload contract",
        "claim": "Command boundary and payload contract is ready to modify with guardrails based on a confirmed answer and cited artifact evidence.",
        "readiness": "ready to modify with guardrails",
        "confidence": "high",
        "evidence_ids": [
          "E1"
        ]
      }
    ],
    "open_gaps": [
      {
        "claim_id": "gap-99af6012-45c8-4d6a-9b69-ff8b52165cfd",
        "gap_id": "99af6012-45c8-4d6a-9b69-ff8b52165cfd",
        "concept_id": "artifact-data-flow",
        "concept_label": "Artifact data flow",
        "title": "Artifact data flow",
        "claim": "Artifact data flow is not ready yet because the latest answer showed: The answer may explain Artifact data flow in isolation but does not yet connect it to the cited artifact evidence, boundary, or change risk.",
        "readiness": "not ready yet",
        "confidence": "medium",
        "severity": "important",
        "repair_action": "Ask the user to trace Artifact data flow from one cited line to the nearest boundary or downstream effect.",
        "evidence_ids": [
          "E2"
        ]
      }
    ],
    "practice_queue": [
      {
        "claim_id": "practice-practice-99af6012-45c8-4d6a-9b69-ff8b52165cfd",
        "challenge_id": "practice-99af6012-45c8-4d6a-9b69-ff8b52165cfd",
        "gap_id": "99af6012-45c8-4d6a-9b69-ff8b52165cfd",
        "concept_id": "artifact-data-flow",
        "title": "Artifact data flow",
        "claim": "Practice is queued for Artifact data flow to repair gap 99af6012-45c8-4d6a-9b69-ff8b52165cfd.",
        "readiness": "not ready yet",
        "confidence": "medium",
        "due_after": "24h",
        "revisit_after": "2026-05-16T01:36:38.440Z",
        "prompt": "Explain Artifact data flow without looking first, then check against src/runtime-concept-graph.ts:4-4 and mark what was missing.",
        "evidence_ids": [
          "E2"
        ]
      }
    ],
    "recommended_next_action": {
      "claim_id": "next-action",
      "title": "Recommended next action",
      "action": "Explain Artifact data flow without looking first, then check against src/runtime-concept-graph.ts:4-4 and mark what was missing.",
      "claim": "Start the queued practice for Artifact data flow.",
      "readiness": "not ready yet",
      "confidence": "medium",
      "evidence_ids": [
        "E2"
      ]
    },
    "evidence_index": [
      {
        "evidence_id": "E1",
        "source": "confirmed_concept",
        "file_path": "src/runtime-concept-graph.ts",
        "start_line": 57,
        "end_line": 57,
        "excerpt": "linePattern: /\\b(runFromSTDIO|handleRequest|main\\(|start|listen|spawnSync|command)\\b/,"
      },
      {
        "evidence_id": "E2",
        "source": "learning_gap",
        "file_path": "src/runtime-concept-graph.ts",
        "start_line": 4,
        "end_line": 4,
        "excerpt": "import { getArtifactSession, readState, writeState } from \"./runtime-state.ts\";"
      }
    ]
  },
  "study_panel": {
    "evidence_index": [
      {
        "evidence_id": "SP1",
        "source": "concept_graph",
        "file_path": "src/runtime-concept-graph.ts",
        "start_line": 57,
        "end_line": 57,
        "excerpt": "linePattern: /\\b(runFromSTDIO|handleRequest|main\\(|start|listen|spawnSync|command)\\b/,"
      },
      {
        "evidence_id": "SP2",
        "source": "concept_graph",
        "file_path": "src/runtime-memory.ts",
        "start_line": 15,
        "end_line": 15,
        "excerpt": "import { getArtifactSession, readState } from \"./runtime-state.ts\";"
      },
      {
        "evidence_id": "SP3",
        "source": "concept_graph",
        "file_path": "src/runtime-concept-graph.ts",
        "start_line": 78,
        "end_line": 78,
        "excerpt": "id: \"core-policy\","
      },
      {
        "evidence_id": "SP4",
        "source": "concept_graph",
        "file_path": "src/runtime-concept-graph.ts",
        "start_line": 4,
        "end_line": 4,
        "excerpt": "import { getArtifactSession, readState, writeState } from \"./runtime-state.ts\";"
      },
      {
        "evidence_id": "SP5",
        "source": "concept_graph",
        "file_path": "Tests/concept-graph.test.ts",
        "start_line": 7,
        "end_line": 7,
        "excerpt": "import { handleRequest } from \"../src/runtime.ts\";"
      },
      {
        "evidence_id": "SP6",
        "source": "concept_graph",
        "file_path": "src/runtime-concept-graph.ts",
        "start_line": 111,
        "end_line": 111,
        "excerpt": "linePattern: /\\b(fail\\(|throw new|catch|reject|outside|invalid|missing|error\\.code)\\b/,"
      }
    ],
    "current_questions": [
      {
        "question_id": "33803571-bfb3-4cac-8fd7-ce06bba93142",
        "created_at": "2026-05-15T01:36:38.438Z",
        "session_id": "42a68851-cc27-433e-a51c-610389dcb14c",
        "detected_layer": 1,
        "required_layer": 4,
        "prompt": "Before any explanation, use the evidence below to predict what this concept is responsible for. Concept: Artifact data flow. Explain what you think it does and name one thing that could break if your model is wrong.",
        "target_area": "Artifact data flow",
        "why_it_matters": "The user should expose their current mental model before Sibi compares it to artifact evidence.",
        "evidence_basis": [
          "runtime-concept-graph.ts:4-4 import { getArtifactSession, readState, writeState } from \"./runtime-state.ts\";"
        ],
        "answer_style": "short_explanation",
        "max_followups": 1,
        "answer": "I am not sure how the boundary rejects excluded paths. I know commands route through runtime, but I cannot trace the artifact evidence filtering yet.",
        "answer_quality": "partial"
      }
    ],
    "learning_gaps": [
      {
        "id": "99af6012-45c8-4d6a-9b69-ff8b52165cfd",
        "artifact_session_id": "94bbe59d-6352-4fc0-aa40-ca3775d4cff4",
        "session_id": "42a68851-cc27-433e-a51c-610389dcb14c",
        "question_id": "33803571-bfb3-4cac-8fd7-ce06bba93142",
        "concept_id": "artifact-data-flow",
        "concept_label": "Artifact data flow",
        "expected_layer": 4,
        "observed_layer": 1,
        "observed_answer_or_uncertainty": "I am not sure how the boundary rejects excluded paths. I know commands route through runtime, but I cannot trace the artifact evidence filtering yet.",
        "artifact_evidence": [
          {
            "file_path": "src/runtime-concept-graph.ts",
            "start_line": 4,
            "end_line": 4,
            "excerpt": "import { getArtifactSession, readState, writeState } from \"./runtime-state.ts\";"
          }
        ],
        "answer_evidence": [
          "prompt=Before any explanation, use the evidence below to predict what this concept is responsible for. Concept: Artifact data flow. Explain what you think it does and name one thing that could break if your model is wrong.",
          "answer=I am not sure how the boundary rejects excluded paths. I know commands route through runtime, but I cannot trace the artifact evidence filtering yet."
        ],
        "suspected_misconception": "The answer may explain Artifact data flow in isolation but does not yet connect it to the cited artifact evidence, boundary, or change risk.",
        "severity": "important",
        "confidence": "medium",
        "repair_action": "Ask the user to trace Artifact data flow from one cited line to the nearest boundary or downstream effect.",
        "created_at": "2026-05-15T01:36:38.439Z"
      }
    ],
    "practice_challenges": [
      {
        "id": "practice-99af6012-45c8-4d6a-9b69-ff8b52165cfd",
        "artifact_session_id": "94bbe59d-6352-4fc0-aa40-ca3775d4cff4",
        "session_id": "42a68851-cc27-433e-a51c-610389dcb14c",
        "concept_id": "artifact-data-flow",
        "gap_id": "99af6012-45c8-4d6a-9b69-ff8b52165cfd",
        "challenge_type": "explain_flow_without_looking",
        "prompt": "Explain Artifact data flow without looking first, then check against src/runtime-concept-graph.ts:4-4 and mark what was missing.",
        "expected_evidence": [
          "gap_id=99af6012-45c8-4d6a-9b69-ff8b52165cfd",
          "concept_id=artifact-data-flow",
          "produce=written explanation, trace, prediction, or test idea that directly repairs the detected gap",
          "counts=must cite artifact evidence and address suspected misconception: The answer may explain Artifact data flow in isolation but does not yet connect it to the cited artifact evidence, boundary, or change risk.",
          "artifact=src/runtime-concept-graph.ts:4-4 excerpt=import { getArtifactSession, readState, writeState } from \"./runtime-state.ts\";"
        ],
        "difficulty": "medium",
        "due_after": "24h",
        "revisit_after": "2026-05-16T01:36:38.440Z",
        "completion_state": "pending",
        "created_at": "2026-05-15T01:36:38.440Z"
      }
    ],
    "memory_summary": {
      "artifact_session_id": "94bbe59d-6352-4fc0-aa40-ca3775d4cff4",
      "label": "SIBAR Self-Hosted MVP First Slice",
      "root_path": ".",
      "generated_at": "2026-05-15T01:36:38.443Z",
      "concept_states": [
        {
          "concept_id": "artifact-data-flow",
          "concept_label": "Artifact data flow",
          "status": "gap_open",
          "confidence": "medium",
          "expected_layer": 4,
          "observed_layer": 1,
          "evidence": [
            {
              "file_path": "src/runtime-concept-graph.ts",
              "start_line": 4,
              "end_line": 4,
              "excerpt": "import { getArtifactSession, readState, writeState } from \"./runtime-state.ts\";"
            }
          ],
          "last_answered_at": "2026-05-15T01:36:38.439Z",
          "next_review_at": "2026-05-16T01:36:38.440Z",
          "open_gap_ids": [
            "99af6012-45c8-4d6a-9b69-ff8b52165cfd"
          ],
          "challenge_ids": [
            "practice-99af6012-45c8-4d6a-9b69-ff8b52165cfd"
          ]
        },
        {
          "concept_id": "core-policy",
          "concept_label": "Core learning policy",
          "status": "unseen",
          "evidence": [
            {
              "file_path": "src/runtime-concept-graph.ts",
              "start_line": 78,
              "end_line": 78,
              "excerpt": "id: \"core-policy\","
            }
          ],
          "open_gap_ids": [],
          "challenge_ids": []
        },
        {
          "concept_id": "entry-point",
          "concept_label": "Runtime entry point",
          "status": "unseen",
          "evidence": [
            {
              "file_path": "src/runtime-concept-graph.ts",
              "start_line": 57,
              "end_line": 57,
              "excerpt": "linePattern: /\\b(runFromSTDIO|handleRequest|main\\(|start|listen|spawnSync|command)\\b/,"
            }
          ],
          "open_gap_ids": [],
          "challenge_ids": []
        },
        {
          "concept_id": "failure-modes",
          "concept_label": "Failure modes and rejected inputs",
          "status": "unseen",
          "evidence": [
            {
              "file_path": "src/runtime-concept-graph.ts",
              "start_line": 111,
              "end_line": 111,
              "excerpt": "linePattern: /\\b(fail\\(|throw new|catch|reject|outside|invalid|missing|error\\.code)\\b/,"
            }
          ],
          "open_gap_ids": [],
          "challenge_ids": []
        },
        {
          "concept_id": "runtime-boundary",
          "concept_label": "Command boundary and payload contract",
          "status": "confirmed",
          "confidence": "high",
          "expected_layer": 4,
          "observed_layer": 4,
          "evidence": [
            {
              "file_path": "src/runtime-concept-graph.ts",
              "start_line": 57,
              "end_line": 57,
              "excerpt": "linePattern: /\\b(runFromSTDIO|handleRequest|main\\(|start|listen|spawnSync|command)\\b/,"
            }
          ],
          "last_answered_at": "2026-05-15T01:36:38.438Z",
          "next_review_at": "2026-05-22T01:36:38.438Z",
          "open_gap_ids": [],
          "challenge_ids": []
        },
        {
          "concept_id": "state-persistence",
          "concept_label": "Runtime state persistence",
          "status": "unseen",
          "evidence": [
            {
              "file_path": "src/runtime-memory.ts",
              "start_line": 15,
              "end_line": 15,
              "excerpt": "import { getArtifactSession, readState } from \"./runtime-state.ts\";"
            }
          ],
          "open_gap_ids": [],
          "challenge_ids": []
        },
        {
          "concept_id": "test-coverage",
          "concept_label": "Runtime behavior tests",
          "status": "unseen",
          "evidence": [
            {
              "file_path": "Tests/concept-graph.test.ts",
              "start_line": 7,
              "end_line": 7,
              "excerpt": "import { handleRequest } from \"../src/runtime.ts\";"
            }
          ],
          "open_gap_ids": [],
          "challenge_ids": []
        }
      ],
      "answer_history": [
        {
          "answer_id": "state-runtime-boundary-29708cdf-c315-48da-a417-e9f9c575b52d",
          "session_id": "665cc30d-585c-4507-986f-eef8be5ed380",
          "question_id": "29708cdf-c315-48da-a417-e9f9c575b52d",
          "concept_id": "runtime-boundary",
          "concept_label": "Command boundary and payload contract",
          "answer": "I think the self-hosted slice uses src/runtime-concept-graph.ts to build bounded evidence, src/runtime-support.ts to define the artifact evidence contracts, and Tests/concept-graph.test.ts to verify included and excluded paths. That is enough to explain this slice, not the whole repo.",
          "outcome": "confirmed",
          "confidence": "high",
          "created_at": "2026-05-15T01:36:38.438Z",
          "evidence": [
            {
              "file_path": "src/runtime-concept-graph.ts",
              "start_line": 57,
              "end_line": 57,
              "excerpt": "linePattern: /\\b(runFromSTDIO|handleRequest|main\\(|start|listen|spawnSync|command)\\b/,"
            }
          ]
        },
        {
          "answer_id": "gap-99af6012-45c8-4d6a-9b69-ff8b52165cfd",
          "session_id": "42a68851-cc27-433e-a51c-610389dcb14c",
          "question_id": "33803571-bfb3-4cac-8fd7-ce06bba93142",
          "concept_id": "artifact-data-flow",
          "concept_label": "Artifact data flow",
          "answer": "I am not sure how the boundary rejects excluded paths. I know commands route through runtime, but I cannot trace the artifact evidence filtering yet.",
          "outcome": "gap",
          "confidence": "medium",
          "created_at": "2026-05-15T01:36:38.439Z",
          "evidence": [
            {
              "file_path": "src/runtime-concept-graph.ts",
              "start_line": 4,
              "end_line": 4,
              "excerpt": "import { getArtifactSession, readState, writeState } from \"./runtime-state.ts\";"
            }
          ]
        }
      ],
      "gaps": [
        {
          "id": "99af6012-45c8-4d6a-9b69-ff8b52165cfd",
          "artifact_session_id": "94bbe59d-6352-4fc0-aa40-ca3775d4cff4",
          "session_id": "42a68851-cc27-433e-a51c-610389dcb14c",
          "question_id": "33803571-bfb3-4cac-8fd7-ce06bba93142",
          "concept_id": "artifact-data-flow",
          "concept_label": "Artifact data flow",
          "expected_layer": 4,
          "observed_layer": 1,
          "observed_answer_or_uncertainty": "I am not sure how the boundary rejects excluded paths. I know commands route through runtime, but I cannot trace the artifact evidence filtering yet.",
          "artifact_evidence": [
            {
              "file_path": "src/runtime-concept-graph.ts",
              "start_line": 4,
              "end_line": 4,
              "excerpt": "import { getArtifactSession, readState, writeState } from \"./runtime-state.ts\";"
            }
          ],
          "answer_evidence": [
            "prompt=Before any explanation, use the evidence below to predict what this concept is responsible for. Concept: Artifact data flow. Explain what you think it does and name one thing that could break if your model is wrong.",
            "answer=I am not sure how the boundary rejects excluded paths. I know commands route through runtime, but I cannot trace the artifact evidence filtering yet."
          ],
          "suspected_misconception": "The answer may explain Artifact data flow in isolation but does not yet connect it to the cited artifact evidence, boundary, or change risk.",
          "severity": "important",
          "confidence": "medium",
          "repair_action": "Ask the user to trace Artifact data flow from one cited line to the nearest boundary or downstream effect.",
          "created_at": "2026-05-15T01:36:38.439Z"
        }
      ],
      "challenges": [
        {
          "id": "practice-99af6012-45c8-4d6a-9b69-ff8b52165cfd",
          "artifact_session_id": "94bbe59d-6352-4fc0-aa40-ca3775d4cff4",
          "session_id": "42a68851-cc27-433e-a51c-610389dcb14c",
          "concept_id": "artifact-data-flow",
          "gap_id": "99af6012-45c8-4d6a-9b69-ff8b52165cfd",
          "challenge_type": "explain_flow_without_looking",
          "prompt": "Explain Artifact data flow without looking first, then check against src/runtime-concept-graph.ts:4-4 and mark what was missing.",
          "expected_evidence": [
            "gap_id=99af6012-45c8-4d6a-9b69-ff8b52165cfd",
            "concept_id=artifact-data-flow",
            "produce=written explanation, trace, prediction, or test idea that directly repairs the detected gap",
            "counts=must cite artifact evidence and address suspected misconception: The answer may explain Artifact data flow in isolation but does not yet connect it to the cited artifact evidence, boundary, or change risk.",
            "artifact=src/runtime-concept-graph.ts:4-4 excerpt=import { getArtifactSession, readState, writeState } from \"./runtime-state.ts\";"
          ],
          "difficulty": "medium",
          "due_after": "24h",
          "revisit_after": "2026-05-16T01:36:38.440Z",
          "completion_state": "pending",
          "created_at": "2026-05-15T01:36:38.440Z"
        }
      ],
      "next_reviews": [
        {
          "concept_id": "artifact-data-flow",
          "concept_label": "Artifact data flow",
          "next_review_at": "2026-05-16T01:36:38.440Z",
          "reason": "pending_challenge",
          "challenge_id": "practice-99af6012-45c8-4d6a-9b69-ff8b52165cfd",
          "gap_id": "99af6012-45c8-4d6a-9b69-ff8b52165cfd"
        },
        {
          "concept_id": "runtime-boundary",
          "concept_label": "Command boundary and payload contract",
          "next_review_at": "2026-05-22T01:36:38.438Z",
          "reason": "confirmed_review"
        }
      ]
    }
  }
};

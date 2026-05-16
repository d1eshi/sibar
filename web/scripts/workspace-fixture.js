// ── Deep Ownership Workspace Fixture Data ──
// Contains the complete fixture JSON for the workspace demo
// Sets window.deepOwnershipFixture

window.deepOwnershipFixture = {
  "fixture_id": "sibi-pedagogy-loop-v1",
  "generated_at": "2026-05-16T00:00:00.000Z",
  "goal": "Understand how Sibi converts a partial user answer into a learning gap and readiness limitation, then generates a concrete repair action scoped to the detected evidence.",
  "artifact_boundary": {
    "root_path": "/Users/d1eshi/.codex/worktrees/e0f0/sibar",
    "source_type": "repository",
    "included_sources": [
      "src/runtime-gap-detection.ts",
      "src/runtime-readiness.ts",
      "src/runtime-practice.ts",
      "src/runtime-memory.ts",
      "src/runtime-support.ts",
      "src/runtime-state.ts",
      "Tests/gap-detection.test.ts",
      "Tests/readiness-report.test.ts",
      "Tests/understanding-memory.test.ts"
    ],
    "excluded_sources": [
      "node_modules/**",
      "dist/**",
      ".git/**",
      "docs/iterations/**",
      "web/**",
      "src/scripts/**",
      "src/evals/**",
      "src/demo/**",
      "src/pedagogy/**",
      "src/article-workspace.ts",
      "src/article-workspace-server.ts",
      "src/code-selection.ts",
      "src/runtime-agent.ts",
      "src/runtime-agent-runner.ts",
      "src/runtime-agent-validation.ts",
      "src/runtime-artifact-session.ts",
      "src/runtime-autopsy.ts",
      "src/runtime-concept-graph.ts",
      "src/runtime-prepared-question.ts",
      "src/runtime-questions.ts",
      "src/runtime-study-panel.ts",
      "src/runtime.ts",
      "src/sibi.ts",
      "src/store.ts",
      "Sources/**",
      "Tests/article-workspace.test.ts",
      "Tests/article-workspace-ui.test.ts",
      "Tests/article-workspace-vercel.test.ts",
      "Tests/autopsy.test.ts",
      "Tests/concept-graph.test.ts",
      "Tests/deterministic-pedagogy-evals.test.ts",
      "Tests/early-access.test.ts",
      "Tests/llm-runtime-trace-evals.test.ts",
      "Tests/ownership-questions.test.ts",
      "Tests/practice-challenges.test.ts",
      "Tests/project-learning-agent.test.ts",
      "Tests/public-demo-fixtures.test.ts",
      "Tests/selfhost-benchmark.test.ts",
      "Tests/selfhost-freeform.test.ts",
      "Tests/selfhost-pilot-evals.test.ts",
      "Tests/study-panel.test.ts",
      "Tests/supply-chain-guard.test.ts",
      "*.md",
      "*.json",
      "*.yaml",
      "*.lock",
      "*.lockb"
    ],
    "evidence_roles": [
      "source_truth",
      "intent",
      "behavior_oracle",
      "implementation",
      "interface"
    ],
    "entrypoints": [
      "src/runtime-gap-detection.ts",
      "src/runtime-readiness.ts"
    ],
    "tests_as_oracles": [
      "Tests/gap-detection.test.ts",
      "Tests/readiness-report.test.ts",
      "Tests/understanding-memory.test.ts"
    ]
  },
  "evidence_inventory": [
    {
      "id": "EV-001",
      "path": "src/runtime-gap-detection.ts",
      "source_type": "source_truth",
      "size_bytes": 8801,
      "extension": ".ts",
      "role": "implementation",
      "content_hash": "sha256:fa4b0a8c",
      "excerpt": "Gap detection: maps answer quality to learning gaps from artifact evidence",
      "status": "inspected",
      "line_count": 268
    },
    {
      "id": "EV-002",
      "path": "src/runtime-readiness.ts",
      "source_type": "source_truth",
      "size_bytes": 12833,
      "extension": ".ts",
      "role": "implementation",
      "content_hash": "sha256:9c1d3e2f",
      "excerpt": "Readiness report: evidence-backed readiness claims from understanding memory",
      "status": "inspected",
      "line_count": 331
    },
    {
      "id": "EV-003",
      "path": "src/runtime-practice.ts",
      "source_type": "source_truth",
      "size_bytes": 6785,
      "extension": ".ts",
      "role": "implementation",
      "content_hash": "sha256:7e2b1d4a",
      "excerpt": "Practice challenge generation from detected learning gaps",
      "status": "inspected",
      "line_count": 183
    },
    {
      "id": "EV-004",
      "path": "src/runtime-memory.ts",
      "source_type": "source_truth",
      "size_bytes": 8272,
      "extension": ".ts",
      "role": "implementation",
      "content_hash": "sha256:5f8a3c1b",
      "excerpt": "Understanding memory: concept mastery, answer history, review scheduling",
      "status": "inspected",
      "line_count": 237
    },
    {
      "id": "EV-005",
      "path": "src/runtime-support.ts",
      "source_type": "source_truth",
      "size_bytes": 9326,
      "extension": ".ts",
      "role": "interface",
      "content_hash": "sha256:2d6e1f7c",
      "excerpt": "Core runtime types: EvidenceCitation, LearningGap, ArtifactSession, UnderstandingMemory, etc.",
      "status": "inspected",
      "line_count": 361
    },
    {
      "id": "EV-006",
      "path": "src/runtime-state.ts",
      "source_type": "source_truth",
      "size_bytes": 2699,
      "extension": ".ts",
      "role": "interface",
      "content_hash": "sha256:8b4f2a0d",
      "excerpt": "Runtime state persistence: readState, writeState, session lookup",
      "status": "inspected",
      "line_count": 102
    },
    {
      "id": "EV-007",
      "path": "Tests/gap-detection.test.ts",
      "source_type": "behavior_oracle",
      "size_bytes": 5298,
      "extension": ".test.ts",
      "role": "behavior_oracle",
      "content_hash": "sha256:3c7a9e5d",
      "excerpt": "Gap detection tests: partial, wrong, uncertain, verified answer outcomes",
      "status": "inspected",
      "line_count": 173
    },
    {
      "id": "EV-008",
      "path": "Tests/readiness-report.test.ts",
      "source_type": "behavior_oracle",
      "size_bytes": 8352,
      "extension": ".test.ts",
      "role": "behavior_oracle",
      "content_hash": "sha256:d1e8f6b3",
      "excerpt": "Readiness report tests: evidence citations, markdown output, persistence",
      "status": "inspected",
      "line_count": 204
    },
    {
      "id": "EV-009",
      "path": "Tests/understanding-memory.test.ts",
      "source_type": "behavior_oracle",
      "size_bytes": 6966,
      "extension": ".test.ts",
      "role": "behavior_oracle",
      "content_hash": "sha256:4b2c7a1e",
      "excerpt": "Understanding memory tests: answer history, gaps, challenges, reviews",
      "status": "inspected",
      "line_count": 167
    }
  ],
  "skip_records": [
    { "id": "SKIP-001", "path": "node_modules/", "reason": "dependency_directory", "risk_if_ignored": "none" },
    { "id": "SKIP-002", "path": "dist/", "reason": "build_output", "risk_if_ignored": "none" },
    { "id": "SKIP-003", "path": ".git/", "reason": "version_control", "risk_if_ignored": "none" },
    { "id": "SKIP-004", "path": "pnpm-lock.yaml", "reason": "lockfile", "risk_if_ignored": "none" },
    { "id": "SKIP-005", "path": "package-lock.json", "reason": "lockfile", "risk_if_ignored": "none" },
    { "id": "SKIP-006", "path": "src/evals/", "reason": "evaluation_infrastructure", "risk_if_ignored": "low" },
    { "id": "SKIP-007", "path": "src/pedagogy/", "reason": "upstream_dependency_outside_slice", "risk_if_ignored": "medium" },
    { "id": "SKIP-008", "path": "web/", "reason": "ui_surface_outside_slice", "risk_if_ignored": "low" },
    { "id": "SKIP-009", "path": "Sources/", "reason": "swift_lens_outside_slice", "risk_if_ignored": "low" }
  ],
  "unknown_zones": [
    { "id": "UZ-001", "path": "src/runtime.ts", "reason": "command router; boundary is reserved for future loop expansion", "risk_if_ignored": "May miss how handleRequest connects pedagogy modules; current evidence from gap-detection and readiness is sufficient for this slice", "when_to_open": "When the user needs to trace end-to-end command routing" },
    { "id": "UZ-002", "path": "src/pedagogy/index.ts", "reason": "pedagogy type definitions imported by runtime-support; inspection deferred", "risk_if_ignored": "AnswerQuality enum and OwnershipQuestion shape may evolve; current fixture snapshots their runtime usage", "when_to_open": "When AnswerQuality or OwnershipQuestion contract changes" },
    { "id": "UZ-003", "path": "src/runtime-concept-graph.ts", "reason": "concept graph generation feeds artifact sessions; inspected only for interface shape", "risk_if_ignored": "Low for this slice — the loop's gap/readiness path depends on concept graph output, not its generation internals", "when_to_open": "When extending the concept slice to generation artifact coverage" }
  ],
  "out_of_bound_refs": [],
  "concept_slice": {
    "id": "CS-001",
    "label": "Readiness limitation from a partial answer",
    "domain": "code",
    "operation_target": "trace",
    "prerequisite_concepts": ["artifact boundary", "gap finding", "readiness claims", "evidence citation"],
    "source_evidence": ["EV-001", "EV-002", "EV-005"],
    "behavior_evidence": ["EV-007", "EV-008", "EV-009"],
    "risk_evidence": [],
    "expected_user_operations": ["trace", "explain", "predict"]
  },
  "thinking_artifacts": [
    {
      "id": "TA-001",
      "kind": "code_slice",
      "title": "Gap Detection Core: detectLearningGapFromAnswer",
      "purpose": "Show the exact code region where a partial answer becomes a typed learning gap with severity, confidence, and a concrete repair action.",
      "concept_slice_id": "CS-001",
      "source_evidence": [
        { "evidence_id": "EV-001", "file_path": "src/runtime-gap-detection.ts", "start_line": 120, "end_line": 180, "excerpt": "detectLearningGapFromAnswer: maps AnswerQuality to gap severity, confidence, misconception, and repair action", "role": "implementation" }
      ],
      "hidden_solution_evidence": [
        { "evidence_id": "EV-001", "file_path": "src/runtime-gap-detection.ts", "start_line": 120, "end_line": 180, "excerpt": "Full detection logic with quality-to-severity mapping", "role": "implementation" }
      ],
      "user_operation": {
        "id": "OP-001",
        "kind": "trace",
        "prompt": "Trace how detectLearningGapFromAnswer maps an answer_quality of 'partial' to a LearningGap. Name every field the gap receives — severity, confidence, suspected_misconception, repair_action, artifact_evidence — and explain which line in the code assigns each field. Then predict what would change if the quality were 'gap_confirmed' instead.",
        "artifact_ids": ["TA-001"],
        "required_evidence": ["EV-001"],
        "allowed_hints": 3,
        "blocked_shortcuts": ["cannot_answer_with_quality_enum_only", "cannot_skip_artifact_evidence_citation"],
        "success_criteria": ["Names at least five gap fields with their source line ranges", "Explains severityFor and confidenceFor branching logic", "Predicts correct change for gap_confirmed quality", "Cites specific file:line evidence for each claim"]
      },
      "renderer": "code_slice",
      "payload": {
        "file_path": "src/runtime-gap-detection.ts",
        "ranges": [{ "start_line": 120, "end_line": 180, "label": "detectLearningGapFromAnswer", "role": "implementation" }],
        "collapsed_context": "Lines 1-119 contain imports, findArtifactAnswerContext, and helper functions (observedLayer, severityFor, confidenceFor, misconceptionFor, repairActionFor)",
        "related_tests": [{ "file_path": "Tests/gap-detection.test.ts", "start_line": 62, "end_line": 83, "label": "partial-answer gap test" }],
        "related_docs": [],
        "selected_symbols": ["detectLearningGapFromAnswer", "observedLayer", "severityFor", "confidenceFor", "misconceptionFor", "repairActionFor"],
        "hidden_lines": [125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175],
        "prompt_focus": "How does the answer_quality value determine each gap field?"
      },
      "success_criteria": ["Names at least five gap fields with their source line ranges", "Explains severityFor and confidenceFor branching logic", "Predicts correct change for gap_confirmed quality", "Cites specific file:line evidence for each claim"],
      "created_at": "2026-05-16T00:00:00.000Z"
    },
    {
      "id": "TA-002",
      "kind": "flow_diagram",
      "title": "From Partial Answer to Scoped Readiness",
      "purpose": "Show the causal path a partial answer takes through gap detection, practice generation, memory building, and readiness reporting.",
      "concept_slice_id": "CS-001",
      "source_evidence": [
        { "evidence_id": "EV-001", "file_path": "src/runtime-gap-detection.ts", "start_line": 120, "end_line": 230, "excerpt": "Gap detection and persistence", "role": "implementation" },
        { "evidence_id": "EV-002", "file_path": "src/runtime-readiness.ts", "start_line": 61, "end_line": 260, "excerpt": "buildReadinessReport: evidence indexing, verified concepts, open gaps, recommended next action", "role": "implementation" },
        { "evidence_id": "EV-003", "file_path": "src/runtime-practice.ts", "start_line": 1, "end_line": 183, "excerpt": "Practice challenge generation from gaps", "role": "implementation" },
        { "evidence_id": "EV-004", "file_path": "src/runtime-memory.ts", "start_line": 1, "end_line": 237, "excerpt": "Understanding memory aggregation from concept states and gaps", "role": "implementation" }
      ],
      "hidden_solution_evidence": [
        { "evidence_id": "EV-002", "file_path": "src/runtime-readiness.ts", "start_line": 61, "end_line": 260, "excerpt": "Full readiness report construction with all claim types and evidence indexing", "role": "implementation" }
      ],
      "user_operation": {
        "id": "OP-002",
        "kind": "trace",
        "prompt": "Trace the end-to-end path: a user submits a partial answer → gap is detected → gap is persisted → practice challenge is generated → understanding memory is built → readiness report is produced. Draw the sequence of function calls and data transformations. For each step, name the file and function responsible.",
        "artifact_ids": ["TA-002"],
        "required_evidence": ["EV-001", "EV-002", "EV-003", "EV-004"],
        "allowed_hints": 3,
        "blocked_shortcuts": ["cannot_skip_practice_generation", "cannot_skip_memory_aggregation"],
        "success_criteria": ["Names the correct file and function for each step", "Identifies that gap detection runs before practice generation", "Identifies that memory aggregates gaps, challenges, and concept states before readiness", "Shows evidence-aware understanding of the data dependencies"]
      },
      "renderer": "flow_diagram",
      "payload": {
        "nodes": [
          { "id": "N-001", "label": "User Partial Answer", "role": "input", "evidence": ["EV-007"], "is_inferred": false, "user_prompt": "What kind of answer would trigger a partial gap?" },
          { "id": "N-002", "label": "detectLearningGapFromAnswer", "role": "process", "evidence": ["EV-001"], "is_inferred": false, "user_prompt": "Which line assigns the severity field?" },
          { "id": "N-003", "label": "LearningGap (persisted)", "role": "data", "evidence": ["EV-001"], "is_inferred": false, "user_prompt": "Where is the gap stored in the artifact session?" },
          { "id": "N-004", "label": "Practice Challenge Generation", "role": "process", "evidence": ["EV-003"], "is_inferred": false, "user_prompt": "What determines the challenge difficulty?" },
          { "id": "N-005", "label": "Understanding Memory Build", "role": "process", "evidence": ["EV-004"], "is_inferred": false, "user_prompt": "How does memory aggregate concepts from gaps and confirmed states?" },
          { "id": "N-006", "label": "Readiness Report", "role": "output", "evidence": ["EV-002"], "is_inferred": false, "user_prompt": "What claim types does the report contain?" },
          { "id": "N-007", "label": "Scoped Readiness Result", "role": "output", "evidence": ["EV-002"], "is_inferred": true, "user_prompt": "The readiness claim is scoped to one operation. Which evidence proves it doesn't claim whole-repo mastery?" }
        ],
        "edges": [
          { "from": "N-001", "to": "N-002", "relation": "input_to_process", "evidence": ["EV-001"], "is_inferred": false },
          { "from": "N-002", "to": "N-003", "relation": "produces", "evidence": ["EV-001"], "is_inferred": false },
          { "from": "N-003", "to": "N-004", "relation": "input_to_process", "evidence": ["EV-003"], "is_inferred": false },
          { "from": "N-003", "to": "N-005", "relation": "input_to_process", "evidence": ["EV-004"], "is_inferred": false },
          { "from": "N-004", "to": "N-005", "relation": "feeds_into", "evidence": ["EV-004"], "is_inferred": true },
          { "from": "N-005", "to": "N-006", "relation": "produces", "evidence": ["EV-002"], "is_inferred": false },
          { "from": "N-006", "to": "N-007", "relation": "projects", "evidence": ["EV-002"], "is_inferred": true }
        ],
        "entry_node": "N-001",
        "terminal_nodes": ["N-007"],
        "uncertainty_markers": []
      },
      "success_criteria": ["Names the correct file and function for each step", "Identifies that gap detection runs before practice generation", "Identifies that memory aggregates gaps, challenges, and concept states before readiness", "Shows evidence-aware understanding of the data dependencies"],
      "created_at": "2026-05-16T00:00:00.000Z"
    }
  ],
  "active_operation": {
    "id": "OP-001",
    "kind": "trace",
    "prompt": "Trace how detectLearningGapFromAnswer maps an answer_quality of 'partial' to a LearningGap. Name every field the gap receives — severity, confidence, suspected_misconception, repair_action, artifact_evidence — and explain which line in the code assigns each field. Then predict what would change if the quality were 'gap_confirmed' instead.",
    "artifact_ids": ["TA-001"],
    "required_evidence": ["EV-001"],
    "allowed_hints": 3,
    "blocked_shortcuts": ["cannot_answer_with_quality_enum_only", "cannot_skip_artifact_evidence_citation"],
    "success_criteria": ["Names at least five gap fields with their source line ranges", "Explains severityFor and confidenceFor branching logic", "Predicts correct change for gap_confirmed quality", "Cites specific file:line evidence for each claim"]
  },
  "sample_attempt": {
    "id": "ATT-001",
    "operation_id": "OP-001",
    "answer_text": "I can see that detectLearningGapFromAnswer calls observedLayer, severityFor, and confidenceFor. But I cannot trace exactly which line assigns each gap field because the helper functions are hard to follow. I know partial answers produce 'important' severity, but I cannot justify why from the code evidence.",
    "selected_evidence": ["EV-001"],
    "declared_confidence": "low",
    "declared_unknowns": ["Cannot trace severityFor branching from quality → severity", "Cannot name the exact line that assigns suspected_misconception", "Cannot predict full gap_confirmed behavior change"],
    "created_at": "2026-05-16T00:05:00.000Z"
  },
  "evidence_check": {
    "id": "EC-001",
    "attempt_id": "ATT-001",
    "required_claims": ["Names at least five gap fields with their source line ranges", "Explains severityFor and confidenceFor branching logic", "Predicts correct change for gap_confirmed quality", "Cites specific file:line evidence for each claim"],
    "observed_claims": ["Names observedLayer, severityFor, confidenceFor functions", "Identifies partial → important severity"],
    "missing_claims": ["Does not name five gap fields with line ranges", "Does not explain severityFor branching logic", "Does not predict gap_confirmed behavior change", "Does not cite specific file:line evidence"],
    "contradicted_claims": [],
    "unsupported_claims": ["Partial answers produce 'important' severity — stated but not justified from code evidence"],
    "cited_evidence": [{ "evidence_id": "EV-001", "file_path": "src/runtime-gap-detection.ts", "start_line": 120, "end_line": 180 }],
    "artifact_counterevidence": [{ "evidence_id": "EV-001", "file_path": "src/runtime-gap-detection.ts", "start_line": 84, "end_line": 112, "excerpt": "severityFor and confidenceFor branching logic showing gap_confirmed → critical severity and high confidence", "role": "implementation" }],
    "result": "partial"
  },
  "detected_gap": {
    "id": "GAP-001",
    "concept_slice_id": "CS-001",
    "kind": "shallow_trace",
    "user_attempt_ref": "ATT-001",
    "artifact_evidence_refs": [
      { "evidence_id": "EV-001", "file_path": "src/runtime-gap-detection.ts", "start_line": 84, "end_line": 112, "excerpt": "severityFor and confidenceFor helpers" },
      { "evidence_id": "EV-001", "file_path": "src/runtime-gap-detection.ts", "start_line": 140, "end_line": 180, "excerpt": "detectLearningGapFromAnswer gap construction body" }
    ],
    "evidence": "The user identified which functions are involved but could not trace the exact branching logic that converts quality into severity, confidence, and misconception. The cited evidence shows severityFor returns 'critical' for gap_confirmed (not 'important' as the user guessed).",
    "severity": "important",
    "blocks_readiness": true,
    "created_at": "2026-05-16T00:05:30.000Z"
  },
  "repair_action": {
    "id": "REP-001",
    "gap_id": "GAP-001",
    "operation_kind": "trace",
    "prompt": "Re-read the severityFor function (lines 84-92) and confidenceFor function (lines 94-104) in src/runtime-gap-detection.ts. Create a small table mapping each answer_quality value to its severity and confidence, with the exact line that determines each. Then trace how detectLearningGapFromAnswer uses those values to construct the LearningGap object.",
    "required_evidence": [
      { "evidence_id": "EV-001", "file_path": "src/runtime-gap-detection.ts", "start_line": 84, "end_line": 112, "role": "implementation" },
      { "evidence_id": "EV-001", "file_path": "src/runtime-gap-detection.ts", "start_line": 120, "end_line": 180, "role": "implementation" }
    ],
    "source_gap_id": "GAP-001",
    "created_at": "2026-05-16T00:06:00.000Z"
  },
  "readiness_claim": {
    "id": "RC-001",
    "concept_slice_id": "CS-001",
    "operation_id": "OP-001",
    "status": "blocked",
    "scope": "Tracing how detectLearningGapFromAnswer maps answer quality to gap fields within src/runtime-gap-detection.ts",
    "ready_to_explain": false,
    "ready_to_trace": false,
    "ready_to_derive": false,
    "ready_to_predict": false,
    "ready_to_build": false,
    "ready_to_modify": false,
    "ready_to_debug": false,
    "ready_to_transfer": false,
    "ready_to_teach": false,
    "blocked_claims": ["Cannot trace severityFor branching from answer_quality to severity", "Cannot predict gap_confirmed behavior change"],
    "supporting_evidence": [{ "evidence_id": "EV-001" }],
    "blocking_gaps": ["GAP-001"],
    "confidence": "low",
    "generated_at": "2026-05-16T00:06:00.000Z"
  },
  "loop_state": {
    "id": "LOOP-001",
    "current_state": "GapOrReady",
    "state_chain": ["GoalInput", "BoundaryConfirmed", "EvidenceInventoried", "ConceptSliceSelected", "ArtifactGenerated", "AwaitingAttempt", "AttemptStored", "EvidenceChecked", "GapOrReady"],
    "boundary_enforced": true,
    "out_of_bound_accesses": 0
  }
};
;

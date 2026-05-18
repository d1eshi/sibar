# 07: Commands, Workspace Signals, And Mutation

## Goal

Define how Sibi can use the workspace as evidence without becoming an
uncontrolled coding agent.

Commands and mutations matter because deep technical understanding often
requires execution. A user learning RL, ML, Rust, or a complex codebase needs to
inspect behavior, tests, traces, failures, and experiments, not only text.

## Workspace Signals

Signals are observations from the user's workspace.

```text
WorkspaceSignal
  id
  source
  kind
  payload
  evidence_role
  created_at
```

Kinds:

1. `file_selection`
2. `code_range_selection`
3. `test_result`
4. `typecheck_result`
5. `command_output`
6. `diff`
7. `notebook_output`
8. `experiment_metric`
9. `runtime_trace`
10. `benchmark_result`
11. `error_log`

Signals can trigger loops or validate hypotheses. They cannot independently
prove user ownership.

## Commands

Commands are explicit, bounded ways to inspect behavior.

```text
WorkspaceCommand
  id
  label
  command
  cwd
  safety_level
  expected_outputs
  evidence_role
  requires_confirmation
```

Safety levels:

1. `read_only`: search, inspect, list, typecheck, tests without writes
2. `study_write`: writes only to Sibi-owned scratch/artifact directories
3. `product_write`: changes product workspace files
4. `destructive`: deletes, resets, rebases, force pushes, wipes state

Early Sibi should support `read_only` and selected `study_write`.

## Command Examples

Read-only:

```text
rg "buildReadinessReport" src Tests
pnpm test -- Tests/readiness-report.test.ts
swift test --filter StudyPanelTests
python run_toy_env.py --episodes 10
```

Study-write:

```text
create scratch PPO objective implementation
generate local HTML artifact prototype
write experiment output under .sibi/artifacts/
```

Product-write:

```text
apply patch to src/runtime-readiness.ts
update production test file
change package dependencies
```

Destructive:

```text
git reset --hard
rm -rf
force push
```

## Mutation Definitions

Sibi should distinguish study mutation from product mutation.

### Study Mutation

Study mutation creates learning artifacts outside the product source of truth.

Allowed early:

1. scratch files
2. toy experiments
3. generated diagrams
4. generated HTML prototypes
5. local notebooks
6. patch previews
7. exercise files

Study mutation rules:

1. write under a declared Sibi-owned artifact directory
2. cite source evidence used to generate the artifact
3. mark artifact as study-only
4. never silently change product code

### Product Mutation

Product mutation changes the user's real project.

Examples:

1. edit source files
2. edit tests
3. edit configs
4. install dependencies
5. change lockfiles
6. commit changes

Product mutation should require:

1. explicit user request
2. visible affected files
3. readiness state or explicit override
4. patch preview when feasible
5. verification command

## Readiness Gates For Mutation

```text
MutationGate
  proposed_change
  affected_scope
  required_readiness
  current_readiness
  missing_evidence
  allowed_action
```

Allowed actions:

1. `study_only`
2. `preview_patch`
3. `apply_with_guardrails`
4. `blocked_until_repair`
5. `explicit_override_required`

Example:

```text
User wants to modify readiness scoring.

Sibi checks:
  - ready_to_trace readiness flow?
  - ready_to_debug gap evidence?
  - related tests identified?

If missing:
  allow patch preview or scratch implementation, but block product apply.
```

## Editor Integration

Editing should remain outside the core at first.

Required:

1. open file at line in default editor
2. copy file/line reference
3. expose patch preview
4. allow user to manually apply changes

Optional later:

1. VS Code extension
2. active selection capture
3. diff viewer
4. apply patch from Sibi
5. LSP context

## Execution As Pedagogy

Commands should support thinking.

Good flow:

```text
1. Sibi asks user to predict test behavior.
2. User writes prediction.
3. Sibi runs configured test.
4. User interprets result.
5. Sibi compares interpretation to evidence.
```

Bad flow:

```text
1. Sibi runs everything.
2. Sibi explains everything.
3. User passively accepts.
```

## Security And Trust

The system must be conservative.

Requirements:

1. commands are shown before execution
2. cwd is shown
3. write scope is shown
4. product writes require explicit action
5. destructive commands are blocked unless the user explicitly asks
6. command output becomes evidence with timestamp
7. failed commands can become learning artifacts


# Deep Ownership Workspace Fixtures

Deterministic workspace-session fixtures live here so `docs/` can stay focused
on Markdown specs and reports.

## Layout

- `fixtures/live-workspace-session.json`: fixture model response for native app
  and CLI workspace-session reproduction.
- `fixtures/sibi-pedagogy-loop.json`: deterministic loop fixture for deep
  ownership runtime and artifact-generation regression tests.

## Usage

- `SIBI_WORKSPACE_FIXTURE_MODEL_RESPONSE_PATH=evals/deep-ownership-workspace/fixtures/live-workspace-session.json swift run SibiStudyApp`
- `node --experimental-strip-types src/sibi.ts start-workspace-session --goal "Explain this project A-Z" --root /path/to/repo --fixture-model-response-path evals/deep-ownership-workspace/fixtures/live-workspace-session.json`

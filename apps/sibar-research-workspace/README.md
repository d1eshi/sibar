# Sibar Research Workspace

This is the public note-taking workspace slice for Sibar research. The deployed
Vercel surface is a static Vite app with no LLM integration, no server functions,
and local browser storage by default.

## Public Vercel Slice

- Build command from the repository root: `pnpm -s workspace:build`
- App-scoped Vercel config: `apps/sibar-research-workspace/vercel.json`
- Vercel project root: `apps/sibar-research-workspace`
- Output directory: `dist`
- Runtime: static files only; no SSR, API routes, serverless functions, edge
  functions, or LLM calls.
- Default persistence: `localStorage` in the user's browser.

The app-scoped Vercel config marks this project as a Vite app, runs the root
workspace build from the app project directory, and rewrites all routes to the
static React entry:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "buildCommand": "cd ../.. && pnpm -s workspace:build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Environment

Copy `.env.example` only when overriding defaults. The public deployment should
normally leave Supabase unset:

```sh
VITE_WORKSPACE_STORAGE_MODE=localStorage
VITE_WORKSPACE_SUPABASE_SYNC_ENABLED=false
```

Optional future Supabase sync is intentionally not implemented in this slice.
If it is added later, it must be opt-in and use public browser env only:

```sh
VITE_WORKSPACE_STORAGE_MODE=supabase
VITE_WORKSPACE_SUPABASE_SYNC_ENABLED=true
VITE_SUPABASE_URL=https://example-project.supabase.co
VITE_SUPABASE_ANON_KEY=example-public-anon-key
```

Do not add Supabase service-role keys, OpenAI keys, model provider keys, or any
other secret to Vite env variables. Vite exposes `VITE_*` values to the browser.

## Runtime and Cost Boundaries

- No `@supabase/supabase-js` dependency is included.
- No remote note sync is active.
- No fetch calls are made by the React note-taking workspace runtime.
- Notes, course title, and note metrics are stored locally in browser
  `localStorage`.
- The static app can be shared publicly without creating LLM usage or Supabase
  request/storage costs.
- If future sync is added, keep it behind
  `VITE_WORKSPACE_SUPABASE_SYNC_ENABLED=true` and avoid background polling,
  automatic retries, or analytics beacons by default.

The runtime guard lives in `src/config/publicRuntimeConfig.ts`. Its effective
storage mode remains `localStorage` until a future implementation adds an
explicit remote client.

## Optional Supabase Notes Schema

Static public mode does not need Supabase. For a future authenticated sync path,
`supabase/workspace_notes.sql` defines a minimal notes table with row-level
security:

- `workspace_notes` stores note body and local context only.
- `owner_id` is bound to `auth.users`.
- RLS policies restrict select, insert, update, and delete to the note owner.
- No LLM prompts, model responses, artifact fixture content, readiness panels,
  or provider credentials belong in this table.

## React migration slice 0 (static)

- Start the React shell from repository root:
  - `pnpm workspace:dev`
- Build the static React entry:
  - `pnpm workspace:build`
- Optional preview from build output:
  - `pnpm workspace:preview`

This slice renders the onboarding prototype screen only: native style topbar, intent
fields, and static preview column. It does not connect to native runners or an
external compiler path.

## React migration slice 1 (interactive onboarding)

- Converted the onboarding screen to controlled form fields for intent, source,
  constraint, and optional background fields.
- `Review workspace plan` now computes a deterministic local workspace preview from
  the current intent/source payload and enables the next workspace action.
- In this slice, the first-session action updated local flow state and surfaced a
  local "First session ready" status before workspace navigation was introduced.
- No fetch calls, native invoke calls, or external compiler execution is performed
  in this step.

## React migration slice 2 (workspace shell, overview, and first session)

- Added the dedicated `WorkspaceShell` boundary so onboarding renders inside a
  reusable native-style container.
- `OnboardingFlow` now emits an `onOpenWorkspace` callback from `Open workspace`
  after local preview generation.
- Added a workspace overview screen that follows the study-path reference:
  left learning rail, current-study center, source evidence, tutor guidance, and
  readiness before opening a learning node.
- Added a workspace home screen with existing workspaces and session resume/open
  actions:
  - `New workspace`
  - `Open` / `Resume`
- Added a static first-session workspace surface with reducer-backed selection state:
  - study path rail
  - session workbench
  - selected learning-material surface
  - compact readiness/source panel
- No fetch calls, Tauri invoke calls, compiler integration, runner sidecar, or
  external execution calls were added in this slice.

## Product surface checks in this slice

- Native-style topbar and prototype onboarding viewport.
- Intent input fields (`What are you trying to build...`, source, constraint and
  optional background/outputs).
- Static proposed plan preview column with first-session outcome and disabled first
  action.

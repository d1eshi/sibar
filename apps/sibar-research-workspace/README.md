# Sibar Research Workspace (Tauri second app)

This is a static second-app product slice intended to run as a desktop shell
workspace for the Deep Ownership flow.

## Run the static slice

- Open `index.html` directly in a browser.
- The page is intentionally offline and offline-first:
  - no network request for state
  - local interaction only
  - sample roadmap, source-to-roadmap compiler, and attempt loop are deterministic

## Tauri shell

- The app shell scaffold is in `src-tauri/`.
- `src-tauri/tauri.conf.json` points `frontendDist` at `../` so the shell serves
  this app folder directly.
- `src-tauri/Cargo.toml` and `src-tauri/src/main.rs` define a minimal, standard
  launch path.

This implementation does not require crates to be downloaded for validation tests.
If you do want to run locally, install a compatible Tauri toolchain first and
then run the conventional Tauri command from this folder.

## Product surface checks in this slice

- Today-first header and work queue
- 3-column workspace: ROADMAP, SESSION / READER, LM GUIDE
- LM tool mode rail with `/map /read /explain /test /critic /repair /build /publish`
- Source-to-roadmap behavior
- Attempt-first reconstruction flow and hint ladder
- Bottom evidence/artifact strip

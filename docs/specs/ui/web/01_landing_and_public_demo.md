# Web UI Spec 01: Landing And Public Demo

## Goal

Make the public web surface explain Sibar without requiring readers to inspect
runtime specs, JSON reports, or eval output.

## Primary Flow

```text
landing
  -> public demo
  -> artifact boundary
  -> attempt-first ownership question
  -> answer state
  -> gap or readiness finding
  -> evidence
  -> repair
  -> bounded readiness
  -> feedback prompt
```

## First View Requirements

1. State the product promise plainly.
2. Show that Sibar asks before explaining.
3. Avoid claims that the demo can analyze any repo live.
4. Provide one clear route into the fixture-backed demo.
5. Avoid generic AI-dashboard styling.

## Demo Requirements

The public demo must show:

1. included and excluded artifact boundary
2. short artifact slice preview
3. one ownership question
4. selectable or typed answer state
5. evidence and user answer comparison
6. repair prompt when insufficient
7. retry or re-evaluation state
8. bounded readiness statement
9. feedback prompt

## Non-Goals

1. No account creation.
2. No live repo ingestion.
3. No model calls required for the demo.
4. No whole-codebase ownership claim.
5. No launch-page feature overload.

## Acceptance

1. A reviewer can explain the loop without reading specs.
2. The demo labels fixture data honestly.
3. The UI distinguishes Sibar from generic code chat.
4. Feedback can be collected after the demo.

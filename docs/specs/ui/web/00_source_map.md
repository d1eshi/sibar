# Web UI Source Map

## Purpose

Track public web and landing UI notes that were previously spread across product
docs, self-hosted specs, and prototypes.

## Canonical Inputs

1. `docs/specs/selfhost/05_public_demo_prototype.md`
   Source for the fixture-backed public demo and feedback harness.
2. `docs/product/web/source-ingestion-iteration.md`
   Source for the reader/source-ingestion first moment.
3. `docs/product/web/prototypes/source-ingestion-start.html`
   Coded prototype for first-open, reading, and saved reader states.
4. `web/index.html`
   Current public landing implementation.
5. `web/article-workspace.html`
   Current article workspace implementation.

## Extracted Decisions

1. Public web explains the product and demonstrates the loop with fixtures.
2. Web must not promise arbitrary live repo analysis before the runtime can
   support it.
3. The demo should show boundary, attempt-first question, answer, gap/readiness,
   evidence, repair, retry, and bounded readiness.
4. Reader onboarding starts with source ingestion, not a generic app dashboard.
5. The reader first-open state should be calm, direct, and non-personalized.

## Pending Extraction

1. Decide whether `web/index.html` is the landing source of truth or only a
   temporary implementation.
2. Add public-demo screenshots after the next web pass.
3. Connect feedback capture requirements to the deploy target.

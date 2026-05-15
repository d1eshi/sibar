# Article Reader Analytics Observer

## Current Decision

Enable only Vercel Web Analytics page-view tracking for the public article
reader.

Do not track article URLs, selected text, note text, reading time, or highlight
behavior yet. Those are useful marketing/product signals, but they can reveal
what a person is studying. Treat them as a separate consent and privacy design
problem.

## Why Vercel Web Analytics Is Acceptable For The First Launch

Vercel Web Analytics is available on all plans and gives basic visitor/page-view
visibility from the Vercel dashboard.

Vercel documents that Web Analytics:

1. stores anonymized aggregate data
2. does not use cookies
3. identifies visitors using a hash from the incoming request
4. resets that visitor hash daily
5. tracks page views automatically once enabled and deployed

Sources:

1. https://vercel.com/docs/analytics
2. https://vercel.com/docs/analytics/quickstart
3. https://vercel.com/docs/analytics/privacy-policy

For this project, that means a cookie banner is not required for Vercel page-view
analytics alone. This is product guidance, not legal advice. The site should
still disclose analytics and local browser storage in a privacy note before
public launch.

## Implementation In This Demo

The static reader defines the Vercel Analytics queue:

```html
window.va = window.va || function () {
  (window.vaq = window.vaq || []).push(arguments);
};
```

It loads the Vercel script only outside localhost:

```html
/_vercel/insights/script.js
```

It also strips query strings and hashes before sending page-view events. This is
defensive: the current reader route is `/article-workspace`, but future marketing
links may add query parameters.

Before production, enable Web Analytics in the Vercel dashboard. Vercel notes
that enabling analytics creates the required analytics routes after the next
deployment.

## What We Should Measure Now

Use Vercel's default dashboard first:

1. unique visitors
2. page views
3. referrers
4. country/region
5. device type
6. browser/OS

These answer the first marketing question: are people opening the reader?

## What Not To Track Yet

Do not send any of these to analytics without an explicit product/privacy pass:

1. raw article URL
2. article title
3. selected text
4. note text
5. full reading history
6. per-user sequence of articles
7. exact scroll timeline
8. identifiable query params

Reason: this turns the reader from page analytics into learning-behavior and
content analytics. Even if Vercel's baseline analytics is cookie-free, these
custom events can still contain sensitive information.

## Future Observer Candidates

If we later add an observer, prefer coarse events with low-identification risk:

1. `reader_loaded`
   - data: article host only, not full URL
   - privacy risk: medium, because host can still reveal interest
2. `reader_note_created`
   - data: note kind only
   - privacy risk: low if no text is sent
3. `reader_highlight_created`
   - data: note kind and approximate paragraph bucket
   - privacy risk: medium
4. `reader_session_summary`
   - data: rounded active seconds, note count, article host
   - privacy risk: medium

Vercel custom events are available on Pro and Enterprise plans and support only
flat string, number, boolean, or null properties with length limits.

Source:

1. https://vercel.com/docs/analytics/custom-events

## Consent Recommendation

No cookie banner for default Vercel page views alone.

Add a small privacy note before public launch because the app already uses
`localStorage` for product data:

```text
This demo stores your article notes in this browser. We use cookie-free Vercel
Analytics for aggregated page-view metrics. We do not send your notes,
highlights, or article history to analytics.
```

If we later track reading time, article hosts, note counts, or highlight events,
add an explicit analytics preference before those events fire.

## Open Questions

1. Should article host be considered acceptable marketing analytics?
2. Should analytics be opt-in for all learning-behavior events?
3. Do we need a visible privacy note in the first public build?
4. Should we build a first-party `/api/events` endpoint instead of using custom
   Vercel events for learning-behavior telemetry?
5. What retention window is appropriate for reader behavior data?

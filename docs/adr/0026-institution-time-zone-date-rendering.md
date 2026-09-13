# Institution Time Zone for Rendered Timestamps

## Status

Accepted

## Date

2026-09-13

## Context

System CLOIE renders record timestamps (assigned, submitted, published, activated, deadline) in Server Components and in Server-Side-Rendered Client Components. Those surfaces formatted dates with ambient-locale APIs — `Intl.DateTimeFormat(...)` and `toLocaleDateString` / `toLocaleString` without a `timeZone` — so the rendered calendar day came from whichever zone the runtime used: the Node server (Asia/Manila) or the reader's browser (any zone).

Because the server HTML and the hydration pass therefore disagreed whenever an instant fell within the zone offset of midnight, React reported `Hydration failed because the server rendered text didn't match the client` and regenerated that subtree on the client. The Program Head program-wide evaluation report was the visible symptom: seeded assignments created at `18:10Z` render as `Sep 11, 2026` on the server and `Sep 10, 2026` in a UTC browser, and the respondents table (a Client Component with date cells) mismatched on every load for every such row.

The second defect was correctness rather than hydration: the same recorded moment displayed as two different calendar days depending on who was reading it, which is wrong for an academic record.

## Decision

Display formatting of record timestamps is owned by `src/lib/utils/date-format.ts`, which pins `INSTITUTION_TIME_ZONE = "Asia/Manila"` in every formatter. Surfaces render record timestamps through `formatDate`, `formatDateTime`, or `formatDateRange`; no surface constructs its own ambient-locale formatter.

- Prohibited for record timestamps: `Intl.DateTimeFormat(...)` without `timeZone`, `Date.prototype.toLocaleDateString` / `toLocaleString` / `toLocaleTimeString`, and any other API whose output depends on the runtime zone, in any component that is server-rendered or hydrated.
- Exempt: values that exist only on the client and are never server-rendered (for example the wizard's "last saved" draft clock, which is set from `Date.now()` during the session). An exempt value must never be part of the server payload.
- Period labels are unaffected: they derive from the academic calendar (`buildPeriodLabel`), not from locale formatting.

## Consequences

- A recorded moment reads in College time for every reader, and server HTML matches the hydrated client output, so the date-rendering hydration mismatch cannot recur.
- Per-device local time is not offered for record timestamps. Presenting device-local time would require a client-only boundary with a hydration-safe placeholder, and is out of scope until a requirement asks for it.
- New record-date surfaces must use the shared helpers; a local `Intl.DateTimeFormat` call in a component is a review finding, not a style choice.
- Locale stays `en-US` and the institutional zone is a constant, so changing the College's display zone is a one-line change with a test that pins the rendered output for a fixed instant.
- `src/__tests__/lib/utils/date-format.test.ts` pins the rendered day and time for UTC instants, so the rule is enforced by a test rather than by convention alone.

## Related

- [ADR 0012](0012-secretary-controlled-academic-calendar-state.md) — academic period state that the period labels derive from.
- `src/features/response-review/CONTEXT.md` — identified review surfaces that render response timestamps.

# ph-evidence EXPLAIN ANALYZE evidence (§43)

Slice #522 hardening: before adding indexes, representative final Program Head
evidence queries were run with `EXPLAIN (ANALYZE, BUFFERS)` against a
disposable PostgreSQL seeded with realistic analytical volume:

- 3,997 evaluation assignments
- 3,745 responses (course-bound + central, ~70% submitted)
- 36,103 quantitative response items
- 7,228 qualitative response items
- 49 course-bound evaluations, 10 central deployments, 3,000 students

Environment: Postgres 16, `postgres:16-alpine` container, canonical Supabase
migration history applied, demo seed + synthetic volume rows. UUIDs anchor to
the BSIT program (`79f1eecc-b46e-4d2e-9ebd-b64333ab1180`) in the active term
(`c76d192a-a028-4583-bf95-a5eb7c6346dd`).

## Queries (mirroring the Prisma shapes in `get-program-head-dashboard.ts`)

Q1 — participation rows: `evaluation_assignments` by program/term through
`central_deployments` or `course_bound_evaluations → course_assignments`.

Q2 — dashboard rating scan: `quantitative_response_items` joined to submitted
`responses` scoped to the selected Program and term.

Q3 — submitted counts by deployment: `responses` grouped by `deployment_id`
filtered to the active term's evaluations.

Q4 — response-detail item lookup: `quantitative_response_items` by
`response_id` (the identified-response drilldown).

## Before

| Query | Plan | Execution time |
|---|---|---|
| Q1 | hash/nested joins, all tables seq-scanned (small reference tables) | 3.5 ms |
| Q2 | **Seq Scan on `quantitative_response_items` re-executed 3,131 times** (one per matching response), 1.4M buffer hits | **12,017 ms** |
| Q3 | nested-loop with join filter over 161k rows, 24k buffer hits | 31 ms |
| Q4 | **full seq scan of 36,103 rows** to find one response's items | 2.5 ms |

Q2 is the Dashboard's core quantitative load; Q4 is every identified-response
drilldown. The missing supporting indexes on `response_id` (FK columns) and
`deployment_id` were the hotspots.

## Indexes added (migration `20260824120000_ph_evidence_query_indexes`)

- `quantitative_response_items_response_id_idx` on `quantitative_response_items (response_id)`
- `qualitative_response_items_response_id_idx` on `qualitative_response_items (response_id)`
- `responses_deployment_id_idx` on `responses (deployment_id)`

All three are additive btree indexes on existing FK/denormalized columns; no
schema or data change.

## After

| Query | Plan | Execution time |
|---|---|---|
| Q2 | single pass over `quantitative_response_items` with indexed response lookups | **11.8 ms** |
| Q3 | Bitmap Index Scan on `responses_deployment_id_idx` | **0.5 ms** |
| Q4 | Bitmap Index Scan on `quantitative_response_items_response_id_idx` | **0.09 ms** |

Q2 improved ~1,000× at this volume; Q3/Q4 are index-driven. The same
`qualitative_response_items` index covers the qualitative feedback scans
(same FK shape, identical join pattern in `get-program-head-dashboard.ts`).

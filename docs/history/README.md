---
title: "Historical material index"
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# Historical Material Index

This directory preserves project-source documents that describe System CLOIE as it
was proposed or specified at a point in time, not as the system behaves today.
They are kept for traceability (capstone evidence, decision archaeology), not as
operational reference.

Every file here carries the frontmatter `kind: historical-project-source` /
`status: historical` plus this warning:

> Historical System CLOIE material. Do not use this document to infer current
> system behavior. Verify current behavior against CONTEXT.md, ADRs,
> implementation, schema, and tests.

## Where current truth lives

- Domain behavior: `src/features/<domain>/CONTEXT.md` (one per domain).
- Architecture decisions: `docs/adr/`, 21 ADR files numbered 0001–0020 (number 0001 exists twice: single-role accounts and complete secretary-created accounts).
- Repo-wide conventions: `AGENTS.md`; schema in `prisma/`; behavior proven by
  tests under `src/__tests__/`.

## docs/history/requirements/

### gen-ed-coordinator-implementation-proposal-2026-08.md

Implementation proposal for the `GEN_ED_COORDINATOR` role (single-role identity,
`Course.course_scope == GENERAL_EDUCATION` as the authorization fact, no
portfolio table, four-PR rollout). Committed 2026-08-21 (`a5f4bb7`).

Why historical: it was implemented and superseded. The role shipped via the
retired OpenSpec change `add-general-education-coordinator` (archived
2026-08-21), and its central open question — ILO catalog ownership, which the
proposal could not resolve because ADR 0005 and the live Secretary write-denial
disagreed — was settled by ADR 0018 in the Coordinator's favor. The behavior
described here now lives in:

- `docs/adr/0018-transfer-ilo-ownership-to-gen-ed-coordinator.md`
- `src/features/course-assignments/CONTEXT.md` (Coordinator General Education
  stewardship, `general-education` UX mode, college-wide scope model, no roster
  or on-behalf publication authority)
- `src/features/outcomes/CONTEXT.md` (Coordinator outcome stewardship)
- `src/features/analytics/CONTEXT.md` (General Education evidence scope,
  issue #477)
- `src/app/(app)/gen-ed-coordinator/`

The proposal's deferred-conflict premise is itself outdated: read ADR 0018, not
the proposal, for the ownership answer. The ADR 0005 amendment remains open as
issue #605.

### cilo-plo-manifestation-implementation-spec-2026-08.md

Implementation specification for manifestation-based CILO-to-PLO mapping
(exhaustive `active CILOs × active PLOs` completeness, `LEARNING`/`PRACTICE`/
`OPPORTUNITY`, draft saves vs staged review, freshness protection) and the
Graduate Outcome (GO) → Program Learning Outcome (PLO) terminology migration.
Committed 2026-08-19 (`e956944`, `aa27e37`).

Why historical: it was implemented via the retired OpenSpec change
`cilo-to-plo-manifestation` (archived 2026-08-20) and absorbed into:

- `docs/adr/0017-program-learning-outcome-canonical-terminology.md`
- `src/features/outcomes/CONTEXT.md` (manifestation semantics, exhaustive vs
  at-least-one readiness rules, alignment workspace/review, publication gate)
- `src/features/evaluations/CONTEXT.md` and the `CILOMapping` model in
  `prisma/models/`

The spec's Secretary-removal section was later extended by ADR 0018: the
Secretary has no Learning Outcomes surface at all and
`/secretary/learning-outcomes/**` redirects to the Secretary dashboard.

## Not committed to this repo

No capstone manuscript drafts, meeting minutes, or formal requirements records
from before the 2026 rebuild were ever committed to this repository (checked
full git history for manuscript/meeting/minutes/PRD/SRS paths). The only
pre-rebuild project sources that existed here were:

- `docs/cloie-prd.md` and `docs/cloie-srs.md` — background PRD/SRS, explicitly
  non-authoritative while present, deleted 2026-08-18 in `af3ebeb`
  ("chore: debloat deprecated docs"). Recoverable read-only from git history,
  e.g. `git show af3ebeb~1:docs/cloie-prd.md`.
- Retired OpenSpec artifacts under `openspec/changes/**` (including
  `archive/2026-08-20-cilo-to-plo-manifestation/` and
  `archive/2026-08-21-add-general-education-coordinator/`), removed in
  `e5b0c24`; git history preserves them as decision records for the two
  documents above.

If original manuscript drafts, meeting minutes, or requirements documents are
recovered from outside the repo, place them under `docs/history/manuscript/`,
`docs/history/meetings/`, or `docs/history/requirements/` respectively, add the
historical frontmatter and warning above (with `as_of` inferred from the
document), and list them here. Do not alter their body content.

## Historical material elsewhere in docs/

- `docs/research/DEPRECATED_dean-dashboard-needs.md` — July 2026 web research
  on what college deans need from effectiveness dashboards. Superseded: the
  Dean surface it informed is implemented (ADR 0005, ADR 0006,
  `src/features/dean/`). Kept in place with a DEPRECATED prefix; treat its
  platform comparisons as research input, not requirements.
- `docs/openspec-deprecation-migration-report.md` — 2026-09-03 evidence-based
  audit that migrated durable OpenSpec content into CONTEXT.md files, ADRs, and
  AGENTS.md before OpenSpec retirement. Historical migration evidence only; it
  does not describe current process or requirements.

## Deleted working artifacts (git history only)

Removed from the working tree as part of the docs rebuild (user's staged
deletions; recoverable from git):

- `docs/agents/cross-source-gap-report-2026-07-18.md` — one-off audit for
  issue #123 reconciling Kanban/PRD/SRS/issues/ADR/CONTEXT sources.
- `docs/agents/discrepancies-prd-srs-vs-current.md` — one-off discrepancy
  inventory for issue #107 (PRD/SRS vs the accepted Wayfinder map and ADR 0005).
- `docs/skills.md` — agent-skills index, replaced by per-skill documentation.
- `docs/research/dean-dashboard-needs.md` — superseded by the DEPRECATED
  variant above.

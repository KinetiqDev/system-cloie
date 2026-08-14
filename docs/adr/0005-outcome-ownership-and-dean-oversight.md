# Outcome Ownership and Dean Oversight

## Status

Accepted

Amended 2026-08-14 for Issue #372. This amendment records the Secretary-owned Institutional Learning Outcome catalog only; it does not alter existing CILO-to-GO mapping, readiness, or authorization semantics. Typed General Education mapping, ILO-to-GO crosswalks, and dual CILO target mappings remain deferred and are not claimed here.

## Context

CLOIE recognizes three outcome layers: college-wide Institutional Learning Outcomes (ILOs), program-level Graduate Outcomes (GOs), and course-level CILOs. The current application continues to use CILO-to-GO mappings; Issue #372 does not change their scope or lifecycle. These layers are produced and used by different roles, and the Wayfinder map "Dean dashboard information architecture" (Issue #103) has accepted that:

- Program Heads own program Graduate Outcomes; Faculty own course-context CILOs. Secretary has college-wide administrative editing authority for both of those layers and their currently authorized CILO-to-GO mappings.
- Existing General Education CILO-to-GO mapping semantics remain unchanged by this catalog-only amendment. Issue #372 introduces neither CILO-to-ILO mappings nor ILO-to-GO behavior.
- The Secretary is the accountable owner of the college-wide Institutional Outcome catalog.
- The Dean has college-wide read-only oversight of outcomes and alignment.
- The Secretary performs routine record-level operations; a shared readiness definition serves both Secretary and Dean, with different presentation granularity.
- The Learning Outcomes area holds setup and alignment. A future Insights area will hold response-based Learning Evaluation Results, Analytics, and Reports. Both Insights and typed General Education mapping are deferred.
- `CILO Reviews` is not a standalone information-architecture label in the current Dean IA.

These rules need a durable home so the Dean and Secretary workstreams, the prototype (Issue #105), and implementation tickets (Issue #110, Issue #372) can reference one source of truth.

## Decision

1. **Institutional Outcomes ownership.** The Secretary owns the college-wide Institutional Learning Outcome catalog (`InstitutionalOutcome` / `institutional_outcomes`). Each Institutional Outcome has a stable unique code, statement stored as `description`, display `order`, active/archive state (`is_active`), and timestamps. Codes remain unique across archived records. Archive is soft state: archived outcomes remain visible for administrative and historical review but cannot be selected as future mapping targets. Restore returns an archived record to the active catalog in its stable display-order position. Dean, Program Head, and Faculty cannot mutate the catalog. Secretary catalog writes use exact before-and-after review, explicit confirmation, freshness recheck, and atomic persistence. The catalog is independent of Graduate Outcomes; there is no ILO-to-GO crosswalk.
2. **Graduate Outcomes ownership.** Program Heads own their program Graduate Outcomes. They create, edit, reorder, and archive GOs within their assigned program scope. Secretary has college-wide administrative authority to create, edit, reorder, and archive GOs, but does not become their accountable owner.
3. **CILO ownership.** Faculty own CILOs for the course contexts they teach. CILOs are stored at the course level so they remain stable across assignment periods; a CILO is never assignment-specific or faculty-owned. Secretary has college-wide administrative authority to create, edit, and archive CILOs, but does not become their accountable owner.
4. **CILO-to-GO mappings.** Existing CILO-to-GO mapping behavior remains unchanged by this catalog-only amendment. Typed General Education CILO-to-Institutional Outcome mapping is deferred. Faculty, Program Heads, and Secretary retain their current authorized CILO-to-GO operations until a separately implemented change revises that policy.
5. **Dean oversight.** The Dean has college-wide **read-only** oversight of Institutional Outcomes, GOs, CILOs, and existing CILO-to-GO mappings. The Dean does not edit outcomes or mappings through this effort; the Dean sees coverage, gaps, and alignment across all programs and active courses. The Dean overview may include the Institutional Outcome catalog for read-only review; it does not present an implemented General Education ILO-mapping coverage surface in this slice.
6. **Secretary operations.** The Secretary performs routine record-level operations (account creation, program lifecycle, course-assignment stewardship, and outcome administration) using shared services and operational rules where capabilities overlap. Secretary is the accountable owner of the Institutional Outcome catalog and may administer GOs, CILOs, and existing CILO-to-GO mappings across the college with protected confirmation that shows exact before-and-after changes. Protected outcome writes use a draft, exact before-and-after review, explicit confirmation, server-side authority and freshness recheck, and atomic save. Secretary does not become accountable owner of GOs or CILOs.
7. **Shared readiness.** Secretary record-level tasks and Dean grouped totals derive from a single readiness source. Both roles consume the same definition; only the presentation granularity differs. This amendment does not change readiness to treat Institutional Outcomes as GO substitutes or to compute ILO-to-GO rollups.
8. **Learning Outcomes vs. Insights.** Learning Outcomes holds setup and alignment: Institutional Outcomes, GOs, CILOs, and current Program-specific mappings. A future Insights area, currently hidden in navigation, will hold response-based Learning Evaluation Results, Analytics, and Reports. None of those Insights surfaces, and no General Education ILO mapping authoring, are in scope here.
9. **Retired labels.** `CILO Reviews` is not a standalone Dean information-architecture label. It does not appear in current Dean navigation or group landing pages.

## Consequences

- The role-owned-route rule from the Course Catalog and Assignments context still applies: even where Secretary and Dean share operational rules for course-assignment stewardship, their dashboards remain separate role-owned routes. The same separation applies to Learning Outcomes: the Dean view is read-only oversight, the Secretary view owns Institutional Outcome catalog administration, the Program Head view is GO authoring, and the Faculty view is CILO authoring.
- Implementation tickets that touch outcomes (Issue #110, Issue #372) and the prototype (Issue #105) can cite this ADR as the authoritative ownership rule set; they do not need to re-litigate ownership.
- The Dean does not acquire edit capability for outcomes or mappings. If a future effort changes this, it must amend this ADR explicitly.
- Secretary Institutional Outcome catalog work is in scope for Issue #372. This ADR records catalog ownership, archive/restore lifecycle, and protected-edit behavior; it does not claim that General Education CILO-to-ILO mapping or an ILO-to-GO crosswalk has been implemented.
- Mapping integrity for existing CILO-to-GO links still includes a duplicate `(CILO, Graduate Outcome)` constraint and Program-scope validation in the shared mapping service. Readiness surfaces temporary incomplete mappings instead of blocking step-by-step authoring. No ILO mapping uniqueness or GE mapping integrity is introduced here.
- The outdated `docs/cloie-prd.md` and `docs/cloie-srs.md` are not authoritative for the rules in this ADR; the Wayfinder map (Issue #103), Issue #372, and this ADR are.

## Related

- Wayfinder map: [Dean dashboard information architecture](https://github.com/Tugeru/project-cloie/issues/103)
- Ticket: [Record outcome ownership and Dean oversight ADR](https://github.com/Tugeru/project-cloie/issues/106)
- Course Catalog and Assignments context: `src/features/course-assignments/CONTEXT.md`
- Identity and Access context (Course-level CILO term): `src/features/auth/CONTEXT.md`
- Background, non-authoritative: `docs/cloie-prd.md`, `docs/cloie-srs.md`
- Adjacent ADR: [Course Catalog and Assignment Refactor](0003-course-catalog-and-assignment-refactor.md)
- Ticket: [feat(outcomes): add Secretary Institutional Outcome catalog](https://github.com/KinetiqDev/system-cloie/issues/372)
- Parent specification: [spec(outcomes): introduce institutional learning outcomes and typed CILO mappings](https://github.com/KinetiqDev/system-cloie/issues/370)
- OpenSpec change: `openspec/changes/introduce-institutional-learning-outcomes/`

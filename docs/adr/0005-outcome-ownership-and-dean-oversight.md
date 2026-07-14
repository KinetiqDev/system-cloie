# Outcome Ownership and Dean Oversight

## Status

Accepted

## Context

CLOIE models two outcome layers: program-level Graduate Outcomes (GOs) and course-level CILOs, connected by CILO-to-GO mappings. These layers are produced and used by different roles, and the Wayfinder map "Dean dashboard information architecture" (Issue #103) has accepted that:

- Program Heads own program Graduate Outcomes; Faculty own course-context CILOs. Secretary has college-wide administrative editing authority for both layers and their mappings.
- CILO-to-GO mappings connect the course and program outcome layers. General Education Course-level CILOs map to relevant GOs for every Academic Program with an active General Education Course assignment in selected period.
- The Dean has college-wide read-only oversight of outcomes and alignment.
- The Secretary performs routine record-level operations; a shared readiness definition serves both Secretary and Dean, with different presentation granularity.
- The Learning Outcomes area holds setup and alignment. A future Insights area will hold response-based Learning Evaluation Results, Analytics, and Reports. Both are deferred.
- `CILO Reviews` is not a standalone information-architecture label in the current Dean IA.

These rules need a durable home so the Dean and Secretary workstreams, the prototype (Issue #105), and the eventual implementation tickets (Issue #110) can reference one source of truth.

## Decision

1. **Graduate Outcomes ownership.** Program Heads own their program Graduate Outcomes. They create, edit, reorder, and archive GOs within their assigned program scope. Secretary has college-wide administrative authority to create, edit, reorder, and archive GOs, but does not become their accountable owner.
2. **CILO ownership.** Faculty own CILOs for the course contexts they teach. CILOs are stored at the course level so they remain stable across assignment periods; a CILO is never assignment-specific or faculty-owned. Secretary has college-wide administrative authority to create, edit, and archive CILOs, but does not become their accountable owner.
3. **CILO-to-GO mappings.** Mappings are explicit records that connect each CILO to one or more GOs of the relevant program. A ready context requires every active CILO to have at least one valid GO mapping. General Education Courses are College-wide catalog entries, but readiness is assignment-scoped: each General Education CILO maps to relevant GOs for every Academic Program with an active General Education Course assignment in selected period. Faculty, Program Heads, and Secretary may create, revise, or remove mappings within their authorized scope. Secretary is an administrative steward, not the accountable owner of either outcome layer. Temporary coverage gaps are allowed while authoring; invalid links and duplicate CILO-to-GO pairs are rejected.
4. **Dean oversight.** The Dean has college-wide **read-only** oversight of GOs, CILOs, and CILO-to-GO mappings. The Dean does not edit outcomes or mappings through this effort; the Dean sees coverage, gaps, and alignment across all programs and active courses. The Dean overview places Graduate Outcomes first and the CILO-plus-mapping coverage second.
5. **Secretary operations.** The Secretary performs routine record-level operations (account creation, program lifecycle, course-assignment stewardship, and outcome administration) using shared services and operational rules where capabilities overlap. Secretary may administer GOs, CILOs, and mappings across the college with protected confirmation that shows exact before-and-after changes. Protected outcome writes use a draft, exact before-and-after review, explicit confirmation, server-side authority and freshness recheck, and atomic save. Secretary does not become accountable owner of GOs or CILOs.
6. **Shared readiness.** Secretary record-level tasks and Dean grouped totals derive from a single readiness source. Both roles consume the same definition; only the presentation granularity differs.
7. **Learning Outcomes vs. Insights.** Learning Outcomes holds setup and alignment only: GOs, CILOs, and mappings. A future Insights area, currently hidden in navigation, will hold response-based Learning Evaluation Results, Analytics, and Reports. None of those are in scope here.
8. **Retired labels.** `CILO Reviews` is not a standalone Dean information-architecture label. It does not appear in current Dean navigation or group landing pages.

## Consequences

- The role-owned-route rule from the Course Catalog and Assignments context still applies: even where Secretary and Dean share operational rules for course-assignment stewardship, their dashboards remain separate role-owned routes. The same separation applies to Learning Outcomes: the Dean view is read-only oversight, the Program Head view is GO authoring, the Faculty view is CILO authoring.
- Implementation tickets that touch outcomes (Issue #110) and the prototype (Issue #105) can cite this ADR as the authoritative ownership rule set; they do not need to re-litigate ownership.
- The Dean does not acquire edit capability for outcomes or mappings. If a future effort changes this, it must amend this ADR explicitly.
- Secretary outcome-authoring interface work is separate from this effort. This ADR grants authority and protected-edit behavior only; a later specification defines its routes and UI.
- Mapping integrity includes a duplicate `(CILO, Graduate Outcome)` constraint and Program-scope validation in the shared mapping service. Readiness surfaces temporary incomplete mappings instead of blocking step-by-step authoring.
- The outdated `docs/cloie-prd.md` and `docs/cloie-srs.md` are not authoritative for the rules in this ADR; the Wayfinder map (Issue #103) and this ADR are.

## Related

- Wayfinder map: [Dean dashboard information architecture](https://github.com/Tugeru/project-cloie/issues/103)
- Ticket: [Record outcome ownership and Dean oversight ADR](https://github.com/Tugeru/project-cloie/issues/106)
- Course Catalog and Assignments context: `src/features/course-assignments/CONTEXT.md`
- Identity and Access context (Course-level CILO term): `src/features/auth/CONTEXT.md`
- Background, non-authoritative: `docs/cloie-prd.md`, `docs/cloie-srs.md`
- Adjacent ADR: [Course Catalog and Assignment Refactor](0003-course-catalog-and-assignment-refactor.md)

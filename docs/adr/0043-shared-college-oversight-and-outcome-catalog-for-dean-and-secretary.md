# Shared college oversight and outcome catalog for Dean and Secretary

## Status

Accepted, 2026-10-11. Supersedes the Secretary-denied read paths in [ADR 0018](0018-transfer-ilo-catalog-to-gen-ed-coordinator.md) and widens [ADR 0038](0038-dean-cross-program-analytics.md) and [ADR 0040](0040-program-outcome-classification-and-shared-ge-common-alignment.md) for read access only. All write-authority decisions in those ADRs remain in force.

## Context

The Secretary and the Dean each owned a `/common-outcomes` page that rendered the identical `CentralOutcomesPage` over the identical `readCentralOutcomeAdministration` read. Two routes, two navigation entries, and two navigation icons existed for one workflow, and the Dean's Learning Outcomes page — the only place a Secretary or Dean could see _all_ Program Outcomes across all programs and classifications — was Dean-only and reachable only from a Dean nav group.

That arrangement also put college-wide outcome management in a page titled after a PO classification subset ("Common / Institution-specific POs") rather than in the page named after the domain, which is where a reader looks for the outcome catalog.

## Decision

**One shared college oversight surface, role-prefixed.** The Dean and the Secretary share two surfaces, each served by one component behind role-prefixed routes:

| Surface           | Dean                                        | Secretary                      |
| ----------------- | ------------------------------------------- | ------------------------------ |
| Analytics         | `/dean/analytics`                           | `/secretary/analytics`         |
| Learning Outcomes | `/dean/college-oversight/learning-outcomes` | `/secretary/learning-outcomes` |

Authorization is a single role check (`isCollegeOversightRole`: `DEAN` or `SECRETARY`) at the existing server-enforced service seams. Every read and AI action reauthorizes on each request; the Analytics surface adds no write path, and every write on the Outcome catalog is one the deleted pages already hosted.

**Learning Outcomes has two views.** `?tab=catalog` (default) is the Outcome catalog: the shared Common PO catalog, every PO of every active program across all classifications, and the read-only ILO catalog. `?tab=readiness` is the existing period-scoped, read-only mapping-gap projection. A query carrying `period`, `risk`, or `program` without an explicit `tab` still opens readiness, so existing dashboard links and bookmarks keep landing where they were written to land.

**Write authority is unchanged.** The Outcome catalog hosts the writes that the deleted pages hosted: the shared Common PO catalog (create, edit, reorder, archive, restore), program Common adoption with a program-local code, program Institution-specific POs, and claiming legacy UNCLASSIFIED rows. All of them continue through exact before/after review, explicit confirmation, freshness recheck, and atomic save. Core and Professional POs remain read-only there and stay with the Program Head. ILOs remain read-only there and stay with the General Education Coordinator under ADR 0018.

**Removed.** `/dean/common-outcomes` and `/secretary/common-outcomes` are deleted along with their navigation entries. `/secretary/learning-outcomes` no longer redirects. The retired course mapping administration route still redirects to the Secretary dashboard.

## Consequences

The Secretary gains read access to the Dean's analytics, including the Written feedback view of qualitative comments, and read access to the ILO catalog. Neither is a write capability, and both remain aggregate-only and privacy-safe. The General Education Coordinator's exclusive ILO ownership and the Program Heads' Core/Professional ownership are unaffected.

Course alignment and readiness semantics are untouched: the readiness view, its snapshot interpretation, and the typed mapping-gap partition behave exactly as they did.

## Tradeoffs

One implementation now serves two roles, so the components take an explicit `routes` value instead of hardcoding `/dean` URLs. That keeps Secretary links inside the Secretary namespace and makes the shared surface testable in one place, at the cost of one extra prop threaded through the evidence views.

Read-only rows in the catalog are shown deliberately: a Dean or Secretary needs the whole outcome picture to do oversight work, even for layers they cannot edit. Those rows carry no affordances, so visibility never implies authority.

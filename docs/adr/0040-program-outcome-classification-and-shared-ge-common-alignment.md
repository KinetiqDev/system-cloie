# Program Outcome classification and shared General Education Common PO alignment

## Status

Accepted design, 2026-10-10. Implementation and release verification are tracked in the working change. User decisions supersede the proposed defaults in `po-classification-impl-plan.md`. This partially supersedes [ADR 0005](0005-outcome-ownership-and-dean-oversight.md) for Dean outcome stewardship: Dean and Secretary jointly hold central Common PO and program-local Common/Institution-specific write authority, while ADR 0005's Core/Professional, ILO, CILO, mapping-edit prohibitions and read-only Dean oversight remain in force.

## Decision

Program Outcomes keep their program identity, physical `gos` table, local code, and complete syllabus order. Classification is explicit: Common, Core, Professional, and Institution-specific. UNCLASSIFIED is a compatibility default for existing rows, not a choice in new authoring. Demo fixtures define their categories explicitly and make no claim of institution-approved syllabus classification.

Program Heads author, edit, archive, and restore only Core and Professional POs within their authorized programs. Common and Institution-specific POs remain visible but read-only. UNCLASSIFIED is the migration-only compatibility state: it has no owner category, so either an authorized Program Head (claiming Core/Professional) or Secretary/Dean (claiming Common/Institution-specific) may claim an UNCLASSIFIED row in their scope by saving a real classification; both roles keep program-local archive/restore on it, and the central read lists it so it is never invisible to every manager. Complete-catalog reordering remains available only in All and does not change classification or statement ownership. CSV imports accept the legacy two-column file with an explicit Core/Professional selection at review; an optional Classification column can specify either authorized category. Administrative categories cannot enter through Program Head import, so Common Outcome Code is intentionally not supported by that CSV path. Secretary/Dean use the reviewed adoption editor instead. Changing a PO between centrally managed and Program Head-managed categories is not supported in this release; it would transfer authoring authority and needs an explicit handoff rule. Within the central editor, changing Common to Institution-specific clears the central link in the protected write.

Secretary and Dean both manage the institution-wide Common PO catalog and program-local Common adoption and Institution-specific PO records. Their role-owned routes are separate. Program Heads do not choose or alter Common adoption. Institution-specific POs remain program-owned and are not Institutional Learning Outcomes. ILO authoring remains Coordinator-only under ADR 0018.

One central Common PO definition has an authoritative statement. A reviewed correction synchronizes linked local PO descriptions in the same serializable transaction and records the actor and exact before/after state. Archive preserves mapping rows and local PO active states. Referenced definitions cannot be deleted. New tables are server-only with RLS and revoked direct anon/authenticated privileges.

New General Education courses use COMMON_PO alignment. The demo seed creates GESTECH in Common mode and retains GEETHICS in ILO mode: GEETHICS is the reviewed ILO-history fixture with submitted responses, and the plan forbids switching a course with publication history. A fresh disposable demo database is the intended release fixture. One Course owns its CILOs and Common PO mappings across all assignment programs, faculty, and sections. Assignment records grant Faculty access but never discriminate mappings. Each active GE CILO needs at least one active Common PO mapping with a non-null L/P/O manifestation for new publication. Program-specific courses retain exhaustive owning-program PO coverage. Faculty saves retain exact diff review, explicit confirmation, serializable commit, and freshness over the mode, active target catalog, CILOs, and mapping values. Common statement/CILO wording changes also invalidate a Common review.

ILO mode remains a compatibility path for existing course history; additive migration defaults existing records to ILO. Demo seeds create GE courses in Common mode. Reseeding does not switch a previously created course with publication history. A fresh disposable demo database is the intended release fixture. No database reset is implicit in this decision.

New completed-period readiness snapshots use version 3 and record Common targets explicitly. Stored v1/v2 snapshots remain immutable and retain their captured ILO/PO interpretation.

Common PO alignment is curriculum coverage, not ILO evidence or Common attainment. Common-mode courses do not contribute through retained ILO mapping rows. Submitted response review can show Common mappings with an explicit inapplicability message; it never applies PO attainment formulas to these mappings.

## Tradeoffs

The small global catalog prevents GE mappings from depending on the first assignment's program. Program-local POs retain codes and ordering without competing central statements. Transactional synchronization keeps existing PO consumers compatible, at the cost of updating linked local rows on a central correction.

Preserving ILO rows and compatibility mode avoids rewriting published history. This does not authorize historical conversion or a new GE Common PO evidence calculation.

## Release boundary

Apply reviewed migrations before deploying writers. Regenerate Supabase types from the migrated disposable database, execute DB and browser gates there, and deploy only after verification. No shared hosted or workstation-shared database is a disposable test target. Common demo statements are illustrative fixtures, not an approved production academic catalog.

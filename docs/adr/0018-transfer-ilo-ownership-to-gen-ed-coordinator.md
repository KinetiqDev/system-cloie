# Transfer Institutional Learning Outcome Catalog Ownership to General Education Coordinator

## Status

Accepted — 2026-08-21 for Issue #490, OpenSpec change `transfer-ilo-catalog-to-gen-ed-coordinator`.

Reconciles ADR 0005 and the `add-general-education-coordinator` deferred conflict recorded at `openspec/config.yaml:132` and `src/features/outcomes/CONTEXT.md:91`.

## Context

System CLOIE has a college-wide Institutional Learning Outcome (ILO) catalog (`InstitutionalOutcome` / `institutional_outcomes`, `prisma/models/outcomes.prisma:42-53`) with typed `CILOInstitutionalOutcomeMapping` rows. Ownership was **deferred**:

- `introduce-institutional-learning-outcomes` and ADR 0005 named the **Secretary** as ILO catalog owner (college-wide `code @unique`, `order`, `is_active`, timestamps).
- `secretary-outcome-access-removal` and live `src/features/outcomes/services/manage-outcome-writes.ts:243` deny Secretary ILO writes (`failure("You do not have permission ...")`).
- The `add-general-education-coordinator` change added the `GEN_ED_COORDINATOR` role with shared college-wide `Course.course_scope == GENERAL_EDUCATION` scope (`openspec/config.yaml:123-132`) but explicitly preserved the denial and added no ILO mutation path (`src/features/outcomes/CONTEXT.md:91-94` deferred note, `openspec/config.yaml:132`).

The General Education Coordinator route tree (`src/app/(app)/gen-ed-coordinator/layout.tsx:5` with `SessionGuard allowedRoles=[GEN_ED_COORDINATOR]`) initially exposed only Dashboard, Course Assignments, Analytics, and Profile (`src/lib/constants/navigation.ts:217`). The institution now requires that **encoding of Institutional Learning Outcomes move from Secretary to the GE Coordinator** as a college-wide catalog mirroring Program Head PLO management, plus a read-only General Education Courses catalog (`CourseScope.GENERAL_EDUCATION`) for that Coordinator. Secretary must retain **no access** to ILO encoding.

The parent tracker is #489; this is slice #490 (foundation: ADR, config, navigation, route shells).

## Decision

1. **Institutional Outcome catalog ownership — General Education Coordinator, college-wide.** The `GEN_ED_COORDINATOR` college-wide owns ILO CRUD, reorder, archive, and restore. The catalog is college-wide (no `program_id`); ordering is via `InstitutionalOutcome.order` with `code @unique` preserved across archive/restore. Secretary, Dean, Program Head, Faculty, Student, Alumni, and Industry Partner cannot mutate ILOs. Server authorization is `activeRole === GEN_ED_COORDINATOR` via `resolveAuthSession()` before and inside the hardened write gateway; forged scope filters never widen.

2. **Secretary loses ILO encode entirely.** `SECRETARY_NAV:63-72` remains without a Learning Outcomes entry. `/secretary/learning-outcomes` and `/secretary/learning-outcomes/alignment/*` continue to `redirect("/secretary/dashboard")` with no mutation UI. No Secretary read-only ILO view is retained in this change.

3. **Transfer reconciles conflicting sources.** This ADR supersedes the deferred ownership claims in ADR 0005 §1 and `introduce-institutional-learning-outcomes` for the ILO catalog encoder, and resolves the `openspec/config.yaml:132` deferred note and `src/features/outcomes/CONTEXT.md:91` deferred section without silently toggling the write check. The live denial behavior is preserved and narrowed to Secretary while the Coordinator is allowlisted.

4. **Reuse hardened write contract.** ILO writes reuse the existing protected gateway in `manage-outcome-writes.ts:45-439`: exact before/after review, explicit `confirmed === true`, `HMAC-SHA256` `freshnessToken = JSON.stringify(before)` + signature (`timingSafeEqual`), `Serializable` `prisma.$transaction`, `FOR UPDATE`-style recheck, and `revalidatePath("/gen-ed-coordinator/outcomes")`. New `scopeAllowsILO` allows only `GEN_ED_COORDINATOR`.

5. **College-wide scope, no portfolio table.** All Coordinators share the same `course.course_scope == GENERAL_EDUCATION` predicate college-wide. No per-Coordinator portfolio or assignment table is added; a partitioned scope requires a separate approved OpenSpec capability.

6. **Navigation and route shells.** `GEN_ED_COORDINATOR_NAV` adds `Outcomes` (`Layers3` → `/gen-ed-coordinator/outcomes`) and `Courses` (`BookOpen` → `/gen-ed-coordinator/courses`) between Dashboard and Course Assignments (`src/lib/constants/navigation.ts:217`), preserving `getMainNavByRoles` / `getMobileNavByRoles` / `getDeepestMatchingNavItem` deepest-match and hamburger drawer behavior (`getMobileNavMode`). Helper `src/lib/constants/gen-ed-routes.ts` mirrors `program-head-routes.ts`. Route shells `src/app/(app)/gen-ed-coordinator/outcomes/page.tsx`, `outcomes/mapping/page.tsx`, and `courses/page.tsx` are Server Components guarded via `resolveAuthSession` (`unauth → /portal/respondents`, non-coordinator → `/unauthorized`) with `loading.tsx` skeletons and `error.tsx` retry boundaries under the existing `layout.tsx:5` `SessionGuard`.

7. **No schema migration.** `InstitutionalOutcome` and `Course` models are unchanged; no `supabase:migration:diff` is required. Rollback is code-only: revert navigation/routes and keep the database.

## Consequences

- `openspec/config.yaml` General Education Coordinator boundaries deferred line is replaced with: *Institutional Outcome catalog: `GEN_ED_COORDINATOR` college-wide owns ILO CRUD/reorder/archive/restore; Secretary no access* (this ADR).
- `src/features/outcomes/CONTEXT.md` Secretary stewardship and deferred conflict sections are replaced with *General Education Coordinator outcome stewardship* and a *resolved* ownership note citing ADR 0018 and Issue #490.
- `CONTEXT-MAP.md` and assignment structure contexts remain consistent with college-wide General Education scope; no new context duplication is introduced.
- Secretary navigation and redirect stubs remain the enforcement surface for Secretary denial, tested by `src/__tests__/app/secretary-learning-outcomes-redirect.test.tsx` and `src/__tests__/lib/navigation.test.ts`.
- Follow-on slices (Issues #491-#494) implement the hardening, list/read services, catalog/mapping/courses UIs, and final verification on top of these shells. Until they land, the shells are navigable empty states demoable at desktop and mobile viewports (375/768/1280) with no unintended horizontal scroll and `min-h-11` touch targets.

## Related

- ADR 0005 (Outcome Ownership and Dean Oversight) — superseded for ILO encoder; readiness/mapping semantics remain.
- OpenSpec changes: `introduce-institutional-learning-outcomes`, `add-general-education-coordinator`, `transfer-ilo-catalog-to-gen-ed-coordinator` (proposal/design/specs `gen-ed-ilo-catalog`, `gen-ed-course-catalog`).
- Specs: `secretary-outcome-access-removal`, `gen-ed-ilo-catalog`, `gen-ed-course-catalog`.
- Code: `src/features/outcomes/CONTEXT.md`, `openspec/config.yaml:123-132`, `src/lib/constants/navigation.ts:217`, `src/lib/constants/gen-ed-routes.ts`, `src/app/(app)/gen-ed-coordinator/layout.tsx:5`, Secretary `src/app/(app)/secretary/learning-outcomes/**/page.tsx`.
- Issues: #477 (deferred), #489 (parent tracker), #490 (this slice), #491-#494 (catalog, courses, mapping review, hardening).

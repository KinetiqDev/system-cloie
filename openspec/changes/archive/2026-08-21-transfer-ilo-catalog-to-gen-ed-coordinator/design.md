## Context

System CLOIE has three outcome layers: `InstitutionalOutcome` (college-wide, `code @unique`, `order`, `is_active`), `PLO` (Program-owned `gos` table), `CILO` (course-owned) with typed mappings `CILOInstitutionalOutcomeMapping` (GE) vs `CILOMapping` (Program-specific) each carrying `manifestation L/P/O` (`prisma/models/outcomes.prisma:1-96`). `classify-course-alignment.ts:43-47` defines **at-least-one** for GE and exhaustive for Program-specific; triggers in `supabase/migrations/20260814*.sql` enforce scope at DB layer.

Current ownership is deferred: `introduce-institutional-learning-outcomes/specs/institutional-outcome-catalog` named `SECRETARY` owner; `secretary-outcome-access-removal` and live `manage-outcome-writes.ts:243-256` deny Secretary ILO writes; `add-general-education-coordinator` added `GEN_ED_COORDINATOR` college-wide `GENERAL_EDUCATION` scope (`openspec/config.yaml:123-132`) but explicitly preserved denial (`src/features/outcomes/CONTEXT.md:91-94`). Gen Ed nav today (`src/lib/constants/navigation.ts:217-222`) is Dashboard/Course Assignments/Analytics/Profile only; Program Head pattern is `resolveProgramHeadContext(programId)` → `listProgramPLOs` → `ProgramHeadOutcomesPage` with `dnd-kit` reorder (`program-head-outcomes-page.tsx:13-331`), `plo-form-dialog.tsx` dialog, `revalidatePath(buildProgramHeadOutcomesPath)`. Courses for PH are `CourseScope.PROGRAM_SPECIFIC` filtered, `GENERAL_EDUCATION` explicitly blocked (`manage-program-head-courses.ts:122-127`). Coordinator needs mirror but college-wide, no `programId`.

This change is the approved reconciliation: Secretary loses ILO encode entirely (redirect preserved), Coordinator gains it.

## Goals / Non-Goals

**Goals:**
- Give `GEN_ED_COORDINATOR` college-wide Outcomes surface: ILO create/edit/archive/restore/reorder + read-only GE CILO→ILO mapping review (`GEMATH`, `GEGS`, etc.) mirroring PH but with `programId = null`.
- Give `GEN_ED_COORDINATOR` college-wide Courses surface read-only filtered `course_scope==GENERAL_EDUCATION`.
- Reuse hardened write gateway: `prepare` (HMAC `createHmac('sha256', getConfirmationSecret())`, `freshnessToken = JSON.stringify(before)`) → explicit `confirmed=true` → `Serializable` `prisma.$transaction` (`manage-outcome-writes.ts:45-439`), `scopeAllows` check before *and* inside tx with `FOR UPDATE`-style recheck.
- Keep server-only auth via `resolveAuthSession()`; no client-provided scope; URL filters never widen.
- Preserve PWA responsive behavior (desktop dense, mobile single-column, `overflow-x-auto`, `min-h-11`, `pb-safe`), semantic tokens (`docs/design.md` §5-8), `customZodResolver`.
- Decide in ADR, update `CONTEXT.md` + `config.yaml` deferred note.

**Non-Goals:**
- No Prisma schema migration (ILO/Course models already correct, `code @unique` unchanged); no `supabase:migration:diff`.
- No Coordinator CILO authoring or CILO→ILO mapping mutation (Faculty remains primary mapper via active `CourseAssignment` in `ACTIVE` term `manage-course-alignment.ts:438`); no ILO-to-PLO crosswalk, no attainment rollup.
- No GE Course create/edit/archive in this slice (read-only only; future slice can add write with `course_scope=GENERAL_EDUCATION` guard).
- No roster management / evaluation publication for Coordinator (already denied per `add-general-education-coordinator/design.md:D6`).
- No shared caching for ILO/Courses; request-scoped only (`private, no-store` for oversight).
- No TanStack Query, Radix, new chart library.

## Decisions

### D1 — Supersede deferral via ADR, not silent override
Create `docs/adr/XXXX-transfer-ilo-ownership-to-gen-ed-coordinator.md` reconciling ADR 0005. Alternate rejected: silently toggle `manage-outcome-writes` check without record — leaves `config.yaml:132` lie.

### D2 — Extend outcome-write gateway with `scopeAllowsILO` (reuse, don't fork)
Add `scopeAllowsILO(input, role) => role===GEN_ED_COORDINATOR` alongside existing `scopeAllowsPLO/Cilo` in `manage-outcome-writes.ts:74-126`. New `readILOState/nextILOState/writeILO` mirror `readPLOState:127-154`. Keeps one `prepareOutcomeWrite:240` / `commitOutcomeWrite:413` path. Alternate rejected: separate table/service — duplicates HMAC/freshness logic.

### D3 — New college-wide services (no `programId` param)
- `src/features/outcomes/services/manage-gen-ed-outcomes.ts`: `listInstitutionalOutcomes()`, `createILO`, `updateILO`, `archiveILO`/`restoreILO`, `reorderILOs`, `listCILOILOMappingsForGE()`. Auth = `resolveAuthSession()`, deny if `activeRole!==GEN_ED_COORDINATOR`. Ordering via `InstitutionalOutcome.order` (college-wide). Unlike PH's `resolveProgramHeadContext(programId)`/`revalidateProgramHeadAssignment` `FOR UPDATE`, no portfolio row; `programHeadAssignmentIsCurrent:355` returns `true` for ILO kind.
- `src/features/academic-structure/services/resolve-gen-ed-courses.ts`: `listGenEdCourses()` → `prisma.course.findMany({where:{course_scope:GENERAL_EDUCATION}, include:{_count:{cilos:{where:{is_active}}}})`, `prisma.course.count` etc. No `program_id` filter.
Alternate rejected: reuse PH services with `undefined` program — leaks per-program invariant and `programHeadAssignment` checks.

### D4 — Routes mirror PH but collapse `programs/[programId]`
- `src/app/(app)/gen-ed-coordinator/outcomes/page.tsx` (Server Component, no `params`) — calls `listInstitutionalOutcomes()`, `notFound()` on unauthorized mirrors `program-head/programs/[programId]/outcomes/page.tsx:15-17`.
- `src/app/(app)/gen-ed-coordinator/outcomes/mapping/page.tsx` — college-wide read-only GE mapping review replicating `program-head/.../outcomes/mapping/page.tsx:1-333` but query `Course where course_scope=GENERAL_EDUCATION`.
- `src/app/(app)/gen-ed-coordinator/courses/page.tsx` — read-only table replicating `program-head-courses-catalog.tsx:1-775` stripped of `CourseScopeFields`/`MajorSelect` (GE `major_id null`).
Navigation constants: extend `GEN_ED_COORDINATOR_NAV` (`src/lib/constants/navigation.ts:217`) with `{name:"Outcomes", href:"/gen-ed-coordinator/outcomes", icon:Layers3}`, `{name:"Courses", href:"/gen-ed-coordinator/courses", icon:BookOpen}` placed between Dashboard and Course Assignments to match PH grouping; keep `ROLE_NAV_PRECEDENCE` order. New helper `src/lib/constants/gen-ed-routes.ts` like `program-head-routes.ts`.

### D5 — UI composition reuses PH components, narrow `"use client"`
Fork `ProgramHeadOutcomesPage:150` → `GenEdOutcomesPage` (same `DndContext`/`SortableContext`/`arrayMove`, 600ms debounce, `GripVertical`, `AlertDialog` confirm). Fork `PLOFormDialog:44-237` → `ILOFormDialog` swapping `createPLOSchema→createILOSchema` (`z.string().trim().min(1).max(20).transform(toUpper)`, `description 3-1000`). New schemas `src/features/outcomes/schemas/ilo.ts`. Server Components hold data; client owns drag, form, pending states. `loading.tsx`/`error.tsx` reuse `gen-ed-coordinator/dashboard` Suspense pattern.

### D6 — Read-only Courses scope enforcement
Every Course read enforces `course_scope==GENERAL_EDUCATION` inside service; UI search/status filters only narrow. Attempted crafted `?course_scope=PROGRAM_SPECIFIC` ignored.

### D7 — No DB migration
Additive code only; no Prisma edit → no `supabase:migration:diff`. `InstitutionalOutcome` table already `@@map("institutional_outcomes")` with `code @unique` (stable across archive/restore). Rollback = revert code + keep DB.

### D8 — Testing follows existing seam
Mock `prisma.institutionalOutcome`, `resolveAuthSession`, verify PH-coverage equivalents: `manage-gen-ed-outcomes.test.ts` mirrors `manage-program-head-outcomes.test.ts:150-822` but with GE role matrix; `gen-ed-outcomes-view.test.tsx` mirrors `program-head-outcomes-view.test.tsx`.

## Risks / Trade-offs

- **[Secretary encode loss]** → Preserve redirect stubs `src/app/(app)/secretary/learning-outcomes/page.tsx:1-5`; server deny tested (`spec: Crafted ILO encode denied`). No data loss.
- **[Concurrent ILO edits]** → Same freshness token + `Serializable` as PLOs; stale review error `"Outcome changed after review."`.
- **[Multiple Coordinators share scope]** → Explicit `config.yaml` college-wide `GENERAL_EDUCATION` predicate; portfolio partitioning needs separate capability (no table).
- **[Mapping review leak]** → GE mappings shared course-level (`src/features/outcomes/CONTEXT.md:38`); review is read-only, no `CILOInstitutionalOutcomeMapping.create` path for Coordinator.
- **[UX parity drift from PH]** → Keep component seams close (`program-head-outcomes-page.tsx` as reference); visually verify desktop (1024+) + mobile (375) per `AGENTS.md` PWA rules.
- **[Fallow false positives]** → `PLOFormDialog` fork keeps same `customZodResolver` pattern; no `@radix-ui/*` installs.

## Migration Plan

1. Merge ADR + OpenSpec delta + `config.yaml:132` + `CONTEXT.md` updates.
2. No Prisma diff; deploy code behind `GEN_ED_COORDINATOR` guard.
3. Verify: `pnpm lint`, `pnpm vitest run src/__tests__/modules/outcomes/manage-gen-ed-outcomes.test.ts src/__tests__/app/gen-ed*`, `pnpm build`, browser check at 375/768/1280.
4. Rollback: if ILO writes fail, leave `GEN_ED_COORDINATOR` routes `SessionGuard` denying, keep DB as-is; forward fix no enum rollback needed.

## Open Questions

- Should Secretary retain **read-only** ILO view (post-breakage)? This design answers **no** per user confirmation; change answer triggers spec/ADR update.
- Future GE Course writes: do GE courses ever need `major_id` or remain `null` only? Current spec assumes `null`.
- Should Dean get read-only ILO oversight mirror (`institutional-outcome-oversight`)? Out of scope; tracks existing `src/app/(app)/dean/college-oversight/learning-outcomes`.

## Cache Matrix

| Read | Key | Scope/Lifetime | Invalidation | Authorization | Stale behavior |
|---|---|---|---|---|---|
| ILO catalog `listInstitutionalOutcomes` | none | request, no persistent | `revalidatePath("/gen-ed-coordinator/outcomes")` after write | `GEN_ED_COORDINATOR` session | freshness token rejects stale review |
| GE Courses `listGenEdCourses` | none | request, no persistent | same path revalidate | `GEN_ED_COORDINATOR` session | refetch next request |
| GE CILO→ILO mapping review | none | request `private, no-store` | revalidated on ILO/CILO writes (read-only) | `GEN_ED_COORDINATOR` session | always fresh |

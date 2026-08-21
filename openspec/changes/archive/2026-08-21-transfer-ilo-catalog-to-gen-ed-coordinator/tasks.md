<!-- Agent vertical slice skills — must be invoked per slice
- 1 Foundation      → /frontend-design /shadcn /web-design-guidelines /next-best-practices
- 2 ILO Catalog     → /frontend-design /shadcn /web-design-guidelines /next-best-practices /tdd
- 3 GE Courses      → /frontend-design /shadcn /web-design-guidelines /next-best-practices /tdd
- 4 ILO Mapping     → /frontend-design /shadcn /web-design-guidelines /next-best-practices /tdd
- 5 Hardening       → /next-best-practices /web-design-guidelines /tdd
Sync: GH issues 490-494 updated to match current design stack (removed ui-ux-pro-max, added shadcn + web-design-guidelines).
-->
## 1. Documentation + Navigation Scaffolding

- [x] 1.1 Record ADR `docs/adr/XXXX-transfer-ilo-ownership-to-gen-ed-coordinator.md` reconciling ADR 0005 and `introduce-institutional-learning-outcomes` Secretary ownership vs `secretary-outcome-access-removal` + deferred `config.yaml:132` → `GEN_ED_COORDINATOR` as sole ILO encoder; note Secretary redirect preserved.
- [x] 1.2 Update `src/features/outcomes/CONTEXT.md` — replace Secretary stewardship with `GEN_ED_COORDINATOR` ILO stewardship (college-wide) and program-head read-only mapping note; mark deferred conflict resolved.
- [x] 1.3 Update `openspec/config.yaml` General Education Coordinator boundaries to replace `Deferred: Institutional Learning Outcome catalog…` with `Institutional Outcome catalog: GEN_ED_COORDINATOR college-wide owns ILO CRUD/reorder/archive/restore; Secretary no access`, and update `CONTEXT-MAP.md` + `src/features/course-assignments/CONTEXT.md`/`src/features/academic-structure/CONTEXT.md` if they reference stewardship.
- [x] 1.4 Add navigation entries to `src/lib/constants/navigation.ts:217` `GEN_ED_COORDINATOR_NAV`: `Outcomes -> /gen-ed-coordinator/outcomes` (`Layers3`) + `Courses -> /gen-ed-coordinator/courses` (`BookOpen`) between Dashboard and Course Assignments; verify `getMainNavByRoles(roles, pathname)` + `getMobileNavByRoles` + `getHighestNavRole` + `getDeepestMatchingNavItem` deepest-match behavior; add helper `src/lib/constants/gen-ed-routes.ts` mirroring `program-head-routes.ts`.
- [x] 1.5 Verify `pnpm lint` for nav change and render at 375/768/1280 — hamburger drawer accessible, active states correct.

## 2. ILO Catalog Schemas + Hardened Write Gateway

- [x] 2.1 Create `src/features/outcomes/schemas/ilo.ts` with `createILOSchema {code: z.string().trim().min(1).max(20).transform(toUpper), description: min3 max1000}`, `updateILOSchema {id:uuid, code, description}`, `reorderILOsSchema {orderedIds: uuid[]}`, `iloActionSchema {id}` — mirrors `plo.ts:4-36` but without `programId`, uses `customZodResolver` compat.
- [x] 2.2 Extend `src/features/outcomes/services/manage-outcome-writes.ts:74-126` — add `scopeAllowsILO(input, role) => role===GEN_ED_COORDINATOR`, `readILOState:127`/`nextILOState:184`/`writeILO:269` mirroring PLO; route `scopeAllows`/`readState`/`nextState`/`writeReviewedOutcome` via `input.kind==="ILO"`; expand `OutcomeWriteInput` union with `{kind:"ILO", action:"create"|"update"|"archive"|"restore"|"reorder"}`, update `prepareOutcomeWrite:240` + `commitOutcomeWrite:413` role check to allow `GEN_ED_COORDINATOR` for ILO kind; keep `HMAC-SHA256 signature + freshnessToken + Serializable tx` invariant.
- [x] 2.3 Create `src/lib/actions/gen-ed-outcome-actions.ts` mirroring `program-head-outcome-actions.ts:41-131`: `createILOAction`, `updateILOAction`, `archiveILOAction`, `restoreILOAction`, `reorderILOsAction` parsing `ilo.ts` schemas then calling service and `revalidatePath("/gen-ed-coordinator/outcomes")` + mapping path.
- [x] 2.4 Unit tests `src/__tests__/modules/outcomes/manage-gen-ed-outcomes.test.ts` + `src/__tests__/lib/actions/gen-ed-outcome-actions.test.ts` covering create, duplicate `code @unique` → `Institutional Outcome code already exists`, update other-layer, non-coordinator denied, reorder missing/duplicate, stale freshness.
- [x] 2.5 Verify `pnpm lint` + `pnpm vitest run src/__tests__/modules/outcomes/manage-gen-ed-outcomes.test.ts`

## 3. ILO College-Wide Services (list/read)

- [x] 3.1 Create `src/features/outcomes/services/manage-gen-ed-outcomes.ts` with `listInstitutionalOutcomes(): ServiceResult<{ilos: InstitutionalOutcome[]}>` ordered `order asc, code asc` + `is_active` inclusion, plus thin wrappers `createILO`, `updateILO`, `archiveILO`, `restoreILO`, `reorderILOs` calling hardened gateway; auth via `resolveAuthSession()` `activeRole===GEN_ED_COORDINATOR` (no `programId`), `failure("You do not have permission ...")` on mismatch.
- [x] 3.2 Add `listCILOILOMappingsForGE(): ServiceResult<CourseCILOMappings[]>` (college-wide) — `prisma.course.findMany({where:{is_active:true, course_scope:GENERAL_EDUCATION, cilos:{some:{is_active}}}, select:{id,code,title,course_scope,cilos:{where:{is_active}, select:{id,description,cilo_institutional_outcome_mappings:{select:{id,manifestation,institutional_outcome:{select:{id,code,description,is_active}}}}}}})` + `prisma.institutionalOutcome.findMany({where:{is_active}})`, map through `ciloIsAligned` (at-least-one) for `readiness` like `manage-program-head-outcomes.ts:346-361`.
- [x] 3.3 Verify no `resolveProgramHeadContext` leakage; service is college-wide predicate `GENERAL_EDUCATION`.

## 4. ILO Catalog UI (catalog page)

- [x] 4.1 Create `src/features/outcomes/components/ilo-form-dialog.tsx` forking `plo-form-dialog.tsx:44-237` → `CreateForm`/`EditForm` with `createILOSchema`/`updateILOSchema` + `createILOAction`/`updateILOAction`, `customZodResolver`, `Field`/`Input`/`Textarea`, `code` placeholder `e.g. ILO-1`, titles `Add/ Edit Institutional Learning Outcome`.
- [x] 4.2 Create `src/features/outcomes/components/gen-ed-outcomes-page.tsx` forking `program-head-outcomes-page.tsx:47-462` (`SortablePLORow→SortableILORow`, `ProgramPLOItem→InstitutionalOutcome` with `_count.cilo_institutional_outcome_mappings`), header `Institutional Learning Outcomes` subtitle `College-wide · General Education CILOs (e.g., GEMATH, GEGS) map here`, stats `Total ILOs`/`Mapped to CILOs`/`Unmapped`, `dnd-kit` drag reorder (600ms debounce), archive/restore `AlertDialog`, plus `Link` to `mapping` via `buildGenEdOutcomeMappingPath()`; narrow `use client` only for drag/form.
- [x] 4.3 Create route `src/app/(app)/gen-ed-coordinator/outcomes/page.tsx` Server Component calling `listInstitutionalOutcomes()`, `notFound()`/`redirect("/unauthorized")` on failure, rendering `GenEdOutcomesPage`, with `export const metadata {title: "Institutional Learning Outcomes | Gen Ed Coordinator | CLOIE"}`; add `loading.tsx`/`error.tsx` siblings mirroring `gen-ed-coordinator/analytics/*`.
- [x] 4.4 Reuse `tokens.css`/`globals.css` semantic classes only (`bg-card`, `border-border`, `text-muted-foreground`, `badge` variants) per `docs/design.md` §5; verify keyboard, focus ring, 44px targets, overflow, PWA shell.

## 5. ILO Mapping Review (read-only college-wide)

- [x] 5.1 Create `src/app/(app)/gen-ed-coordinator/outcomes/mapping/page.tsx` read-only review forking `program-head/programs/[programId]/outcomes/mapping/page.tsx:1-333` but college-wide (no `params`): calls `listCILOILOMappingsForGE()`, back link to `/gen-ed-coordinator/outcomes`, header `CILO Mapping Review`, per-course `Card` with `Badge courseCode` + `Shared General Education` secondary, per-CILO `mappedTargets` badges `code · Learning (L)` etc., `Aligned`/`Needs mapping`, no mutation controls; empty = `No CILO mappings found`.
- [x] 5.2 Handle desktop table vs mobile card responsive (`hidden md:block` table when PLO-style not needed — for GE, simple list works), but keep `overflow-x-auto` where needed; `Alert` for `No Program Learning Outcomes` not shown (GE has `InstitutionalOutcome` catalog instead).
- [x] 5.3 Tests `src/__tests__/app/gen-ed-outcomes-route.test.tsx` + `gen-ed-outcomes-mapping.test.tsx` asserting `GEN_ED_COORDINATOR` renders, `FACULTY`/`SECRETARY` redirect, crafted `scopeAllowsILO` denial.

## 6. General Education Courses Catalog (read-only)

- [x] 6.1 Create `src/features/academic-structure/services/resolve-gen-ed-courses.ts` with `listGenEdCourses(): ServiceResult<{courses, summary:{total,active,archived}}>` — `prisma.course.findMany({where:{course_scope:GENERAL_EDUCATION}, include:{_count:{cilos:{where:{is_active}}}})`, order `code asc`, counts `active vs archived`; guard `resolveAuthSession().activeRole===GEN_ED_COORDINATOR` else failure; no `program_id`/`major_id` branching.
- [x] 6.2 Create `src/features/academic-structure/components/gen-ed-courses-catalog.tsx` read-only fork of `program-head-courses-catalog.tsx:1-775` stripped of `CourseScopeFields`/`MajorSelect`/`submitCourseForm` creation branch + `Major`/`Program` filters; keep `statusFilter Select` (`All Statuses/Active/Archived`), search `code/title`, `PAGE_SIZE=15` slice, `Table` columns `Course/Course Title/Status/Last Updated`, `Badge success/secondary`, no Edit/Archive buttons (read-only this slice).
- [x] 6.3 Create `src/app/(app)/gen-ed-coordinator/courses/page.tsx` Server Component calling `listGenEdCourses()`, redirect on auth failure, rendering `GenEdCoursesCatalog` with header `Courses — General Education catalog` + `College-Wide` scope badge; add `loading.tsx`/`error.tsx`.
- [x] 6.4 Tests `src/__tests__/modules/academic-catalog/resolve-gen-ed-courses.test.ts`, `src/__tests__/app/gen-ed-courses-route.test.tsx` verifying `GENERAL_EDUCATION` predicate enforced, `PROGRAM_SPECIFIC` excluded, and role guard.

## 7. Hardening + Final Verification

- [x] 7.1 Ensure `src/app/(app)/secretary/learning-outcomes/page.tsx` + `alignment/[courseId]/page.tsx` remain `redirect("/secretary/dashboard")` and `SECRETARY_NAV:63-72` has no Learning Outcomes entry; add/keep `src/__tests__/app/secretary-learning-outcomes-redirect.test.tsx` passing.
- [x] 7.2 Add component view tests `src/__tests__/components/gen-ed-outcomes-view.test.tsx` + `src/__tests__/components/gen-ed-courses-catalog.test.tsx` covering Empty, Stats, `deleteError`/`reorderError`, 375/1024 responsive artifacts where feasible.
- [x] 7.3 Run full gate: `pnpm lint`, `pnpm vitest run src/__tests__/modules/outcomes/manage-gen-ed-outcomes.test.ts src/__tests__/app/gen-ed-*.test.tsx src/__tests__/app/secretary-learning-outcomes-redirect.test.tsx src/__tests__/components/gen-ed-*`, `pnpm build` (typecheck), `pnpm exec fallow fix --dry-run` on changed files, manual browser verification at desktop (1280) + mobile (375) for Outcomes reorder/edit/archive flow and Courses filter/pagination.

# Evidence — Slice 7.1 + 8.1 (Issue #219)

Date: 2026-08-04. Branch: `feat/program-head-multi-program-context`. No schema,
migration, generated-type, or remote Supabase change was made; the linked Supabase
project was not written to.

## 7.1 Secretary assignment-set administration

- `editUserBySecretarySchema` now accepts `program_head.program_ids: string[]`
  (may be empty); the singular `program_id` Program Head field is removed.
- The edit record projection returns every active assignment with Program code
  and name; the dialog preselects exactly that set in a Base UI `Checkbox`
  fieldset composed with the installed shadcn `FieldSet`, `FieldLegend`,
  `FieldGroup`, `Field`, and `FieldLabel` components (`src/components/ui/field.tsx`).
- The confirmation payload signs the reviewed before set and the desired after
  set (`PROGRAM_HEAD:id=…:before=…:after=…`), so an intervening administrator
  change invalidates the token; the write transaction also re-reads the set and
  rejects a stale confirmation, and re-verifies the target still has the
  `PROGRAM_HEAD` role.
- The shared lifecycle helper `applyProgramHeadAssignmentSet` in
  `src/features/users/services/manage-users.ts` activates/reactivates selected
  rows and deactivates unselected active rows inside the edit transaction; it is
  the same upsert-on-compound-key and `is_active` toggle semantics used by the
  standalone assignment functions. No row is deleted or recreated solely to
  change selection, and the compound unique key converts a duplicate activation
  race into a safe activation.
- Secretary-created Program Head accounts still create exactly one active
  assignment (`create-user-by-secretary.ts` unchanged; test asserts one row).
- Browser-verified on the local dev server as `demo-secretary@cloie.test`
  editing Program Head Ana Cruz (ph-bssw): fieldset labels and preselect state,
  Tab order, Space toggling, exact before/after names in the protected review,
  and persistence of the new set after confirmation.

## 8.1 Final cross-Program inventory (run at HEAD of this slice)

`rg "programIds\[0\]|program_head_assignments\[0\]|programHeadAssignment\.findFirst|findFirst\(" src/app src/features src/lib/actions`

| Inventory item | Result |
| --- | --- |
| `programIds[0]` | 0 matches |
| `program_head_assignments[0]` | 3 matches at the pre-slice baseline, all in the Secretary edit flow (`get-user-edit-record.ts`, `edit-user-by-secretary.ts` ×2); eliminated by 7.1 — 0 matches at final HEAD |
| `programHeadAssignment.findFirst` | 1 match at the pre-slice baseline in `edit-user-by-secretary.ts`; eliminated by 7.1 — 0 matches at final HEAD |
| Other `findFirst(` matches | Course Assignment, instrument template, academic term, evaluation assignment, response, faculty affiliation, user role, invite, enrollment, deployment, exclusion models only; none derives Program Head authority from unordered data |
| Static Program Head route strings | `PROGRAM_HEAD_NAV` hrefs are fallback defaults; `getProgramHeadNav(pathname)` derives Program-scoped links from the pathname and falls back to the entry route, never an implicit Program. Post-login destination `/program-head/dashboard` redirects to the entry state machine. Generic `TemplateBuilder.toolsHref` default is always overridden by the Program Head wrapper with `buildProgramHeadToolsPath(programId)` |
| Program cache/revalidation dimensions | Program Head actions revalidate exact selected-Program paths (`buildProgramHead*Path(programId)`); no static Program Head path invalidation remains |
| Persistent authorization cache | None for Program Head reads; the only `React.cache` use is academic-calendar active-term memoization, unrelated to Program Head authority |
| Catch-all placeholder | `programs/[programId]/[...path]` no longer reserves any path; every reserved path has a real page and unknown nested paths fail closed with `notFound()` |
| Selected-Program/resource mismatch coverage | Covered by slices 1–6 route/service/action suites plus this slice's assignment-set tests: zero/one/multiple active assignments, inactive newly selected Program, stale confirmation, role revocation gate, duplicate activation race |

## Out-of-scope security follow-up (not fixed by this change)

Pre-existing Supabase advisor findings — RLS disabled on `public.program_head_assignments`
and related core tables with broad `anon`/`authenticated` grants — remain open.
This change keeps authority in server-only Prisma services and neither treats
UI routes nor JWT metadata as a substitute for RLS. Remediation requires a
dedicated security change covering the whole application data graph (see
`openspec/changes/program-head-multi-program-context/design.md` Risks section).

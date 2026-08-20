## Context

`CourseRosterDetailPage` is a Server Component presentation surface with narrow client boundaries for membership mutation. It receives an already server-authorized `CourseRosterDetail`; `canWrite` requires `canManage`, `canMutate`, and `ACTIVE` roster state. Current `AddRosterMember` and `ImportRosterCsv` render independently above the roster table, making the operational page longer and separating related write paths.

The approved prototype direction was a conservative two-step overlay: `Add members` then `Results`; it kept CSV import and one-student entry as tabs. Its fold-in was commit `84d95db`, but current `main` predates it. This change reintroduces that focused workflow while using existing responsive overlay practice: Dialog at desktop widths, Drawer at mobile widths.

ADR 0007 remains controlling: Course-assignment membership is durable and separate from `StudentEnrollment`; roster eligibility, mutation authorization, evaluation locks, and safe errors stay server-owned. ADR 0009 selected-Program routing stays unchanged. `docs/design.md` requires semantic tokens, Dialog-to-Drawer responsive adaptation where established, visible focus, 44 px touch targets, and contained wide tables.

## Goals / Non-Goals

**Goals:**

- Give a Course roster manager one clear entry point for adding memberships.
- Preserve both established methods: CSV import and one existing Student email.
- Keep import results in-session and move successful CSV imports to an explicit results state.
- Make Course-assignment scope and separate active/evaluation-eligible counts easy to scan before mutation.
- Preserve desktop Dialog and mobile Drawer usability with one shared management body.

**Non-Goals:**

- No change to Course-assignment membership persistence, eligibility rules, lifecycle locks, Server Actions, CSV grammar, partial-success behavior, or safe error mapping.
- No client-side authorization, client fetching, cache, schema, migration, generated-type, route, or dependency work.
- No roster replacement, Student profile editing, Student term-placement changes, method-selection step, inline full-page workspace, or changes to removal/restoration controls.
- No browser acceptance suite; issue #143 remains owner for end-to-end workflow coverage.

## Decisions

### 1. Use one responsive management workspace

Create `RosterManagementDialog` in `src/features/course-assignments/components/course-roster-management.tsx`. It owns only overlay state, method tabs, CSV file selection, import phase, and session result. Reuse existing `AddRosterMember`, CSV parsing/export helpers, `WizardStepper`, shadcn/Base UI primitives, and course-roster Server Actions.

At `md` and wider, render shared body in `Dialog`; below `md`, render same body in `Drawer` with swipe handle. A `useMediaQuery` client boundary is justified because viewport choice requires browser media-query state. No server data moves into this boundary beyond existing serializable assignment ID, optional selected Program ID, and displayed assignment summary.

Alternatives rejected:

- Desktop Dialog only: fails approved mobile overlay pattern for a multi-control flow.
- Inline page workspace: adds page-level state and competes with table review, filters, and remove/restore actions.
- Three-step method picker: adds friction when CSV import is expected default and both methods fit visible tabs.

### 2. Keep two phases and session-only import results

The workspace exposes `Add members` and `Results` through `WizardStepper`. The initial phase contains line tabs: `Import from CSV` and `Add one Student`. A successful CSV import advances to `Results`, presents summary, safe row outcomes, unexpected-failure reference if supplied, and failed-row export. `Back` returns to methods without rewriting results; `Done`, Cancel, escape, or closing resets workspace state for next opening.

Invalid file type, parser rejection, and action failure remain adjacent destructive alerts within import method. Pending import prevents duplicate submission and preserves action width/state. Add-one membership messages remain adjacent to its form and do not manufacture an import result phase.

Alternatives rejected:

- Close overlay after CSV import: removes visible partial-success and failed-row recovery context.
- Persist results in URL or database: contradicts session-only import-result contract and expands privacy surface.
- Merge add-one result into CSV results: changes established mutation feedback without user value.

### 3. Render course context and counts in roster detail

Modify `src/features/course-assignments/components/course-roster-pages.tsx` so detail content groups Course code, title, Program, year level, Class section, and Academic Period near title and lifecycle state. Use canonical two-card KPI composition for active roster and current evaluation-eligible count. For write-capable detail, show a compact `Manage roster` card with explanatory copy and workspace trigger; do not render separate add/import blocks.

Read-only, unauthorized, inactive-assignment, inactive-Academic-Period, and published-evaluation-lock behavior stays unchanged: lifecycle banner remains visible and management entry point is absent. Roster member filters, table, pagination, remove, and restore remain in current positions.

### 4. Preserve request-scoped data and server-owned write rules

`CourseRosterDetailPage` remains a Server Component. Existing route and service code continue server-side session resolution, role scope, Program Head selected-Program checks, and not-found non-disclosure. Existing Server Actions retain revalidation and action-level authorization; workspace visibility is convenience only, never authority.

No cache is added.

| Data | Key | Scope | Lifetime | Tags | Invalidation | Authorization | Stale behavior |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Course roster detail | N/A | request-only | request | none | existing mutation revalidation | existing server service | next navigation/render reads current data |
| Import row results | N/A | browser component state | open workspace session | none | reset on close/reopen | action already authorizes writes; no shared read | discarded after close |

### 5. Keep production-surface inventory complete

If management components are split or added, update `src/features/design-system/data/production-surface-inventory.ts` with task `15`, matching current Course-assignment component ownership. Do not remove or reassign unrelated entries.

## File Changes

| Action | Path | Purpose |
| --- | --- | --- |
| Modify | `src/features/course-assignments/components/course-roster-management.tsx` | Add responsive management workspace; retain add, remove, restore, CSV helpers, and safe feedback behavior. |
| Modify | `src/features/course-assignments/components/course-roster-pages.tsx` | Add detail context/count hierarchy and replace separate add/import blocks with workspace entry. |
| Modify | `src/__tests__/components/course-assignments/course-roster-pages.test.tsx` | Cover context, entry visibility, two methods, result transition, reset, responsive overlay choice, and preserved scope. |
| Modify if component paths change | `src/features/design-system/data/production-surface-inventory.ts` | Maintain single-disposition inventory coverage. |

## Risks / Trade-offs

- [Overlay content exceeds small mobile viewport] Mitigation: Drawer body uses existing scrollable flex layout and keeps footer/actions reachable.
- [Workspace state becomes stale after close] Mitigation: reset phase, file, alerts, and results on every open; server mutation revalidation remains source of truth.
- [Visual gate hides a valid mutation path] Mitigation: workspace visibility derives from existing `canWrite`; Server Actions retain complete authorization and lifecycle validation.
- [CSV result loses safe recovery detail] Mitigation: preserve current row table, failed-row export, opaque support reference, and focus placement after result transition.
- [Duplicate responsive markup diverges] Mitigation: render one shared management body inside Dialog or Drawer shell, not separate flows.

## Migration Plan

1. Add component tests before replacing detail controls, then introduce responsive workspace using existing action and CSV seams.
2. Replace detail-page add/import blocks with one management entry and contextual KPI presentation.
3. Update inventory only if implementation adds or moves a production surface.
4. Run focused roster tests, `pnpm test`, `pnpm lint`, and `pnpm build`.
5. Roll back by restoring the two independent detail-page controls; no persisted data, API contract, migration, or deployment rollback exists.

## Open Questions

None. Prototype verdict selected this conservative two-phase flow; method-first and inline-workspace variants are intentionally excluded.

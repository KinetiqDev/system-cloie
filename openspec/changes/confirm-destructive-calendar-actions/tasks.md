## 1. Destructive Confirmation in the Structural Calendar View

- [x] 1.1 Add a pending-destructive dialog state to `CalendarStructureView` covering archive and cancel, with target labels and irreversible-consequence copy
- [x] 1.2 Route Archive and Cancel buttons through the dialog; fire the existing server actions only on confirm with destructive variant
- [x] 1.3 Add tests: confirm runs the action once, dismiss does not mutate, destructive semantics applied, focus restored after dismissal
- [x] 1.4 Run focused tests, `pnpm lint`, `pnpm test`, and `pnpm build`

**Scope:** `src/features/academic-calendar/components/calendar-structure-view.tsx`, `src/__tests__/features/academic-calendar/calendar-structure-view.test.tsx`
**Verification:** focused Vitest tests, `pnpm lint`, `pnpm test`, `pnpm build`
**Commit:** `fix(academic-calendar): confirm destructive archive and cancel actions`

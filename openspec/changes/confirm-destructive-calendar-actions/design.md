## Context

The structural calendar view renders School Year → Semester → Term with per-state lifecycle buttons. Archive and Cancel are one-click terminal mutations with neutral styling, contradicting the destructive-action pattern in `docs/design.md` and the view's own activation confirmation flow.

## Goals / Non-Goals

**Goals:**

- Archive and Cancel require explicit confirmation naming the target.
- Confirmed destructive action uses destructive visual treatment.
- Dismissal never mutates; server-side lifecycle validation remains the authority.
- Focus returns to the invoking control after dismissal (or the confirmed action's completion keeps the view consistent with existing `runAction` behavior).

**Non-Goals:**

- Confirmation for Complete and Make Active (normal forward transitions).
- Changing lifecycle semantics, service layer, or server actions.
- Un-archive or un-cancel recovery paths.

## Decisions

### Decision 1: Confirmation dialog keyed by destructive action type

`CalendarStructureView` gains a single `pendingDestructive` state describing either an archive or a cancel:

```typescript
type PendingDestructiveAction =
  | { type: "archive"; schoolYearId: string; code: string }
  | { type: "cancel"; termId: string; label: string };
```

The School Year header's **Archive** button and each ACTIVE term's **Cancel** button set this state instead of calling `runAction` directly. An `AlertDialog` renders the target label and an irreversible-consequence statement; its confirm button uses the `destructive` variant and on confirm invokes the existing `runAction` path for the stored action, then clears the pending state.

**Rationale:** Single dialog component, one code path, matches the existing `SetActiveTermDialog`/semester-dialog pattern of state-held dialogs in this view. No new server actions.

### Decision 2: Confirm button runs the existing action with the existing error handling

Confirmed Archive calls `archiveSchoolYearAction` and confirmed Cancel calls `transitionPeriodStatusAction(target=CANCELLED)` through the existing `runAction` helper, preserving toast/error surfacing and `router.refresh()`.

**Rationale:** Server-side lifecycle validation stays the final authority per ADR 0012; the dialog is a UX guard, not a second validation layer.

### Decision 3: Dismissal is non-mutating and restores focus

Escape, backdrop, or Cancel closes the dialog without invoking any action. Focus returns to the trigger button on dismissal, matching the mobile-drawer and dialog conventions.

## Affected Paths

- Modify `src/features/academic-calendar/components/calendar-structure-view.tsx`
- Modify `src/__tests__/features/academic-calendar/calendar-structure-view.test.tsx`

## Verification

- Focused Vitest tests, `pnpm lint`, `pnpm test`, `pnpm build`

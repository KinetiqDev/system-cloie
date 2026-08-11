# Confirm Destructive Calendar Actions

## Why

The structural calendar view (`calendar-structure-view.tsx`) fires terminal lifecycle mutations on a single click. **Archive** on an inactive School Year and **Cancel** on an ACTIVE academic term invoke their server actions immediately with a neutral `outline` button and no confirmation. Both transitions are terminal under the Academic Calendar context: CANCELLED is immutable, and archiving removes all lifecycle affordances for the year and its terms. `docs/design.md` requires destructive actions to use destructive semantics and `AlertDialog` confirmation, and the view already confirms activation through `SetActiveTermDialog` — so the one-click destructive path is also inconsistent with the same screen's interaction pattern.

## What Changes

- Add a confirmation step before **Archive** and **Cancel** in the structural calendar view.
- The dialog names the exact School Year or Term and states that the transition is irreversible.
- The server action fires only after explicit confirmation; dismissal leaves the record unchanged.
- **Complete** and **Make Active** keep their current immediate behavior — they are the normal forward lifecycle path.

## Capabilities

### New Capabilities

- `destructive-calendar-confirmation`: Archive and Cancel require explicit confirmation with destructive visual treatment.

### Modified Capabilities

- `structural-calendar-ui`: per-state lifecycle buttons gain confirmation for terminal destructive transitions.

## Impact

- **UI**: `src/features/academic-calendar/components/calendar-structure-view.tsx` — confirmation dialog wired to Archive and Cancel paths.
- **Tests**: `src/__tests__/features/academic-calendar/calendar-structure-view.test.tsx` — confirmation-gating, destructive semantics, dismiss-without-mutation, focus return.
- **No schema, Prisma, migration, or Supabase type changes.**
- **Server actions unchanged** — lifecycle validation remains the final authority.

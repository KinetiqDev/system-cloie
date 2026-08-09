# ADR 0012: Secretary-Controlled Academic Calendar State

- **Status:** Accepted
- **Date:** 2026-08-09
- **Contexts:** Academic Calendar, User Experience, Data Integrity

## Decision

Academic Calendar state — which School Year, semester, and academic period is live — is **Secretary-controlled through lifecycle services and a fixed structural calendar UI**, not through ad-hoc term CRUD. Dates are informational and never gate lifecycle transitions. Seed and backfill scripts derive active state from the same canonical structure used by the app.

## Context

The refactor tracker (#317) decomposed the academic calendar rework into C1.1–C1.5. Earlier slices established: the canonical 5-term structure per School Year (#319), School Year active state columns plus the SQL-only `one_active_school_year` partial unique index and the `is_active = true OR active_semester IS NULL` CHECK (#318/#320), and the active-context read model with `end_date`-gate removal (#321).

C1.5 (#322) surfaces three previously implicit decisions that this ADR records, plus one correction forced by review:

1. **Activation semester resolution (spec contradiction).** The `activateSchoolYear` spec requires an `active_semester`, but the #318 CHECK forbids an inactive School Year holding one, and `setActiveSemester` rejects inactive School Years. The two spec scenarios are jointly unsatisfiable. Resolution: `activateSchoolYear(schoolYearId, semester?)` accepts an optional starting semester and persists it atomically with activation; `setActiveSemester` remains active-only for mid-year changes.
2. **`end_date` is informational.** The COMPLETED transition and the successor-activation flow (`completePriorActivePeriod`) must not reject undated active periods. Dates are metadata; lifecycle advances when the Secretary declares it.
3. **Fixed structural UI.** The Secretary calendar is a fixed School Year → Semester → Term hierarchy with per-state lifecycle buttons. No Add/Delete Term affordances exist — the structure is canonical per #319.
4. **Seed/backfill derive state, never invent it.** The seed activates SY_2026_2027 with `active_semester = FIRST` through the canonical creation path, and the backfill script derives active state from the single ACTIVE AcademicTermInstance.

## Options Considered

### Ad-hoc term creation for operators

Rejected. The canonical 5-term structure matches institutional reality; free-form term creation produced legacy non-canonical rows that could not be recreated once deleted (#319). Operators get lifecycle controls (Activate/Deactivate/Archive SY, Set Active Semester, Make Active/Complete/Cancel) instead.

### Requiring `end_date` before COMPLETED or successor activation

Rejected. Stakeholder requirement: dates must not control lifecycle. The #321 review (T-Rex, P1) confirmed the successor-activation path must also ignore `end_date` — otherwise an undated active period could complete directly but never advance through the normal activation flow.

### Seed creating terms manually with fixed ids

Replaced. The seed now creates School Years through `createSchoolYearWithCanonicalTerms` (the auth-free core of the Secretary service) and applies fixture statuses by canonical pair, so re-seeds reconcile against generated-id rows instead of colliding (#319 `d9e3563`/`ef8eaa6`).

## Decision Details

### 1. Lifecycle services

- `manage-school-years.ts`: `activateSchoolYear(id, semester?)`, `deactivateSchoolYear(id)`, `setActiveSemester(id, semester)`, `archiveSchoolYear(id)` — all Serializable transactions, P2002/P2034 → retry errors.
- `manage-academic-period-lifecycle.ts`: `transitionPeriodStatus(id, target)` — PLANNED→ACTIVE|CANCELLED, ACTIVE→COMPLETED|CANCELLED, terminal immutable; hierarchy revalidated inside the transaction; prior active period atomically completed regardless of `end_date`.
- Server Actions in `secretary-school-year-actions.ts` gate on `activeRole === SECRETARY`, validate with Zod, and revalidate period read-model tags/routes.

### 2. Structural calendar UI

`calendar-structure-view.tsx` renders School Year → Semester → Term from serialized Server Component data. Per-state buttons: SY (Activate/Deactivate/Archive, semester choice dialog for activation), semester (Set Active Semester when the year is active), term (PLANNED → Make Active; ACTIVE → Complete/Cancel; terminal → none). Archived years render no actions. `TermInstancePicker` and `RolloverRunner` remain for downstream consumers.

### 3. Seed and backfill

- Seed: canonical School Year creation (fixed fixture ids when absent, reconcile-by-update on re-seed), fixture statuses applied by canonical pair, then SY_2026_2027 activated with `active_semester = FIRST` after clearing any previously active year.
- `scripts/backfill-school-year-active-state.ts`: derives active state from the single ACTIVE AcademicTermInstance (partial unique index guarantees at most one); no ACTIVE period → leave untouched. Used to migrate existing production data.

## Consequences

- Secretary has a single, consistent surface for lifecycle control; the read model (`resolveActiveAcademicContext`) always agrees with the services.
- Operators cannot create or delete terms — canonical structure is enforced by construction.
- Backfill is lossy only if multiple ACTIVE periods span different School Years; the partial unique index makes that state impossible, so the single ACTIVE period is authoritative.
- The seed's `active_semester = FIRST` on SY_2026_2027 coexists with an ACTIVE SECOND-semester fixture period (spec "period is the authority" scenario); the UI can resolve this through the normal lifecycle flow.

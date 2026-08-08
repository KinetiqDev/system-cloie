## ADDED Requirements

### Requirement: Resolve active academic context
The system SHALL provide `resolveActiveAcademicContext()` returning the active School Year, active Semester, and active Academic Period in a single read. When no active period exists, `assignmentPeriod` shall be null. When no active School Year exists, `schoolYear` shall be null.

#### Scenario: Full active context
- **WHEN** a School Year is active with `active_semester = "FIRST"` and a FIRST/FIRST_TERM AcademicTermInstance is ACTIVE
- **THEN** `resolveActiveAcademicContext()` returns `{ schoolYear: { id, code }, semester: "FIRST", assignmentPeriod: { id, semester: "FIRST", term: "FIRST_TERM" } }`

#### Scenario: Active period without active School Year
- **WHEN** an AcademicTermInstance is ACTIVE but no School Year has `is_active = true`
- **THEN** `resolveActiveAcademicContext()` returns `schoolYear: null` but `assignmentPeriod` populated from the active term's school year

#### Scenario: No active period exists
- **WHEN** no AcademicTermInstance has `status = ACTIVE`
- **THEN** `resolveActiveAcademicContext()` returns `{ schoolYear: null, semester: null, assignmentPeriod: null }`

#### Scenario: Active period validates semester match
- **WHEN** the active School Year has `active_semester = "FIRST"` but the ACTIVE AcademicTermInstance has `semester = "SECOND"`
- **THEN** `resolveActiveAcademicContext()` returns the actual active period but `semester` reflects `SECOND` from the period (the period is the authority)

### Requirement: Backward-compatible active term resolution
The existing `getActiveTermId()`, `hasActiveTerm()`, and `resolveActiveTerm()` functions SHALL remain available and produce identical results to their pre-change behavior.

#### Scenario: getActiveTermId still works
- **WHEN** `getActiveTermId()` is called and an ACTIVE period exists
- **THEN** the active period's ID is returned, matching previous behavior

#### Scenario: hasActiveTerm still works
- **WHEN** `hasActiveTerm()` is called
- **THEN** returns `true` if an ACTIVE period exists, `false` otherwise

### Requirement: Academic period activation validates School Year and Semester
When activating an AcademicTermInstance (PLANNED→ACTIVE), the system SHALL verify that the period's School Year is active and the period's semester matches the School Year's `active_semester`.

#### Scenario: Activation fails when School Year inactive
- **WHEN** Secretary attempts to activate a term whose School Year has `is_active = false`
- **THEN** the activation is rejected with an error indicating the School Year must be active first

#### Scenario: Activation fails when semester mismatch
- **WHEN** the active School Year has `active_semester = "FIRST"` and Secretary attempts to activate a SECOND-semester term
- **THEN** the activation is rejected with an error indicating the semester does not match

#### Scenario: Activation succeeds when hierarchy valid
- **WHEN** the School Year is active with `active_semester = "FIRST"` and Secretary activates a FIRST/FIRST_TERM period
- **THEN** activation succeeds

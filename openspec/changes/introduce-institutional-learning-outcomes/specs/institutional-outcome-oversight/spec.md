## ADDED Requirements

### Requirement: Dean Learning Outcomes includes Institutional Outcome oversight
The Dean's read-only College Oversight → Learning Outcomes surface SHALL show the selected Academic Period's Institutional Outcome catalog coverage before General Education mapping gaps and Program-specific Graduate Outcome coverage. It SHALL provide no mutation controls.

#### Scenario: Dean reviews mixed outcome coverage
- **GIVEN** the selected eligible Academic Period has General Education and Program-specific Course contexts
- **WHEN** Dean opens Learning Outcomes
- **THEN** the page distinguishes Institutional Outcome coverage for General Education from Graduate Outcome coverage for Program-specific Courses and preserves stable risk ordering

#### Scenario: Dean has no write controls
- **GIVEN** an authenticated user has active role `DEAN`
- **WHEN** the Dean Learning Outcomes page renders
- **THEN** it shows read-only catalog, readiness, and gap information with no create, edit, reorder, archive, restore, or mapping mutation controls

### Requirement: Dean overview is privacy-safe and period-scoped
Dean outcome reads SHALL remain server-authorized, selected-period scoped, and uncached with `Cache-Control: private, no-store`. They SHALL not include student identifiers, roster data, evaluation responses, or private account metadata.

#### Scenario: Dean requests an active period
- **GIVEN** an authenticated Dean selects an eligible active Academic Period
- **WHEN** the Learning Outcomes route is loaded
- **THEN** the response contains only the typed outcome readiness and mapping projection for that period and is marked `private, no-store`

#### Scenario: Non-Dean requests Dean oversight
- **GIVEN** an authenticated user has active role `SECRETARY`, `PROGRAM_HEAD`, or `FACULTY`
- **WHEN** the user requests the Dean Learning Outcomes read surface
- **THEN** the server rejects access without returning outcome oversight data

#### Scenario: No eligible period exists
- **GIVEN** no active or eligible completed Academic Period exists
- **WHEN** Dean opens Learning Outcomes
- **THEN** the page shows an explicit no-eligible-period state rather than treating missing data as zero coverage

### Requirement: Dean can identify typed mapping gaps and archived targets
The Dean projection SHALL show Course/CILO gaps with their target type, archived status where relevant, and responsible repair context. Institutional Outcome gaps SHALL not be represented as Program GO gaps.

#### Scenario: General Education gap is expanded
- **GIVEN** an active General Education context contains an unmapped CILO
- **WHEN** Dean expands the corresponding Program/period detail
- **THEN** the gap identifies the General Education Course and missing Institutional Outcome alignment without exposing Faculty private data

#### Scenario: Historical archived target is reviewed
- **GIVEN** a completed period snapshot contains an archived ILO or GO target
- **WHEN** Dean opens that completed period
- **THEN** the target remains visible with an `Archived` label and the snapshot's historical state is preserved

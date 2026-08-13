## ADDED Requirements

### Requirement: Faculty can open a target-aware Course alignment detail
The Faculty Manage CILOs workflow SHALL expose a URL-backed Course alignment detail route. The detail SHALL show the Course identity, Course scope, target type, active CILOs, current mapped targets, per-CILO coverage state, and Course-level readiness.

#### Scenario: Faculty opens a Program-specific Course
- **GIVEN** an authenticated Faculty user owns an active assignment for a Program-specific Course
- **WHEN** the user opens the Course alignment route
- **THEN** the page shows only active Graduate Outcomes from the Course's owning Academic Program as valid targets

#### Scenario: Faculty opens a General Education Course
- **GIVEN** an authenticated Faculty user owns an active assignment for a General Education Course
- **WHEN** the user opens the Course alignment route
- **THEN** the page shows only the shared Institutional Outcome catalog as valid targets and explains that mappings apply to every assignment of the Course

#### Scenario: Course URL is unauthorized or invalid
- **GIVEN** the Course does not belong to an active assignment owned by the current Faculty user
- **WHEN** the user requests the alignment route
- **THEN** the server returns a not-found or equivalent safe unavailable response without revealing whether another Course exists

### Requirement: Faculty edits one-to-many targets through an accessible searchable multi-select
Each CILO row SHALL provide a searchable target picker with checkbox semantics, code and full statement, selected state/count, visible focus, keyboard operation, and touch-sized controls. The UI SHALL never mix Institutional Outcomes and Graduate Outcomes in one picker.

#### Scenario: Faculty selects multiple targets
- **GIVEN** the valid target catalog contains multiple active targets
- **WHEN** Faculty searches and selects several targets for a CILO
- **THEN** the selected state is visible, the CILO coverage status updates locally, and no server write occurs until the Course diff is reviewed and saved

#### Scenario: Faculty clears all targets
- **GIVEN** a CILO currently has valid mappings
- **WHEN** Faculty removes all targets in the local draft
- **THEN** the UI marks that CILO as incomplete, explains the readiness consequence, and allows the change to be reviewed rather than silently saving it

### Requirement: Faculty Course alignment saves show the complete impact
The Course alignment editor SHALL show an explicit before/after diff before commit. For General Education Courses it SHALL warn that CILO mapping changes affect all active and future Course Assignment contexts using the shared Course-level CILOs.

#### Scenario: Faculty confirms a Course diff
- **GIVEN** Faculty has staged additions or removals
- **WHEN** Faculty opens and confirms the exact review
- **THEN** the system saves the complete Course diff atomically, shows success feedback, and refreshes alignment status

#### Scenario: Faculty dismisses unsaved changes
- **GIVEN** the editor contains unsaved mapping changes
- **WHEN** Faculty navigates away or closes the editor
- **THEN** the system offers a clear discard path and does not silently lose or commit the draft

### Requirement: Faculty alignment handles empty, loading, and error states
The alignment route SHALL show a structural loading state, safe recoverable read/write errors, and guided empty states.

#### Scenario: Course has no active CILOs
- **GIVEN** an authorized Course has no active CILOs
- **WHEN** Faculty opens alignment
- **THEN** the page explains that CILOs must be added before alignment and provides a path back to CILO management

#### Scenario: Valid target catalog is empty
- **GIVEN** an authorized Course has active CILOs but no active Institutional Outcomes or owning-Program Graduate Outcomes
- **WHEN** Faculty opens alignment
- **THEN** the CILOs remain inspectable, mapping controls are disabled, the Course is incomplete, and the page identifies Secretary or the owning Program Head as responsible for creating the catalog target

#### Scenario: Alignment read or save fails
- **GIVEN** an expected or unexpected server failure occurs
- **WHEN** the alignment route renders or a save completes
- **THEN** the UI shows a specific safe recovery message, preserves unsaved local state where safe, and offers retry/reload without exposing internal errors

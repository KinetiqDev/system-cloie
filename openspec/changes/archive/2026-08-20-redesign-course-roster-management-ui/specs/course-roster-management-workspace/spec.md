<!-- NOTE: This delta was intentionally NOT synced to main specs on 2026-08-20.
     It is preserved here for historical record. The capability `course-roster-management-workspace`
     was superseded by the archived change `2026-08-16-replace-student-id-with-name-roster-resolution`,
     which already synced a newer name-based, 3-phase (Add/Review/Results) spec to
     `openspec/specs/course-roster-management-workspace/spec.md`. Syncing this older
     email-based, 2-phase delta would have regressed the main spec. Only the sibling
     `course-roster-detail-hierarchy` delta was synced. -->

## ADDED Requirements

### Requirement: Authorized mutable roster has one responsive management workspace
The system SHALL show one `Manage roster` entry point only when the current user is an authorized Course roster manager, the Course assignment is active, and its Academic Period is active with no published Course-bound evaluation lock. The entry point SHALL open a Dialog at desktop widths and a Drawer at mobile widths, with equivalent management content and keyboard-operable controls.

#### Scenario: Authorized Faculty opens management workspace
- **GIVEN** a `FACULTY` user owns an active Course assignment with an open roster
- **WHEN** the user selects `Manage roster`
- **THEN** the system SHALL show methods for CSV import and adding one existing Student by email

#### Scenario: Program Head opens selected-Program management workspace
- **GIVEN** a `PROGRAM_HEAD` user opens a Course roster within an authorized selected Program
- **WHEN** the user selects `Manage roster` and submits either method
- **THEN** the system SHALL preserve the selected Program ID in the existing Server Action request

#### Scenario: Read-only roster has no management workspace
- **GIVEN** a Course assignment has an inactive assignment, inactive Academic Period, published Course-bound evaluation lock, or lacks roster-management authority
- **WHEN** its Course roster detail renders
- **THEN** the system SHALL not show `Manage roster` while retaining existing review and lifecycle feedback

### Requirement: Workspace separates member input from CSV import results
The management workspace SHALL show progress for `Add members` and `Results`. Its initial state SHALL provide `Import from CSV` and `Add one Student` methods. A successful CSV operation SHALL advance to `Results`; CSV result data SHALL remain session-only.

#### Scenario: CSV import reaches results
- **GIVEN** a Course roster manager has opened `Import from CSV`
- **WHEN** the existing CSV import operation returns created, restored, failed, or unprocessed row results
- **THEN** the system SHALL show totals, each safe row result, any opaque support reference, and failed-row download when failures exist

#### Scenario: Add one Student preserves direct feedback
- **GIVEN** a Course roster manager has selected `Add one Student`
- **WHEN** the user submits an existing Student email
- **THEN** the system SHALL preserve the existing adjacent success or safe error feedback without treating it as CSV import results

#### Scenario: Invalid CSV stays in member-input phase
- **GIVEN** a Course roster manager selects a non-CSV file or submits CSV rejected by the existing parser
- **WHEN** validation fails before an import action succeeds
- **THEN** the system SHALL remain in `Add members` and show an adjacent safe error with recovery guidance

### Requirement: Workspace state resets between sessions
The management workspace SHALL clear selected files, import results, pending-independent feedback, and progress phase whenever it closes and before it reopens. Closing or cancelling SHALL not reverse completed Course-assignment membership writes.

#### Scenario: Manager reopens workspace after import
- **GIVEN** a Course roster manager has viewed CSV import results and closes the workspace
- **WHEN** the manager opens `Manage roster` again
- **THEN** the system SHALL start at `Add members` with no prior file or row result displayed

#### Scenario: Manager closes during pending import
- **GIVEN** a CSV import action is pending
- **WHEN** the manager attempts to close the workspace
- **THEN** the system SHALL prevent duplicate submission and preserve existing action completion behavior without exposing technical failure detail

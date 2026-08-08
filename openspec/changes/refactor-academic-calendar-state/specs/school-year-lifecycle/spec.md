## ADDED Requirements

### Requirement: Activate School Year
The system SHALL allow a SECRETARY to activate at most one School Year at a time. When a School Year is activated, any previously active School Year SHALL be deactivated atomically within the same transaction. A School Year MUST have an `active_semester` set before it can be activated.

#### Scenario: Activate first School Year
- **WHEN** Secretary activates a School Year with `active_semester` set and no other School Year is active
- **THEN** the School Year is marked `is_active = true` and the operation succeeds

#### Scenario: Activate replaces prior active
- **WHEN** Secretary activates School Year B while School Year A is active
- **THEN** School Year A is atomically deactivated and School Year B becomes the sole active School Year

#### Scenario: Activate without active semester
- **WHEN** Secretary attempts to activate a School Year that has `active_semester = null`
- **THEN** the operation is rejected with an error indicating active semester must be set first

#### Scenario: Non-Secretary activation rejected
- **WHEN** a non-SECRETARY user attempts to activate a School Year
- **THEN** the operation is rejected with an authorization error

### Requirement: Deactivate School Year
The system SHALL allow a SECRETARY to deactivate the active School Year. A School Year with an active Academic Period MUST NOT be deactivated.

#### Scenario: Deactivate active School Year
- **WHEN** Secretary deactivates the active School Year and no Academic Period within it is ACTIVE
- **THEN** the School Year is marked `is_active = false` and `active_semester` is cleared to null

#### Scenario: Deactivate with active period rejected
- **WHEN** Secretary attempts to deactivate a School Year that contains an ACTIVE AcademicTermInstance
- **THEN** the operation is rejected with an error indicating an active period exists

### Requirement: Archive School Year
The system SHALL preserve the existing archive behavior: an archived School Year cannot be active, cannot have an active semester, and cannot have its terms modified.

#### Scenario: Archive inactive School Year
- **WHEN** Secretary archives a non-active School Year
- **THEN** `is_archived = true` with audit metadata

#### Scenario: Archive active School Year rejected
- **WHEN** Secretary attempts to archive the active School Year
- **THEN** the operation is rejected

### Requirement: Database enforces one active School Year
The database SHALL enforce at most one `school_years` row with `is_active = true` through a partial unique index.

#### Scenario: Concurrent activation conflicts
- **WHEN** two concurrent transactions attempt to activate different School Years
- **THEN** only one succeeds; the other fails with a unique constraint violation

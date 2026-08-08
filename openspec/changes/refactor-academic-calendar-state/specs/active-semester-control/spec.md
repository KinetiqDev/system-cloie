## ADDED Requirements

### Requirement: Set active semester
The system SHALL allow a SECRETARY to set the `active_semester` on an active School Year. Valid values are `FIRST`, `SECOND`, or `SUMMER`. Setting `active_semester` SHALL record the activating user and timestamp.

#### Scenario: Set active semester on active School Year
- **WHEN** Secretary sets `active_semester = "FIRST"` on the active School Year
- **THEN** `active_semester` is updated and `active_semester_activated_by`/`active_semester_activated_at` are recorded

#### Scenario: Set active semester on inactive School Year rejected
- **WHEN** Secretary attempts to set `active_semester` on a non-active School Year
- **THEN** the operation is rejected with an error indicating the School Year must be active first

#### Scenario: Change active semester
- **WHEN** Secretary changes `active_semester` from `FIRST` to `SECOND` on the active School Year
- **THEN** `active_semester` is updated and the activation audit fields are refreshed

### Requirement: Clear active semester on deactivation
When a School Year is deactivated, the system SHALL automatically clear `active_semester` to null.

#### Scenario: Deactivation clears semester
- **WHEN** Secretary deactivates a School Year with `active_semester = "FIRST"`
- **THEN** after deactivation, `active_semester` is `null`

### Requirement: Database ensures inactive school year has null semester
The database SHALL enforce a CHECK constraint that `active_semester IS NULL` when `is_active = false`.

#### Scenario: Inactive with semester rejected by database
- **WHEN** a direct write attempts to set `is_active = false` while `active_semester` is not null
- **THEN** the database rejects the write with a constraint violation

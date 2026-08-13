## ADDED Requirements

### Requirement: Secretary can manage the institution-wide Institutional Outcome catalog
The system SHALL provide a Secretary-owned catalog of Institutional Learning Outcomes common to every Academic Program. Each Institutional Outcome SHALL have a stable unique code, statement, display order, active state, created timestamp, and updated timestamp. The catalog SHALL support create, edit, reorder, archive, and restore through server-authorized operations.

#### Scenario: Secretary creates an Institutional Outcome
- **GIVEN** an authenticated user has active role `SECRETARY`
- **WHEN** the user submits a valid unique code and statement
- **THEN** the system creates an active Institutional Outcome in the college-wide catalog and reports success

#### Scenario: Duplicate code is rejected
- **GIVEN** an active or archived Institutional Outcome already uses the submitted code
- **WHEN** a Secretary submits another Outcome with that code
- **THEN** the system rejects the write with a safe duplicate-code error and preserves the existing catalog

#### Scenario: Non-Secretary cannot mutate the catalog
- **GIVEN** an authenticated user has active role `DEAN`, `PROGRAM_HEAD`, or `FACULTY`
- **WHEN** the user attempts any Institutional Outcome create, edit, reorder, archive, or restore operation
- **THEN** the server rejects the operation without reading private mutation state or changing the catalog

#### Scenario: Archived outcomes remain visible
- **GIVEN** a Secretary archives an Institutional Outcome
- **WHEN** the catalog is loaded for administrative or historical review
- **THEN** the Outcome remains visible with an `Archived` state and cannot be selected for a new mapping

#### Scenario: Restore requires an active catalog record
- **GIVEN** an archived Institutional Outcome belongs to the catalog
- **WHEN** a Secretary restores it
- **THEN** it becomes selectable for new mappings and remains in its stable display-order position

### Requirement: Catalog writes use protected review and current-state confirmation
Secretary Institutional Outcome writes SHALL use an exact before-and-after review, explicit confirmation, server-side authorization, freshness recheck, and atomic save. A stale or unconfirmed review SHALL NOT mutate the catalog.

#### Scenario: Secretary cancels a reviewed write
- **GIVEN** a valid Institutional Outcome write has been prepared
- **WHEN** the Secretary does not explicitly confirm the exact before-and-after review
- **THEN** the system performs no catalog mutation

#### Scenario: A stale catalog review is committed
- **GIVEN** another write changes the reviewed Institutional Outcome after preparation
- **WHEN** the original review is submitted
- **THEN** the system rejects it with a freshness error and requires a new review

### Requirement: Catalog UI communicates loading, empty, and failure states
The Secretary catalog SHALL show structural loading feedback, a useful empty state with a create action, and safe recoverable errors. Dean and Faculty users SHALL see no Secretary mutation controls on their read-only catalog views.

#### Scenario: Catalog has no outcomes
- **GIVEN** the authorized Secretary catalog read returns no Institutional Outcomes
- **WHEN** the catalog page renders
- **THEN** it explains that no Institutional Outcomes exist and provides the Secretary with a create action

#### Scenario: Catalog read fails
- **GIVEN** the authorized catalog read fails unexpectedly
- **WHEN** the catalog page renders
- **THEN** it shows a generic safe error with a retry path and does not expose database details

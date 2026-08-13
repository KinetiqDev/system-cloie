## ADDED Requirements

### Requirement: Course scope determines the valid CILO target relation
The system SHALL derive the valid mapping target from the Course scope and SHALL reject cross-target mappings server-side:

- A `GENERAL_EDUCATION` Course CILO may map only to active Institutional Outcomes.
- A `PROGRAM_SPECIFIC` Course CILO may map only to active Graduate Outcomes belonging to the Course's owning Academic Program.

The system SHALL not expose a client-selectable target type that can override this rule.

#### Scenario: General Education CILO maps to an Institutional Outcome
- **GIVEN** an active CILO belongs to a `GENERAL_EDUCATION` Course
- **WHEN** an authorized Faculty or Secretary creates a mapping to an active Institutional Outcome
- **THEN** the system creates the typed General Education mapping

#### Scenario: General Education CILO maps to a Graduate Outcome
- **GIVEN** an active CILO belongs to a `GENERAL_EDUCATION` Course
- **WHEN** an authorized writer attempts to map it to a Graduate Outcome
- **THEN** the system rejects the operation and preserves all existing mappings

#### Scenario: Program-specific CILO maps to its owning Program GO
- **GIVEN** an active CILO belongs to a `PROGRAM_SPECIFIC` Course whose owning Program is `BSIT`
- **WHEN** an authorized Faculty or Secretary maps it to an active `BSIT` Graduate Outcome
- **THEN** the system creates the typed Program-specific mapping

#### Scenario: Program-specific CILO maps to another Program GO
- **GIVEN** a CILO belongs to a `PROGRAM_SPECIFIC` Course owned by `BSIT`
- **WHEN** a writer attempts to map it to a Graduate Outcome owned by `BSED`
- **THEN** the system rejects the operation with a safe scope error

### Requirement: Typed mapping pairs are unique and durable
Each typed mapping relation SHALL reject duplicate CILO-target pairs at the database and service layers. New or changed mapping rows SHALL retain creator/updater actor and timestamps where the actor is known. Existing legacy rows without actor data SHALL not receive fabricated attribution.

#### Scenario: Duplicate mapping is submitted
- **GIVEN** the same CILO-target pair already exists in its valid typed relation
- **WHEN** a writer submits the pair again
- **THEN** the system rejects it as a duplicate without creating another row

#### Scenario: Mapping target is archived
- **GIVEN** an Institutional Outcome or Graduate Outcome is archived
- **WHEN** a writer attempts a new mapping to that target
- **THEN** the system rejects the new mapping while retaining any historical relation row

### Requirement: Faculty and Secretary mapping authorization is explicit
`FACULTY` users SHALL write mappings only for Courses with an active Course Assignment owned by that Faculty user in an active Academic Period. `SECRETARY` users SHALL write mappings college-wide. `PROGRAM_HEAD` and `DEAN` users SHALL have read-only mapping access through their authorized review surfaces.

#### Scenario: Assigned Faculty writes a Course mapping
- **GIVEN** an authenticated Faculty user owns an active Course Assignment for the Course
- **WHEN** the Faculty user creates or removes a valid typed mapping
- **THEN** the server authorizes the write and records the authenticated actor

#### Scenario: Unassigned Faculty writes a Course mapping
- **GIVEN** an authenticated Faculty user has no active Course Assignment for the Course
- **WHEN** the user attempts to write a mapping
- **THEN** the server rejects the operation without mutation

#### Scenario: Secretary corrects a mapping college-wide
- **GIVEN** an authenticated user has active role `SECRETARY`
- **WHEN** the user submits a valid typed mapping change for any active Course
- **THEN** the server permits it through protected review and records the Secretary actor

#### Scenario: Program Head reviews but cannot edit
- **GIVEN** an authenticated user has active role `PROGRAM_HEAD`
- **WHEN** the user opens a mapping review or submits a mapping mutation
- **THEN** the review is read-only and the mutation is rejected

### Requirement: Course-level mapping diffs commit atomically
The system SHALL allow a writer to submit the desired mapping set for one Course. The server SHALL compute additions and removals, present an exact diff, recheck freshness and authorization inside a serializable transaction, and commit all changes atomically.

#### Scenario: Multiple CILO changes succeed together
- **GIVEN** a writer stages additions and removals across several CILOs of one Course
- **WHEN** the writer confirms the exact Course-level diff
- **THEN** all valid additions and removals commit together and the read model reflects the complete new set

#### Scenario: One staged target is invalid
- **GIVEN** a Course-level diff includes a target from the wrong catalog or an archived target
- **WHEN** the writer submits the diff
- **THEN** the server rejects the complete transaction and leaves every existing mapping unchanged

#### Scenario: Concurrent Course edit makes the review stale
- **GIVEN** another writer changes a mapping after the diff was prepared
- **WHEN** the first writer confirms the stale diff
- **THEN** the server rejects the complete diff with a freshness error and requires reloading

### Requirement: Legacy General Education GO mappings are removed during cutover
The migration SHALL delete only legacy CILO-to-GO rows whose CILO belongs to a General Education Course. It SHALL not delete Program-specific CILO-to-GO rows, CILOs, GOs, Institutional Outcomes, or published evaluation/readiness snapshot records.

#### Scenario: Legacy General Education rows are deleted
- **GIVEN** the cutover migration runs against a database containing General Education CILO-to-GO rows
- **WHEN** the migration completes successfully
- **THEN** those rows are absent and the new typed mapping tables and constraints exist

#### Scenario: Program-specific mappings survive cutover
- **GIVEN** a Program-specific CILO-to-GO row exists before migration
- **WHEN** the cutover migration completes
- **THEN** that row remains available and continues to represent Program-specific alignment

#### Scenario: Migration preflight reports scope
- **GIVEN** the migration is prepared for deployment
- **WHEN** its dry-run/preflight is reviewed
- **THEN** the operator can identify the exact General Education deletion predicate and affected-row count before push

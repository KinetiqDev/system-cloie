## ADDED Requirements

### Requirement: RLS enabled on curriculum tables

The `curriculum_versions` and `curriculum_courses` tables SHALL have RLS enabled. SELECT SHALL be allowed for all authenticated users. Write operations SHALL be restricted to SECRETARY and PROGRAM_HEAD roles.

#### Scenario: Authenticated user can read curricula

- **WHEN** any authenticated user queries curriculum data
- **THEN** the query returns results filtered by the user's authorization scope

#### Scenario: Non-Secretary, non-PH cannot write

- **WHEN** a FACULTY or STUDENT user attempts to create, update, or delete curriculum data
- **THEN** the operation is rejected at the database level

### Requirement: Program Head scope enforced

PROGRAM_HEAD write operations on curriculum SHALL be scoped to programs assigned through `ProgramHeadAssignment`.

#### Scenario: PH writes to own program

- **WHEN** a PROGRAM_HEAD assigned to BSIT creates a CurriculumVersion with program_id matching BSIT
- **THEN** the operation succeeds

#### Scenario: PH writes to other program rejected

- **WHEN** a PROGRAM_HEAD assigned to BSIT attempts to create a CurriculumVersion for BSBA
- **THEN** the operation is rejected

### Requirement: Direct writes restricted to DRAFT

Direct authenticated writes to CurriculumVersion and CurriculumCourse rows SHALL be rejected at the database layer unless the target row (or, for a CurriculumCourse, its parent CurriculumVersion) has `status = DRAFT`. Direct INSERT of a non-DRAFT CurriculumVersion SHALL be rejected. Lifecycle transitions SHALL remain the responsibility of the application service layer.

#### Scenario: Direct update of a published version rejected

- **WHEN** a SECRETARY or in-scope PROGRAM_HEAD issues a direct UPDATE against a PUBLISHED CurriculumVersion
- **THEN** the database rejects the write

#### Scenario: Direct delete of a retired version rejected

- **WHEN** a SECRETARY or in-scope PROGRAM_HEAD issues a direct DELETE against a RETIRED CurriculumVersion
- **THEN** the database rejects the write

#### Scenario: Direct insert of a published version rejected

- **WHEN** a SECRETARY or in-scope PROGRAM_HEAD issues a direct INSERT whose status is PUBLISHED or RETIRED
- **THEN** the database rejects the insert

#### Scenario: Direct write under a published version rejected

- **WHEN** a SECRETARY or in-scope PROGRAM_HEAD issues a direct INSERT, UPDATE, or DELETE against a CurriculumCourse whose parent CurriculumVersion is PUBLISHED or RETIRED
- **THEN** the database rejects the write

#### Scenario: DRAFT mutation still allowed

- **WHEN** a SECRETARY or in-scope PROGRAM_HEAD issues a direct write against a DRAFT CurriculumVersion or a CurriculumCourse under a DRAFT parent
- **THEN** the database accepts the write

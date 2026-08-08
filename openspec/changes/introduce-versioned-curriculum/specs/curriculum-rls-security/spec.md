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

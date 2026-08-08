## ADDED Requirements

### Requirement: Add Course to Curriculum Version
The system SHALL allow adding a Course to a DRAFT CurriculumVersion as a CurriculumCourse with a specific year_level, semester, and term.

#### Scenario: Add course with valid placement
- **WHEN** Secretary adds Course IT201 to a DRAFT CurriculumVersion with year_level=SECOND_YEAR, semester=FIRST, term=FIRST_TERM
- **THEN** a CurriculumCourse is created linking the course with that placement

#### Scenario: Summer placement has no term
- **WHEN** Secretary adds a Course with semester=SUMMER
- **THEN** term must be null; providing a term rejects the operation

#### Scenario: Regular semester requires term
- **WHEN** Secretary adds a Course with semester=FIRST and no term
- **THEN** the operation is rejected with "Regular semesters require a term"

### Requirement: Remove Course from Curriculum Version
The system SHALL allow removing a CurriculumCourse from a DRAFT CurriculumVersion. Removal SHALL NOT delete the Course itself.

#### Scenario: Remove course from draft
- **WHEN** Secretary removes a CurriculumCourse from a DRAFT CurriculumVersion
- **THEN** the CurriculumCourse row is deleted; the Course remains unchanged

#### Scenario: Remove course from published rejected
- **WHEN** Secretary attempts to remove a CurriculumCourse from a PUBLISHED CurriculumVersion
- **THEN** the operation is rejected

### Requirement: Same Course may appear multiple times
The system SHALL allow the same Course to appear more than once within one CurriculumVersion (e.g., in different semesters), OR across different CurriculumVersions.

#### Scenario: Same course in different semesters
- **WHEN** Course GE101 appears in both FIRST and SECOND semesters of the same CurriculumVersion
- **THEN** both CurriculumCourse rows are created without conflict

#### Scenario: Same course in different versions
- **WHEN** Course IT201 appears in both BSIT-2026 and BSIT-2030 CurriculumVersions with different year_levels
- **THEN** both CurriculumCourse rows are created independently

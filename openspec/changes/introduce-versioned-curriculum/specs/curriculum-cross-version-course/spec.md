## ADDED Requirements

### Requirement: Course reused across CurriculumVersions
A Course MAY appear in multiple CurriculumVersions with different year_level, semester, or term placements. Each placement SHALL be independent.

#### Scenario: Course changes year level between versions
- **GIVEN** Course IT201 is placed in 2nd Year/First Semester/First Term in BSIT-2026
- **WHEN** IT201 is placed in 1st Year/Second Semester/First Term in BSIT-2030
- **THEN** both CurriculumCourse rows exist independently; neither affects the other

#### Scenario: Course omitted from newer version
- **GIVEN** Course IT201 exists in BSIT-2026
- **WHEN** BSIT-2030 is created without IT201
- **THEN** IT201 remains in BSIT-2026; BSIT-2030 has no IT201 entry; Course IT201 itself is unchanged

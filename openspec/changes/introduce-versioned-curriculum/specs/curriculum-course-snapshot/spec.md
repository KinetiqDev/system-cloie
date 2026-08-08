## ADDED Requirements

### Requirement: Course metadata snapshot on creation
When a CurriculumCourse is created, the system SHALL capture `course_code_snapshot` and `course_title_snapshot` from the Course's current `code` and `title` values.

#### Scenario: Snapshot captured at creation
- **WHEN** a CurriculumCourse is created for Course IT201 with code "IT201" and title "Introduction to Programming"
- **THEN** `course_code_snapshot = "IT201"` and `course_title_snapshot = "Introduction to Programming"` are stored

### Requirement: Snapshot survives Course metadata changes
The snapshot values SHALL remain unchanged when the underlying Course's code or title is later modified.

#### Scenario: Course renamed after publication
- **GIVEN** a PUBLISHED CurriculumCourse with `course_title_snapshot = "Intro to Programming"`
- **WHEN** the Course's title is changed to "Advanced Programming Fundamentals"
- **THEN** the CurriculumCourse's `course_title_snapshot` still reads "Intro to Programming"

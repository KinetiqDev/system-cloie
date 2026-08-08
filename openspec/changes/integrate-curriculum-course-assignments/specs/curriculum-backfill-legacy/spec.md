## ADDED Requirements

### Requirement: Backfill only unambiguous matches
The system SHALL backfill `curriculum_course_id` on existing CourseAssignments only when exactly one CurriculumCourse matches the assignment on: course_id, program_id, year_level, semester, and term. Zero or multiple matches SHALL leave `curriculum_course_id` as null.

#### Scenario: Single match backfilled
- **GIVEN** a CourseAssignment for IT201 in BSIT, 2nd Year, First Term matches exactly one CurriculumCourse
- **WHEN** the backfill runs
- **THEN** `curriculum_course_id` is set on that assignment

#### Scenario: No match left null
- **GIVEN** a CourseAssignment for GE101 in BSIT, 1st Year, First Term that has zero matching CurriculumCourse entries
- **WHEN** the backfill runs
- **THEN** `curriculum_course_id` remains null

#### Scenario: Multiple matches left null
- **GIVEN** a CourseAssignment that matches two CurriculumCourse rows (ambiguous)
- **WHEN** the backfill runs
- **THEN** `curriculum_course_id` remains null; ambiguity is logged

### Requirement: Backfill is idempotent
Running the backfill script multiple times SHALL produce the same result. Already-linked assignments SHALL NOT be re-evaluated or changed.

#### Scenario: Rerun backfill
- **WHEN** backfill is run a second time
- **THEN** no assignments with non-null curriculum_course_id are modified

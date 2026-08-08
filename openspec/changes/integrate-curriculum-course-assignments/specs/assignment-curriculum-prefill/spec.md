## ADDED Requirements

### Requirement: CurriculumCourse pre-fills assignment fields
When a CurriculumCourse is selected during CourseAssignment creation, the system SHALL pre-fill `course_id` and `year_level` from the CurriculumCourse's course and placement.

#### Scenario: Prefill from curriculum course
- **WHEN** Program Head selects CurriculumCourse for IT201 (2nd Year, First Semester, First Term) during assignment creation
- **THEN** course is set to IT201 and year_level is set to SECOND_YEAR

#### Scenario: Prefill does not lock fields
- **WHEN** course and year_level are pre-filled from CurriculumCourse
- **THEN** the user may still override year_level before submitting (per ADR 0003 advisory defaults)

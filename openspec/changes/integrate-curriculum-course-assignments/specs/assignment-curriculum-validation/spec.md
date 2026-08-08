## ADDED Requirements

### Requirement: Course identity validation
When `curriculum_course_id` is set on a CourseAssignment, the system SHALL validate that `CourseAssignment.course_id === CurriculumCourse.course_id`. If they do not match, the operation SHALL be rejected.

#### Scenario: Valid link
- **WHEN** both course_id and curriculum_course_id reference the same Course
- **THEN** validation passes

#### Scenario: Mismatched link rejected
- **WHEN** course_id references Course A but curriculum_course_id references CurriculumCourse for Course B
- **THEN** validation fails with "Selected curriculum course does not match the assigned course"

### Requirement: Program scope validation
When `curriculum_course_id` is set, the system SHALL validate that `CourseAssignment.program_id` matches the CurriculumVersion's `program_id`.

#### Scenario: Same program
- **WHEN** assignment program_id matches curriculum's program_id
- **THEN** validation passes

#### Scenario: Different program rejected
- **WHEN** assignment is for BSIT but curriculum is for BSBA
- **THEN** validation fails

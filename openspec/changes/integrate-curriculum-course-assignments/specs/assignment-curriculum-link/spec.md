## ADDED Requirements

### Requirement: Optional curriculum link on CourseAssignment
The system SHALL allow a `curriculum_course_id` to be set on a CourseAssignment at creation time. The field SHALL be nullable. When set, the assignment SHALL validate that `CourseAssignment.course_id === CurriculumCourse.course_id`.

#### Scenario: Create assignment with curriculum link
- **WHEN** Program Head creates a CourseAssignment and selects CurriculumCourse for IT201 from BSIT-2030
- **THEN** `curriculum_course_id` is set on the assignment and `course_id` is prefilled from CurriculumCourse.course_id

#### Scenario: Create assignment without curriculum link
- **WHEN** Program Head creates a CourseAssignment without selecting a CurriculumCourse
- **THEN** `curriculum_course_id` is null and the assignment is created normally

#### Scenario: Course mismatch rejected
- **WHEN** `curriculum_course_id` points to a CurriculumCourse for IT201 but `course_id` is set to IT301
- **THEN** the operation is rejected with a course mismatch error

### Requirement: Legacy null curriculum_course_id fully supported
All queries, reports, and operations SHALL work correctly for CourseAssignments with `curriculum_course_id = null`. No behavior SHALL be gated on the presence of a curriculum link.

#### Scenario: Legacy assignment readable
- **WHEN** viewing a CourseAssignment created before curriculum integration (null curriculum_course_id)
- **THEN** all assignment details are displayed normally

#### Scenario: Legacy assignment roster works
- **WHEN** managing roster for a legacy assignment
- **THEN** roster add/remove/import operate normally

#### Scenario: Legacy assignment evaluation works
- **WHEN** publishing an evaluation for a legacy assignment
- **THEN** evaluation publication succeeds normally

### Requirement: Curriculum link is not mutable after creation
The `curriculum_course_id` SHALL NOT be changeable after CourseAssignment creation. This preserves audit integrity.

#### Scenario: Attempt to change curriculum link
- **WHEN** editing an existing CourseAssignment and attempting to change `curriculum_course_id`
- **THEN** the field is disabled or the change is rejected

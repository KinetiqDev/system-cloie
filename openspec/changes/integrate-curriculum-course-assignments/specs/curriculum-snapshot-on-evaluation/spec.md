## ADDED Requirements

### Requirement: Curriculum context in evaluation publication
When publishing a CourseBoundEvaluation for a CourseAssignment that has `curriculum_course_id` set, the system SHALL include `curriculum_version_id` and `curriculum_course_id` in the evaluation's `course_info_snapshot`.

#### Scenario: Snapshot includes curriculum data
- **WHEN** an evaluation is published for an assignment linked to CurriculumCourse from BSIT-2030
- **THEN** `course_info_snapshot` includes `curriculumVersionId` and `curriculumCourseId`

#### Scenario: Legacy assignment omits curriculum data
- **WHEN** an evaluation is published for an assignment with null `curriculum_course_id`
- **THEN** `course_info_snapshot` does not include curriculum fields

### Requirement: Evaluation snapshots survive curriculum changes
Evaluation snapshots that include curriculum context SHALL NOT be affected by later CurriculumVersion retirement, Course deactivation, or curriculum re-organization.

#### Scenario: Retired curriculum still reflected in snapshot
- **GIVEN** a published evaluation with `curriculumVersionId` pointing to BSIT-2026
- **WHEN** BSIT-2026 is later RETIRED
- **THEN** the evaluation's snapshot still references BSIT-2026 in its stored JSON

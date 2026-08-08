## ADDED Requirements

### Requirement: Retired curriculum remains queryable
RETIRED CurriculumVersions and their CurriculumCourses SHALL remain fully queryable through the API and visible in historical views.

#### Scenario: View retired curriculum
- **WHEN** a user views a historical report for a past academic period
- **THEN** RETIRED CurriculumVersions applicable to that period are included in query results

### Requirement: Inactive course remains in curriculum
A Course marked `is_active = false` that appears in a CurriculumVersion SHALL remain listed in that curriculum. Inactivation SHALL NOT remove it from existing CurriculumVersions.

#### Scenario: Deactivated course remains in published curriculum
- **GIVEN** Course IT201 is deactivated by a Secretary
- **WHEN** viewing the PUBLISHED CurriculumVersion that contains IT201
- **THEN** IT201 is still visible in the curriculum listing with its snapshot data

### Requirement: Course not deletable when referenced by curriculum
The system SHALL block deletion of a Course that is referenced by any CurriculumCourse row. The application-layer guard MUST be expanded to include curriculum references.

#### Scenario: Delete course with curriculum reference rejected
- **WHEN** Secretary attempts to delete Course IT201 that appears in one or more CurriculumVersions
- **THEN** the operation is rejected; the user is advised to deactivate the Course instead

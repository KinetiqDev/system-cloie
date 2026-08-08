## ADDED Requirements

### Requirement: Inactive course assignments remain visible
CourseAssignments referencing a Course with `is_active = false` SHALL remain visible in historical views, rosters, and reports.

#### Scenario: Inactive course assignment in historical list
- **WHEN** Dean views past academic period data that includes assignments for a now-inactive Course
- **THEN** those assignments are displayed normally with course code and title

### Requirement: Retired curriculum assignments remain visible
CourseAssignments linked to a RETIRED CurriculumVersion SHALL remain visible. The retired status SHALL only affect whether the curriculum appears in new-assignment selection pickers.

#### Scenario: Retired curriculum in historical report
- **WHEN** viewing assignments from a past period linked to a now-RETIRED Curriculum
- **THEN** the CurriculumVersion code and Course placements are still displayed

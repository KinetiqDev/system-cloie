## ADDED Requirements

### Requirement: Create DRAFT Curriculum Version
The system SHALL allow a SECRETARY or PROGRAM_HEAD to create a CurriculumVersion with `status = DRAFT` for a Program. A DRAFT CurriculumVersion SHALL be fully editable.

#### Scenario: Create DRAFT for program
- **WHEN** Secretary creates a CurriculumVersion with code "BSIT-2030" for the BSIT program
- **THEN** a new CurriculumVersion is created with status DRAFT and no courses

#### Scenario: Create DRAFT for program with major
- **WHEN** Program Head creates a major-specific CurriculumVersion with `major_id` set
- **THEN** a CurriculumVersion scoped to that major is created

#### Scenario: Program Head scoped to own program only
- **WHEN** a PROGRAM_HEAD attempts to create a CurriculumVersion for a program they are not assigned to
- **THEN** the operation is rejected

### Requirement: Edit DRAFT Curriculum Version metadata
The system SHALL allow a SECRETARY or in-scope PROGRAM_HEAD to update a DRAFT CurriculumVersion's `code`, `name`, and `effective_from_school_year_id`. Editing SHALL NOT change program or major scope, and SHALL be rejected for PUBLISHED and RETIRED versions.

#### Scenario: Update DRAFT metadata
- **WHEN** Secretary changes a DRAFT CurriculumVersion's code from "BSIT-2030" to "BSIT-2031"
- **THEN** the code is updated while status, program, and major remain unchanged

#### Scenario: Clear optional metadata
- **WHEN** Secretary clears a DRAFT CurriculumVersion's name and effective school year
- **THEN** both values are stored as null

#### Scenario: Edit published version rejected
- **WHEN** Secretary attempts to update the metadata of a PUBLISHED CurriculumVersion
- **THEN** the operation is rejected with "Published curricula are immutable"

#### Scenario: Code collision rejected
- **WHEN** Secretary sets a DRAFT's code to a code already used by another version of the same program
- **THEN** the operation is rejected with a code-conflict message

### Requirement: Publish Curriculum Version
The system SHALL allow publishing a DRAFT CurriculumVersion. Published CurriculumVersions SHALL be immutable. Publication SHALL require at least one CurriculumCourse.

#### Scenario: Publish DRAFT with courses
- **WHEN** Secretary publishes a DRAFT CurriculumVersion that has at least one CurriculumCourse
- **THEN** status changes to PUBLISHED, `published_at` and `published_by` are recorded, and the version becomes immutable

#### Scenario: Publish empty DRAFT rejected
- **WHEN** Secretary attempts to publish a CurriculumVersion with zero CurriculumCourses
- **THEN** the operation is rejected with "A curriculum must contain at least one course"

#### Scenario: Edit published version rejected
- **WHEN** Secretary attempts to modify a PUBLISHED CurriculumVersion or its CurriculumCourses
- **THEN** the operation is rejected with "Published curricula are immutable"

### Requirement: Clone Curriculum Version
The system SHALL allow cloning a PUBLISHED or RETIRED CurriculumVersion into a new DRAFT. The clone SHALL copy all CurriculumCourse rows with their placements and snapshots.

#### Scenario: Clone published to create new draft
- **WHEN** Secretary clones a PUBLISHED CurriculumVersion "BSIT-2026"
- **THEN** a new DRAFT CurriculumVersion is created with identical CurriculumCourse entries; original remains unchanged

### Requirement: Retire Curriculum Version
The system SHALL allow retiring a PUBLISHED CurriculumVersion. RETIRED versions SHALL be immutable and not selectable for new CourseAssignments but SHALL remain fully queryable.

#### Scenario: Retire published version
- **WHEN** Secretary retires a PUBLISHED CurriculumVersion
- **THEN** status changes to RETIRED; the version is no longer offered in assignment-creation Curriculum pickers

#### Scenario: Retired version still readable
- **WHEN** a Dean views historical reports for a period when a now-RETIRED Curriculum was active
- **THEN** the retired CurriculumVersion and its courses are still visible

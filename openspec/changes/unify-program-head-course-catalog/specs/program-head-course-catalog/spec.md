# Program Head Course Catalog

## ADDED Requirements

### Requirement: Program-Scoped Course Listing
The Program Head course catalog SHALL list only courses owned by the selected program with `course_scope = PROGRAM_SPECIFIC` (both active and archived). General Education courses assigned to the program SHALL NOT be listed on this page.

#### Scenario: Listing courses for selected program
Given a Program Head viewing the course catalog for their program
When the catalog loads
Then only courses with `program_id = selected program id` and `course_scope = PROGRAM_SPECIFIC` are displayed
And no General Education courses appear in the listing regardless of course assignments.

---

### Requirement: Catalog Filter Bar
The catalog SHALL provide a filter bar containing a Status filter (Select dropdown), Major filter (Select dropdown, displayed when active majors exist for the program), and Search input.

#### Scenario: Status filtering
Given a list of program-specific courses
When the user selects "Active" from the Status filter
Then only active courses (`is_active = true`) are shown.
When the user selects "Archived" from the Status filter
Then only archived courses (`is_active = false`) are shown.
When the user selects "All Statuses"
Then both active and archived courses are shown.

#### Scenario: Major filtering
Given a program with active majors
When the user selects a specific major from the Major filter
Then only courses assigned to that major are shown.

#### Scenario: Search input
Given a list of program-specific courses
When the user enters text into the search input
Then courses are filtered by case-insensitive code or title substring match.

---

### Requirement: Table Layout and Schedule Columns
The catalog table SHALL display the following columns in order: Course, Course Title, Major, Year Level, Semester, Term, Status, Last Updated, Actions.

#### Scenario: Column data formatting
Given a course row in the table
Then the Course column displays the course code in bold (and on mobile viewports, stacks course title, status badge, and major name)
And the Major column displays the major name or "—" if program-wide
And the Year Level column displays the year level display label (e.g., "1st Year") or "—" if unset
And the Semester column displays the semester label (e.g., "1st Semester") or "—" if unset
And the Term column displays the term label (e.g., "1st Term") or "—" if unset
And the Status column displays an Active or Inactive badge
And the Actions column presents Edit and Archive/Restore action buttons unconditionally.

---

### Requirement: Design System Table Presentation
The catalog table SHALL use canonical `Table` components wrapped in an `overflow-x-auto rounded-lg border` container without capsule tab buttons or a Type column.

#### Scenario: Canonical presentation
Given the course catalog surface
Then the table headers use plain `TableHead` styling
And no scope capsule tab buttons ("All", "Program-Wide", "Gen Ed", etc.) are rendered
And no "Type" column is rendered.

---

### Requirement: Summary Statistics Cards
The catalog surface SHALL render summary cards for Total Courses, Program-Wide, Major-Specific, and Archived counting only the program's program-specific courses.

#### Scenario: Summary counts
Given program-specific courses in the catalog
Then Total Courses reflects active program-specific courses
And Program-Wide reflects active program-specific courses without a major
And Major-Specific reflects active program-specific courses with a major
And Archived reflects inactive program-specific courses
And no Gen Ed summary card is displayed.

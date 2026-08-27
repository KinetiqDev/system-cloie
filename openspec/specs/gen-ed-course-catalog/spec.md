# gen-ed-course-catalog Specification

## Purpose

TBD - created by archiving change transfer-ilo-catalog-to-gen-ed-coordinator. Update Purpose after archive.

## Requirements

### Requirement: General Education Coordinator manages the college-wide General Education course catalog

The system SHALL provide a `GEN_ED_COORDINATOR`-owned catalog at `/gen-ed-coordinator/courses` listing and managing **only** Courses where `course.course_scope == GENERAL_EDUCATION`. The list is college-wide: `course.program_id` and `course.major_id` remain `null`. The catalog SHALL support create, edit, archive, restore, page-bound multi-selection, bulk archive, bulk restore, search by `code`/`title`, status filtering, and pagination.

#### Scenario: Coordinator views and filters GE courses

- **GIVEN** an authenticated user has active role `GEN_ED_COORDINATOR`
- **WHEN** the user visits `/gen-ed-coordinator/courses`
- **THEN** the server returns only `GENERAL_EDUCATION` courses ordered by `code asc`, including archived Courses, and the client supports search, status filters, and 15-row pagination

#### Scenario: Coordinator creates or edits a GE course

- **GIVEN** the Coordinator opens the create or edit flow
- **WHEN** they submit valid Course code, title, and catalog defaults
- **THEN** the server writes a Course with `course_scope == GENERAL_EDUCATION`, `program_id == null`, and `major_id == null`; client input cannot widen or change that scope

#### Scenario: Coordinator archives or restores selected courses

- **GIVEN** the Coordinator selects up to 100 visible Courses on the current page
- **WHEN** they choose Archive or Restore
- **THEN** each Course is independently reloaded and constrained by `course_scope == GENERAL_EDUCATION`, the result reports succeeded and failed counts, and selection clears after completion

#### Scenario: Program-specific courses are excluded and immutable

- **GIVEN** the catalog contains `PROGRAM_SPECIFIC` courses
- **WHEN** a Coordinator loads the catalog or submits a forged Course ID to create, edit, archive, restore, or a bulk action
- **THEN** Program-specific data is not returned and no Program-specific Course is mutated

#### Scenario: Empty GE catalog

- **GIVEN** no General Education Courses exist
- **WHEN** the page renders
- **THEN** it shows `No courses found.` and an `Add Course` action

### Requirement: GE course catalog is role-owned and fails closed

The `/gen-ed-coordinator/courses` route SHALL be guarded by `SessionGuard allowedRoles=[GEN_ED_COORDINATOR]` (`src/app/(app)/gen-ed-coordinator/layout.tsx:5`). The backing service `listGenEdCourses` SHALL verify `resolveAuthSession().activeRole===GEN_ED_COORDINATOR` server-side; any other role or unauthenticated request SHALL receive no course data.

#### Scenario: Another role requests GE courses

- **GIVEN** an authenticated user has role `SECRETARY`/`PROGRAM_HEAD`/`FACULTY`/etc.
- **WHEN** they request `/gen-ed-coordinator/courses`
- **THEN** the server denies with `redirect("/unauthorized")` and the service returns `{success:false, error}` / throws `GenEdDashboardUnauthorizedError`-class handling

#### Scenario: Unauthenticated request

- **GIVEN** no valid Supabase session
- **WHEN** the request reaches `/gen-ed-coordinator/courses`
- **THEN** the system redirects to the portal (`/portal/respondents`) without rendering protected data in a loading fallback

### Requirement: GE course catalog UI preserves PWA responsive behavior

The catalog UI SHALL reuse `AppShell` (`max-w-[1600px]`, `p-4 sm:p-6`), shadcn `Table` inside `overflow-x-auto`, semantic tokens (`bg-card`/`border-border`/`text-muted-foreground`), and meet PWA touch/overflow rules (no unintended horizontal scroll, `min-h-11` touch targets, `pb-safe`).

#### Scenario: Mobile viewport

- **GIVEN** the Coordinator views at 375px width
- **WHEN** the table renders
- **THEN** secondary columns collapse to a stacked card-like row (code + title + badges), filter bar stacks, and the page remains usable without horizontal overflow

#### Scenario: Desktop viewport

- **GIVEN** the Coordinator views at 1280px width
- **WHEN** the table renders
- **THEN** full columns (`Course`/`Course Title`/`Status`/`Last Updated`) render, `TableHead`/`TableRow` hover uses semantic hover tokens, and stats grid uses `grid-cols-2 md:grid-cols-4`

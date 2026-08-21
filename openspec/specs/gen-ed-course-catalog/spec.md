# gen-ed-course-catalog Specification

## Purpose
TBD - created by archiving change transfer-ilo-catalog-to-gen-ed-coordinator. Update Purpose after archive.
## Requirements
### Requirement: General Education Coordinator has a read-only college-wide General Education course catalog
The system SHALL provide a `GEN_ED_COORDINATOR`-owned read-only catalog at `/gen-ed-coordinator/courses` listing **only** Courses where `course.course_scope == GENERAL_EDUCATION` (`prisma/models/course-assignments.prisma:10-13,57-82`). The list is college-wide (no `programId` filter, `course.program_id` is `null` for GE). The catalog SHALL support search by `code`/`title`, status filter (`All Statuses`/`Active`/`Archived`), and pagination. No Course create, edit, archive, or restore controls SHALL be present in this slice.

#### Scenario: Coordinator views GE courses
- **GIVEN** an authenticated user has active role `GEN_ED_COORDINATOR`
- **WHEN** the user visits `/gen-ed-coordinator/courses`
- **THEN** the server returns only `GENERAL_EDUCATION` courses ordered by `code asc`, each row shows `code`, `title`, `is_active` badge, `updated_at`, and `cilos` active count; the header shows `Scope College-Wide General Education` and stat cards `Total`/`Archived`

#### Scenario: Program-specific courses are excluded
- **GIVEN** the catalog contains `PROGRAM_SPECIFIC` courses (e.g., BSED/BSED-owned)
- **WHEN** the GE Coordinator loads `/gen-ed-coordinator/courses`
- **THEN** those rows are not returned, even if the request supplies a forged query param

#### Scenario: Filtering and pagination
- **GIVEN** the catalog holds ≥16 GE courses (e.g., `GESTECH`, `GEETHICS`, `GEMATH`, `GEUS`, `NSTP1` …)
- **WHEN** the Coordinator types a search query, changes status filter, or navigates pages
- **THEN** the client filters locally (search case-insensitive `code`/`title`, status `active`/`archived`), paginates `PAGE_SIZE=15`, updates `filtered count`, and preserves URL-independent server truth

#### Scenario: Empty GE catalog
- **GIVEN** `prisma.course.count({where:{course_scope:GENERAL_EDUCATION, is_active:true}})` is zero
- **WHEN** the page renders
- **THEN** it shows `No courses found.` in the table body, not a Create CTA (create is out of scope)

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


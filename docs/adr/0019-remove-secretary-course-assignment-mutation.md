# Removing Secretary Course Assignment Mutation

After ADR 0018 removed Secretary authority over General Education assignments,
assignment mutation stayed split: Secretaries kept mutating Program-specific
assignments while a server policy denied only the General Education half, and
the Secretary screen still advertised management the server rejected.

Decided: the Secretary holds **no** Course assignment mutation at all. General
Education assignments are stewarded college-wide by the General Education
Coordinator (`course.course_scope == GENERAL_EDUCATION` predicate inside server
services). Program-specific assignments are stewarded by the owning program's
Program Head within their Authorized Program set. The Dean retains all-program
stewardship of both kinds. The Secretary keeps read-only visibility; the
`/secretary/course-assignments` route, its navigation entry, and its inventory
entries were removed, and the Secretary was dropped from the bulk-create
allowlist.

Rationale: one accountable owner per assignment kind, and no UI advertising
actions the server denies.

## Consequences

- `canManageCourseAssignment` denies every Secretary request; the reason string
  is the single source for client messaging.
- Roster deep links that previously returned Secretaries to
  `/secretary/course-assignments` now return to `/secretary/dashboard`.

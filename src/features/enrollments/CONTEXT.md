# Enrollments

Enrollments define the per-term student ledger that places each student into a program, year level, and section for one academic term instance, scoping students for class rosters and evaluation targeting.

## Ledger

**Student enrollment**:
One student's placement in a program, year level, and section for a single term instance. Unique per student + term, so one student holds at most one enrollment per term; year level and section live here, while the static academic profile keeps only the program/major affiliation.
_Avoid_: Class membership, course assignment membership

**Enrollment source**:
The provenance of an enrollment row: `ONBOARDING` (student self-service onboarding), `ROLLOVER` (term rollover), or `SECRETARY` (admin-created). Onboarding upserts are restricted to the `ONBOARDING` source; secretary upserts may use any source.
_Avoid_: Import origin, registration channel

## Lifecycle

**Enrollment upsert**:
The operation that, for the same student + term, updates the existing row in place and forces `is_active` true; otherwise it creates a new row. The onboarding flow upserts only the active term, while the secretary flow can upsert any term.
_Avoid_: Merge, replace

**Soft deactivation**:
Enrollments are deactivated (`is_active` false) rather than deleted, preserving history. Bulk deactivation accompanies removing a student's academic context.
_Avoid_: Delete enrollment, hard removal

## Lookup

**Class lookup**:
Roster preview keyed by term instance + program + year level, optionally narrowed by section and major; it returns active enrollments as student records whose name is the canonical opaque account name per ADR 0014. Publication flows use it to target respondents.
_Avoid_: Full roster export, directory query

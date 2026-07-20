# Course-Assignment Roster Membership

## Context

`StudentEnrollment` is the term-placement ledger. It records a Student's program, year level, section, and active placement for an academic period, and its one-placement-per-period rule is intentional. It cannot represent the set of Courses a Student takes because a Student may take multiple Courses in the same academic period.

The Course roster must therefore be explicit and independently auditable. Course-bound evaluation recipients must follow the managed Course-assignment roster rather than being inferred from the term-placement ledger.

## Decision

1. Introduce `CourseAssignmentMembership` as the durable Course-roster record. It is separate from `StudentEnrollment` and carries the Course assignment scope needed to prevent cross-section drift.
2. Seed development memberships explicitly. There is no production backfill and no inference from existing term placements, historical evaluations, or mock enrollment rows.
3. Use active Course-assignment memberships as the future source of Course-bound evaluation recipients. `StudentEnrollment` remains an eligibility prerequisite for adding or restoring membership and for current participation eligibility.
4. Resolve current eligibility dynamically from account status, Student role, completed profile, and active term placement. Existing memberships are retained when those conditions later become false; current ineligible members are excluded from current evaluation eligibility rather than silently removed.
5. Keep ordinary roster writes locked after a Course-bound evaluation is published. Evaluation-specific exclusions and late inclusion are separate durable behavior for the later exclusion slice and do not change roster membership.
6. Treat missing and unauthorized Course-assignment roster detail as the same not-found result. Server-side authorization uses the active portal role and assignment ownership/scope; client input never supplies authority or audit actors.

## Consequences

- A Student can be active in multiple Course rosters during one academic period.
- The database enforces one durable membership per Course assignment and Student and one active membership across sections for a Student, Course, academic period, and assignment program.
- Removing a membership preserves its audit row for restoration and history. Assignment deletion cascades membership history only when the assignment is otherwise eligible for permanent deletion.
- Course-bound publication and dynamic pending participation must use the shared roster and eligibility seams established by the follow-up slices.
- Clarification 10 of ADR 0003 is superseded only for Course-bound roster sourcing and CSV roster work. The remaining Course catalog and assignment decisions in ADR 0003 remain in force.

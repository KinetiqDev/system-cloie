## Why

Faculty receives official class lists containing Student names, while System CLOIE currently requires account email addresses for Course roster entry. At the same time, System CLOIE collects an unverified, Student-entered `student_id_number` and incorrectly uses its presence as a roster-eligibility completeness check; names and Student ID must therefore be treated neither as durable identity nor as authority.

## What Changes

- **BREAKING:** Remove `student_id_number` from Student academic profiles, onboarding, Secretary account management, profile and evaluation UI, validation, DTOs, eligibility checks, fixtures, generated Supabase types, and active documentation. Existing values are discarded without replacement.
- Replace email-based Course roster CSV input with a name-based, preview-first reconciliation workflow. Initial upload never mutates `CourseAssignmentMembership`.
- Parse one `name`/`Student Name` CSV column with standard quoting, UTF-8 support, at most 100 source rows, and independent resolution for repeated names.
- Resolve uploaded names against an assignment-authorized, eligibility-aligned Student candidate pool using strict normalized equality and conservative, explainable suggestion rules. Names remain lookup inputs; `User.id` remains durable identity.
- Require Faculty reconciliation for ambiguity and explicit skips for unresolved rows. Suggested matches use one final acknowledgement; unique strict matches may be preselected.
- Replace manual email entry with bounded, assignment-scoped Student search that selects `User.id` and uses the same server-owned candidate and eligibility rules.
- Confirm resolved identities through server reauthorization, batch request validation, and short row transactions that recheck roster mutability, account/profile/placement eligibility, restoration, and other-section conflicts.
- Preserve partial success for expected row outcomes, stop on unexpected infrastructure failure, and return privacy-safe results plus a name-oriented failed-row export without candidate emails.
- Preserve explicit `CourseAssignmentMembership` sourcing for Course-bound evaluation recipients; name matching never enters evaluation publication or response eligibility.
- Add ADR 0015 and update Identity and Access and Course Catalog and Assignments language to record the new identity-resolution boundary and Student ID removal.

## Capabilities

### New Capabilities
- `course-roster-name-resolution`: Name CSV parsing, assignment-scoped candidate discovery, explainable resolution states, reconciliation, and preview behavior.
- `course-roster-identity-confirmation`: Identity-based confirmation, stale-data revalidation, partial row outcomes, safe failure handling, and manual Student search/add.
- `student-id-deprecation`: Complete removal of the unverified Student ID field and its former completeness semantics through compatibility-safe deployment gates.

### Modified Capabilities
- `canonical-user-name`: Clarify that canonical `User.name` is opaque display text that may be normalized temporarily for authorized candidate discovery but is never parsed, overwritten, or persisted as a roster identity key.
- `course-roster-management-workspace`: Replace the two-phase immediate-write email workflow with Add members, Review and resolve, and Results while preserving responsive Dialog/Drawer behavior and session-only state.

## Impact

- **Classification:** feature plus breaking data-model removal.
- **Affected contexts:** Identity and Access; Course Catalog and Assignments; Evaluations and Deployments as a preserved integration boundary; Design System for the responsive reconciliation workspace.
- **Affected modules:** Prisma identity schema; Supabase migration and generated types; Student onboarding/deferred onboarding/profile; Secretary create/edit services and forms; Student enrollment projections; Course roster parser, policies, types, reads, mutations, actions, UI, and tests; evaluation respondent preview DTOs/UI; seed/demo fixtures; active specs, ADRs, glossaries, and user journeys.
- **Database:** code-first compatibility release removes every application read/write before a later generated migration drops `student_academic_profiles.student_id_number`; historical migrations remain unchanged.
- **Authorization:** server-side role, Faculty ownership, Secretary/Dean authority, Program Head selected-Program scope, assignment lifecycle, and publication locks remain mandatory. Confirmation rejects arbitrary IDs outside the server-recomputed candidate scope.
- **Privacy:** candidate and result data remains request/component-session scoped and uncached. Interactive search returns at most 10 scoped results for a query of at least two normalized characters. Logs and failed exports omit uploaded/candidate emails by default.
- **Caching and dependencies:** no shared cache, preview persistence, database draft, client data-fetching library, or new matching dependency is proposed.
- **Unchanged invariants:** `User.id` is durable account identity; `User.name` remains canonical opaque account text; `StudentEnrollment` remains period placement and never implies Course membership; `CourseAssignmentMembership` remains the explicit roster and Course-bound evaluation recipient source; existing membership audit/restoration and SQL conflict constraints remain authoritative.
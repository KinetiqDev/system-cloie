# Name-Based Course Roster Resolution and Student ID Removal

## Status

Proposed

## Context

Faculty receives official Course rosters as Student names, but System CLOIE currently requires account emails. `student_id_number` is Student-entered free text with no authoritative institutional verification or database identity constraint, yet roster eligibility incorrectly uses its presence as a profile-completeness proxy. Canonical `User.name` is culturally opaque display text under ADR 0014, and explicit Course-assignment membership is the Course-bound recipient source under ADR 0007.

## Decision

Faculty-provided names are identity-resolution inputs, not durable identifiers. System CLOIE resolves names only within an authorized Course-assignment candidate scope, preserves ambiguity for human reconciliation, and confirms selected internal `User.id` values. Canonical account names are never overwritten, parsed into semantic parts, made unique, or persisted in normalized form. `CourseAssignmentMembership.student_user_id` remains the authoritative explicit Course roster and the only roster identity consumed by Course-bound evaluation publication.

System CLOIE will no longer collect or store Student ID because no authoritative institutional source verifies Student-entered values. Existing values may be discarded. `StudentAcademicProfile` remains required and owns stable Program and applicable Major affiliation; `StudentEnrollment` remains active-period placement. Student ID removal uses a code-first compatibility release before a generated contract migration drops the column.

Name resolution is preview-first. Parsing and candidate discovery perform no membership mutation. Unique strict-normalized matches may be prepared automatically; conservative middle-token, initial, punctuation, suffix, or diacritic differences are suggestions rather than identity proof; same-name and uncertain cases require Faculty reconciliation. Final writes reauthorize and revalidate current account, profile, placement, assignment scope, membership, and conflict state using internal identities.

## Considered Options

- Continue email input: rejected because it does not match the official roster workflow and shifts account discovery to Faculty.
- Use Student ID: rejected because System CLOIE cannot verify ownership or correctness.
- Treat names as unique or persist normalized names: rejected because names collide and ADR 0014 defines one opaque canonical account name.
- Infer Course rosters from `StudentEnrollment`: rejected because placement is not Course membership and ADR 0007 requires explicit memberships.
- Persist roster-import drafts: rejected because refresh recovery does not justify new private durable state, cleanup, expiry, and authorization machinery.

## Consequences

- Name matching stops at the Course roster boundary; evaluation publication never reruns it.
- Authorized managers may see ACD email and academic context for disambiguation, but interactive disclosure is bounded and failed exports omit candidate email.
- Irregular Students remain resolvable because year level and section rank candidates but do not define eligibility.
- Preview progress is lost on refresh or confirmed discard; this is an intentional simplicity and privacy tradeoff.
- ADR 0001 is superseded only where Student role completeness requires Student ID.
- ADR 0014 is superseded only where it states roster eligibility and Student academic identity are unchanged; its canonical opaque-name authority remains controlling.
- ADR 0007 remains controlling for explicit membership, audit/restoration, conflicts, and Course-bound evaluation recipient sourcing.

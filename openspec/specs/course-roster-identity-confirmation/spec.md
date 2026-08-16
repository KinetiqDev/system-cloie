# Course Roster Identity Confirmation

## Purpose

Define how an authorized Course roster manager confirms name-resolved Students by durable account identity while preserving roster lifecycle, current-state authorization, partial-success, and privacy constraints.

## Requirements

### Requirement: Confirmation accepts internal identities, not names or emails

Final bulk confirmation SHALL identify actionable rows by source index and selected `User.id`, carry explicit skipped source indexes, and SHALL not treat uploaded names, account names, or email addresses as mutation authority.

#### Scenario: Valid reconciled rows are submitted

- **GIVEN** the manager has resolved and acknowledged all actionable rows
- **WHEN** confirmation is submitted
- **THEN** System CLOIE SHALL validate the internal identities against current assignment scope before any membership write

#### Scenario: Malicious client submits arbitrary User ID

- **GIVEN** a client submits a Student `User.id` that was not in the server-recomputed candidate scope
- **WHEN** confirmation is validated
- **THEN** System CLOIE SHALL reject that row without membership mutation even if the account is otherwise active

### Requirement: Duplicate selected identities fail before mutation

The same `User.id` SHALL NOT be selected for multiple source rows in one confirmation. Any duplicate selection SHALL reject the whole confirmation before membership changes and identify every implicated row safely.

#### Scenario: Two names select one account

- **GIVEN** source rows 4 and 9 both select the same `User.id`
- **WHEN** confirmation preflight runs
- **THEN** System CLOIE SHALL perform zero membership writes and SHALL require the manager to remap or skip one row

### Requirement: Confirmation revalidates authority and current business state

Before confirmation completes, System CLOIE SHALL require the active role, assignment ownership/scope, selected Program context, and a mutable active Course assignment and Academic Period without a published Course-bound evaluation lock. Each submitted identity SHALL be assessed against current Student, account, profile, placement, scope, Program, membership, restoration, and other-section-conflict state.

#### Scenario: Roster becomes read-only after preview

- **GIVEN** a Course-bound evaluation is published after preview and before confirmation
- **WHEN** confirmation starts
- **THEN** System CLOIE SHALL return a request-level read-only result and SHALL perform zero row writes

#### Scenario: Student leaves candidate scope after preview

- **GIVEN** a selected Student changes Program or placement before confirmation
- **WHEN** that row is revalidated
- **THEN** System CLOIE SHALL return the current safe row reason, SHALL not substitute another name match, and MAY continue later valid rows

#### Scenario: Account becomes inactive after preview

- **GIVEN** a selected account becomes inactive after preview
- **WHEN** the row is processed
- **THEN** System CLOIE SHALL return `ACCOUNT_INACTIVE` without creating or restoring membership

### Requirement: Membership writes preserve lifecycle and audit semantics

A new valid identity SHALL create a `CourseAssignmentMembership` with current actor provenance. A valid inactive membership for the same assignment SHALL be restored while preserving original creation provenance. An active membership SHALL return `ALREADY_ACTIVE`. A membership active in another section for the same Course, Academic Period, and Program SHALL remain unchanged and return `OTHER_SECTION_CONFLICT`.

#### Scenario: Removed membership is restored

- **GIVEN** preview disposition is `WILL_RESTORE` and the Student remains eligible and conflict-free
- **WHEN** confirmation processes the row
- **THEN** System CLOIE SHALL restore the existing membership, preserve creator/creation time, and record the current updater

#### Scenario: Other-section conflict appears concurrently

- **GIVEN** another manager adds the Student to a conflicting section after preview
- **WHEN** confirmation processes the target row
- **THEN** System CLOIE SHALL prevent the target membership and return `OTHER_SECTION_CONFLICT`

### Requirement: Expected row outcomes permit partial success

Confirmation SHALL process accepted identities independently. Expected current business outcomes SHALL not roll back completed writes or prevent later rows. An unexpected infrastructure failure SHALL preserve completed writes, mark the failing row `UNEXPECTED_FAILURE`, mark remaining rows `UNPROCESSED`, stop processing, and return one opaque support reference.

#### Scenario: One row conflicts and another is valid

- **GIVEN** one selected Student has an other-section conflict and the next remains valid
- **WHEN** confirmation processes both rows
- **THEN** System CLOIE SHALL report the conflict and SHALL still create or restore the later valid membership

#### Scenario: Unexpected service failure occurs

- **GIVEN** earlier rows have completed and an unexpected service failure occurs on a later row
- **WHEN** confirmation stops
- **THEN** earlier successful outcomes SHALL remain effective, the manager SHALL receive only a safe failure result, and later unattempted rows SHALL be `UNPROCESSED`

### Requirement: Manual add uses bounded scoped identity search

Manual roster add SHALL replace faculty-entered email with the shared assignment-scoped candidate search. Selecting a candidate and invoking Add SHALL submit `User.id` to the same identity-based authorization and mutation rules without requiring a second preview screen.

#### Scenario: Same-name manual results exist

- **GIVEN** several scoped Students match the manager's query
- **WHEN** manual search returns results
- **THEN** System CLOIE SHALL show each authorized canonical name, ACD email, Program, year level, section, and applicable Major and SHALL require explicit account selection

#### Scenario: Crafted manual add ID is out of scope

- **GIVEN** a client bypasses search and submits an out-of-scope `User.id`
- **WHEN** Add is invoked
- **THEN** System CLOIE SHALL reject it without membership mutation

### Requirement: Results and failed export are actionable and private

Final results SHALL remain visible until the workspace closes and SHALL separate identity resolution from membership outcomes. Failed export SHALL contain source row, uploaded name, safe status, and safe error plus optional non-email academic context; it SHALL exclude internal UUIDs, candidate emails, alternative-candidate lists, raw exceptions, and support references.

#### Scenario: Repeated names fail differently

- **GIVEN** two identical uploaded names have different final outcomes
- **WHEN** failed rows are exported
- **THEN** their original source row numbers SHALL distinguish them

#### Scenario: Unexpected failure has a safe support reference

- **GIVEN** confirmation produces an opaque support reference
- **WHEN** the manager receives the final result
- **THEN** System CLOIE SHALL provide the opaque support reference without exposing uploaded names, emails, or internal identifiers

### Requirement: Failure diagnostics preserve roster-input privacy

Unexpected-failure diagnostics SHALL omit uploaded names, candidate emails, alternative-candidate lists, raw exceptions, and row-level support references.

#### Scenario: Support investigates an unexpected failure

- **GIVEN** a manager received an opaque support reference for an unexpected failure
- **WHEN** authorized support investigates that reference
- **THEN** the diagnostics SHALL not disclose uploaded names, candidate emails, alternative candidates, raw exceptions, or row-level support references

### Requirement: Course-bound evaluation integration remains membership-based

After confirmation, Course-bound respondent preview, publication, assignments, and current participation eligibility SHALL continue using `CourseAssignmentMembership.student_user_id` and SHALL never rerun name matching or infer Course membership from `StudentEnrollment`.

#### Scenario: Course-bound evaluation is published

- **GIVEN** confirmed active Course-assignment memberships exist
- **WHEN** an authorized publisher publishes the Course-bound evaluation
- **THEN** System CLOIE SHALL create respondent assignments from active membership `student_user_id` values subject to existing exclusion and eligibility rules

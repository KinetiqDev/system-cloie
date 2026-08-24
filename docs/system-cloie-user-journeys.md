# System CLOIE User Journeys

This document describes the end-to-end operational journeys in System CLOIE for Assumption College of Davao. It combines the current application behavior, accepted architectural decisions, and known planned or incomplete work.

Status labels used below:

- **Implemented**: supported by the current application code and route model.
- **Partial**: a usable path exists, but a material rule, screen, verification layer, or administrative transition is incomplete.
- **Deferred / planned**: intentionally unavailable, stubbed, or still awaiting a product or policy decision.

The accepted decisions in `openspec/config.yaml`, `CONTEXT-MAP.md`, `src/features/*/CONTEXT.md`, and `docs/adr/` take precedence over older PRD/SRS wording. In particular, CLOIE uses explicit permissions rather than role impersonation, accounts have one active role, and the Dean has read-only oversight for outcome and enrollment views even though the Dean shares selected catalog and roster operations with the Secretary.

## 1. System-Wide Entry Rules

### 1.1 Public entry and authentication

1. A person opens the role selection portal rather than a role-less login page.
2. The person chooses one intended role from the staff or respondent portal.
3. CLOIE records the intended role and starts Google OAuth.
4. Google authenticates the identity. CLOIE normalizes the account email by trimming whitespace and lowercasing it.
5. CLOIE resolves the domain user record, links the Google identity to the existing domain account when applicable, resolves the single active CLOIE account role, and evaluates the role-specific profile gate.
6. The person is sent to the requested route, role dashboard, onboarding, or an account-status page.

Google OAuth is the primary Production authentication mechanism. CLOIE does not use CLOIE-managed passwords, magic links, or ordinary email invitations. A domain user can be provisioned before first sign-in; the first Google sign-in must match the registered normalized email.

### 1.2 Role eligibility

| Role             | Entry model                                                   | Email rule                                 | Required setup before dashboard access                                           |
| ---------------- | ------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------- |
| Secretary        | Pre-provisioned, except the one-time bootstrap Secretary path | Exact ACD institutional domain             | Active account and Secretary role                                                |
| College Dean     | Pre-provisioned                                               | Exact ACD institutional domain             | Active account and Dean role                                                     |
| Program Head     | Pre-provisioned                                               | Exact ACD institutional domain             | Active account, Program Head role, and active Program Head assignment            |
| Faculty Member   | Self-service role claim or Secretary-created account          | Exact `@acd.edu.ph` or `@acdeducation.com` | Faculty role and active Faculty Program affiliation                              |
| Student          | Self-service role claim or Secretary-created account          | Exact `@acd.edu.ph` or `@acdeducation.com` | Student profile and active-term enrollment, unless deferred                      |
| Alumni           | Self-service role claim or Secretary-created account          | Any valid email domain                     | Alumni profile; external verification applies to self-service accounts           |
| Industry Partner | Self-service role claim or Secretary-created account          | Any valid email domain                     | Industry Partner profile; external verification applies to self-service accounts |

The role selection portal rejects a self-service claim for Secretary, Dean, or Program Head with `pre-provisioning-required`. Internal role claims with a non-ACD email reach the invalid-domain status page. There is no self-service role switching or role stacking. A role change is administrator-controlled and must satisfy the target role's requirements.

### 1.3 Account states and destinations

| State                     | User journey                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role selection required   | The person chooses a role and continues through Google OAuth.                                                                                                                                     |
| Role mismatch             | The selected portal role differs from the account role; CLOIE stops the request rather than switching roles.                                                                                      |
| Role onboarding required  | The person completes the missing Faculty, Student, Alumni, or Industry Partner profile.                                                                                                           |
| Deferred enrollment       | A Student profile exists but no active academic term enrollment exists. The Student may see the dashboard and a warning but cannot participate in evaluation work that requires active placement. |
| Pending external account  | A self-service Alumni or Industry Partner profile exists with pending verification. The current UI shows a verification banner; pending accounts are not currently blocked by the profile gate.   |
| Rejected external account | A rejected Alumni or Industry Partner is sent to the rejected status page and cannot enter the role dashboard.                                                                                    |
| Inactive account          | An administrator-disabled account is blocked regardless of role, profile, verification, or enrollment state.                                                                                      |
| Complete                  | The account enters its role-owned dashboard.                                                                                                                                                      |

The status pages explain invalid domains, pre-provisioning, role mismatch, inactivity, and rejected external access without exposing internal account details. Legal acknowledgement is required before the OAuth flow where the legal flow applies.

### 1.4 Demo and development entry

The isolated dedicated demo deployment may offer a role switcher backed by a short-lived signed demo session. The server re-resolves the seeded user and applies the normal role, account-state, program-scope, roster, respondent-eligibility, and mutation rules. The primary Production deployment remains OAuth-only. The development-only `cloie_dev_auth` path is not a Production authentication path.

## 2. Foundation Workflow: Secretary

The Secretary is the primary institutional setup and record-stewardship role. The Secretary's journey normally occurs before faculty, Program Head, and respondent activity.

### 2.1 Bootstrap and account administration

1. The first real Secretary is created through the one-time bootstrap path.
2. The Secretary opens `/secretary/users` and reviews the paginated user list and user KPIs.
3. The Secretary creates complete accounts through one dynamic form at `/secretary/users/new`.
4. The Secretary selects exactly one account role and enters the role-specific required information.
5. CLOIE validates the email domain, duplicate email, program/major relationship, and role requirements before writing anything.
6. CLOIE atomically creates the domain `User`, one `UserRole`, and the required role-specific record.
7. The new account is active immediately. The user later enters through Google OAuth using the exact registered email.

Secretary-created account requirements:

| Created role      | Information recorded at creation                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secretary or Dean | First name, last name, ACD email                                                                                                                     |
| Program Head      | First name, last name, ACD email, exactly one managed program                                                                                        |
| Faculty           | First name, last name, ACD email, one primary Faculty Program affiliation                                                                            |
| Student           | Provisional account name, ACD email, program, year level, section, and major when the selected program has active majors                              |
| Alumni            | First name, last name, valid email, program, graduation year, and major when the selected program has active majors; verification starts as approved |
| Industry Partner  | First name, last name, valid email, company or organization, optional position, optional affiliated program; verification starts as approved         |

For a Secretary-created Student, an active academic term produces a `SECRETARY`-sourced `StudentEnrollment` in the same transaction. If no active term exists, CLOIE creates the static Student academic profile and leaves the Student in deferred enrollment. The selected program dynamically controls whether a major is required.

The Secretary can also:

- Activate or deactivate another account, but cannot deactivate or alter the Secretary's own account through these controls.
- Edit Student academic identity and current placement through protected account-edit flows.
- Add or deactivate Faculty Program affiliations after initial creation.
- Add or deactivate Program Head assignments after initial creation.
- Maintain Industry Partner profiles.
- Assign or revoke roles subject to dependent-record preconditions.
- Create and update external stakeholder invite drafts with `DRAFT`, `SENT`, `ACCEPTED`, or `REVOKED` status. This is an administrative record, not an email invitation delivery workflow.
- Perform managed Student-to-Alumni graduate transitions while retaining historical Student profile, enrollment, and evaluation records.

Protected edits that change academic history, current placement, managed program responsibility, or external access require review of the exact before-and-after changes and a server-side freshness recheck. Role-specific edit coverage remains partial in the tracked Secretary account work.

### 2.2 Academic calendar setup

1. The Secretary opens `/secretary/school-years`.
2. The Secretary creates a school year with its code and optional start/end dates.
3. The Secretary adds periods under that school year.
4. A regular semester receives a First Term or Second Term academic term. Summer is a Summer semester and does not receive a term.
5. The Secretary sets one period active when live academic work should begin.
6. When a new period becomes active, CLOIE atomically completes the previous active period when its end date exists and preserves its readiness snapshot.
7. The Secretary may cancel a planned or active period within the lifecycle rules. Completed and cancelled periods are immutable.
8. The Secretary may archive a school year only when its active-period and dependency rules allow it.

There is one active academic period at a time. Course assignments use a regular-semester academic term or the Summer semester itself as their assignment period. Academic-period state drives Student enrollment gates, course-assignment mutability, evaluation availability, readiness, and Dean period filters.

### 2.3 Term rollover and Student placement

1. The Secretary selects a source and target academic term from a school-year rollover screen.
2. The Secretary previews the result without writing enrollments.
3. CLOIE reads active Student placements from the source term and calculates the next year level.
4. The Secretary reviews counts and exceptions.
5. The Secretary runs the rollover.
6. CLOIE creates target-term enrollments in an idempotent transaction and skips records already present.
7. Fourth-year Students are reported as `GRADUATING` exceptions rather than promoted to a fifth year. Missing program data is reported as `MISSING_DATA`; duplicate target placement is skipped.

Rollover changes term-placement records. It does not create Course-assignment roster memberships. Course rosters are maintained separately by roster managers.

### 2.4 Program, major, and catalog setup

1. The Secretary creates the academic program with its code, name, and metadata.
2. The Secretary adds, edits, activates, or deactivates majors belonging to that program where applicable.
3. The Secretary creates courses in `/secretary/courses`.
4. The Secretary chooses `GENERAL_EDUCATION` or `PROGRAM_SPECIFIC` scope.
5. A Program-specific Course is linked to its owning program and may be linked to a major. A General Education Course has no single owning program.
6. The Secretary records advisory catalog defaults for year level, semester, and term.
7. The Secretary activates or deactivates courses and uses the dependency rules before permanent deletion.

Program deactivation is reversible and preserves history. Permanent Program deletion is available only to the Secretary or Dean after deactivation and only when every dependent record is absent. Linked majors, courses, outcomes, student profiles, enrollments, affiliations, assignments, templates, deployments, invitations, and external profiles block deletion. The same principle applies to dependent Course records: deactivation is the safe lifecycle operation when history exists.

Catalog defaults prefill assignments but do not force the eventual assignment period. Requested or Tutorial course types remain deferred; current Course workflows cover General Education and Program-specific Courses.

### 2.5 Institutional evaluation baseline setup

1. The Secretary opens `/secretary/instruments`.
2. The Secretary creates or edits an institutional baseline template and selects its type: `COURSE_BOUND` or `PROGRAM_WIDE`.
3. The Secretary defines the instrument structure, including supported Likert-scale and guided open-ended questions.
4. CLOIE creates or updates an `InstrumentVersion` snapshot so later deployments retain the version used at publication.
5. For a Course-bound baseline, the Secretary may mark the template faculty-accessible. Program-wide templates remain institutional governance records.
6. The Secretary activates, deactivates, duplicates, or removes a baseline only when its dependency rules allow the operation.

The baseline catalog is the source from which Program Heads can create program-owned copies and from which Faculty can use explicitly accessible Course-bound templates. Typical baseline instruments include the Post-Term CILO Evaluation Tool, Graduating Student Exit Survey, Alumni Evaluation Tool, and Industry Partner Internship Evaluation Tool. The route and instrument model are implemented; the complete report and deployment policy for every instrument remains partly unfinished.

### 2.6 Course-assignment setup

1. The Secretary holds no Course assignment management: General Education assignments are stewarded by the General Education Coordinator at `/gen-ed-coordinator/course-assignments`, and Program-specific assignments by each program's Program Head. The Dean retains all-program authority. The Secretary keeps read-only visibility.
2. The steward selects the academic assignment period, Course, program context, year level, section, and Faculty Member.
3. Catalog defaults prefill advisory values, but the steward can apply the actual period and year-level context.
4. The steward selects a required section: Morning, Afternoon, or Evening.
5. System CLOIE enforces one class identity per academic period, Course, program, year level, and section, with exactly one Faculty owner.
6. A class taught to Students from multiple programs is represented by separate Course assignments, one per program; it is not stored as one mixed assignment.
7. The steward may create assignments individually or in a partial-success bulk operation.
8. The steward can edit class identity before roster membership exists, reassign the Faculty owner after that point, deactivate/reactivate an assignment, open its roster, and run the typed-confirmation deletion flow when deletion is allowed.

Permanent deletion requires the displayed assignment label, a fresh revision/count check, no published Course-bound evaluation, and confirmation that roster membership and audit history will be deleted. A published Course-bound evaluation blocks permanent assignment deletion.

### 2.7 Secretary's cross-role handoff

The Secretary's setup makes the following downstream journeys possible:

- Programs and majors make Student, Alumni, Industry Partner, Faculty, and Program Head scope meaningful.
- Academic periods make current enrollment, assignments, rollover, readiness, and evaluation availability meaningful.
- Complete accounts give staff and respondents a predictable Google OAuth entry path.
- Courses and assignments give Faculty and Program Heads teaching capability.
- Baseline templates give Program Heads and Faculty governed instrument starting points.
- Student profiles and term placement make Course roster eligibility and Student-targeted evaluation targeting possible.

## 3. College Dean Journey

The Dean has college-wide oversight and selected operational capabilities. The Dean uses separate role-owned routes and does not impersonate a Secretary or Program Head.

### 3.1 Account entry

1. The Secretary pre-provisions a complete Dean account with an ACD institutional email.
2. The Dean chooses the staff portal and authenticates with Google OAuth.
3. CLOIE matches the normalized Google email to the pre-provisioned domain account.
4. The Dean enters `/dean/dashboard`.

The Dean has no self-service role claim. The canonical Dean navigation is Dashboard, Academic Structure, College Oversight, and Profile.

### 3.2 Academic Structure operations

The Dean can use the role-owned Academic Structure routes:

- Create, edit, activate, deactivate, and guarded-delete Programs and majors.
- Create, edit, activate, deactivate, and guarded-delete Courses.
- Create, edit, activate, deactivate, and delete Course assignments across all programs.
- Manage General Education and Program-specific assignments with the same all-program operational rules as the Secretary.
- Open and manage authorized Course-assignment rosters, including add, restore, remove, CSV import, exclusions, and late inclusion where the roster policy permits.
- Create, edit, version, activate, deactivate, and delete institutional baseline instruments.

These are Dean-owned routes under `/dean/academic-structure/*`, not Secretary routes. User management is not exposed as a canonical `/dean/users` journey; the Secretary remains the user-management owner even though some shared administrative services contain Dean authorization for selected account operations.

### 3.3 College Oversight dashboard

1. The Dean opens `/dean/dashboard`.
2. CLOIE defaults the dashboard to the active academic period.
3. The Dean sees count-only readiness KPIs for active Course-Program contexts, ready contexts, contexts missing CILOs, and contexts with incomplete outcome mappings.
4. Risk cards link to the same-period Learning Outcomes view with the selected risk filter.
5. A program readiness matrix lets the Dean compare programs and open the relevant Learning Outcomes scope.

The dashboard is not a response-analytics dashboard. Evaluation scores, raw responses, student identifiers, word clouds, formal Reports, and export artifacts are not part of the current Dean dashboard journey.

### 3.4 Learning Outcomes oversight

1. The Dean opens `/dean/college-oversight/learning-outcomes`.
2. The Dean selects an eligible active or completed academic period through URL-backed state.
3. CLOIE shows program totals and readiness coverage.
4. The Dean expands a program to see Institutional Outcome coverage and General Education gaps before Program-specific Graduate Outcome coverage and gaps.
5. Archived outcomes needed for historical context are labelled `Archived`.
6. The Dean uses risk filters for missing CILOs, incomplete mappings, or not-ready contexts.

This surface is read-only. Faculty own Course-level CILO authoring and are the primary mappers, Program Heads own Graduate Outcome authoring and review mappings read-only, and the Secretary has college-wide administrative write authority over the catalog and both mapping relations. The Dean does not edit outcomes or mappings.

### 3.5 Enrollments oversight

1. The Dean opens `/dean/college-oversight/enrollments`.
2. CLOIE defaults to the active period; if no active period exists, it uses the latest completed eligible period or shows an explicit no-eligible-period state.
3. The Dean sees Student placement totals by program.
4. The Dean expands a program to see Course/class rows.
5. The Dean explicitly opens a class roster before any names appear.
6. The Dean searches and paginates the roster server-side, with 25 names per page.

The Dean roster projection shows display names only. It does not expose Student IDs, email addresses, account IDs, enrollment source, profile details, or an export control. The Enrollments view is read-only.

### 3.6 Dean limitations and unfinished areas

- Dean analytics and reporting routes outside the accepted oversight IA are unavailable or deferred.
- `/dean/analytics`, `/dean/reports`, and stale CILO review routes are not current supported journeys; several return `404`.
- Formal PDF/spreadsheet exports, response-based Learning Evaluation Results, response score charts, and college-wide report contracts remain deferred.
- Whole-app offline/PWA data access is deferred. The accepted offline contract is a future design input, not an implemented feature.

## 4. Program Head Journey

The Program Head is the accountable owner for one or more explicitly assigned academic-program scopes. The current implementation generally resolves the first active assignment for some workflows; multi-assignment behavior remains an open authorization concern.

### 4.1 Account entry and program scope

1. The Secretary creates a complete Program Head account with an ACD email and exactly one managed program.
2. The Program Head chooses the staff portal and authenticates with Google OAuth.
3. CLOIE resolves the active `ProgramHeadAssignment`.
4. If no active assignment exists, the Program Head sees a guidance/blocked state rather than an unscoped program dashboard.
5. All subsequent Program Head reads and writes derive program scope from the server-side assignment, not from a client-provided program ID.

### 4.2 Program catalog and course-assignment operations

The Program Head can currently use `/program-head/courses` and `/program-head/course-assignments` for program-scoped Course and assignment work. The exact long-term boundary for Program Head catalog authoring is still open in the reconciled PRD/SRS decisions.

For Course assignments, the Program Head can:

- Create and manage Program-specific Course assignments within the active assigned-program scope.
- Assign a Faculty Member to a Program-specific Course.
- Use scoped teaching self-assignment when the Program Head is also teaching a Course in the managed program. This is teaching capability, not a second account role.
- View General Education assignments for the program.
- Not manage General Education assignments; Secretary and Dean steward those assignments.
- Open and manage authorized Program-specific rosters, subject to active assignment, active-period, roster-lock, and scope rules.

### 4.3 Graduate Outcomes and alignment

1. The Program Head opens `/program-head/outcomes`.
2. The Program Head creates, edits, reorders, archives, and restores Graduate Outcomes for the assigned program.
3. The Program Head opens the selected Program's mapping review (`/program-head/programs/<programId>/outcomes/mapping`) to inspect typed alignment — CILO-to-Institutional Outcome for General Education Courses, CILO-to-Graduate Outcome for Program-specific Courses — within authorized program scope. Legacy `/program-head/outcomes/mapping` bookmarks redirect safely to the Program dashboard.
4. Mapping review is read-only: the Program Head inspects valid mappings and readiness gaps but cannot create or remove mapping rows. Faculty maintains Course-level alignment in the Course alignment workspace; the Secretary has college-wide correction authority.
5. Readiness reports missing CILOs and incomplete typed mappings rather than blocking incremental authoring.

Every active CILO needs at least one valid active target of its Course scope's typed layer for a ready context. General Education CILOs map once at Course level to the shared Institutional Outcome catalog; that shared mapping applies to every Program with an active General Education assignment for the Course.

### 4.4 Program-owned evaluation template journey

1. The Program Head opens `/program-head/tools`.
2. The Program Head creates a program-owned template or copies an institutional baseline.
3. The Program Head selects the template type:
   - `PROGRAM_WIDE` for stakeholder evaluations that apply across the program.
   - `COURSE_BOUND` for an evaluation tied to a specific Course assignment context.
4. The Program Head builds or edits the instrument structure and saves version snapshots.
5. The Program Head activates or deactivates the template.
6. For a Course-bound template, the Program Head decides whether the template is faculty-accessible.
7. The Program Head can control faculty access by exposing only explicitly permitted Course-bound templates.
8. The Program Head can duplicate a baseline or an in-scope template without modifying the source baseline.

Program-owned templates are distinct from Graduate Outcomes. GO ownership does not make a Program Head the owner of institutional templates, and template authoring does not replace GO authoring.

### 4.5 Program-wide deployment journey

1. The Program Head selects an active Program-wide template and its latest active version.
2. The Program Head chooses a target stakeholder: Student, Alumni, or Industry Partner.
3. For Student targets, the Program Head supplies the required academic targeting such as year level and optional major context.
4. The Program Head selects the academic period and activation/deadline window.
5. CLOIE validates that the template belongs to the assigned program or is an authorized institutional baseline.
6. CLOIE previews the resolved respondent audience where the preview route is available.
7. The Program Head reviews the deployment details and publishes it.
8. CLOIE creates the central deployment and respondent assignments in one transaction, with `ACTIVE` or `SCHEDULED` status based on activation time.
9. The Program Head can close an active or scheduled deployment before or during its response window.

Program-wide deployments are the route for Alumni evaluations, Industry Partner internship/readiness evaluations, and graduating-student-targeted instruments. Graduating Students are still Students; there is no separate graduating-student role.

### 4.6 Course-bound evaluation journey

1. The Program Head opens the Course-bound evaluation flow when acting for an authorized Program-specific assignment.
2. The Program Head selects the Course assignment and the Faculty-owned or authorized bound template.
3. The service rechecks the assignment, Faculty owner, program scope, active period, template, latest version, and existing one-evaluation-per-assignment constraint.
4. The service reads active Course-assignment roster memberships, not merely term placement.
5. The Program Head reviews active roster members and records any evaluation-specific exclusions with a standard reason.
6. CLOIE requires at least one recipient after exclusions, creates assignments, snapshots the CILOs and question bindings, and locks ordinary roster membership writes.
7. The Program Head can review anonymized Course-bound results and response details for the program scope.

The Program Head can deploy on behalf of a Faculty Member where the shared Course-bound policy allows it. On-behalf deployment records the actual deployer separately from the Faculty being evaluated and does not give the Program Head a Faculty account role.

### 4.7 Analytics and reports

- `/program-head/dashboard` provides program-scoped KPIs and stakeholder/course-bound summary visualizations.
- `/program-head/analytics` provides program-scoped analytics for accessible deployments/evaluations.
- Review routes provide anonymized respondent labels and scoped Course-bound response review.
- `/program-head/reports` exists, but export controls are intentionally stubbed while authoritative report contracts and server-side PDF/spreadsheet generation are defined.

The Program Head cannot view another program's analytics or reports. Exact analytics formulas, minimum-response suppression, weighting, qualitative privacy, and report structures remain open under issue #133 and report implementation issue #173.

## 5. Faculty Member Journey

The Faculty Member owns the authoring and operational work for the Course contexts to which they have teaching capability. A Faculty Program affiliation is not the same as a Course assignment and does not itself grant roster or evaluation access.

### 5.1 Account entry

1. The Faculty Member selects Faculty from the staff portal.
2. The Faculty Member authenticates with Google using an ACD institutional email.
3. A self-service Faculty claim collects a primary Faculty Program affiliation; a Secretary-created Faculty account already has one.
4. CLOIE enters the Faculty dashboard once the affiliation exists.
5. Course teaching capability becomes available only through a current Course assignment owned by the Faculty Member.

### 5.2 Course roster journey

1. The Faculty Member opens `/faculty/course-rosters` (`My Course Rosters`).
2. CLOIE lists current active Course assignments owned by that Faculty Member and separately shows active-roster and evaluation-eligible counts.
3. The Faculty Member searches or includes historical assignments.
4. The Faculty Member opens `/course-rosters/[assignmentId]` for one authorized Course assignment.
5. The Faculty Member reviews Student name, email, program, major, year level, section, membership-added date, and safe eligibility state.
6. The Faculty Member adds one existing Student through scoped name search, selects the intended account using canonical name, ACD email, and academic context, then adds that selected account directly; or downloads the browser-generated name-column template.
7. For name-list upload, the Faculty Member uploads a UTF-8 CSV with one `name` or `Student Name` column, standard CSV quoting, and 1 to 100 source rows. Blank rows may be ignored; non-empty extra columns reject the file.
8. System CLOIE validates file structure and prepares a no-write preview. The Faculty Member reconciles each source row by reviewing exact or suggested matches, selecting an ambiguous account, or explicitly skipping unresolved rows; suggested matches require acknowledgement before confirmation.
9. System CLOIE confirms selected account identities with current authorization and eligibility checks, then reports created, restored, already-active, conflict, ineligible, skipped, and unprocessed outcomes. Failed-row export uses source row, uploaded name, safe status, and safe error without candidate emails or account identifiers.
10. The Faculty Member removes a membership after a confirmation explaining that the change affects only this Course roster and future Course-bound evaluation eligibility.
11. The Faculty Member can restore a removed membership if the Student is still eligible and no other section membership conflicts.

Roster eligibility requires an active Student account, Student role, completed Student profile, and active term placement for the assignment period. Program-specific assignments require a matching program; General Education assignments accept any eligible active-term Student placement. Existing memberships are retained but marked ineligible when account, profile, or placement state later changes. They are excluded from current evaluation eligibility without being silently removed.

Roster operations are locked when the assignment is inactive, its period is completed, or a Course-bound evaluation is published. Faculty cannot edit Student profiles or term placement from the roster.

### 5.3 Course-level CILO journey

1. The Faculty Member opens `/faculty/cilos`.
2. The Faculty Member selects an authorized Course context.
3. The Faculty Member creates, edits, archives, or restores Course-level CILOs.
4. CILOs remain attached to the Course across assignment periods; they are not owned by a particular assignment or copied as a new Faculty-owned outcome each term.
5. The Faculty Member opens the Course alignment workspace to connect CILOs to valid active targets: Institutional Outcomes for General Education Courses (shared at Course level, with a shared-impact warning), owning-Program Graduate Outcomes for Program-specific Courses.
6. Readiness reflects missing active CILOs and incomplete typed mappings for the Course scope; new Course-bound evaluation publication is blocked until every active CILO has a valid active target.

### 5.4 Faculty template and Course-bound deployment journey

1. The Faculty Member opens `/faculty/tools`.
2. The Faculty Member selects an institutional or Program Head Course-bound template explicitly marked faculty-accessible, or a Faculty-owned copy.
3. CLOIE creates a derived Faculty-owned copy when the source is not already owned by the Faculty Member; editing the copy does not overwrite the source.
4. The Faculty Member binds the derived template to an authorized Course, program, and optional major context.
5. The Faculty Member binds each active CILO exactly once to a Likert question. A CILO cannot bind to an open-ended question, and a Likert question cannot receive two CILOs.
6. The Faculty Member previews the Student-facing evaluation and sets the activation/deadline values.
7. The Faculty Member publishes the evaluation once for the Course assignment.
8. CLOIE snapshots the CILOs, Course information, question bindings, and instrument version; creates assignments for active roster members except documented exclusions; and locks ordinary roster changes.
9. The Faculty Member may close the evaluation, review anonymized responses, and use late inclusion for an excluded eligible Student before closure when authorized.

On-behalf Course-bound publication by Program Head, Dean, or Secretary uses the Faculty's bound Course template and disables question customization. The Secretary-specific on-behalf deployment policy remains open under issue #131.

### 5.5 Faculty analytics and review

- `/faculty/dashboard` shows metrics and visualizations for the Faculty's accessible/deployed Course evaluations.
- `/faculty/analytics` provides evaluation-level analytics and qualitative processing surfaces where implemented.
- `/faculty/cilo-evaluations/[evaluationId]` and response detail routes provide scoped Course-bound review with anonymized respondent labels.
- The Faculty cannot read responses belonging to unrelated Faculty assignments.
- Chart and aggregate views should not expose respondent identifiers; raw qualitative comment access and privacy thresholds remain under security work #176.

## 6. Student Journey

The Student role includes regular and graduating Students. Graduating status changes targeting, not the account role or portal.

### 6.1 Registration and onboarding

1. The Student selects Student from the staff portal.
2. The Student authenticates with Google using an exact ACD institutional email.
3. A self-service Student claim collects Student academic profile information and self-declared active-term placement when a term exists.
4. A Secretary-created Student already has the static profile and, when possible, a Secretary-recorded active-term enrollment.
5. If no active term exists, CLOIE places the Student in deferred enrollment and shows a dashboard-only warning until an active placement is available.
6. The Student profile includes academic program, applicable major, and current term placement fields such as year level and section. System CLOIE does not collect a Student-entered institutional ID.

### 6.2 Receiving assigned evaluations

1. Faculty, Program Head, Secretary, or another authorized deployment path publishes a Course-bound evaluation based on a Course-assignment roster, or a Program Head publishes a central Program-wide deployment targeted to Students.
2. CLOIE creates an `EvaluationAssignment` for the Student when the targeting and eligibility rules match.
3. The Student opens `/student/dashboard` or `/student/evaluations`.
4. The Student sees active, due-soon, in-progress, submitted, or completed evaluation states.
5. Course-bound pending access is rechecked dynamically against active account state, Student role/profile, active term placement, program match, active roster membership, evaluation window, and exclusion state.
6. A temporarily ineligible Student cannot begin or continue pending participation. A saved draft remains stored and becomes available again if eligibility returns before closure. A submitted response remains counted even if later eligibility changes.

Student evaluation access is based on enrollment, Course-assignment membership, and deployment targeting. Deprecated CILO access codes are not part of the current journey.

### 6.3 Answer, review, confirm, and submit

1. The Student opens an assigned evaluation.
2. CLOIE loads the published instrument snapshot, not a mutable current template.
3. The Student completes the guided one-step-at-a-time wizard on mobile, tablet, or desktop.
4. The Student answers required Likert and guided open-ended items. Suggested open-ended responses may populate a text field but remain editable.
5. The Student saves progress as a draft and returns later while the evaluation remains available.
6. The Student reviews the completed answers in the confirmation step.
7. CLOIE validates required answers and the availability/eligibility state again.
8. The Student confirms final submission.
9. CLOIE atomically persists the response items and changes the response to `SUBMITTED`.
10. A second submission is rejected; the submitted response is immutable from the respondent workflow.
11. The Student is sent to submission history or the submitted-response view.

Draft and final response concurrency hardening is tracked under issue #168. The intended invariant is one response per assignment, `IN_PROGRESS` to `SUBMITTED` lifecycle, and no post-submission mutation.

### 6.4 Student history and profile

- `/student/history` lists submitted responses.
- `/student/history/[responseId]` shows a permitted submitted response in read-only form.
- `/student/profile` shows the Student academic profile.
- A Student does not manage Courses, rosters, CILOs, templates, analytics, or reports.

## 7. Alumni Journey

### 7.1 Registration and verification

1. The Alumni selects Alumni from the respondent portal.
2. The Alumni authenticates with Google using any valid email domain.
3. Self-service onboarding collects program, applicable major, graduation year, and the Alumni identity.
4. A self-service profile starts pending external verification and displays a verification banner in the Alumni shell. The current profile gate blocks rejected accounts but does not yet block pending accounts.
5. A Secretary-created Alumni account is complete and approved immediately because Secretary creation is the institutional verification step.
6. A former Student can reach Alumni through a Secretary-managed graduate transition while historical Student records remain retained.

External approval/rejection management for self-service accounts is incomplete; current administrative invite status records do not constitute a complete verification decision workflow.

### 7.2 Receiving and completing evaluations

1. A Program Head publishes a Program-wide deployment targeting Alumni for the assigned program and academic period.
2. CLOIE resolves eligible Alumni respondent assignments according to the current deployment targeting path.
3. The Alumni opens `/alumni/dashboard` or `/alumni/evaluations`.
4. The Alumni sees pending and in-progress assigned evaluations.
5. The Alumni opens an evaluation wizard, saves a draft, reviews the completed answers, confirms, and submits.
6. CLOIE validates required answers, availability, assignment ownership, and response lifecycle before final submission.
7. The Alumni sees the submitted evaluation in `/alumni/evaluations/[id]/submitted` and `/alumni/history`.

The Alumni does not see student-course rosters, Course-level CILOs, or program analytics. The Alumni supplies stakeholder feedback; the Program Head and future reporting services consume scoped aggregates.

## 8. Industry Partner Journey

### 8.1 Registration and profile

1. The Industry Partner selects Industry Partner from the respondent portal.
2. The Industry Partner authenticates with Google using any valid email domain.
3. Self-service onboarding records the represented company or organization, optional position, and applicable program affiliation.
4. The profile begins pending external verification and shows a verification banner. Rejected external accounts are blocked; pending-account gating remains partial.
5. A Secretary-created Industry Partner account records company information and starts approved immediately.

The current profile supports one optional program association. Multi-program affiliation and a separate Industry Partner access-code model remain open under issue #132. Student-style access codes are not a settled current workflow.

### 8.2 Receiving and completing evaluations

1. A Program Head publishes an Industry Partner program-wide deployment, such as an internship or graduate-readiness evaluation.
2. CLOIE resolves Industry Partner assignments from the current program-affiliation path.
3. The Industry Partner opens `/industry-partner/dashboard` or `/industry-partner/evaluations`.
4. The Industry Partner completes the guided evaluation, saves drafts, reviews answers, confirms submission, and submits.
5. CLOIE stores the final response as submitted and prevents a second submission through the respondent workflow.
6. The Industry Partner can review submitted evaluations in `/industry-partner/evaluations/[id]/submitted` and `/industry-partner/history`.

The Industry Partner does not manage academic structure, templates, rosters, outcomes, analytics, or reports.

## 9. Shared Evaluation Lifecycle

This lifecycle connects the operational roles and respondent roles.

### 9.1 Instrument and version

1. Secretary or Dean maintains an institutional baseline.
2. Program Head copies or creates a program-owned instrument when a program-specific stakeholder evaluation is needed.
3. Faculty creates a Faculty-owned derived Course-bound copy when the source is faculty-accessible.
4. The author saves versions. Once an evaluation is published, the deployment uses an immutable instrument version and snapshots the relevant Course, CILO, GO, and question-binding context.

### 9.2 Publication types

| Type                            | Owner / deployer                                                          | Audience source                                                                                               | Main lock                                                                           |
| ------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Course-bound                    | Faculty by default; authorized Program Head, Dean, or Secretary on behalf | Active Course-assignment memberships, less recorded exclusions                                                | One evaluation per Course assignment; ordinary roster writes lock after publication |
| Program-wide central deployment | Program Head within assigned program                                      | Student targeting, Alumni assignments, or Industry Partner program affiliation under current deployment rules | Deployment status/window; explicit close                                            |

Course-bound publication uses active Course-assignment memberships, not a broad StudentEnrollment cohort. It creates one assignment per active roster member unless a documented exclusion is recorded. Exclusions do not remove the Student from the roster. Before closure, an authorized roster manager can reverse an exclusion with a distinct reason and create the missing EvaluationAssignment without a notification.

### 9.3 Availability and closure

- A future activation time creates `SCHEDULED`; an immediate activation creates `ACTIVE`.
- Availability is resolved at read time from the activation/deadline window and current eligibility.
- There is no implemented scheduler that automatically rewrites the stored status when the activation time passes.
- A Program Head can close a central deployment; Faculty can close their Course-bound evaluation; other closure permissions depend on the deployment path.
- `CLOSED` evaluations do not accept new responses, roster late inclusion, or ordinary roster changes.
- The `ARCHIVED` deployment enum value has no complete writer workflow.

## 10. Analytics, Review, and Reporting Journey

### 10.1 Current analytics journeys

- Faculty views aggregates for evaluations within Faculty Course-assignment ownership.
- Program Head views program-scoped Course-bound, central-deployment, and stakeholder summaries.
- Program Head and Faculty can review scoped Course-bound responses using anonymized respondent labels such as `Respondent R-######`.
- Dean views active-period readiness, outcome alignment coverage, program totals, and privacy-safe enrollment drill-down rather than response analytics.
- Secretary has record-level setup and administrative views; a future Insights area is the intended home for response-based institution-wide analysis.

### 10.2 Planned reporting journey

The intended report journey is:

1. The authorized role selects a program or college scope, academic period, evaluation/deployment, and report type.
2. CLOIE resolves the role and scope server-side.
3. CLOIE derives the report from submitted responses, instrument versions, CILO/GO snapshots, readiness snapshots, and approved privacy rules.
4. CLOIE displays a stable report preview with generation metadata and caveats.
5. The user exports an authorized PDF or spreadsheet artifact.

This is not complete. Program Head exports are stubbed, Dean Reports is unavailable, and report contracts are still open. Issue #133 must settle rating scales, CILO attainment, GO aggregation, weighting, minimum-response suppression, Dean drill-down, and report structure. Issue #173 tracks authoritative server-side reports and PDF/spreadsheet export. Raw qualitative comments require a separate privacy policy under issue #176 and must not be assumed safe merely because account identifiers are removed.

## 11. End-to-End Operational Chains

### 11.1 Academic setup to Course-bound evaluation

1. Secretary creates a school year, periods, programs, majors, Courses, complete accounts, baseline templates, and Course assignments.
2. Faculty authenticates and receives teaching capability through a Course assignment.
3. Faculty manages Course-level CILOs and a Course roster through manual add or CSV import.
4. Faculty creates a derived Course-bound template, binds CILOs to Likert questions, previews, and publishes.
5. CLOIE resolves roster membership, creates Student EvaluationAssignments, records exclusions, snapshots the instrument, and locks the roster.
6. Student signs in, sees the assignment, saves a draft, reviews, confirms, and submits.
7. Faculty and authorized Program Head review anonymized results; current analytics use only their authorized evaluation scope.
8. Future report services produce formal evidence artifacts after the report contracts are approved.

### 11.2 Program setup to stakeholder evaluation

1. Secretary creates the program and assigns a Program Head.
2. Program Head authors Graduate Outcomes and creates or copies a Program-wide template.
3. Program Head selects Student, Alumni, or Industry Partner targeting and an academic period/window.
4. CLOIE creates central respondent assignments.
5. The target respondent signs in, completes the wizard, confirms, and submits.
6. Program Head reviews program-scoped completion and stakeholder analytics.
7. Formal exports remain planned.

### 11.3 Academic period completion to Dean oversight

1. Secretary completes the active academic period through the lifecycle workflow.
2. CLOIE persists the period's readiness snapshot in the completion transaction.
3. Dean opens Dashboard for the next active period or selects a completed period on Learning Outcomes/Enrollments.
4. Dean reviews readiness totals, program gaps, and privacy-safe class drill-down.
5. Historical views retain the completed-period context even when current Courses, programs, or outcomes later become inactive.

### 11.4 Student graduation transition

1. Term rollover identifies fourth-year Students as graduating exceptions.
2. The Secretary reviews the graduating Student records.
3. When the institution confirms graduation, the Secretary performs a managed Student-to-Alumni role transition.
4. CLOIE retains the historical Student profile, enrollment, and evaluation history.
5. The former Student enters future respondent journeys as Alumni, not as a second simultaneous account role.

## 12. Important Boundaries and Non-Goals

- CLOIE is not an LMS, SIS, grading system, transcript system, scheduling system, or full accreditation platform.
- StudentEnrollment is the term-placement ledger; it is not a Course roster.
- CourseAssignmentMembership is the Course-bound evaluation recipient source.
- Faculty Program affiliation does not grant Faculty access to every Course in that program.
- Program Head teaching capability is an assignment capability, not a second role.
- Secretary and Dean shared services do not mean route impersonation or a role switch.
- Graduating Student is a targeting condition under the Student role, not a separate role.
- Access codes for Student CILO evaluations are deprecated.
- Industry Partner access-code ownership, authentication, reuse, expiry, revocation, and multi-program scope are not decided.
- Whole-app offline mutation, queueing, synchronization, and offline respondent submission are not implemented.
- Formal report exports, final analytics formulas, minimum-response privacy thresholds, and complete external verification transitions are not fully implemented.

## 13. Journey Status Matrix

| Workflow                                              | Current status                                           | Main evidence / follow-up                                                        |
| ----------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Google OAuth, portal entry, role gates, status pages  | Implemented                                              | `src/features/auth/`, `src/features/users/services/resolve-profile-gate.ts`      |
| Bootstrap and Secretary-created complete accounts     | Partial                                                  | ADR `0001-complete-secretary-created-accounts.md`; issues #70-#77 remain tracked |
| School years, academic terms, active-period lifecycle | Implemented                                              | `src/features/academic-calendar/`; Secretary-only lifecycle                      |
| Term rollover and graduating exceptions               | Implemented                                              | `run-term-rollover.ts` and Secretary rollover routes                             |
| Programs and majors lifecycle                         | Implemented                                              | `manage-programs.ts`; strict deletion ADR                                        |
| General Education and Program-specific Course catalog | Implemented                                              | `manage-courses.ts`; catalog defaults are advisory                               |
| Institutional baseline instruments and versioning     | Implemented                                              | `manage-instruments.ts`; complete deployment/report coverage remains partial     |
| Secretary and Dean all-program Course assignments     | Implemented                                              | ADR `0003`; role-owned routes                                                    |
| Program Head Program-specific assignment management   | Implemented                                              | General Education management remains Secretary/Dean-only                         |
| Faculty roster manual management                      | Implemented                                              | Roster membership services; browser verification remains open                    |
| Faculty name-list roster reconciliation                | Implemented; runtime desktop/mobile verification partial | Name CSV preview, scoped identity search, and `CourseAssignmentMembership` writes |
| Graduate Outcome authoring                            | Implemented for Program Head; Secretary authority exists | Secretary UI/protected-write coverage is partial                                 |
| Faculty Course-level CILO authoring                   | Implemented                                              | `/faculty/cilos` and evaluation services                                         |
| Typed outcome mapping (CILO→ILO for General Education, CILO→GO for Program-specific) and readiness | Implemented                                              | ADR `0005`; Course alignment workspace, typed readiness, publication gate       |
| Program-owned template creation and faculty access    | Implemented                                              | `manage-program-head-templates.ts`                                               |
| Faculty-derived Course-bound templates                | Implemented                                              | `manage-faculty-templates.ts`                                                    |
| Course-bound publication, exclusions, late inclusion  | Implemented                                              | `publish-course-bound-evaluation.ts`; roster-lock rules                          |
| Program-wide stakeholder deployment                   | Implemented for current Program Head path                | Central deployment policy and external targeting remain partial                  |
| Student evaluation response workflow                  | Implemented; concurrency hardening open                  | Wizard, draft, confirmation, submit, history; issue #168                         |
| Alumni evaluation response workflow                   | Implemented; verification gate partial                   | Alumni routes and stakeholder response services                                  |
| Industry Partner evaluation response workflow         | Implemented; access-code policy open                     | Industry Partner routes; issue #132                                              |
| Faculty and Program Head scoped analytics/review      | Implemented, formulas/privacy incomplete                 | Analytics services; issues #133/#176                                             |
| Dean readiness and enrollment oversight               | Implemented                                              | Issues #111, #119, #120; read-only and privacy-safe                              |
| Program Head report exports                           | Stubbed                                                  | `/program-head/reports`; issue #173                                              |
| Dean report exports                                   | Deferred/unavailable                                     | `/dean/reports`; issue #173                                                      |
| Formal PDF/spreadsheet reporting                      | Deferred/planned                                         | Issue #173                                                                       |
| Self-service external approval/rejection transition   | Partial                                                  | Rejected gate exists; complete approval workflow is not present                  |
| Whole-app offline/PWA data workflow                   | Deferred                                                 | ADR `0006`                                                                       |

## 14. Primary Sources

- `openspec/config.yaml`
- `CONTEXT-MAP.md`
- `src/features/auth/CONTEXT.md`
- `src/features/academic-calendar/CONTEXT.md`
- `src/features/course-assignments/CONTEXT.md`
- `src/features/academic-structure/CONTEXT.md`
- `docs/adr/0001-single-role-accounts.md`
- `docs/adr/0001-complete-secretary-created-accounts.md`
- `docs/adr/0002-separate-domain-users-from-auth-identities.md`
- `docs/adr/0003-course-catalog-and-assignment-refactor.md`
- `docs/adr/0004-strict-program-deletion.md`
- `docs/adr/0005-outcome-ownership-and-dean-oversight.md`
- `docs/adr/0006-dean-pwa-offline-cache-contract.md`
- `docs/adr/0007-course-assignment-roster-membership.md`
- `docs/adr/0008-dedicated-demo-deployment-authentication.md`
- `openspec/changes/improve-navigation-rendering-and-caching/`
- `docs/agents/discrepancies-prd-srs-vs-current.md`
- `docs/agents/cross-source-gap-report-2026-07-18.md`
- GitHub issues [#103](https://github.com/Tugeru/project-cloie/issues/103), [#111](https://github.com/Tugeru/project-cloie/issues/111), [#130](https://github.com/Tugeru/project-cloie/issues/130), [#132](https://github.com/Tugeru/project-cloie/issues/132), [#133](https://github.com/Tugeru/project-cloie/issues/133), [#168](https://github.com/Tugeru/project-cloie/issues/168), [#173](https://github.com/Tugeru/project-cloie/issues/173), and [#176](https://github.com/Tugeru/project-cloie/issues/176)

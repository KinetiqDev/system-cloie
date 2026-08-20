# Course Catalog and Assignments

Course Catalog and Assignments define the subjects offered by the institution, when they are scheduled in the curriculum, and how they are assigned to faculty members.

## General Education assignment stewardship (approved scope, issue #477)

**General Education CourseAssignments**:
Shared institutional Courses where `course.course_scope == GENERAL_EDUCATION`. Every CourseAssignment still carries the operational `program_id` as the class context, regardless of Course scope.
_Avoid_: Deriving Course scope from nullable program_id, Program-owned General Education Course

**General Education assignment authority — approved matrix (server-enforced)**:
Secretary: read-only for General Education (Program-specific mutation unchanged). Dean: retains current all-program General Education and Program-specific mutation. `GEN_ED_COORDINATOR`: college-wide read and mutation for General Education assignments only (every list read, Course picker, curriculum option read, faculty search allowlist, create, update, activation, deactivation, deletion, deletion preflight, and bulk creation is gated by `course.course_scope == GENERAL_EDUCATION` inside the server service; URL filters cannot widen it). Program Head: read-only for General Education within the Authorized Program set. Faculty: no assignment mutation. This contract requires the shared college-wide Coordinator scope approval and the breaking transfer recorded in `openspec/config.yaml` and the `add-general-education-coordinator` change; the services in this slice MUST NOT implement the transfer until that approval is recorded.
_Avoid_: Client-provided course_scope, Secretary General Education mutation after the transfer, Coordinator Program-specific mutation

**Coordinator assignment UX mode**:
`general-education` — a concrete Coordinator mode that reuses the assignment shell with Course scope fixed to General Education, allows any active target Program, and performs cross-Program Faculty search. Roster management and on-behalf evaluation publication are not granted to the Coordinator.
_Avoid_: Roster management by Coordinator, generic permission-configured component framework

**Coordinator scope model**:
All Coordinators share the single college-wide General Education scope (`course.course_scope == GENERAL_EDUCATION`). No portfolio assignment table exists in this change; a partitioned scope requires a separate approved OpenSpec capability.
_Avoid_: Coordinator portfolio assignment, fake General Education Program

**Curriculum provenance (advisory, unchanged in this slice)**:
An optional published `CurriculumCourse` link where `CourseAssignment.course_id == CurriculumCourse.course_id` and `CourseAssignment.program_id == CurriculumVersion.program_id`. `CourseAssignment` remains the operational class record and roster/evaluation authority.
_Avoid_: Required curriculum link, curriculum as roster authority

**Deferred**: ILO catalog ownership and write authority remain unresolved and are recorded as deferred. This change adds no ILO catalog mutation path.
_Avoid_: Coordinator ILO catalog editor, Secretary ILO write assumption


## Language

**Course**:
A catalog subject representing a unit of instruction, defining its code, title, credits, scope, and default year/semester/term.
_Avoid_: Subject, course offering

**Program-specific Course**:
A Course owned by one academic program. Its course assignments are created for that same owning program.
_Avoid_: Department subject, program offering

**General Education Course**:
A shared institutional Course that is not owned by a single academic program. Secretary or Dean users steward General Education course assignments; Program Heads may view General Education assignments for their program but do not manage them.
_Avoid_: Shared program course, merged course

**Catalog default**:
The advisory `year_level`, `semester`, and `term` stored on a `Course`. A catalog default pre-fills a course assignment but may be overridden for a specific assignment.
_Avoid_: Course offering default, scheduled term

**Course assignment**:
A term-scoped mapping between a teacher, a course, a program, a year level, and a section that grants teaching capability. Once it has a Course-assignment membership, its course, academic period, program, year level, and section are immutable; Faculty reassignment remains allowed and transfers roster-management access without changing the roster.
_Avoid_: Teaching assignment, roster record

**Course-assignment roster**:
The collection of active student memberships for one Course assignment. A student may belong to multiple Course-assignment rosters during the same academic period.
_Avoid_: Term enrollment, class roster record

**Course-assignment membership**:
A Student's active or inactive inclusion in one Course-assignment roster. A Student may have one active membership per Course, academic period, and program, guaranteed by a database constraint. To correct a section, a roster manager removes the current membership before adding the Student to the target section. It retains its creator, latest updater, and removal actor and times. Removing a membership makes it inactive. Restoring it preserves creation provenance, records the restoring actor as the latest update, and clears removal fields; restoration succeeds only when no other section is active. A referenced Student or audit actor cannot be permanently deleted. Re-uploading an active membership is a duplicate. Deactivation preserves the membership; permanently deleting its Course assignment requires typing the displayed assignment label and cascade-deletes the membership and its audit history.
_Avoid_: Term enrollment, duplicate class assignment

**Course roster import**:
A preview-first partial-success operation that reconciles at most 100 official Student-name rows against assignment-scoped eligible accounts before creating or restoring Course-assignment memberships. Every source row remains independent, names are lookup inputs rather than identity, unresolved rows require explicit resolution or skip, and confirmed writes use `User.id` with current server revalidation.
_Avoid_: Atomic roster replacement, database error report

**Roster name resolution**:
The authorized discovery and human-reconciliation step that compares one uploaded name with a bounded Course-assignment candidate population. Exact, suggested, ambiguous, and no-match states describe discovery evidence only; confirmed `User.id` identifies the Student.
_Avoid_: Name identity, automatic fuzzy match, normalized Student name

**Roster failure**:
An expected roster validation, eligibility, permission, or lifecycle outcome is reported with a specific safe message. An unexpected failure is reported with a generic safe message and support reference ID; its diagnostic detail stays in server-side structured logs. During an import it stops remaining processing while preserving completed memberships.
_Avoid_: Raw database error, server exception message

**Faculty course roster view**:
A Faculty-facing table of Students with active Course-assignment memberships for a Course assignment the Faculty owns.
_Avoid_: Faculty term enrollment list, all-program roster

**My Course Rosters**:
The role-owned Faculty route for viewing and managing Course-assignment rosters for active Course assignments owned by the current Faculty member. It is a flat searchable assignment table that defaults to active current-period assignments and can include history. It displays separate active-roster and current evaluation-eligible counts.
_Avoid_: Faculty dashboard roster widget, all-program roster page

**Course roster detail**:
The shared, server-authorized, paginated, and searchable view of Students in one Course-assignment roster. Invalid and unauthorized Course-assignment URLs are indistinguishable as not found. It shows name, email, program, major, year level, section, membership-added date, and inactive-account status. It distinguishes roster membership count from evaluation-eligible count. An authorized, default-off filter exposes removed memberships, removal time, and removal actor without including them in active counts or evaluation eligibility. Inactive assignments, completed academic periods, and published Course-bound evaluations are read-only and show a lifecycle-specific banner instead of write controls. Faculty reach it from My Course Rosters; Secretary, Dean, and Program Head reach it from an authorized Course assignment row.
_Avoid_: Separate administrator roster page, all-program student list

**Faculty roster management**:
Faculty management of Course-assignment memberships for an active Course assignment they own. It permits scoped Student search, preview-first name-roster reconciliation, and soft removal after confirmation that states its roster-only and future-evaluation effect; it does not permit changing Student profiles or term placement.
_Avoid_: Student administration, term enrollment administration

**Course roster manager**:
A Faculty owner, Secretary, Dean, or Program Head authorized to manage Course-assignment memberships through their active role's role-owned route. Secretary and Dean manage all programs; a Program Head manages only active program-specific Course assignments in their assigned-program scope. Membership changes require an active Course assignment in an active academic period.
_Avoid_: Roster administrator, unrestricted faculty access

**Roster eligibility**:
The rule deciding whether an existing Student may join a Course-assignment roster. It requires an active Student with a completed profile and active term placement for the assignment's academic period. A program-specific Course assignment requires the profile and term placement program to match the assignment's program; a General Education Course assignment accepts any active-term placement.
_Avoid_: Course prerequisite, cohort lock

**Inactive rostered Student**:
A Student with an inactive account who retains an active Course-assignment membership. The membership remains visible with its inactive-account status, cannot be newly added or restored, and is excluded from Course-bound evaluation recipients.
_Avoid_: Automatically removed Student, eligible evaluation recipient

**Profile-mismatched rostered Student**:
A Student whose active Course-assignment membership no longer matches a program-specific Course assignment because their academic profile changed. The membership remains visible with its mismatch status, cannot be newly added or restored, and is excluded from Course-bound evaluation recipients.
_Avoid_: Automatically removed Student, eligible evaluation recipient

**Term-placement-ineligible rostered Student**:
A Student whose active Course-assignment membership no longer has an eligible active term placement for the assignment's academic period. The membership remains visible with its eligibility warning, cannot be newly added or restored, and is excluded from Course-bound evaluation recipients.
_Avoid_: Automatically removed Student, eligible evaluation recipient

**Roster eligibility reason**:
The exact safe business reason a roster manager sees when a selected account cannot join a Course-assignment roster or a Student cannot receive a Course-bound evaluation: unknown or out-of-scope account, non-Student account, account inactive, profile incomplete, no active term placement, program mismatch, or membership conflict. It never includes internal identifiers, private account metadata, or technical failure detail.
_Avoid_: Raw account state, server error explanation

**Secretary course assignment operations**:
All-program stewardship of Course assignments by a Secretary, including General Education and Program-specific assignments across every academic program.
_Avoid_: Program Head impersonation, per-program Secretary mode

**Dean course assignment operations**:
All-program stewardship of Course assignments by a Dean, reusing the same operational rules as Secretary course assignment operations for General Education and Program-specific assignments.
_Avoid_: Separate Dean assignment model, analytics-only Dean mode

**All-program Course assignment manager**:
A Secretary or Dean user who can manage General Education and Program-specific Course assignments across every academic program through the same operational rules.
_Avoid_: Secretary mode, Dean mode, role impersonation

**Role-owned route**:
A dashboard URL owned by one role even when the underlying operation capability is shared with another role. Secretary and Dean Course assignment routes remain separate role-owned routes.
_Avoid_: Role impersonation route, shared dashboard route

**Faculty affiliation**:
A faculty member's active relationship to one or more academic programs. Affiliation is displayed as assignment context, but it does not prevent a Program Head from assigning a faculty member from another program to one of the Program Head's program-specific Courses.
_Avoid_: Faculty scope, assignment permission

**Class section**:
A predefined shift (Morning, Afternoon, Evening) during which a course assignment is taught.
_Avoid_: Section code, free-text section

**Course-bound evaluation**:
A single term-scoped evaluation of course learning outcomes (CILOs) deployed exactly once per Course assignment. Publication requires at least one active Student to receive an assignment, creates assignments for every active Student in that Course-assignment roster except explicitly excluded Students with a recorded reason, and locks the roster against membership changes. Current account, profile, and term-placement eligibility dynamically controls unsubmitted participation and pending counts. An ineligible Student cannot begin or continue pending participation, but their already submitted response remains counted. Any existing incomplete draft remains uncounted and becomes accessible again only if eligibility returns before the evaluation closes. A published evaluation blocks permanent Course assignment deletion. Development seed data creates memberships explicitly.
_Avoid_: CILO evaluation, survey, exam

**Course-bound evaluation exclusion**:
A recorded decision in a dedicated record not to create an evaluation assignment for one active Course-assignment roster member. It does not change roster membership and records a standard reason category; `Other` includes a neutral short explanation without sensitive medical or disciplinary detail. Any authorized roster manager may reverse it before the evaluation closes by recording a distinct standard reversal reason, actor, time, and constrained `Other` explanation before creating the missing evaluation assignment; the assignment appears in the Student portal without a notification.
_Avoid_: Roster removal, unrecorded recipient omission

**Merged class**:
A class composed of students from different academic programs taught together, represented in CLOIE as separate course assignments (one per program).
_Avoid_: Combined class, mixed assignment

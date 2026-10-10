# Identity and Access

Identity and Access defines how people enter System CLOIE, claim or use account roles, authenticate with Google, complete onboarding, and move through access states.

## General Education Coordinator (approved scope, issue #477)

**General Education Coordinator (`GEN_ED_COORDINATOR`)**:
A pre-provisioned System CLOIE account role for college-wide General Education CourseAssignment stewardship after the approved transfer. It requires an eligible `acd.edu.ph` / `acdeducation.com` institutional email and SHALL NOT require `program_id`. Self-service role claim SHALL reject `GEN_ED_COORDINATOR`. No assignment or portfolio table exists in this change.
_Avoid_: Self-service Coordinator claim, Coordinator with `program_id`

**Coordinator scope model — shared college-wide**:
Every active `GEN_ED_COORDINATOR` account shares the same managed scope: `Course.course_scope == GENERAL_EDUCATION`. Authorization is derived from Course scope, not a nullable `Course.program_id` or an assignment row. A portfolio-partitioned model requires a separately approved capability change and a new assignment model and is not enabled.
_Avoid_: Coordinator portfolio assignment, fake General Education Program, ProgramHead-like scope table

**Coordinator assignment authority** (after the approved transfer; server-enforced):
Secretary: no Course assignment mutation; read-only visibility only. Coordinator: college-wide read and mutation for General Education assignments only. Program Head: mutation for Program-specific assignments within the Authorized Program set; read-only for General Education. Dean: all-program mutation across General Education and Program-specific assignments. Faculty: read-only for own assignments; no assignment mutation. Server services enforce the General Education predicate inside reads and every mutation path (create, update, activation, deactivation, deletion, deletion preflight, bulk creation).
_Avoid_: Program Head Coordinator mutation, Secretary General Education mutation after the transfer, client-provided course_scope filter

**Course evidence ownership**:
The active General Education Coordinator owns General Education Course-bound response review and analytics college-wide. The active Program Head owns Program-specific Course-bound and Central evidence within authorized Programs. A Student's Program membership grants no General Education evidence access to the Program Head. Faculty and Dean evidence permissions are unchanged by this transfer.
_Avoid_: Program-scoped General Education review, assigned role as active authority


## Language

**Self-service role claim**:
A user-selected request to join System CLOIE under a role that the system allows the user to choose for themselves, without a prior invitation or roster match.
_Avoid_: Self-sign up, self-registration when discussing authorization semantics

**Incomplete self-service role claim**:
A self-service role claim that has assigned the System CLOIE account role but has not yet completed the role's required onboarding data.
_Avoid_: Completed account, role change

**Incomplete role cancellation**:
A request to abandon one assigned self-service role before its required profile artifact exists. The requested role is checked against the account's assigned-role set and removed only while its own completion artifact remains absent; another active role is preserved. Student is never cancellable this way: it has no self-service artifact, and cancelling would strip a legitimately provisioned account.
_Avoid_: Account deletion, active role selection, completed-role revocation

**Pre-provisioned role**:
A System CLOIE account role that an administrator must create before the person can sign in through the staff entrance.
_Avoid_: Invite-only when the account is already created directly by an administrator

**Managed role transition**:
An administrator-controlled role change where the administrator must provide the target role's required institution-managed information before the role is usable.
_Avoid_: Self-service onboarding, incomplete self-service role claim

**Secretary-created account**:
A System CLOIE account created by a Secretary as either the required path for pre-provisioned roles or an override path for self-service roles, with the selected role's required institution-managed information completed at creation time. Its required `User.name` is provisional until the first real Google OAuth link, which replaces it with the Google-derived account name defined by ADR 0014.
_Avoid_: Seeded user, invited user when no invitation is involved

**Canonical account name**:
The single opaque human-readable name stored on `User` and displayed throughout System CLOIE. It is not a first-name/last-name pair and must not be parsed into semantic name components.
_Avoid_: First name, last name, surname, email-derived name

**Provisional pre-link name**:
The required `User.name` entered when a Secretary creates an account before its first real Google OAuth link. It keeps the pre-provisioned account complete before sign-in and is replaced by the Google-derived account name at first link.
_Avoid_: Placeholder name, permanent Secretary name

**First OAuth link**:
The first successful association of a Google/Supabase Auth identity with a domain `User`, normally identified by the User having no `auth_user_id` before the callback. The callback matches the account by exact normalized email, stores the Auth link, and replaces a provisional pre-link name with the Google-derived account name.
_Avoid_: Role claim, account takeover, routine login

**Google-derived account name**:
The canonical account name resolved from the authenticated Google provider metadata during a new account creation or first OAuth link. Resolution prefers `name`, then `full_name`, then `given_name` plus `family_name`; it never uses the Gmail address local part.
_Avoid_: Parsed first/last name, email-derived name, synchronized login name

**Secretary name correction**:
An authorized Secretary update to a linked User's canonical account name. It remains authoritative on later OAuth callbacks because Google name metadata is not synchronized after first link.
_Avoid_: Student self-edit, automatic Google synchronization

**Bootstrap secretary**:
The first real Secretary account created through a one-time setup path before normal administrator-managed account creation is available.
_Avoid_: Self-claimed admin, public admin registration

**Internal role**:
A System CLOIE role for people participating from inside Assumption College of Davao: Secretary, College Dean, Program Head, Faculty Member, or Student.
_Avoid_: Staff role, ACD role when including Students

**ACD institutional email**:
An email address on exactly `acd.edu.ph` or `acdeducation.com`, used to establish eligibility for internal roles in both public-entry and Secretary-created account flows.
_Avoid_: Any ACD subdomain, any school-looking email

**External role**:
A System CLOIE role for people participating from outside the current institution: Alumni or Industry Partner.
_Avoid_: Guest role, public role

**Scoped entrance**:
One of the audience-separated public entry points where a person chooses how they enter System CLOIE: the Student entrance, the staff entrance (Secretary, Dean, Program Head, General Education Coordinator, Faculty), Faculty registration, or the email-first external entrance for Alumni and Industry Partner. Every entrance issues a legal acknowledgement ticket bound to that entrance before any authentication contact.
_Avoid_: Role selection portal, one shared role card grid

**Audience landing page**:
A public page at `/entry/student`, `/entry/staff`, or `/entry/external` that identifies its audience and offers one primary sign-in action into the existing scoped entrance. Student has no registration link; staff offers a secondary Faculty request link; external offers a secondary account-creation link. These pages choose a navigation destination, never claim a role or grant access. Login and audience-specific registration back navigation returns to the corresponding audience landing page.
_Avoid_: Authentication gate, audience detection, workspace

**Public entry**:
The audience landing pages, scoped entrances, and System CLOIE homepage are the way people enter System CLOIE, whether they are registering for the first time or returning to an existing account. The homepage links to the three audience landing pages rather than presenting competing sign-in actions.
_Avoid_: Role-less login as the main entry point, retired portal selection

**Entry intent**:
The entrance binding carried by the legal acknowledgement ticket: one of the eight role intents, or the role-less `staff` and `external` entrance intents. A role-less entry intent never claims or creates a role; the callback resolves the existing account, requires provisioning for an unknown staff address, and sends an unknown external address to external registration. External registration binds the chosen role's intent (`alumni` or `industry-partner`) to its Google action, so a new Google holder claims that role and enters its onboarding instead of returning to registration; the external sign-in entrance keeps the role-less intent because returning holders resolve through their existing session.
_Avoid_: Role claim, authorization decision

**Google-only internal role**:
An internal role — Student, Faculty, Secretary, Dean, Program Head, or General Education Coordinator — that may only be used from a current Google sign-in. A password, one-time-code, or recovery session for the same Auth identity is refused at the centralized session boundary and at internal Server Actions, and Alumni and Industry Partner are the only roles that may use email-password alongside Google.
_Avoid_: Any authenticated session, user_metadata provider claim

**Proved Google session**:
A session whose verified access-token claims resolve to Google. GoTrue reports every OAuth provider as the single `amr` method `oauth`, so OAuth alone is not Google proof: the session is accepted only when the recorded `app_metadata.provider` is `google`, System CLOIE enables Google as its only OAuth provider, and no proved password, one-time-code, or recovery method is present. `user_metadata` is never consulted because the person can edit it.
_Avoid_: Trusting app_metadata alone as a session method, assuming amr names the provider

**Recovery-confined session**:
A verified recovery-code session that may change the password but cannot enter any internal or external workspace. Raw code sessions are not workspace-authorized. A verified signup may continue external onboarding only when the server has proved its signup purpose for that exact session. Both successful and failed password updates end the recovery session before normal sign-in resumes.
_Avoid_: External workspace session, recovery as institutional approval

**External stakeholder invite**:
A Secretary-managed invitation (ExternalStakeholderInvite) that offers an Alumni or Industry Partner person entry into System CLOIE, with statuses DRAFT, SENT, ACCEPTED, and REVOKED and an optional program scope; it is the parallel invite-based entry path alongside self-service external sign-up.
_Avoid_: Self-service external sign-up, generic invitation email

**Google-authenticated account**:
A System CLOIE account whose identity is proven through Google OAuth rather than a System CLOIE-managed password. For real OAuth accounts, the Google profile supplies the canonical account name only when the account is first created or first linked; later callbacks preserve the stored name.
_Avoid_: Password account, email-code account, synchronized Google profile

**Legal acknowledgement gate**:
The signed legal-acknowledgement ticket the OAuth callback requires before the Google code exchange proceeds; a missing or invalid ticket redirects to the site root, so the privacy/terms acknowledgement precedes role selection.
_Avoid_: Post-login consent banner, cookie consent

**Dedicated demo deployment**:
An isolated production-mode System CLOIE deployment with resettable demo data and explicitly enabled signed demo sessions for demonstrations and route-performance evidence.
_Avoid_: Primary Production, development server, public demo bypass

**Demo-authenticated account**:
A seeded System CLOIE account selected through the dedicated demo deployment role switcher and represented by a short-lived signed demo session; its identity does not change the account's normal authorization or account-state rules. Demo and development authentication retain fixture-controlled names and do not perform Google name derivation or first-link replacement.
_Avoid_: Real OAuth account, development-only account

**Account email**:
The trimmed lowercase email address used to match a Google-authenticated identity to a System CLOIE account during the first OAuth link. It establishes the account match but never supplies the account name. An already-linked User whose email is presented with a different Auth identity fails closed rather than being relinked.
_Avoid_: Gmail alias, display email when discussing identity matching

**Assigned account role**:
A System CLOIE role attached to an account that the person may select as their active context. An account may hold multiple distinct assigned roles, but assigned membership alone grants no authority while another role is active.
_Avoid_: Role stack, simultaneous authority, primary role

**Active account role**:
The one assigned role currently used for dashboard access, authorization, onboarding gates, and account-state decisions.
_Avoid_: Any assigned role, client-granted role, primary role

**Withheld active role**:
The state of an active role whose profile gate denies access: a Google-only role opened by a password, one-time-code, or recovery session, an inactive account, a rejected external account, a Faculty request not yet approved, or a Student awaiting institution-recorded placement. The session still reports the assigned role and the gate still names it, but `activeRole` resolves to no role, so every internal role guard fails closed while the workspace switcher can still move to a role the session may actually use. Gates that redirect to a self-service route a person may still complete — role selection, Faculty registration, external onboarding, deferred enrollment — do not withhold.
_Avoid_: Revoked role, unassigned role, inactive session

**Active role selection**:
A person's choice among their assigned account roles. Selection changes authorization context but does not create, revoke, or complete a role. An authenticated, active multi-role account without a valid selection may enter the shared app shell and `/select-role` without workspace authority. Role-owned guards and the generic dashboard redirect this state to `/select-role`; they never choose a role automatically. Every new sign-in starts in this state: the Google callback and logout both discard the remembered selection, so a multi-role account chooses its workspace at each sign-in and never inherits the previous one. Role-less accounts and denied profile gates do not receive this allowance.
_Avoid_: Role impersonation, role assignment, role change

**Role change**:
An administrator-controlled change to an account's assigned-role set after registration.
_Avoid_: Active role selection, role upgrade

**Role requirement**:
The role-specific information that must exist before a System CLOIE account can actively use a selected account role.
_Avoid_: Optional profile data, historical record

**Program Head assignment**:
The managed program a Program Head is responsible for in System CLOIE; a Secretary-created Program Head account must start with exactly one active Program Head assignment.
_Avoid_: Faculty program affiliation, teaching assignment

**Program Head assignment activation/deactivation**:
A Secretary-managed reversible change to a Program Head assignment row's active state; it preserves the assignment row, its creation time, and its relationship history, and it does not change the Program Head account role.
_Avoid_: Assignment deletion, role revocation, primary Program change

**Authorized Program set**:
The complete set of Programs represented by a Program Head's active assignments; it defines which Programs the Program Head may deliberately select for current management work.
_Avoid_: Primary Program, default Program, remembered Program

**Selected Program context**:
The one Program a Program Head deliberately chooses for the current management activity after it is checked against the Authorized Program set; it is an operation context, not an account attribute.
_Avoid_: Primary Program, default Program, Program preference

**Graduate transition**:
An administrator-controlled role change that moves a former Student account into Alumni participation: an administrator removes the student academic context, revokes the Student role, and assigns the Alumni role through generic role management.
_Avoid_: Separate alumni account, self-service graduation

**Historical student record**:
Enrollment ledger rows and evaluation history that remain attached to the User account after the Student role is revoked; the student academic profile itself is not retained.
_Avoid_: Active Student role, deleted student record

**Role mismatch**:
A sign-in attempt whose requested role is neither already assigned nor eligible for self-service claim by that Google-authenticated account.
_Avoid_: Active role selection, stale active-role preference

**Faculty program affiliation**:
The academic program a Faculty Member is associated with for System CLOIE participation; a Secretary-created Faculty account must start with one primary faculty program affiliation, while additional affiliations may be managed after account creation.
_Avoid_: Faculty course assignment, teaching load when referring only to onboarding identity

**Teaching capability**:
A term-scoped ability to perform course instructor work for a specific course assignment, independent of which account roles the person holds.
_Avoid_: Faculty-role requirement, unrestricted teaching access

**Course assignment**:
A term-scoped assignment of a person to handle a course for a specific academic context, granting teaching capability for that course.
_Avoid_: Teaching assignment, faculty-only assignment

**Course assignment ownership**:
The relationship that lets an assigned Faculty Member or Program Head perform course-instructor actions for that assigned course.
_Avoid_: Role-only course access, program-wide teaching access

**Course-level CILO**:
A course intended learning outcome that belongs to a course rather than to a specific course assignment or assignment period.
_Avoid_: Assignment-specific CILO, faculty-owned CILO

**Active course assignment**:
A course assignment in the current active assignment period that grants current teaching capability.
_Avoid_: Upcoming course assignment, past course assignment

**Upcoming course assignment**:
A course assignment in a future assignment period that may be shown for planning awareness but does not grant teaching capability.
_Avoid_: Active course assignment, preparation access

**Scoped teaching self-assignment**:
A Program Head assigning themselves teaching capability only for a course within a program they manage.
_Avoid_: Unrestricted self-assignment, second Faculty role

**Secretary-recorded enrollment**:
A Secretary-provided academic enrollment record for a Student account in the active academic term, including program, year level, and section; a Secretary-created Student account should receive this record at creation time when an active term exists. It is the only writer of a Student's placement — no self-service form exists.
_Avoid_: Self-declared enrollment, optional profile note

**Student academic profile**:
The stable academic affiliation for a Student account, including academic program and an applicable major when the selected program has active majors. System CLOIE does not collect or treat a Student-entered institutional ID as authoritative identity.
_Avoid_: Current enrollment, year level record, section record

**Deferred enrollment**:
A Student state where the student profile has been created but active-term enrollment could not yet be recorded because no active academic term is available.
_Avoid_: Failed student onboarding, completed enrollment, blocked account

**Pending external account**:
An Alumni or Industry Partner account that has completed self-service onboarding but has not yet been verified by the institution.
_Avoid_: Blocked account, incomplete account

**Rejected external account**:
An Alumni or Industry Partner account that the institution has reviewed and decided should not access role dashboards.
_Avoid_: Pending account, incomplete account

**Inactive account**:
A System CLOIE account that has been disabled by an administrator and cannot access role dashboards regardless of role, onboarding, or verification state.
_Avoid_: Rejected external account, incomplete account

**Account status page**:
A non-dashboard page that explains why a Google-authenticated person cannot continue into the selected System CLOIE role or dashboard. Safe outcomes include missing Google account name (new account or first OAuth link blocked without mutation) and identity conflict (normalized-email match already linked to a different Auth identity; record preserved, session terminated, no internal IDs disclosed).
_Avoid_: Login error page, onboarding page, provider diagnostic dump

**External verification**:
The institutional review state for an Alumni or Industry Partner account after self-service onboarding; Secretary-created external accounts are considered institution-verified at creation time.
_Avoid_: Profile completion, onboarding status

**Alumni profile**:
The graduate identity for an Alumni account, including the academic program, applicable major when the selected program has majors in the catalog, and graduation year the person claims or the institution records.
_Avoid_: Student profile, alumni proof record

**Industry Partner profile**:
The self-declared organization identity for an Industry Partner account, including the company or organization the person represents and its program affiliations; affiliations are stored in the IndustryPartnerProgramAffiliation join table (unique per industry partner and program) and synced on profile save, while the legacy single program_id field remains with a one-program ceiling as the upgrade path.
_Avoid_: Employer record, company account

**Protected account edit**:
A Secretary-managed account change that can alter academic history, current student placement, managed program responsibility, or external access; System CLOIE requires an explicit review of the exact changes before saving it.
_Avoid_: Ordinary profile correction, browser-only confirmation

**Table access disposition**:
The single declared database access boundary for a Prisma-backed application table: role-aware RLS, authenticated read-only, server-only, or an approved application-layer authorization exception. One table, exactly one disposition; the registry in `src/lib/db/table-access-dispositions.ts` is verified deterministically and against live database probes.
_Avoid_: Partial RLS coverage, unclassified table access

**Role-aware RLS table**:
An application table whose rows are gated by row-level security policies keyed to role, with live policy evidence exercised through the disposable RLS harness.
_Avoid_: RLS table without live probe evidence

**Authenticated read-only table**:
An application table any authenticated identity may read in full while writes are denied at the database boundary.
_Avoid_: Public table, unauthenticated read table

**Server-only table**:
An application table with no direct anon or authenticated access — RLS enabled and privileges revoked — reached only through server-side Prisma under the service role.
_Avoid_: Direct Data API table, exposed table

**Application-layer authorization exception**:
An approved waiver of the RLS boundary where server code is the authorization owner; it must name the owning server module and must not weaken existing authorization.
_Avoid_: Unnamed exception, silent RLS waiver

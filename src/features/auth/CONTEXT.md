# Identity and Access

Identity and Access defines how people enter CLOIE, claim or use account roles, authenticate with Google, complete onboarding, and move through access states.

## Language

**Self-service role claim**:
A user-selected request to join CLOIE under a role that the system allows the user to choose for themselves, without a prior invitation or roster match.
_Avoid_: Self-sign up, self-registration when discussing authorization semantics

**Incomplete self-service role claim**:
A self-service role claim that has assigned the CLOIE account role but has not yet completed the role's required onboarding data.
_Avoid_: Completed account, role change

**Pre-provisioned role**:
A CLOIE account role that must be created by an administrator before the person can enter through the role selection portal.
_Avoid_: Invite-only when the account is already created directly by an administrator

**Managed role transition**:
An administrator-controlled role change where the administrator must provide the target role's required institution-managed information before the role is usable.
_Avoid_: Self-service onboarding, incomplete self-service role claim

**Secretary-created account**:
A CLOIE account created by a Secretary as either the required path for pre-provisioned roles or an override path for self-service roles, with the selected role's required institution-managed information completed at creation time. Its required `User.name` is provisional until the first real Google OAuth link, which replaces it with the Google-derived account name defined by ADR 0014.
_Avoid_: Seeded user, invited user when no invitation is involved

**Canonical account name**:
The single opaque human-readable name stored on `User` and displayed throughout CLOIE. It is not a first-name/last-name pair and must not be parsed into semantic name components.
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
A CLOIE role for people participating from inside Assumption College of Davao: Secretary, College Dean, Program Head, Faculty Member, or Student.
_Avoid_: Staff role, ACD role when including Students

**ACD institutional email**:
An email address on exactly `acd.edu.ph` or `acdeducation.com`, used to establish eligibility for internal roles in both public-entry and Secretary-created account flows.
_Avoid_: Any ACD subdomain, any school-looking email

**External role**:
A CLOIE role for people participating from outside the current institution: Alumni or Industry Partner.
_Avoid_: Guest role, public role

**Role selection portal**:
The single public entry point where a person chooses the CLOIE role they want to enter with before continuing through authentication and any required onboarding.
_Avoid_: Separate sign-up pages per role

**Public entry**:
The role selection portal is the primary way people enter CLOIE, whether they are registering for the first time or returning to an existing account.
_Avoid_: Role-less login as the main entry point

**Google-authenticated account**:
A CLOIE account whose identity is proven through Google OAuth rather than a CLOIE-managed password. For real OAuth accounts, the Google profile supplies the canonical account name only when the account is first created or first linked; later callbacks preserve the stored name.
_Avoid_: Password account, email-code account, synchronized Google profile

**Dedicated demo deployment**:
An isolated production-mode CLOIE deployment with resettable demo data and explicitly enabled signed demo sessions for demonstrations and route-performance evidence.
_Avoid_: Primary Production, development server, public demo bypass

**Demo-authenticated account**:
A seeded CLOIE account selected through the dedicated demo deployment role switcher and represented by a short-lived signed demo session; its identity does not change the account's normal authorization or account-state rules. Demo and development authentication retain fixture-controlled names and do not perform Google name derivation or first-link replacement.
_Avoid_: Real OAuth account, multi-role account, development-only account

**Account email**:
The trimmed lowercase email address used to match a Google-authenticated identity to a CLOIE account during the first OAuth link. It establishes the account match but never supplies the account name. An already-linked User whose email is presented with a different Auth identity fails closed rather than being relinked.
_Avoid_: Gmail alias, display email when discussing identity matching

**CLOIE account role**:
The single role that defines a user's participation in CLOIE.
_Avoid_: Primary role, role stack, multi-role account

**Active account role**:
The current CLOIE account role used for dashboard access, onboarding gates, and account-state decisions.
_Avoid_: Historical profile, previous role

**Role change**:
An administrator-controlled change from one CLOIE account role to another after the account has already been registered.
_Avoid_: Self-service role switch, role upgrade, role stacking

**Role requirement**:
The role-specific information that must exist before a CLOIE account can actively use a selected account role.
_Avoid_: Optional profile data, historical record

**Program Head assignment**:
The managed program a Program Head is responsible for in CLOIE; a Secretary-created Program Head account must start with exactly one active Program Head assignment.
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
An administrator-controlled role change that moves a former Student account into Alumni participation.
_Avoid_: Separate alumni account, self-service graduation

**Historical student record**:
Student profile, enrollment, and evaluation history retained after a former Student moves into another CLOIE account role.
_Avoid_: Active Student role, deleted student record

**Role mismatch**:
A sign-in attempt where the selected portal role differs from the existing CLOIE account role for the authenticated Google identity.
_Avoid_: Role switch, primary-role fallback

**Faculty program affiliation**:
The academic program a Faculty Member is associated with for CLOIE participation; a Secretary-created Faculty account must start with one primary faculty program affiliation, while additional affiliations may be managed after account creation.
_Avoid_: Faculty course assignment, teaching load when referring only to onboarding identity

**Teaching capability**:
A term-scoped ability to perform course instructor work for a specific course assignment, regardless of whether the account role is Faculty Member or Program Head.
_Avoid_: Second account role, role switching

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

**Faculty self-service account**:
A Faculty account claimed through the role selection portal using an institutional email and completed by choosing a faculty program affiliation.
_Avoid_: Faculty pending account, faculty pre-provisioned account

**Self-declared enrollment**:
A Student-provided academic enrollment claim used by CLOIE to place the student in an active term, program, year level, and section.
_Avoid_: Registrar-verified enrollment, official enrollment record

**Secretary-recorded enrollment**:
A Secretary-provided academic enrollment record for a Student account in the active academic term, including program, year level, and section; a Secretary-created Student account should receive this record at creation time when an active term exists.
_Avoid_: Self-declared enrollment, optional profile note

**Student academic profile**:
The static academic identity for a Student account, including student ID number, academic program, and applicable major when the selected program has majors in the catalog.
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
A CLOIE account that has been disabled by an administrator and cannot access role dashboards regardless of role, onboarding, or verification state.
_Avoid_: Rejected external account, incomplete account

**Account status page**:
A non-dashboard page that explains why a Google-authenticated person cannot continue into the selected CLOIE role or dashboard. Safe outcomes include missing Google account name (new account or first OAuth link blocked without mutation) and identity conflict (normalized-email match already linked to a different Auth identity; record preserved, session terminated, no internal IDs disclosed).
_Avoid_: Login error page, onboarding page, provider diagnostic dump

**External verification**:
The institutional review state for an Alumni or Industry Partner account after self-service onboarding; Secretary-created external accounts are considered institution-verified at creation time.
_Avoid_: Profile completion, onboarding status

**Alumni profile**:
The graduate identity for an Alumni account, including the academic program, applicable major when the selected program has majors in the catalog, and graduation year the person claims or the institution records.
_Avoid_: Student profile, alumni proof record

**Industry Partner profile**:
The self-declared organization identity for an Industry Partner account, including the company or organization the person represents and any applicable program affiliation.
_Avoid_: Employer record, company account

**Protected account edit**:
A Secretary-managed account change that can alter academic history, current student placement, managed program responsibility, or external access; CLOIE requires an explicit review of the exact changes before saving it.
_Avoid_: Ordinary profile correction, browser-only confirmation

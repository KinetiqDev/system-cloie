# Evaluations

Evaluations defines how System CLOIE deploys instruments to respondents — the deployment kinds, their lifecycle and publication gating, roster exclusions, and who is authorized to deploy.

## Deployment kinds

**Deployment**:
A scheduled instance of an instrument version offered to a population of respondents. System CLOIE has two deployment kinds — Course-bound evaluations and Central deployments — both carrying an instrument version, a deployment name, optional activation and deadline, and a status.
_Avoid_: Survey, survey event

**Course-bound evaluation**:
A per-class deployment bound to exactly one Course Assignment and offered to that class's roster members. It evaluates CILO-bound Likert questions, snapshotting each bound CILO description and question prompt at publish time.
_Avoid_: Class evaluation when the Central Deployment distinction matters

**Central deployment**:
A program-wide deployment bound to a term instance and one TargetStakeholder — `STUDENT`, `ALUMNI`, or `INDUSTRY_PARTNER` — optionally narrowed by program, major, and year level. Publishing snapshots each bound PLO's code, description, and question prompt into `CentralDeploymentPloSnapshot` rows.
_Avoid_: Program-wide evaluation when stakeholder targeting matters

## Lifecycle and gating

**Deployment lifecycle**:
The status progression `DRAFT -> SCHEDULED -> ACTIVE -> CLOSED`. Publishing derives `SCHEDULED` when activation is in the future, otherwise `ACTIVE`; closing moves only `ACTIVE` or `SCHEDULED` deployments to `CLOSED`. `ARCHIVED` exists in the enum but is written by no service.
_Avoid_: PENDING, EXPIRED

**Publication alignment gate**:
Before a Course-bound evaluation publishes, every active CILO must satisfy the Course scope's typed alignment rule. General Education requires at least one active Institutional Outcome alignment with a manifestation; Program-specific courses require a manifestation on every active PLO of the owning program, and zero active PLOs with active CILOs is incomplete.
_Avoid_: Partial alignment, publish-with-warnings

## Roster exclusions

**Roster exclusion**:
Removal of an active roster member from a deployed evaluation, recorded under one of `APPROVED_ACCOMMODATION`, `NOT_TAKING_ASSESSMENT`, `ADMINISTRATIVE_EXCEPTION`, or `OTHER`, with the acting user and timestamp. One exclusion per member per evaluation.
_Avoid_: Unenrollment, roster removal

**Exclusion reversal**:
Undoing an exclusion under `EXCLUDED_IN_ERROR`, `ELIGIBILITY_CORRECTED`, `APPROVED_LATE_PARTICIPATION`, or `OTHER`. While the deployment window is open (`ACTIVE` or `SCHEDULED` and before the deadline), late inclusion re-creates the respondent's EvaluationAssignment.
_Avoid_: Re-add, un-exclude

**Neutral OTHER explanation**:
Only the `OTHER` exclusion and reversal categories carry free text, and it must be 5-200 characters and screened against sensitive-detail patterns such as medical, disciplinary, or sanction terms.
_Avoid_: Notes field, detailed reason

## Deployment authorization

**On-behalf deployment authorization**:
Who may publish a Course-bound evaluation for a given assignment: `FACULTY` deploy only their own assignments; `PROGRAM_HEAD` deploys within assigned programs and never for General Education courses; `DEAN` and `SECRETARY` may deploy on behalf of any faculty.
_Avoid_: Role hierarchy fallback, self-service only

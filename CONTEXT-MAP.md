# Context Map

## Contexts

- [Identity and Access](./src/features/auth/CONTEXT.md) - manages Google-authenticated accounts, role entry, onboarding gates, and account access states.
- [Academic Calendar](./src/features/academic-calendar/CONTEXT.md) - defines school years, semesters, terms, and active academic periods.
- [Course Catalog and Assignments](./src/features/course-assignments/CONTEXT.md) - defines courses, class sections, teaching assignments, and evaluation scopes.
- [Academic Structure](./src/features/academic-structure/CONTEXT.md) - defines academic programs and majors offered by the college.
- [Outcomes](./src/features/outcomes/CONTEXT.md) - defines the college-wide Institutional Learning Outcome catalog (GEN_ED_COORDINATOR owns ILO), Program-owned Program Learning Outcomes, Course-level CILOs, typed alignment relations, readiness semantics, and role responsibilities.
- [Analytics](./src/features/analytics/CONTEXT.md) - defines submitted-response evidence, source-aware analytics terminology, Program PLO evidence boundaries, and bounded AI-assisted interpretation.
- [Design System](./src/features/design-system/CONTEXT.md) - defines root semantic tokens, unified appearance preferences (Light, Dark, System), protected visual showcase, and production-surface inventory.
- [Evaluations](./src/features/evaluations/CONTEXT.md) - defines evaluation deployments (Course-bound and Central), the deployment lifecycle, roster exclusions and reversals, publication alignment gating, and deployment authorization.
- [Instruments](./src/features/instruments/CONTEXT.md) - defines evaluation instrument templates, immutable versions with frozen structure snapshots, question types, CILO/PLO question bindings, and baseline/program-copy provisioning.
- [Responses](./src/features/responses/CONTEXT.md) - defines the one-response invariant, response lifecycle, availability and eligibility gating, section-scoped draft saves, and atomic submission completeness.
- [Response Review](./src/features/response-review/CONTEXT.md) - defines identified vs anonymized review flows, submitted-answer outcome bindings, the SUBMITTED gate, period labels, and qualitative summaries.
- [Enrollments](./src/features/enrollments/CONTEXT.md) - defines the per-term student enrollment ledger, enrollment sources, upsert semantics, soft deactivation, and class lookup targeting.
- [Users](./src/features/users/CONTEXT.md) - defines profile gates, the single-active-role invariant, provisioning rules, external stakeholder invites, verification statuses, role revocation gates, and program scope records.
- [Dean Oversight](./src/features/dean/CONTEXT.md) - defines the Dean's period-scoped oversight read model: readiness KPIs, risk buckets, mapping gaps, archived outcome display, and roster paging.
- [Legal](./src/features/legal/CONTEXT.md) - defines privacy/terms document versioning, the signed acknowledgement ticket gate before role selection, and the non-anonymity disclosure.

## Relationships

- **Identity and Access -> Users**: Identity and Access owns account role and access-state language; Users owns profile/admin-user management screens and services that operate on those accounts.
- **Identity and Access -> Portals**: The role selection portal is the public entry UI for Identity and Access flows.
- **Identity and Access -> Enrollments**: Student onboarding may create or defer active-term enrollment after the Student account role and profile are established.
- **Identity and Access -> Academic Calendar**: Deferred enrollment depends on whether an active academic term exists.
- **Course Catalog and Assignments -> Academic Calendar**: Course assignments are scoped to the active academic period.
- **Academic Structure -> Course Catalog and Assignments**: Program-specific courses and course assignments reference the academic program that owns or scopes them.
- **Academic Structure -> Outcomes**: Program Learning Outcomes are owned by and scoped to Academic Programs.
- **Course Catalog and Assignments -> Outcomes**: Course scope (General Education vs Program-specific) determines the typed alignment relation and valid target catalog for a Course's CILOs; active Course Assignments scope Faculty mapping authority and readiness contexts.
- **Academic Calendar -> Outcomes**: Outcome readiness and completed-period readiness snapshots are scoped to academic periods.
- **Analytics -> Academic Calendar**: Analytics evidence is filterable by canonical School Year, Semester, and Academic Term context.
- **Analytics -> Course Catalog and Assignments**: Course-bound student evidence and evaluation opportunities originate from Course-bound evaluations and their assignments.
- **Analytics -> Outcomes**: Program PLO evidence follows typed Program-specific CILO-to-PLO mappings; Institutional Outcome evidence and ILO-to-PLO crosswalks remain separate/deferred.
- **Design System -> All Contexts**: Design System provides shared semantic tokens, appearance resolution, and production component primitives consumed across all feature visual surfaces.
- **Evaluations -> Instruments**: deployments pin an InstrumentVersion; published instruments never reference the live template.
- **Evaluations -> Outcomes**: the publication alignment gate enforces typed alignment manifestations for every active CILO before a Course-bound evaluation publishes.
- **Evaluations -> Course Catalog and Assignments**: Course-bound evaluations bind a CourseAssignment and target its authoritative roster; exclusions and reversals operate on roster memberships.
- **Responses -> Evaluations**: answering is gated by the deployment availability window and, for Course-bound evaluations, active roster membership.
- **Response Review -> Responses**: review bodies serve only after SUBMITTED; identified respondent detail is a Program-Head-only flow.
- **Enrollments -> Academic Calendar**: ledger rows scope to AcademicTermInstances; Term rollover creates ROLLOVER-source enrollments in the target term.
- **Legal -> Identity and Access**: the signed acknowledgement ticket gates the OAuth callback before Google code exchange and role selection.
- **Dean Oversight -> Outcomes**: the oversight read model consumes period readiness snapshots and typed mapping-gap vocabulary defined by Outcomes.

---
title: System CLOIE Product Overview
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# System CLOIE Product Overview

System CLOIE is a college-wide outcomes-based education (OBE) evaluation, monitoring, analytics, and reporting platform for Assumption College of Davao (ACD). It collects stakeholder evaluations against the institution's outcome layers — Institutional Learning Outcomes (ILOs), Program Learning Outcomes (PLOs), and Course Intended Learning Outcomes (CILOs) — and turns submitted responses into evidence for monitoring and continuous quality improvement.

The three outcome layers and their ownership rules are defined in [src/features/outcomes/CONTEXT.md](../../src/features/outcomes/CONTEXT.md) and [docs/adr/0005-outcome-ownership-and-dean-oversight.md](../adr/0005-outcome-ownership-and-dean-oversight.md).

## What System CLOIE is not

Per the accepted boundaries in [../system-cloie-user-journeys.md](../system-cloie-user-journeys.md) (§12), System CLOIE is **not**:

- an **LMS** — no instruction delivery, course content, or learning activities;
- an **SIS** — the Enrollments domain is a per-term student placement ledger ([src/features/enrollments/CONTEXT.md](../../src/features/enrollments/CONTEXT.md)), not registrar enrollment processing;
- a **grading or transcript system** — analytics evidence is explicitly "not an individual student mastery record, grade, or transcript" ([src/features/analytics/CONTEXT.md](../../src/features/analytics/CONTEXT.md));
- a **scheduling system** or a **full accreditation platform**.

## System boundary

**Inside the boundary** (each owned by a domain context below): role entry and account states, academic structure and calendar, curriculum placement _records_, course assignments and rosters, outcome catalogs and typed alignment with readiness tracking, instrument templates and immutable versions, evaluation deployments, response collection with the one-response invariant, response review, analytics evidence, and Dean oversight read models.

**Outside the boundary**, verified against the current CONTEXT.md files:

- **Instruction delivery, grades, transcripts, enrollment administration** — not modeled anywhere; the closest domains (Curriculum, Enrollments, Analytics) deliberately stop short of them.
- **Curriculum revision as an academic act.** The Curriculum domain only _documents_ course placements across versioned curriculum revisions ([src/features/curriculum/CONTEXT.md](../../src/features/curriculum/CONTEXT.md)); "curricula never auto-generate assignments or schedules". Deciding what a revised curriculum should contain happens outside the system.
- **Academic decision-making.** Analytics supplies submitted-response evidence "to inspect perceived or stakeholder-rated attainment" for continuous quality improvement; AI-assisted interpretation is a bounded supplement that "does not replace the Program Head's human CQI judgment" ([src/features/analytics/CONTEXT.md](../../src/features/analytics/CONTEXT.md)). Decisions remain with the institution's people.
- **Formal report generation/exports** — intended part of the platform, but currently **stubbed/deferred**: Program Head exports are stubbed and Dean report routes are unavailable pending report contracts ([../system-cloie-user-journeys.md](../system-cloie-user-journeys.md) §10.2, §13).

## Stakeholder groups

- **Internal staff**: Secretary, College Dean, Program Head, General Education Coordinator, Faculty Member.
- **Internal respondents**: Students (including graduating Students, who are a targeting condition, not a separate role).
- **External respondents**: Alumni and Industry Partners, with institutional verification for self-service accounts.

Role scopes are inventoried in [roles-and-access.md](roles-and-access.md).

## Domain map

The 16 bounded contexts under `src/features/`, each with its own `CONTEXT.md` (linked; descriptions from the root [CONTEXT-MAP.md](../../CONTEXT-MAP.md)):

| Domain                         | Context                                                                | One-line description                                                                                                                                                        |
| ------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity and Access            | [auth](../../src/features/auth/CONTEXT.md)                             | Manages Google-authenticated accounts, role entry, onboarding gates, and account access states.                                                                             |
| Users                          | [users](../../src/features/users/CONTEXT.md)                           | Profile gates, the single-active-role invariant, provisioning rules, external stakeholder invites, verification statuses, role revocation gates, and program scope records. |
| Legal                          | [legal](../../src/features/legal/CONTEXT.md)                           | Privacy/terms document versioning, the signed acknowledgement ticket gate before role selection, and the non-anonymity disclosure.                                          |
| Academic Calendar              | [academic-calendar](../../src/features/academic-calendar/CONTEXT.md)   | Defines school years, semesters, terms, and active academic periods.                                                                                                        |
| Academic Structure             | [academic-structure](../../src/features/academic-structure/CONTEXT.md) | Defines academic programs and majors offered by the college.                                                                                                                |
| Curriculum                     | [curriculum](../../src/features/curriculum/CONTEXT.md)                 | Documents how Courses are placed (year level, semester, term) within an academic Program across revisions.                                                                  |
| Course Catalog and Assignments | [course-assignments](../../src/features/course-assignments/CONTEXT.md) | Defines courses, class sections, teaching assignments, and evaluation scopes.                                                                                               |
| Outcomes                       | [outcomes](../../src/features/outcomes/CONTEXT.md)                     | The college-wide ILO catalog (Gen Ed Coordinator-owned), Program-owned PLOs, Course-level CILOs, typed alignment relations, readiness semantics, and role responsibilities. |
| Instruments                    | [instruments](../../src/features/instruments/CONTEXT.md)               | Evaluation instrument templates, immutable versions with frozen structure snapshots, question types, CILO/PLO question bindings, and baseline/copy provisioning.            |
| Evaluations                    | [evaluations](../../src/features/evaluations/CONTEXT.md)               | Evaluation deployments (Course-bound and Central), the deployment lifecycle, roster exclusions and reversals, publication alignment gating, and deployment authorization.   |
| Responses                      | [responses](../../src/features/responses/CONTEXT.md)                   | The one-response invariant, response lifecycle, availability and eligibility gating, section-scoped draft saves, and atomic submission completeness.                        |
| Response Review                | [response-review](../../src/features/response-review/CONTEXT.md)       | Identified vs anonymized review flows, submitted-answer outcome bindings, the SUBMITTED gate, period labels, and qualitative summaries.                                     |
| Analytics                      | [analytics](../../src/features/analytics/CONTEXT.md)                   | Submitted-response evidence, source-aware analytics terminology, Program PLO evidence boundaries, and bounded AI-assisted interpretation.                                   |
| Enrollments                    | [enrollments](../../src/features/enrollments/CONTEXT.md)               | The per-term student enrollment ledger, enrollment sources, upsert semantics, soft deactivation, and class lookup targeting.                                                |
| Dean Oversight                 | [dean](../../src/features/dean/CONTEXT.md)                             | The Dean's period-scoped oversight read model: readiness KPIs, risk buckets, mapping gaps, archived outcome display, and roster paging.                                     |
| Design System                  | [design-system](../../src/features/design-system/CONTEXT.md)           | Root semantic tokens, unified appearance preferences (Light, Dark, System), protected visual showcase, and production-surface inventory.                                    |

How the contexts connect to each other: see the Relationships section of [CONTEXT-MAP.md](../../CONTEXT-MAP.md).

## Platform shape

- **Web application**, Next.js App Router + TypeScript (see [docs/cloie-techstack.md](../cloie-techstack.md)); modular monolith under `src/features/`.
- **Desktop and mobile are first-class surfaces**: the respondent evaluation wizard is a guided one-step-at-a-time flow usable on mobile, tablet, or desktop ([../system-cloie-user-journeys.md](../system-cloie-user-journeys.md) §6.3), and role navigation has dedicated mobile modes. PWA-facing metadata surfaces (manifest theme colors) are owned by the Design System context; **whole-app offline/PWA data access is deferred** per [docs/adr/0006-dean-pwa-offline-cache-contract.md](../adr/0006-dean-pwa-offline-cache-contract.md).
- **Primary Production authentication is Google OAuth only**, behind a legal-acknowledgement gate ([src/features/auth/CONTEXT.md](../../src/features/auth/CONTEXT.md), [src/features/legal/CONTEXT.md](../../src/features/legal/CONTEXT.md)).

3# Cross-Source Gap Report — 2026-07-18

> Generated for GH Issue #123: "chore(project): establish System CLOIE orchestration and reconcile project sources"
>
> **Scope:** Notion Kanban + Backlog, PRD, SRS, GH Issues, ADRs, CONTEXT.md files
> **Mode:** Audit only — findings, no mutations applied.
> **Sources of truth priority** (per issue #123): confirmed decisions → ADRs → current technical docs → PRD/SRS → historical notes.

---

## 1. Notion Kanban Board (CLOIE Tasks) — Audit Findings

### 1.1 Database Schema (Current)

| Property             | Type         | Values                                                                                                                                                              |
| -------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task Name            | title        | —                                                                                                                                                                   |
| Status               | select       | Backlog, To Do, In Progress, Testing, Done                                                                                                                          |
| Module               | select       | User Roles and Authentication, Academic Structure, Evaluation Instrument, Evaluation Deployment, Outcomes Management, Response Collection, Analytics, Report Export |
| Priority             | select       | Low, Medium, High                                                                                                                                                   |
| Type                 | multi_select | UI/UX and Branding, Database and System Design, Frontend Development, Backend Development, Testing                                                                  |
| Assignee             | multi_select | Andy, Abbegail                                                                                                                                                      |
| Start Date           | date         | —                                                                                                                                                                   |
| Completed Date       | date         | —                                                                                                                                                                   |
| Definition of Done   | rich_text    | —                                                                                                                                                                   |
| Task id              | rich_text    | —                                                                                                                                                                   |
| Description          | rich_text    | —                                                                                                                                                                   |
| Related Backlog Item | relation     | → CLOIE Backlog                                                                                                                                                     |
| Files & media        | files        | —                                                                                                                                                                   |

### 1.2 Current Task Inventory

**Total tasks: 93**
| Status | Count |
|---|---|
| Done | 25 |
| In Progress | 23 |
| Testing | 31 |
| To Do | 14 |
| Backlog | 0 |

### 1.3 Critical Issues Found

#### Issue A: ZERO tasks have the `Module` field filled in

All 93 tasks have `Module = (empty)`. The module column exists but has never been populated. This directly contradicts the defense note requirement: _"refactor the kanban board to be a per module board with its backlog based on the tasks of that specific module."_

**Impact:** The entire "by-module Kanban" purpose is broken — it's an unorganized flat list.

#### Issue B: ZERO tasks have `Definition of Done` filled in

All 93 tasks are missing DoD entries. The defense note explicitly requires: _"Consider adding a definition of done in each backlog entry."_

**Impact:** No verifiable acceptance criteria per task.

#### Issue C: ZERO tasks have `Priority` filled in (except one)

Only one task ("ERD: Draft Initial Entity-Relationship Diagram") has Priority = High. All others are empty.

#### Issue D: ZERO tasks have `Start Date` or `Completed Date` filled in

The defense note requires the Gantt chart to reflect Kanban progress with date-coded columns. Without dates, a Gantt cannot be generated from this data.

#### Issue E: Tasks have no `Backlog` status items

The "Backlog" stage exists in the Status select but is unused. All 93 tasks start at To Do or higher. This misaligns with the defense note: _"The backlog is the overall lists of tasks. These should not move."_

#### Issue F: Tasks with incorrect/outdated status

Several items suggest stale statuses based on what's been implemented:

**Items likely Done but marked otherwise:**

- `Wireframe: Respondent Dashboard and CILO Code Entry Screens` — [Testing] — CILO code entry is **deprecated** per defense notes
- `Wireframe: Evaluation Deployment and CILO Code Generation Screens` — [To Do] — CILO code **deprecated**
- `Industry Partner Program Access via Access Code` — [To Do] — Access code spec still open per issue #123
- `Student Enrollment (Bulk Uploading)` — [In Progress] — Partially addressed; faculty now does bulk upload (issue #123)
- `Student Enrollment (Individual)` — [In Progress] — needs review

**Items that are deprecated per defense notes / ADRs:**

- `Wireframe: Respondent Dashboard and CILO Code Entry Screens` — CILO access code entry deprecated
- `Wireframe: Evaluation Deployment and CILO Code Generation Screens` — CILO code generation deprecated
- `Faculty-Owned Template Management (Faculty Members)` — In Progress — scope clarification needed; ADR 0005 clarifies template vs. CILO ownership
- `CILO to Question Binding` — [Testing] — needs review against ADR 0005 (CILO lifecycle)

**Items missing from the Kanban (not found):**

- Dean Dashboard — Learning Outcomes (read-only overview) — GH issues #110–#121 work
- Dean Academic Operations oversight (PR #122 — the entire merged work)
- Secretary user creation flows (GH issues #70–#77)
- Secretary bypass/delegation (defense note: "bypass" is now implemented as explicit permissions per issue #123)
- Dean Enrollments (program totals, drill-down, read-only)
- Dean Academic Structure oversight
- PWA/offline contract (ADR 0006 — deferred but exists as decision)
- Course Catalog Refactor implementation (issue #36 — ongoing)
- CILO-to-GO mapping readiness (ADR 0005)

#### Issue G: Documentation tasks present — should not be

Defense note: _"Do not include documentation tasks in the kanban. It should solely focus on the software development tasks."_

These should be removed or moved:

- `Wireframe: Report Export Screens` [In Progress]
- `Wireframe: Analytics Dashboard Screens` [In Progress]
- `Wireframe: Authentication and Role-Based Sign-up Screens` [In Progress]
- `Wireframe: Respondent Dashboard and CILO Code Entry Screens` [Testing]
- `Wireframe: Outcomes Management Screens` [Testing]
- `Wireframe: Evaluation Instrument Builder Screens` [Testing]
- `Wireframe: Academic Structure and Enrollment Screens` [Testing]
- `Wireframe: Evaluation Deployment and CILO Code Generation Screens` [To Do]
- `Use Case: Identify All System Actors and Draft a Use-Case Diagram` [Testing]
- `ERD: Draft Initial Entity-Relationship Diagram` [Testing]
- `ERD: Define Database Constraint and Rules` [Testing]
- `ERD: Finalize and Baseline Schema` [Testing]
- `UI/UX Design System: Define Layout, Grid, and Breakpoints` [Done]
- `UI/UX Design System: Build Reusable Component Library` [Done]
- `UI/UX Design System: Define Visual Foundations` [Done]
- `System Architecture: Design Authentication and RBAC Model` [Done]
- `System Architecture: Define API Design and Endpoint Conventions` [Done]
- `System Architecture: Define Tech Stack and Layer Structure` [Done]
- `Testing: Implement github actions for CI/CD` [Testing]

#### Issue H: Missing properties required by defense notes

Per defense notes:

- **"Gantt chart must utilize different colors signifying different status"** → requires date fields filled (Start Date, Completed Date) — currently empty for all tasks
- **"Consider showing the starting backlog and also the finished backlog"** → Backlog status value exists but unused
- **"The backlog and the done column of the board are the same [at end]"** → needs alignment between backlog items and done tasks

**Required new properties (not yet in schema) per defense notes:**

- There is no `Backlog Item` flag to distinguish "this task is from the backlog" from ad-hoc tasks
- No `Module` link to indicate which system module this belongs to (field exists but unused)
- No `In Progress Date` or `Testing Date` columns (the issue #123 body explicitly requires these 4 date columns: To Do Date, In Progress Date, Testing Date, Done Date — only Start Date and Completed Date exist currently)

---

## 2. Notion Backlog (CLOIE Backlog) — Audit Findings

### 2.1 Database Schema (Current)

| Property           | Type      | Values                            |
| ------------------ | --------- | --------------------------------- |
| Feature Name       | title     | —                                 |
| Status             | select    | To do, In Progress, Testing, Done |
| Priority           | select    | Low, Medium, High                 |
| Backlog ID         | rich_text | —                                 |
| Definition of Done | rich_text | —                                 |
| Date               | date      | —                                 |
| Progress           | rollup    | (from Related Tasks)              |
| Related Tasks      | relation  | → CLOIE Tasks                     |

### 2.2 Current Backlog Inventory

**Total: 10 items — ALL have DoDs (good)**

| ID         | Module        | Status      | Name                           |
| ---------- | ------------- | ----------- | ------------------------------ |
| BASE-001   | System Design | In Progress | System Design and Architecture |
| MODULE-001 | Auth          | In Progress | User Access and Authentication |
| MODULE-002 | Structure     | In Progress | Academic Structure             |
| MODULE-003 | Calendar      | In Progress | Academic Period and Enrollment |
| MODULE-004 | Instrument    | In Progress | Evaluation Instrument          |
| MODULE-005 | Deployment    | In Progress | Evaluation Deployment          |
| MODULE-006 | Outcomes      | In Progress | Outcomes Management            |
| MODULE-007 | Response      | In Progress | Response Collection            |
| MODULE-008 | Analytics     | To do       | Analytics                      |
| MODULE-009 | Report        | To do       | Report Export                  |

### 2.3 Backlog Issues Found

#### Issue A: All 8 "In Progress" items — are they actually all still in progress?

Based on GH issues and PR #122:

- MODULE-001 (User Access and Authentication): Secretary create-user is in GH issues #70–#77 — largely implemented
- MODULE-002 (Academic Structure): Core implemented, course catalog refactor (#36) pending
- MODULE-003 (Academic Period and Enrollment): Core calendar done; enrollment bulk upload still open
- MODULE-006 (Outcomes Management): Dean oversight merged via PR #122; outcome authoring ongoing

These may need status bumped to Testing or Done for completed sub-features.

#### Issue B: Defense note DoD contradictions in existing DoDs

**MODULE-007 DoD says:** _"students can enter a CILO access code"_ — This is **DEPRECATED** per defense notes: _"Deprecated. Students will be bulk uploaded in someway."_ The DoD must be updated.

**MODULE-005 DoD says:** _"Faculty can generate a unique CILO access code per course evaluation"_ — Also deprecated. Students access via enrollment + deployment targeting, not access codes. Must be updated.

**MODULE-001 DoD says:** _"bypass/delegation system allows Secretary and College Dean to assume delegated privileges on demand"_ — Issue #123 explicitly confirms the bypass/delegation model was **replaced** with explicit permissions. The DoD uses "bypass/delegation" language which is now superseded.

**MODULE-003 DoD says:** _"Program Head can enroll Industry Partners via access code provisioning"_ — Access code model for Industry Partners is still **open/unspecified** per issue #123. This DoD states it as a requirement but it's not yet decided.

**MODULE-002 DoD says:** _"Regular and Requested/Tutorial course types are supported"_ — Tutorial/Requested courses are **deferred** per issue #123 and ADR 0003.

#### Issue C: Missing modules not in backlog

These areas have GH issues but no backlog module:

- **Dean Dashboard IA** (the entire wayfinder map #103 work) — not a named module
- **Secretary User Creation** (GH #70–#77) — subsumed in MODULE-001 but should be clearly scoped
- **PWA / Offline** — deferred per ADR 0006, not in backlog (correct for deferred, but should be noted as out-of-scope)

#### Issue D: Missing properties per issue #123 / defense notes

The backlog `Date` column is ambiguous. Issue #123 requires:

- **To Do Date**
- **In Progress Date**
- **Testing Date**
- **Done Date**

Currently the backlog has only one `Date` property. The Tasks DB has `Start Date` and `Completed Date` but not all four stage dates.

---

## 3. Defense Notes — Reconciliation Against Current State

Full defense notes content extracted from Notion (Defense Notes page).

### 3.1 Title Defense Notes

| Note                                                                              | Current Status                                                              |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| "Flexibility of forms — adapt for curriculum revision every 5 years"              | ✓ Addressed via template versioning model                                   |
| "GOs intercorrelated with CILOs — system should address analytics"                | ⚠ Analytics deferred (MODULE-008 To Do); ADR 0005 defines ownership model   |
| "Less detailed user profiles — more concerned about responses"                    | ✓ Philosophy adopted                                                        |
| "Bulk uploading of students"                                                      | ⚠ In Progress — faculty does bulk upload; secretary fallback per issue #123 |
| "Program/Graduate Outcomes set by admin or program head; CILOs by faculty"        | ✓ ADR 0005 — Program Head owns GOs, Faculty owns CILOs                      |
| "CQI support — monitor if curriculum is ok"                                       | ⚠ Analytics deferred                                                        |
| "Way to know if student responses reflect test scores"                            | 🔴 Not addressed — open design question                                     |
| "Integrity of responses + protecting student identity (prevent platform attacks)" | ⚠ Anonymization noted; not fully specced                                    |
| "Preview modal + confirmation + final submission"                                 | ✓ Implemented per Done Kanban tasks                                         |
| "Faculty inputs only the CILO"                                                    | ✓ ADR 0005                                                                  |
| "Separate encoding of CILOs and GOs in scope document"                            | ⚠ PRD/SRS not yet updated                                                   |

### 3.2 Outline Defense Notes

| Note                                                                               | Current Status                                                        |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| "Gantt must reflect development progress of kanban"                                | 🔴 Not actionable — no dates in Kanban                                |
| "Gantt colors: to-do, in-progress, done with legend"                               | 🔴 Not actionable — no dates                                          |
| "Show starting backlog and finished backlog"                                       | 🔴 Backlog status unused in Kanban                                    |
| "Backlog = overall task list, should not move; done column mirrors backlog at end" | 🔴 Kanban tasks not linked to backlog items                           |
| "Backlog can be per SDLC phase or per module — chose per module"                   | ✓ Backlog has MODULE-00x structure                                    |
| "Definition of done in each backlog entry"                                         | ✓ Backlog has DoDs; ✗ Kanban tasks do not                             |
| "Do not include documentation tasks in kanban"                                     | 🔴 ~19 documentation/wireframe/ERD/architecture tasks still in Kanban |
| "Refactor kanban to be per-module with its backlog"                                | 🔴 Module field exists but is empty for all 93 tasks                  |

### 3.3 Use-Case Diagram Notes

| Note                                                       | Current Status                                                                                                  |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| "System admin = Secretary; ICTC handles maintenance only"  | ✓ Confirmed — issue #123, ADR decisions                                                                         |
| "Have a Secretary actor"                                   | ✓ In codebase                                                                                                   |
| "Secretary has access to Program Head privileges (bypass)" | 🔴 Deprecated — issue #123 replaces bypass with explicit permissions. PRD/SRS/DoDs still use "bypass" language. |
| "Secretary has access to College Dean privileges"          | 🔴 Deprecated in bypass framing; issue #123 replaces with explicit permissions                                  |
| "College Dean has access to Program Head privileges"       | 🔴 Deprecated in bypass framing                                                                                 |
| "Secretary has bypass access for unavailable PH or Dean"   | 🔴 Deprecated — this was replaced per issue #123 decisions. Must NOT be re-introduced in SRS/PRD.               |

### 3.4 System Functionalities Notes

| Note                                                                         | Current Status                                                                             |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| "Courses tied to Year level, Semester, Term"                                 | ✓ ADR 0003 — advisory defaults on Course; override on CourseAssignment                     |
| "CILO access code entry — DEPRECATED"                                        | 🔴 Kanban still has "Wireframe: CILO Code Entry" tasks and backlog DoDs still reference it |
| "Each respondent role has their own sign-up page forms"                      | ✓ Addressed via portal/respondents and portal/staff                                        |
| "Sign-up forms for Faculty, Industry Partners, Alumni"                       | ✓ GH issues #71–#75; onboarding forms                                                      |
| "Bulk uploading of student lists — faculty does it; secretary as fallback"   | ⚠ In progress — issue #123; not fully implemented                                          |
| "Program Heads enroll Industry Partners via access code — NOT YET ADDRESSED" | ⚠ Open — per defense notes themselves: "Not yet addressed"                                 |
| "Requested/Tutorial courses — DEFERRED"                                      | ✓ Confirmed deferred per issue #123                                                        |
| "Program head course assignment simplified (secretary sets defaults)"        | ⚠ Addressed but still 5 steps; noted in defense notes                                      |

---

## 4. PRD (`docs/cloie-prd.md`) — Outdated Sections

> The discrepancies inventory at `docs/agents/discrepancies-prd-srs-vs-current.md` already catalogues these; this section adds items that emerged **after** that inventory or from the defense notes.

### 4.1 Already catalogued (from discrepancies-prd-srs-vs-current.md)

- §6.2, §8.2: "System Administrator" → must be "Secretary"
- §6.2: Dean = Program Head equivalence → replace with shared services, separate routes
- §9, §10.4: "CILO Reviews" as standalone label → retired
- §10.8: Analytics as live surface → deferred
- §8.7: Dean Enrollments as comparison dashboard → replace with program totals / drill-down model
- §12.10: PWA offline scope → add cache-last-viewed rule + mutations-require-network
- §10.1: "invite" workflow for account creation → replace with Secretary-created complete accounts (ADR 0001)

### 4.2 NEW gaps (from defense notes + issue #123)

| Section          | Current claim                                           | Required change                                                                                                                                                                  |
| ---------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §6.2, §6.3       | Secretary/Dean "bypass" delegation to Program Head      | REPLACE — no bypass/delegation mode. Secretary has explicit permissions to perform PH-scoped operations. Dean has college-wide read-only oversight. Explicit, not impersonation. |
| §10.3, §8.3      | CILO access codes for student evaluation access         | REMOVE — deprecated. Students access via enrollment + deployment targeting (bulk upload).                                                                                        |
| §6.5             | "Tutorial and Requested courses" as live features       | Mark deferred. Only Regular courses in current scope.                                                                                                                            |
| Use-case section | Merged classes → single assignment                      | UPDATE — merged classes split into separate program assignments (ADR 0003 §3).                                                                                                   |
| §10.1            | Faculty creates evaluation from template                | CLARIFY — CILO Faculty creates from bound template; question customization disabled for on-behalf deployments (ADR 0003 §8).                                                     |
| Missing          | GOs intercorrelated with CILOs — analytics implications | ADD — at minimum note that attainment reporting requires CILO-to-GO mapping coverage; deferred to Insights.                                                                      |
| Missing          | Student response anonymization and integrity            | ADD — design commitment from defense (preview + confirmation + anonymization).                                                                                                   |

---

## 5. SRS (`docs/cloie-srs.md`) — Outdated Items

### 5.1 Already catalogued (from discrepancies inventory)

- §1.2, §2.4.1: "System Administrator" role → "Secretary"
- §2.4.2: "Dean = Program Head same capabilities" → shared services, separate read-only routes
- §5.4: "CILO Evaluation Tool" as standalone label → retired; is now instrument name not nav label
- FR-8.7, FR-9.9: Same analytics access for Dean and Program Head → differentiate scope
- NFR-26: "Limited shell-style PWA" → update to cache-last-viewed + network-for-mutations rule
- FR-11.1, FR-11.2: "invite" workflow → Secretary-created complete accounts

### 5.2 NEW gaps (from defense notes + issue #123)

| FR/NFR             | Current claim                                                             | Required change                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §2.4.1 (Secretary) | "bypass/delegation" access model                                          | REPLACE — explicit permissions model. No impersonation. Secretary has Secretary-scoped capabilities that include administrative equivalents of PH operations. |
| §2.4.2 (Dean)      | "bypass/delegation" access to PH capabilities                             | REPLACE — Dean has college-wide read-only oversight; no bypass.                                                                                               |
| FR-11.x            | Student enrollment via access code (CILO code entry)                      | REMOVE — deprecated. Students enrolled via bulk upload. Secretary fallback.                                                                                   |
| §5.4, FR-5.x       | "CILO access code" generation per faculty                                 | REMOVE — deprecated.                                                                                                                                          |
| §2.4.4, FR-3.3     | "CILOs are course-context, faculty-managed"                               | UPDATE → "CILOs stored at course level, stable across assignment periods; Faculty authors but does not own" (ADR 0005 §2)                                     |
| FR-4.14…4.24       | Program Heads "own" program templates (conflates GOs with templates)      | SPLIT — GOs are program-level outcomes; templates are evaluation instruments. Program Heads own GOs; separately, they own program-level evaluation templates. |
| §10.2, FR-2.4…2.10 | Course catalog without advisory defaults                                  | ADD — Course has advisory year_level/semester/term; CourseAssignment may override year_level; 1-to-1 evaluation per assignment (ADR 0003)                     |
| §10.3              | "Requested/Tutorial course types supported" (currently in DoD MODULE-002) | MARK DEFERRED                                                                                                                                                 |
| FR-8.12, FR-9.5    | Historical analytics on dashboard                                         | RELOCATE — historical filters belong on source pages, not dashboard; dashboard shows active period only                                                       |
| Missing            | Response review modal + confirmation before submit                        | ADD — defense note requirement                                                                                                                                |
| Missing            | Secretary as fallback for faculty bulk enrollment                         | ADD — per issue #123 confirmed decision                                                                                                                       |
| Missing            | 4 stage dates (To Do Date, In Progress Date, Testing Date, Done Date)     | Not an SRS item but note for project management docs                                                                                                          |

---

## 6. Notion Kanban — Required Changes (findings only, no writes)

### 6.1 Schema additions needed

| New Property                          | Type | Rationale                                               |
| ------------------------------------- | ---- | ------------------------------------------------------- |
| In Progress Date                      | date | Required by issue #123; defense notes Gantt requirement |
| Testing Date                          | date | Required by issue #123                                  |
| To Do Date                            | date | Required by issue #123                                  |
| _(rename Start Date → To Do Date)_    | date | Or repurpose existing                                   |
| _(rename Completed Date → Done Date)_ | date | Or repurpose existing                                   |

### 6.2 Existing property fixes

- **Module**: Must be populated for all 93 tasks → map each task to its module
- **Definition of Done**: Must be added to each task (or link to backlog item's DoD)
- **Priority**: Must be filled for all active tasks

### 6.3 Task-level changes

**Remove (documentation tasks — per defense notes):**
All wireframe tasks, ERD tasks, system architecture tasks, use-case tasks, UI/UX design system tasks (~19 items)

**Deprecate/mark superseded:**

- `Wireframe: Respondent Dashboard and CILO Code Entry Screens` — CILO code deprecated
- `Wireframe: Evaluation Deployment and CILO Code Generation Screens` — CILO code deprecated
- `Industry Partner Program Access via Access Code` — status: open/unspecified; do not mark Done

**Add missing tasks (linked to GH issues):**

- Dean Dashboard — Learning Outcomes read-only view (GH #110–#121 scope)
- Dean Dashboard — Enrollments (program totals, drill-down)
- Dean Dashboard — Academic Structure oversight
- Dean Dashboard — KPI cards + active period context
- Secretary user creation flows: Secretary/Dean base accounts, Program Head/Faculty, Student, Alumni, Industry Partner, Alumni (GH #71–#77)
- Course Catalog Refactor implementation (GH #36 — linked to MODULE-002/003)
- CILO-to-GO Mapping (currently "In Progress" in Kanban — needs GH issue link)
- Bulk Student Enrollment by Faculty (GH #26 scope — faculty CSV upload)
- Secretary bulk enrollment fallback
- On-behalf evaluation deployment (Secretary deploys on behalf of Faculty — ADR 0003 §8)

**Status corrections:**

- Tasks from PR #122 (Dean academic operations, outcome oversight) → verify Done status
- Secretary create-user tasks (GH #70–#77 — ready-for-agent) → To Do if not started

### 6.4 Backlog DoD corrections needed

| Module     | DoD phrase to remove/change                                              | Replacement                                                                        |
| ---------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| MODULE-007 | "students can enter a CILO access code"                                  | Remove — students access via enrollment + deployment targeting                     |
| MODULE-005 | "Faculty can generate a unique CILO access code"                         | Remove — deprecated                                                                |
| MODULE-001 | "bypass/delegation system"                                               | Replace — Secretary and Dean have explicit permissions per role (no impersonation) |
| MODULE-003 | "Program Head can enroll Industry Partners via access code provisioning" | Mark as open/unspecified — per issue #123 Decisions Still Required                 |
| MODULE-002 | "Regular and Requested/Tutorial course types are supported"              | Remove Tutorial/Requested — deferred                                               |

---

## 7. GitHub Issues — Alignment Gaps

### 7.1 Issues without Notion task coverage

These GH issues have no corresponding Notion Kanban task:

- #70 PRD: complete Secretary-created user registration [ready-for-agent]
- #71–#77 Secretary create-user flows [ready-for-agent]
- #36 Course Catalog & Assignment Refactor [ready-for-human]
- #26 Architectural Refactor Plan [ready-for-human]
- #46 PRD 2 Code Review Remediation [ready-for-human]
- #25 Codebase Review & Tech Debt [needs-triage]
- #103 Wayfinder map (Dean dashboard IA) — no Kanban tasks for any of its implementation tickets

### 7.2 GH Issues needed but not yet created (per issue #123)

- Faculty CSV bulk enrollment of existing Students
- Secretary on-behalf evaluation deployment
- Industry Partner access-code specification
- Analytics formulas, dashboards, and reporting
- Notion/Kanban/Gantt reconciliation ← this audit fulfills part of it
- Documentation reconciliation (PRD/SRS update)
- Internal testing, alpha, beta, and UAT readiness

---

## 8. Summary: What Requires Action

### Immediate (before next defense / documentation submission)

| #   | Action                                                                                         | Owner                |
| --- | ---------------------------------------------------------------------------------------------- | -------------------- |
| 1   | Add 4 date properties to Notion Kanban (To Do Date, In Progress Date, Testing Date, Done Date) | Human (Notion write) |
| 2   | Populate Module field for all 93 Kanban tasks                                                  | Human (Notion write) |
| 3   | Add Definition of Done to each Kanban task                                                     | Human (Notion write) |
| 4   | Remove ~19 documentation/wireframe/ERD tasks from Kanban                                       | Human (Notion write) |
| 5   | Fix 5 Backlog DoDs (remove CILO code refs, bypass language, Tutorial course claim)             | Human (Notion write) |
| 6   | Update PRD §6.2, §10.3 — remove bypass/delegation language                                     | PRD rewrite ticket   |
| 7   | Update SRS §2.4.1, §2.4.2 — remove bypass/delegation, add explicit permissions                 | SRS rewrite ticket   |
| 8   | Update PRD/SRS — remove student CILO access code requirements                                  | PRD/SRS rewrite      |
| 9   | Update SRS MODULE-002 DoD — remove Tutorial/Requested courses                                  | Notion write         |
| 10  | Add missing GH issues per issue #123 §"Focused Follow-Up Issues"                               | GH issue creation    |

### Near-term (before final defense)

| #   | Action                                                                                            |
| --- | ------------------------------------------------------------------------------------------------- |
| 11  | Full PRD rewrite targeting the 9+ blocking discrepancies in `discrepancies-prd-srs-vs-current.md` |
| 12  | Full SRS rewrite targeting the same                                                               |
| 13  | Populate Kanban task dates from git log / PR merge dates for historical fidelity                  |
| 14  | Link all Kanban tasks to Related Backlog Items                                                    |
| 15  | Create Gantt chart from updated Kanban date data                                                  |
| 16  | Reconcile Notion Kanban "Done" column against PR #122 merged work                                 |

---

## 9. Open Questions (from issue #123 — unresolved, not deciding here)

1. **Bulk upload matching field** — Student number, institutional email, or both?
2. **Final CSV columns** for student bulk enrollment
3. **Secretary on-behalf deployment** — evaluation types, reason requirement, who can close
4. **Industry Partner access codes** — owner, auth requirement, scope, reuse/expiry rules
5. **Analytics formulas** — rating scales, CILO attainment formula, GO aggregation, minimum-response rules
6. **Dean filters and drill-down levels** for analytics
7. **Student response integrity vs. test scores** — flagged in defense notes; no decision yet

---

## 9b. Additional Gaps from Codebase Baseline Audit (subagent findings)

These are confirmed by the codebase audit and were not in the prior discrepancies inventory.

### Structural / architectural (not in PRD/SRS at all)

- **Single-role account invariant** — `user_roles` table capped at 1 row per user (ADR 0001a); PRD/SRS never state this as a DB-enforced rule.
- **Separate domain `User.id` from `auth_user_id`** — admin-provisioned users exist before OAuth; PRD/SRS §4.2 mention Google OAuth but not the split-identity model (ADR 0002).
- **Strict program deletion with `RESTRICT` FKs** — Secretary/Dean only; Program Heads excluded from deletion lifecycle (ADR 0004). Not in PRD/SRS.
- **Program lifecycle steward = Secretary or Dean** (not Program Head) — per `academic-structure/CONTEXT.md`.

### Course catalog (not in PRD/SRS)

- **`CourseOffering` table explicitly rejected** (ADR 0003 §9).
- **GE course assignment stewardship = Secretary or Dean**; Program Heads may view but NOT manage GE assignments (ADR 0003 §11). PRD §10.2 / SRS FR-2.4–2.5 give Program Heads full catalog management — **direct contradiction**.
- **CSV roster upload deferred** per ADR 0003 §10 — evaluation recipients come from `StudentEnrollment` via `listStudentsForClass` only. (#123 confirms Faculty does CSV _enrollment_ of existing accounts; evaluation recipients are separate.)

### Dean IA (implemented in code, not in PRD/SRS)

- **Four-KPI overview** with period context and outcome coverage matrix (map #103, PR #122).
- **Responsive navigation contracts** — phone bottom tabs + drawer, tablet compact sidebar, desktop full sidebar, 44px touch controls (issue #108, resolved).
- **Role-owned routes** — Dean and Secretary dashboards are separate even for shared capabilities; PRD/SRS "same general portal capabilities" does not acknowledge this separation.
- **Protected outcome writes** — draft → exact before/after review → explicit confirmation → server-side recheck → atomic save (ADR 0005 §5). Not in PRD/SRS.

### New #123 confirmed decisions not yet in any doc

- **Cross-program Faculty assignments allowed** — Faculty from another program may be assigned to a PH's program-specific course.
- **ICTC handles technical maintenance only** — not system administration. PRD/SRS do not distinguish ICTC from Secretary.
- **No PWA Service Worker exists today** — confirmed by ADR 0006 audit (zero code matches); PRD §12.10 / SRS NFR-30–32 describe PWA as a current requirement; actual state is manifest + icons only.

### Notion-specific (from Notion subagent)

- **Two "CLOIE Tasks" databases coexist** — old DB (created 2026-03-29) is not archived; both appear on the dashboard. The old DB contains documentation tasks violating the defense directive.
- **Three unnamed "Untitled" inline databases** cluttering the dashboard — should be cleaned up.
- **`Related Backlog Item` relation unpopulated** — no task-to-backlog linkage means the `Progress` rollup on the Backlog is broken (shows nothing).
- **Task IDs unpopulated** — the `Task id` rich_text field is empty for all tasks; cannot cross-reference tasks by ID.

### SRS editorial error

- **Duplicate FR numbering bug** — two separate FR-4.14 and FR-4.15 entries exist in §5.4.3 and §5.4.4. Must be renumbered.

---

## 10. Source Authority Reference

| Source                                         | Authority level | Last known sync                               |
| ---------------------------------------------- | --------------- | --------------------------------------------- |
| Issue #123 Confirmed Decisions                 | ★★★★★           | 2026-07-18                                    |
| ADR 0005 (Outcome Ownership)                   | ★★★★★           | 2026-06                                       |
| ADR 0003 (Course Catalog Refactor)             | ★★★★★           | 2026-06                                       |
| ADR 0006 (PWA Offline — Deferred)              | ★★★★★           | 2026-06                                       |
| Wayfinder map #103                             | ★★★★☆           | 2026-06 (closed)                              |
| `discrepancies-prd-srs-vs-current.md`          | ★★★★☆           | 2026-06                                       |
| CONTEXT.md files (per module)                  | ★★★★☆           | 2026-07                                       |
| `docs/cloie-prd.md`                            | ★★☆☆☆           | Pre-ADR 0005 — outdated                       |
| `docs/cloie-srs.md`                            | ★★☆☆☆           | Pre-ADR 0005 — outdated                       |
| `docs/system-cloie-technical-documentation.md` | ★★★☆☆           | Unknown                                       |
| Notion Kanban + Backlog                        | ★★★☆☆           | Partially stale — this audit                  |
| Defense Notes (Notion)                         | ★★★★☆           | From defense sessions — some items deprecated |

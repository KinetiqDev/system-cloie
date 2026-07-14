# Discrepancy Inventory: PRD/SRS vs. Current Decisions

> Reconciles user-added, untracked `docs/cloie-prd.md` and `docs/cloie-srs.md` (background, non-authoritative) against the accepted Wayfinder map ([#103](https://github.com/Tugeru/project-cloie/issues/103)) and the recent outcome-ownership ADR (`docs/adr/0005-outcome-ownership-and-dean-oversight.md`).
> Inventory only. PRD/SRS are not edited in this session.
> Generated for [#107](https://github.com/Tugeru/project-cloie/issues/107).

## How to read

- **Source of truth:** Map #103 *Decisions so far* + *Out of scope* + ADRs `0001`, `0003`, `0005`. PRD/SRS do not override.
- **Severity:**
  - **blocking** — PRD/SRS text states a rule that map/ADR has explicitly overturned or redefined; cannot stand if the system matches current decisions.
  - **wording** — PRD/SRS use a term or framing that the project glossary (CONTEXT.md files) and ADRs have already sharpened; rewrite needed for accuracy, not direction.
  - **obsolete** — PRD/SRS describe work outside this effort's destination (Dean IA + implementation tickets) but still inside the broader CLOIE product. They are not wrong; they are out of this scope and must be left out of any future PRD/SRS rewrite that targets the Dean IA.
  - **open** — a PRD/SRS statement raises a question map #103 has not decided; surface only, do not decide here.
- **Grouping** follows the suggested inventory shape from the handoff.

---

## 1. Outcome ownership and oversight

| Topic | PRD/SRS claim | Current decision | Severity | Notes |
|---|---|---|---|---|
| GO ownership | "Program Heads may create, manage, edit, version, save, or deploy authorized program-level stakeholder evaluation tools… author/manage program-level evaluation tool templates" (PRD §6.2, §8.2; SRS §2.4.3, FR-4.14…4.24). They also implicitly own GOs. | Map #103 + ADR 0005 §1: **Program Heads own program Graduate Outcomes.** GOs are a program-layer construct, distinct from program-level evaluation templates. | wording | PRD/SRS conflate "GO authoring" with "program-level template authoring." ADRs split them: GOs are program outcomes; templates are evaluation instruments. Rewrite should separate the two ownership rules. |
| CILO ownership and lifecycle | "CILOs are encoded per course context, faculty-managed" (PRD §10.3; SRS §2.4.4, FR-3.3). CILOs are edited "for selected course contexts" by faculty. | ADR 0005 §2: **CILOs are stored at the course level; stable across assignment periods; never assignment-specific or faculty-owned.** Owner = faculty for authoring; the CILO itself belongs to the course. Identity and Access glossary term `Course-level CILO` already encodes this. | wording | PRD/SRS describe faculty as course-context editors; ADR sharpens the lifecycle rule (course-level, not assignment-period-scoped, not faculty-owned). Rewrite must align with the existing `Course-level CILO` glossary entry. |
| CILO-to-GO mappings | Mapping is "supported" generically; faculty "map course outcomes to Graduate Outcomes where applicable" (PRD §8.3, §10.3; SRS FR-3.6). | ADR 0005 §3: **Every CILO must have at least one GO mapping. Shared GE CILOs map to the relevant GOs of every program they serve. Mapping maintenance follows the owner of each side.** | wording + blocking on the "at least one" rule | PRD/SRS never state the "every CILO must have at least one mapping" rule and never distinguish shared GE mapping behavior. ADR wins; rewrite must add these constraints. |
| Dean oversight of outcomes | "College Dean may review outcomes, governed stakeholder-tool templates, deployment context, analytics, reports, dashboards, and evidence outputs" (SRS §2.4.2). "College Deans shall have the same portal capabilities and operational access pattern as Program Heads" (PRD §6.2). PRD/SRS present Dean and Program Head as near-equivalent reviewers. | Map #103 + ADR 0005 §4: **Dean has college-wide *read-only* oversight of GOs, CILOs, and mappings.** Dean overview = GOs first, CILO + mapping coverage second. The Dean-vs-Program-Head equivalence in the PRD/SRS is the *general academic-leadership portal* model; the outcome-ownership rule layer is a *read-only* subset, distinct from the operational equivalence. | wording | The PRD/SRS equivalence is not wrong for the academic-leadership portal surface, but it does not flag the read-only constraint on outcomes. Rewrite should add a Dean-outcomes read-only clause. |
| Dean editing outcomes | Not explicitly granted, but the "same portal capabilities" wording is ambiguous. | ADR 0005 §4: **Dean does not edit outcomes or mappings through this effort.** | wording | Rewrite must make the read-only constraint explicit. |
| Secretary operations | Secretary is described as a "System Administrator" (PRD §6.2) who "manages users, roles, programs, majors…" and stewards records. | Map #103: **Secretary performs routine record-level operations; shared readiness definition serves both Secretary and Dean, with different presentation granularity.** Identity and Access glossary further restricts Secretary-created accounts per `0001-complete-secretary-created-accounts.md`. | wording | PRD calls this role "System Administrator"; the project uses `Secretary`. `0001` is the canonical role-completeness rule. |
| Shared readiness definition | Not mentioned in PRD/SRS. | Map #103: **One shared readiness source** with different presentation granularity for Secretary (record-level) and Dean (grouped totals). | obsolete | Outside Dean-IA scope; flag for the eventual full PRD/SRS rewrite but do not absorb into this effort. |

---

## 2. Secretary vs. Dean operational model

| Topic | PRD/SRS claim | Current decision | Severity | Notes |
|---|---|---|---|---|
| Secretary as system administrator | "System Administrator: Manage users, roles, programs, majors, program catalog details, course catalog, institutional instruments, system records, and governed platform configuration" (PRD §6.2). | The project uses `Secretary`, not `System Administrator`. Secretary's scope is set by `0001` (account creation) and `0003` (course-assignment stewardship). Map #103 reiterates: routine record-level operations, shared services, separate role-owned routes. | wording | Rename to `Secretary`; cite `0001` and `0003` for capability scope. |
| Dean "same portal capabilities" as Program Head | "Program Head and College Dean shall use the same general portal capabilities and operational access pattern" (PRD §6.2, §6.3; SRS §1.2, §2.4.2, FR-1.10). | Map #103: **Dean and Program Head use shared services where authorized, but role-owned routes remain separate.** ADR 0005 consequences reinforce: the Dean view of outcomes is *read-only*, the Program Head view is *GO authoring*; these are distinct routes, not a single shared screen. | wording | PRD/SRS do not contradict the rule on role-owned routes, but the "same general portal capabilities" wording could be read as a single shared UI. The current decision is shared *services*, separate *routes*. Rewrite should clarify. |
| `dean/users` scope | Not in PRD/SRS. | Map #103 *Out of scope*: **`dean/users` is out of scope for this effort; Secretary owns user management.** | open for the rewrite | Not present in PRD/SRS; nothing to flag in them. The rewrite should not introduce a Dean user-management surface. |

---

## 3. Learning Outcomes vs. future Insights

| Topic | PRD/SRS claim | Current decision | Severity | Notes |
|---|---|---|---|---|
| Where CILO attainment lives | "CILO Evaluation Tool… post-term course outcome attainment" (PRD §9.1). The tool's analytics and reports are described in the same IA surface as the GOs and CILOs themselves. | Map #103 + ADR 0005 §7: **Learning Outcomes area holds setup and alignment only** (GOs, CILOs, mappings). **Future Insights area holds response-based Learning Evaluation Results, Analytics, and Reports — currently hidden in navigation.** | blocking | PRD/SRS do not separate setup/alignment from response-based results. The separation is a current rule, not a PRD/SRS misunderstanding of an earlier model. Rewrite must split "Learning Outcomes" (setup) from a deferred "Insights" (results). |
| "CILO Reviews" as a standalone IA label | "CILO Evaluation Tool" / "Post-Term CILO Evaluation Tool" used as a tool name and as a navigation label (PRD §9, §10.4; SRS §5.4). | Map #103 *Notes* + ADR 0005 §8: **`CILO Reviews` is not a standalone Dean IA label**; it does not appear in current Dean navigation or group landing pages. | blocking | PRD/SRS still use "CILO Evaluation Tool" / "CILO Reviews" as a label. The decision is to retire that label in the Dean IA; the underlying evaluation tool can remain as the instrument name, but the IA label is gone. |
| Analytics, Reports, Learning Evaluation Results as live surfaces | "Analytics and attainment computation module" (PRD §10.8); "Reporting and Evidence Generation Module" (PRD §10.9); evaluation-result analytics described as live. | Map #103 *Out of scope*: **Current delivery of Analytics, Reports, Learning Evaluation Results, formal PDF reporting, evaluation-score charts, outcome versioning, or real-time subscriptions is deferred.** | obsolete | Outside this effort's destination. The rewrite should keep these as PRD/SRS scope for the broader product but must not re-introduce them as live Dean IA surfaces. |
| Word-cloud analytics | "Word-cloud generation from open-ended responses" (PRD §7.1, §9.2; SRS FR-7.8, FR-8.10). | Deferred. Same Out of scope entry as above. | obsolete | Defer in the rewrite. |

---

## 4. Enrollments presentation

| Topic | PRD/SRS claim | Current decision | Severity | Notes |
|---|---|---|---|---|
| Enrollments view shape | "Aggregated analytics, reports, outcomes views, and stakeholder evaluation insights across all college programs. Filter or drill down into specific programs" (PRD §8.7). Dean views are described as program-comparison dashboards. | Map #103: **Enrollments — program totals first, class/course drill-down, names only after explicit drill-down, all Dean views read-only.** | blocking | The Dean-facing Enrollments view is *not* a program-comparison dashboard; it is program totals first, names only after drill-down. The PRD/SRS framing as "drill into specific programs" matches the historical general-academic-leadership view, not the current Dean IA. |
| Student identifiers in Dean exports | "Export-ready report refinements" (PRD §18.2 Priority 2; SRS FR-9.6). | Map #103: **Exports exclude student identifiers.** | blocking | Dean enrollments exports must not include student identifiers. |
| Dean edit on enrollments | Not directly addressed; PRD/SRS describe Dean as a reviewer with the "same general capabilities" as Program Head. | Map #103: **All Dean views read-only.** | blocking | The "same general capabilities" wording leaves room for Dean edits; current decision locks Dean to read-only. Rewrite must make this explicit. |

---

## 5. Dashboard period scope

| Topic | PRD/SRS claim | Current decision | Severity | Notes |
|---|---|---|---|---|
| Dashboard period | PRD/SRS describe dashboards as showing "aggregated analytics, reports" across the college (PRD §8.7, §10.8). No period scoping rule. | Map #103: **Dashboard shows active period only. Source pages provide explicit historical filters. Without an active period, Enrollments opens the labelled latest completed period.** | blocking | PRD/SRS do not state the period rule. Rewrite must add it. |
| Historical navigation | "History-aware reporting" in PRD Release 2 (PRD §19) and "historical and longitudinal analysis" in PRD §10.8 / SRS FR-8.12, FR-9.5. | Same as above: source pages own historical filters; dashboard does not. | wording | The "history" capability is not removed, but it belongs on source pages, not the dashboard. Rewrite should relocate it. |

---

## 6. PWA offline behavior

| Topic | PRD/SRS claim | Current decision | Severity | Notes |
|---|---|---|---|---|
| Offline scope | "Advanced offline capabilities beyond a practical app-shell style experience" is explicitly deferred (PRD §18.3; SRS §10.3). "Limited shell-style PWA support outside a fully connected state" (SRS NFR-26). | Map #103: **Cache last viewed read-only data with timestamp. All mutations require network.** | blocking | The PRD/SRS deferral is consistent in spirit, but it is silent on the "all mutations require network" rule and the "cache last viewed read-only data with timestamp" rule. Rewrite should make both rules explicit. |
| Installability, app framing | "CLOIE shall be developed as a Progressive Web Application… installability on supported Android, iOS, and desktop" (PRD §12.10; SRS NFR-30…32). | Consistent with the current PWA direction. | obsolete (not in Dean IA scope) | Keep as PRD/SRS scope; not in this effort. |

---

## 7. Account role completeness

| Topic | PRD/SRS claim | Current decision | Severity | Notes |
|---|---|---|---|---|
| Role-completeness rules for Secretary-created accounts | PRD §10.1 ("user creation, modification, activation, deactivation, and role assignment"); SRS FR-11.1, FR-11.2 ("register or invite faculty members, program heads, deans, and industry partners using controlled account-creation workflows"). Use the words "register or invite." | `0001-complete-secretary-created-accounts.md`: **No invitation workflow; Secretary creates complete accounts using existing role-specific tables, atomic transaction, ACD email rules, deferred-enrollment semantics, conditional major rule, external verification = APPROVED for Secretary-created external accounts.** | wording | PRD/SRS use "invite," which is wrong for the current model. Rewrite must replace with Secretary-created, complete-at-creation, and the supporting rules. |

---

## 8. Course catalog defaults and assignment overrides

| Topic | PRD/SRS claim | Current decision | Severity | Notes |
|---|---|---|---|---|
| Course catalog model | "Course applicability to the entire program or to selected majors within a program" (PRD §5.2); "course-to-program and course-to-major associations" (PRD §10.2; SRS FR-2.4…2.10). Course default fields not specified. | `0003-course-catalog-and-assignment-refactor.md`: **Course has advisory catalog defaults (`year_level`, `semester`, `term`); `CourseAssignment` may override `year_level`; merged classes are split into separate assignments; section is required; one evaluation per assignment.** | wording | PRD/SRS describe the catalog features at a high level but do not state the advisory-defaults rule, the year-level override on `CourseAssignment`, the merged-class split, the required section, or the one-evaluation-per-assignment rule. Rewrite should add these. |
| One evaluation per class | "A course assignment can have at most one evaluation" implied via "Course-bound evaluation" terminology. Not stated as a constraint. | `0003`: **1-to-1 enforcement between `CourseBoundEvaluation` and `CourseAssignment`; legacy columns dropped; backfill migration required before the unique index.** | wording | Rewrite must state the 1-to-1 rule and call out the historical backfill as resolved. |
| On-behalf evaluation deployment | Not addressed. | `0003`: **Program Heads, Deans, and Secretaries may deploy a course-bound evaluation on behalf of a faculty member; deployer recorded in `deployed_by`; on-behalf deployments skip question customization.** | obsolete for the PRD level | Not in this effort. The rewrite should note on-behalf deployment as part of the broader product. |

---

## 9. Open questions (PRD/SRS raises, map #103 has not decided)

These are surfaced for the inventory; do not decide them here.

| Topic | PRD/SRS question | Status |
|---|---|---|
| Program Head course-catalog management scope | "FR-2.5 The system shall allow authorized Program Heads to create, update, activate, archive, and manage course records only within assigned program scope and valid major scope" (SRS §5.2.2). | `0003` confirms Secretary/Dean steward course assignments and Secretary owns user management, but does not decide whether Program Heads may create catalog records vs. only view them. PRD/SRS grant Program Head catalog-authoring. **Open — needs a future ticket.** |
| Student onboarding and self-sign-up | "Support student self-sign-up and onboarding if this operational model is retained" (PRD §10.1; PRD §18.1 Priority 1). | Identity and Access glossary models both self-service role claim and Secretary-recorded enrollment, but no accepted decision in map #103 settles whether student self-sign-up is part of this effort. **Open — needs a future ticket.** |
| Graduating-student exposure through Student role | "Graduating students are not a separate system role; they are students who qualify for graduating-student-targeted instruments based on academic context" (PRD §6.5; SRS §1.2). | Consistent with the Identity and Access glossary, but the actual implementation detail (how graduating eligibility is resolved for evaluation targeting) is not pinned by map #103. **Open — needs a future ticket.** |
| Industry partner multi-program affiliation | "Whether industry partners may be affiliated with more than one program context in the initial release" (PRD §20, item 8). | Not decided. **Open.** |
| Shared GE CILO mapping integrity | "Mapping integrity for shared General Education CILOs is part of the readiness data-model work tracked by Issue #104" (ADR 0005). | Resolved-by-104 reference; #104 is closed. The data-model support exists, but the implementation ticket for the rule is not yet on the frontier. **Open — out of this inventory; should be picked up by #110.** |

---

## 10. Cross-cutting wording / housekeeping

| Topic | PRD/SRS claim | Current decision | Severity | Notes |
|---|---|---|---|---|
| "System Administrator" terminology | Used throughout PRD §6.2, §6.5, §10.11; SRS §2.4.1, FR-11.1…11.7. | Project canonical term is `Secretary`. | wording | Rename across the rewrite; reference `0001` for capability scope. |
| "CILO Reviews" navigation label | Used as a tool/label. | Retired (map #103 *Notes*; ADR 0005 §8). | blocking | Replace with "Post-Term CILO Evaluation Tool" (instrument name) and place it under Learning Outcomes (setup) and the deferred Insights (results). |
| "Same general portal capabilities and operational access pattern" | Repeated phrasing. | Shared services; separate role-owned routes (map #103; ADR 0005 consequences; course-assignments CONTEXT.md "Role-owned route"). | wording | Rewrite should call out the route separation explicitly. |
| Dean vs. Program Head analytics identity | "College Dean shall have the same general analytics capabilities available to the Program Head" (PRD §10.8; SRS FR-8.7, FR-9.9). | Shared *services*, different *presentation* granularity and *scope*. For outcomes specifically, Dean = read-only oversight, Program Head = GO authoring. | wording | Rewrite should differentiate the operational equivalence (general academic-leadership portal) from the read-only-outcome constraint. |
| Dashboard navigation labels | "Dashboard" appears generically. | Map #103: phone bottom tabs + drawer, tablet compact sidebar, desktop full sidebar, with structure and oversight as thin group landing pages. | obsolete | Outside this effort; the rewrite is for the broader product. |

---

## 11. Not in scope for this inventory

The PRD/SRS sections that are correct for the broader product but **not** affected by map #103's Dean-IA destination are listed here so the later rewrite (likely part of #110) does not lose them:

- All evaluation-instrument delivery, response collection, submission, and post-data processing rules (PRD §9, §10.4…10.7; SRS §5.4…5.7) — outside the Dean IA destination, but still authoritative for the broader CLOIE product. Keep as-is in the PRD/SRS.
- PWA installability and app-framing details (PRD §12.10; SRS NFR-27…32) — same.
- Hardware, communications, and software interface requirements for the rest of the system (SRS §4.2…4.4) — same.
- Tech-stack direction (PRD §13; SRS §8.2) — already aligned with current repo. No change needed.
- MVP scope and release prioritization (PRD §18; SRS §10.2, §10.3) — for the broader product; not in this effort.

---

## Summary for the #107 resolution comment

Discrepancy classes (one line each):

- **Outcome ownership** — PRD/SRS conflate GO authoring with program-level template authoring and call CILOs "course-context editor" records; ADR 0005 + map #103 split GOs and templates, lock CILOs to the course level, and add the "every CILO must have at least one mapping" rule.
- **Secretary vs. Dean operational model** — PRD/SRS use "System Administrator" and imply a shared UI; current decisions use `Secretary`, share services but keep role-owned routes, and lock Dean to read-only on outcomes.
- **Learning Outcomes vs. future Insights** — PRD/SRS place CILO attainment analytics and word-cloud outputs in the same IA surface; current decisions split Learning Outcomes (setup/alignment) from a deferred Insights (results, analytics, reports).
- **`CILO Reviews` label** — PRD/SRS still use it; current decision retires the label from the Dean IA.
- **Enrollments** — PRD/SRS frame Dean Enrollments as a program-comparison dashboard; current decisions are program totals first, names only after drill-down, exports exclude student identifiers, all read-only.
- **Dashboard period scope** — PRD/SRS do not state a period rule; current decisions restrict the dashboard to the active period and push historical filters to source pages.
- **PWA offline** — PRD/SRS defer offline support without specifying the rule; current decisions cache last viewed read-only data with timestamp and require network for mutations.
- **Account role completeness** — PRD/SRS use "invite" and treat Secretary as system administrator; `0001` makes Secretary-created accounts complete at creation time with no invitation workflow.
- **Course catalog defaults and assignment overrides** — PRD/SRS describe the catalog at a high level; `0003` adds advisory defaults, year-level overrides on `CourseAssignment`, the merged-class split, the required section, and the 1-to-1 evaluation constraint.
- **Open questions** — Program Head course-catalog authoring scope, student self-sign-up retention, graduating-student evaluation targeting detail, industry partner multi-program affiliation, and shared-GE-CILO mapping-implementation ticket are surfaced but not decided here.

No new policy opened; no PRD/SRS edits made; only the inventory file added.

---
title: Requirements Traceability Matrix (RTM)
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# Requirements Traceability Matrix (RTM)

Skeleton aligned to [Appendix F — Requirements Traceability Matrix Template](../guide/appendix-f-requirements-traceability-matrix-template.md). The matrix is maintained throughout the capstone, not prepared only before Final Defense. Every gap below is **pending**; entries are added only when responsibly attributable evidence exists in this repository.

## Header block (pending)

| Capstone Project Title:    | pending                               |
| :------------------------- | :------------------------------------ |
| **Team / Proponents:**     | pending                               |
| **Client / Partner:**      | pending                               |
| **Adviser:**               | pending                               |
| **Current Version:**       | pending                               |
| **Date Updated:**          | pending                               |
| **Project Milestone:**     | ☐ Title ☐ Outline ☐ Pre-Final ☐ Final |
| **Prepared / Updated by:** | pending                               |

## A. ID stability policy (legend)

- Each approved objective and requirement carries a **unique and stable identifier**. IDs are **never renumbered** because a requirement changed, moved, or was rewritten.
- **Superseded IDs are retired, not reused.** A replaced requirement keeps its ID linked to its replacement via the change log (Section E) and the status `Changed / Superseded`; the retired ID never migrates to different content.
- IDs are assigned **only** when a requirement is responsibly attributable to a current, verifiable source: a domain `CONTEXT.md` invariant, an ADR decision, or current code plus tests that enforce it. **A requirement is never inferred merely because code exists** — code without a documented requirement source gets `pending review`, not an ID.
- ID prefixes follow Appendix F: `FR-` functional, `NFR-` quality/non-functional, `SEC-` security/privacy, `DR-` data, `INT-` integration, `OBJ-` objectives.
- Rows marked `pending review` have candidate material but unresolved provenance; they gain IDs only after the source is confirmed. Rows with no attributable source stay out of the matrix entirely until such a source exists.

## B. Status vocabulary

Per [Appendix F §B](../guide/appendix-f-requirements-traceability-matrix-template.md): Proposed, Approved, In Development, Implemented, Verified / Passed, Partially Met, Deferred, Changed / Superseded, Rejected / Removed. No row in this file may claim `Verified / Passed` without linked test/acceptance evidence in this repository.

## C. Requirements Traceability Matrix

All seeded rows below were reconstructed from current, verifiable repository sources. No requirement was inferred from code alone; every row cites its source. Unattributed candidate requirements are not listed — they enter only after provenance review.

| Req. ID | Objective / Stakeholder Need        | Requirement Statement                                                                                                                                                                                                                                                                                             | Type / Priority   | Acceptance Criteria                                                                                                                                                                                                    | Design / Component Reference                                                                                                                                                                                                                                                                                                                                                            | Implementation Evidence                                                                                                                                                                                     | Test / Validation Reference                                                                                                                                                                                                                                                                                                               | Latest Result / Status                       | Remarks / Change Reference |
| ------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------- |
| FR-01   | pending (objective mapping pending) | A respondent holds exactly one response row per evaluation assignment; submission is atomic and a SUBMITTED response rejects further draft saves and submissions.                                                                                                                                                 | Functional / Must | Submission in one transaction deletes prior answer items and writes the final item set before flipping status; a concurrent second submission fails; unique `assignment_id` backs the invariant at the database level. | [src/features/responses/CONTEXT.md](../../../src/features/responses/CONTEXT.md) ("One-response invariant", "Response lifecycle", "Submission completeness")                                                                                                                                                                                                                             | Unique `assignment_id` constraint in [prisma/models/responses.prisma](../../../prisma/models/responses.prisma); submission services in [src/features/responses/services/](../../../src/features/responses/) | [src/**tests**/features/responses/response-lifecycle-invariants.test.ts](../../../src/__tests__/features/responses/response-lifecycle-invariants.test.ts) (gated DB invariant suite)                                                                                                                                                      | pending (test run evidence not yet recorded) | —                          |
| FR-02   | pending (objective mapping pending) | Before a Course-bound evaluation publishes, every active CILO of the locked Course must satisfy the Course scope's typed alignment rule (General Education: at least one active Institutional Outcome mapping with a manifestation; Program-specific: a manifestation on every active PLO of the owning program). | Functional / Must | Publication is rejected with a direct repair path to Course alignment when any active CILO fails the typed alignment rule; zero active PLOs with active CILOs is incomplete, not ready.                                | [src/features/evaluations/CONTEXT.md](../../../src/features/evaluations/CONTEXT.md) ("Publication alignment gate"); [src/features/outcomes/CONTEXT.md](../../../src/features/outcomes/CONTEXT.md) ("Outcome readiness", typed alignment relations); [docs/adr/0017-program-learning-outcome-canonical-terminology.md](../../adr/0017-program-learning-outcome-canonical-terminology.md) | Publication service under [src/features/evaluations/](../../../src/features/evaluations/)                                                                                                                   | [src/**tests**/features/evaluations/publication-roster-lock-db-invariants.test.ts](../../../src/__tests__/features/evaluations/publication-roster-lock-db-invariants.test.ts) (gated DB invariant suite); unit suites under [src/**tests**/modules/deployments-and-targeting/](../../../src/__tests__/modules/deployments-and-targeting/) | pending (test run evidence not yet recorded) | —                          |
| FR-03   | pending (objective mapping pending) | A deployed evaluation may exclude an active roster member only under a recorded category with acting user and timestamp; exclusion reversal re-creates the respondent's EvaluationAssignment while the window is open.                                                                                            | Functional / Must | One exclusion per member per evaluation; reversal categories restricted; late inclusion works only while `ACTIVE` or `SCHEDULED` and before the deadline.                                                              | [src/features/evaluations/CONTEXT.md](../../../src/features/evaluations/CONTEXT.md) ("Roster exclusions", "Exclusion reversal")                                                                                                                                                                                                                                                         | Exclusion services under [src/features/evaluations/](../../../src/features/evaluations/)                                                                                                                    | [src/**tests**/features/evaluations/publication-roster-lock-db-invariants.test.ts](../../../src/__tests__/features/evaluations/publication-roster-lock-db-invariants.test.ts)                                                                                                                                                             | pending (test run evidence not yet recorded) | —                          |

### Pending review (provenance unclear)

The following candidate requirement areas have current implementation and test material but **unclear provenance to an approved requirement statement**. They are deliberately NOT assigned IDs. Each needs review against stakeholder-approved objectives before entering Section C.

| Candidate area                                                                                    | Material that exists                                                                                                                                                                                                                                                                             | Missing provenance                                              | Status         |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | -------------- |
| Cross-role privacy boundaries for response review (identified detail is a Program-Head-only flow) | [src/features/response-review/CONTEXT.md](../../../src/features/response-review/CONTEXT.md); privacy test suites under [src/**tests**/features/response-review/](../../../src/__tests__/features/response-review/) and [e2e/cross-role-privacy.spec.ts](../../../e2e/cross-role-privacy.spec.ts) | Link to an approved stakeholder requirement/objective statement | pending review |
| Removed: curriculum versioning lifecycle (DRAFT → PUBLISHED → RETIRED, published immutability)    | Superseded by [ADR 0021](../../adr/0021-remove-curriculum-versioning.md); historical decision preserved in [ADR 0013](../../adr/0013-versioned-curriculum-course-placement.md)                                                                                                                   | Removed from current scope; no new requirement ID               | removed        |
| One-active Academic Period invariant                                                              | [src/features/academic-calendar/CONTEXT.md](../../../src/features/academic-calendar/CONTEXT.md); [src/**tests**/features/academic-calendar/academic-period-one-active-invariant.test.ts](../../../src/__tests__/features/academic-calendar/academic-period-one-active-invariant.test.ts)         | Link to an approved stakeholder requirement/objective statement | pending review |
| Single-role accounts invariant                                                                    | [docs/adr/0001-single-role-accounts.md](../../adr/0001-single-role-accounts.md); [src/features/users/CONTEXT.md](../../../src/features/users/CONTEXT.md)                                                                                                                                         | Link to an approved stakeholder requirement/objective statement | pending review |

## D. Objective-to-Requirement Coverage Check

Objectives are defined in Chapter 1 ([manuscript/01-project-context-and-definition.md](../manuscript/01-project-context-and-definition.md), §1.3), which is itself pending drafting. No objective IDs are assigned until those objectives are approved; this section is intentionally empty of invented rows.

| Objective ID | Approved Objective | Linked Requirement IDs | Coverage / Evidence | Gap / Required Action                        |
| ------------ | ------------------ | ---------------------- | ------------------- | -------------------------------------------- |
| OBJ-\_\_     | pending            | pending                | pending             | Draft and approve Chapter 1 objectives first |

## E. Requirement Change Log

| Change ID | Date    | Req. ID | Change / Decision | Reason / Evidence | Impact on Scope/Design/Test | Approved by |
| --------- | ------- | ------- | ----------------- | ----------------- | --------------------------- | ----------- |
| CR-\_\_   | pending | pending | pending           | pending           | pending                     | pending     |

## F. Final Traceability and Completion Summary

All counts **pending** — none may be filled until Section C rows have verified evidence.

| Measure                                   | Count   | Percentage | Notes |
| ----------------------------------------- | ------- | ---------- | ----- |
| Total approved requirements               | pending | 100%       |       |
| Verified / Passed requirements            | pending | pending    |       |
| Partially met requirements                | pending | pending    |       |
| Deferred requirements                     | pending | pending    |       |
| Failed / unresolved requirements          | pending | pending    |       |
| Requirements with linked test evidence    | pending | pending    |       |
| Requirements with implementation evidence | pending | pending    |       |

Completion Formula: Verified Requirements ÷ Total Approved Requirements × 100. Progress indicator only; critical and quality/security requirements are not equivalent to trivial features.

## G. Proponent Declaration and Review

Per [Appendix F §G](../guide/appendix-f-requirements-traceability-matrix-template.md): entries must be supported by project artifacts and not fabricated or misrepresented. All signature fields **pending**.

| Prepared by:                         | pending | Date:          | pending |
| :----------------------------------- | :------ | :------------- | :------ |
| **Team Leader / Proponent:**         | pending | **Signature:** | pending |
| **Reviewed by Adviser:**             | pending | **Date:**      | pending |
| **Verified at Defense / Review by:** | pending | **Date:**      | pending |

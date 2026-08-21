# gen-ed-ilo-catalog Specification

## Purpose
TBD - created by archiving change transfer-ilo-catalog-to-gen-ed-coordinator. Update Purpose after archive.
## Requirements
### Requirement: General Education Coordinator owns the college-wide Institutional Learning Outcome catalog
The system SHALL provide a `GEN_ED_COORDINATOR`-owned college-wide Institutional Learning Outcome (ILO) catalog. Each Institutional Outcome SHALL have a stable unique `code`, statement `description`, display `order`, active/archive `is_active`, and timestamps `created_at`/`updated_at` (`prisma/models/outcomes.prisma:42-53`). The catalog SHALL support create, edit, reorder, archive, and restore through server-authorized protected operations. The catalog is **college-wide** (no `program_id`).

#### Scenario: Coordinator creates an Institutional Outcome
- **GIVEN** an authenticated user has active role `GEN_ED_COORDINATOR`
- **WHEN** the user submits a valid unique `code` (1-20 chars, case-insensitive) and `description` (3-1000 chars) at `/gen-ed-coordinator/outcomes`
- **THEN** the system creates an active Institutional Outcome in the college-wide catalog with `order = count(active+archived)` and reports success

#### Scenario: Duplicate ILO code is rejected
- **GIVEN** an active or archived Institutional Outcome already uses `code` (e.g., `ILO-1`)
- **WHEN** a `GEN_ED_COORDINATOR` submits another Outcome with that `code` (any casing)
- **THEN** the system rejects the write with a safe duplicate-code error (`Institutional Outcome code already exists.`) and preserves the catalog

#### Scenario: Non-Coordinator cannot mutate the ILO catalog
- **GIVEN** an authenticated user has active role `SECRETARY`, `DEAN`, `PROGRAM_HEAD`, `FACULTY`, `STUDENT`, `ALUMNI`, or `INDUSTRY_PARTNER`
- **WHEN** the user attempts any ILO create, edit, reorder, archive, or restore — including crafted `FormData` or direct service calls to `prepareOutcomeWrite`/`commitOutcomeWrite`
- **THEN** the server rejects the operation with an authorization error and does not change the catalog

#### Scenario: Secretary ILO routes remain denied
- **GIVEN** an authenticated user has active role `SECRETARY`
- **WHEN** the user visits `/secretary/learning-outcomes` or `/secretary/learning-outcomes/alignment/*`
- **THEN** the system redirects to `/secretary/dashboard` and shows no ILO mutation controls

#### Scenario: Archived outcomes remain visible
- **GIVEN** a `GEN_ED_COORDINATOR` archives an Institutional Outcome
- **WHEN** the catalog at `/gen-ed-coordinator/outcomes` is loaded
- **THEN** the Outcome remains visible with `Archived` badge, stays in its `order`, cannot be selected for new CILO→ILO mappings, and persists its `code` uniqueness

#### Scenario: Restore archived ILO
- **GIVEN** an archived Institutional Outcome belongs to the catalog
- **WHEN** a `GEN_ED_COORDINATOR` restores it
- **THEN** it becomes `is_active=true`, becomes selectable for new mappings, and retains its stable `order` position

#### Scenario: Reorder ILOs is complete and unique
- **GIVEN** the catalog contains `N` Institutional Outcomes
- **WHEN** a `GEN_ED_COORDINATOR` drags to reorder and the client submits `orderedIds` with missing, duplicate, or foreign ids
- **THEN** the system rejects with `Institutional Outcomes must be a complete unique college-wide order.`

### Requirement: ILO catalog writes use protected review and current-state confirmation
`GEN_ED_COORDINATOR` ILO writes SHALL use an exact before-and-after review, explicit confirmation, server-side `GEN_ED_COORDINATOR` authorization, freshness recheck, and `Serializable` atomic save. A stale or unconfirmed review SHALL NOT mutate the catalog. Implementation reuses `manage-outcome-writes.ts:45-439` (`token(JSON.stringify(before))`, `signReview(HMAC-SHA256)`, `reviewIsValid timingSafeEqual`, `revalidate` inside `prisma.$transaction({isolationLevel: Serializable})`).

#### Scenario: Coordinator cancels a reviewed write
- **GIVEN** a valid ILO write has been prepared (`prepareOutcomeWrite` returned `before/after/freshnessToken/signature`)
- **WHEN** the Coordinator does not explicitly confirm (`confirmed !== true` to `commitOutcomeWrite`)
- **THEN** the system performs no catalog mutation

#### Scenario: Stale catalog review is rejected
- **GIVEN** another write changes the same catalog scope after `prepare`
- **WHEN** the original `review` with old `freshnessToken` is submitted to `commitOutcomeWrite`
- **THEN** the system rejects with `Outcome changed after review. Prepare a new review.` or `Outcome changed; prepare a new review.` and requires a new prepare

#### Scenario: Tampered review signature rejected
- **GIVEN** a prepared review `signature` was altered or originated from a different `userId`
- **WHEN** it is submitted
- **THEN** the system rejects with `You do not have permission to modify this outcome.`

### Requirement: ILO catalog UI communicates catalog + interaction states
The GE Coordinator catalog at `/gen-ed-coordinator/outcomes` SHALL show a college-wide ordered list with stable `code` + `description`, count of `cilo_institutional_outcome_mappings`, structural loading skeleton, useful empty state with create action, and safe recoverable errors. Non-Coordinator users SHALL see no mutation controls.

#### Scenario: Catalog has no outcomes
- **GIVEN** `listInstitutionalOutcomes` returns zero rows
- **WHEN** the page renders
- **THEN** it explains no Institutional Outcomes exist, shows `No Institutional Learning Outcomes yet` with `Add ILO` action (mirroring `program-head-outcomes-page.tsx:315-329` Empty)

#### Scenario: Catalog read fails
- **GIVEN** the catalog read fails unexpectedly
- **WHEN** the page renders
- **THEN** it shows a generic safe error with a retry path and does not expose database details

#### Scenario: Coordinator drag-reorders ILOs
- **GIVEN** at least 2 active Institutional Outcomes
- **WHEN** the Coordinator drags a row (`GripVertical`) to a new position
- **THEN** the client optimistically reorders, debounces 600ms, calls `reorderILOsAction`, on failure rolls back to server state and shows `Institutional Outcome order could not be saved.`

### Requirement: GE Coordinator has a read-only college-wide CILO-to-ILO mapping review
The system SHALL provide a read-only mapping review at `/gen-ed-coordinator/outcomes/mapping` listing every `is_active=true` GE course (`course.course_scope==GENERAL_EDUCATION`) with active CILOs and, per CILO, its mapped active ILOs with `manifestation L/P/O` badges and college-wide `readiness` (`ready` when at-least-one active mapping with non-null manifestation, else `Needs mapping` via `ciloIsAligned`). The view SHALL be authorized `GEN_ED_COORDINATOR` only and reuse `listCILOILOMappingsForGE` server logic.

#### Scenario: Coordinator opens mapping review
- **GIVEN** a `GEN_ED_COORDINATOR` visits `/gen-ed-coordinator/outcomes/mapping`
- **WHEN** the server reads active GE courses and ILOs
- **THEN** each GE course card (e.g., `GEMATH`, `GEGS`) shows its CILOs, each CILO shows mapped ILO `code · L/P/O` badges, and `Aligned`/`Needs mapping` status; GE badge reads `Shared General Education`

#### Scenario: Non-Coordinator requests mapping review
- **GIVEN** another role requests `/gen-ed-coordinator/outcomes/mapping`
- **WHEN** the server checks `resolveAuthSession().activeRole`
- **THEN** the request fails closed (`redirect("/unauthorized")`) and returns no mapping data

#### Scenario: Course has no GE CILO mappings
- **GIVEN** a GE course has active CILOs but zero `cilo_institutional_outcome_mappings`
- **WHEN** the review renders that CILO
- **THEN** it shows `No mapped outcome. Faculty can align this CILO to Institutional Outcomes through Course alignment.` alert and `Needs mapping` badge


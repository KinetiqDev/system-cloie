# Interface screenshots — manifest and capture README

213 interface screenshots of the System CLOIE build, captured read-only on 2026-09-14, with a
machine-readable index (`manifest.csv`) and the capture/verification record in this file.

## 1. Source of truth

| Field | Value |
| --- | --- |
| Branch | `feat/630-scaffold-selection` |
| Commit | `e18c0e4` |
| Capture date | 2026-09-14 |
| Application | System CLOIE dev server at `http://127.0.0.1:3000` (Next.js development build, never restarted during capture) |
| Browser | Playwright **1.62.1**, Chromium `151.0.7922.34`, headless, device scale factor 1 |
| Viewports | desktop `1440x900`, mobile `390x844` (viewport-only frames — no full-page capture, no browser chrome) |
| Authentication | Playwright `POST /api/auth/dev-login` with the account email, one isolated browser context per role account and viewport; no Google OAuth, no passwords |
| Appearance | Light (documented default). The only dark frames are the three `shared/shared__appearance__*` captures |
| Capture hygiene (every frame) | `networkidle` + App Router settle (no `aria-*` on `<html>`), `prefers-reduced-motion: reduce`, injected CSS disabling animation/transition/caret, `nextjs-portal` dev overlay and the development-only Demo/Dev role switchers hidden |
| Read-only guarantee | Navigation only. No record was created, edited, saved, published, activated, deactivated, archived, imported, rolled over, revoked or deleted; no seed data, config or application code was modified |

The set was produced by four independent capture slices, each with its own ledger; this README and
`manifest.csv` are the consolidated delivery of those ledgers.

## 2. Contents and counts

### 2.1 Per role and per viewport

| Role (directory) | desktop 1440x900 | mobile 390x844 | total |
| --- | ---: | ---: | ---: |
| `shared/` (role-independent chrome, pre-auth surfaces) | 14 | 5 | 19 |
| `secretary/` | 20 | 7 | 27 |
| `dean/` | 13 | 10 | 23 |
| `program-head/` | 24 | 12 | 36 |
| `gen-ed-coordinator/` | 12 | 10 | 22 |
| `faculty/` | 19 | 18 | 37 |
| `student/` | 10 | 9 | 19 |
| `alumni/` | 10 | 7 | 17 |
| `industry-partner/` | 7 | 6 | 13 |
| **Total** | **129** | **84** | **213** |

All nine directories carry both desktop and mobile frames, so each of the eight roles has
desktop + mobile evidence.

### 2.2 Appendix mapping (`appendix_section` column)

| Section | Subject | Rows |
| --- | --- | ---: |
| E-9.2 | Auth / role selection and role-scope surfaces | 20 |
| E-9.3 | Admin interfaces (Secretary, Dean, Program Head, Gen Ed Coordinator) | 43 |
| E-9.4 | Faculty interfaces | 17 |
| E-9.5 | Respondent workflows (student, alumni, industry partner) and response review | 26 |
| E-9.6 | Mobile navigation and responsive composition | 75 |
| E-9.7 | Loading / empty / validation / error / confirmation states | 26 |
| E-9.8 | Accessibility evidence | 6 |

Where a slice proposed a frame for a second section, the manifest keeps the primary section in
`appendix_section` and records the secondary one in `notes` (`Secondary appendix support: E-9.x.`).

## 3. File naming

Every file is `<role>/<role>__<page-or-workflow>__<state>__<viewport>.png`, all lowercase
kebab-case, `<role>` equal to its directory, `<viewport>` one of `desktop` / `mobile`.
Verified for all 213 files (see §11, check 1).

## 4. `manifest.csv` schema

| Column | Meaning |
| --- | --- |
| `file` | Path relative to `docs/interface-screenshots/` |
| `role` | Role directory (`shared` … `industry-partner`) |
| `account` | Seeded demo account used for the frame, or `anonymous` for pre-auth frames |
| `viewport` | `1440x900` or `390x844` (matches the PNG pixel size exactly) |
| `route` | Canonical route, with query parameters and seeded UUIDs resolved (see §6.3) |
| `page_or_workflow` | Human-readable surface or workflow name |
| `state` | Exact captured state (default, dialog open, filter applied, validation error, …) |
| `appendix_section` | Primary appendix section code (§2.2) |
| `chapter_4_candidate` | `TRUE` for the two recommended Chapter 4 frames (§10), `FALSE` otherwise |
| `captured_at` | `2026-09-14` |
| `commit` | `e18c0e4` |
| `notes` | Frame-specific provenance: redirect-only aliases, unsaved/unsubmitted states, secondary appendix support, resolved runtime ids, applied list filters, privacy notes (recorded or resolved deviations) |

## 5. Accounts

| Account | Role | Frames |
| --- | --- | ---: |
| — (no session) | anonymous / pre-auth surfaces | 12 |
| `demo-secretary@cloie.test` | Secretary | 34 |
| `demo-dean@cloie.test` | Dean | 23 |
| `demo-ph@cloie.test` | Program Head (BSIT only) | 34 |
| `ph-multi@cloie.test` | Program Head (BEED + BSED) | 2 |
| `demo-gened@cloie.test` | Gen Ed Coordinator | 22 |
| `demo-faculty@cloie.test` | Faculty | 37 |
| `demo-student@cloie.test` | Student | 19 |
| `demo-alumni@cloie.test` | Alumni | 17 |
| `demo-industry@cloie.test` | Industry Partner | 13 |

`ph-multi@cloie.test` is used only for the two surfaces that require a genuinely multi-program
Program Head (the program **selection** page and the topbar program **switcher**); with
`demo-ph@cloie.test`, `/program-head` redirects straight to its single program dashboard and the
switcher renders nothing.

## 6. Routes: canonical vs redirect-only aliases

### 6.1 Aliases documented instead of duplicated

| Redirect-only alias | Canonical target (captured) |
| --- | --- |
| `/login` (no error parameter) | `/portal/respondents` — the sign-in surface renders only with `?error=…` (captured as `shared__login__auth-failure__desktop.png`) |
| `/portal` | `/portal/respondents` |
| `/secretary/courses/new`, `/secretary/courses/[id]/edit` | `/secretary/courses` (creation/editing are dialogs on the catalog page) |
| `/secretary/learning-outcomes` | `/secretary/dashboard` |
| `/dean` | `/dean/dashboard` |
| `/dean/programs`, `/dean/courses`, `/dean/course-assignments`, `/dean/instruments` | `/dean/academic-structure/{programs,courses,course-assignments,instruments}` |
| `/dean/cilo-reviews`, `/dean/cilo-reviews/[evaluationId]`, `/dean/cilo-reviews/[evaluationId]/responses/[responseId]` | `notFound()` by design — the Dean has no CILO-review or identified-response surface |
| `/dean/analytics`, `/dean/reports` | `notFound()` by design — no Dean analytics/reports surface exists |
| `/program-head` and the top-level `/program-head/{dashboard,courses,course-assignments,outcomes,tools,reports,analytics,cilo-reviews}` (single-program account) | `/program-head/programs/[programId]/dashboard` |
| `/program-head/programs/[programId]/cilo-reviews[/evaluationId]` | `/program-head/programs/[programId]/responses[/course/[evaluationId]]` (legacy CILO-review deep links) |
| `/program-head/programs/[programId]/profile` | `notFound()` by design — the Program Head profile lives at `/program-head/profile` |
| `/faculty/cilo-evaluations/[id]`, `/faculty/cilo-evaluations/[id]/responses/[responseId]` | `/faculty/analytics?evaluationId=[id]` (Faculty review is aggregate-only by contract) |
| `/alumni/evaluations/[deploymentId]` on an already-submitted deployment | `/alumni/evaluations/[deploymentId]/submitted` (frozen review) |
| `/industry-partner/evaluations/[deploymentId]` on an already-submitted deployment | `/industry-partner/evaluations/[deploymentId]/submitted` (frozen review) |
| `/student/evaluations/[id]` on an already-submitted assignment | `/student/history/[responseId]` (frozen review) |

Canonical shared routes reused across roles are captured once: `/course-rosters/[assignmentId]`
(Secretary, Faculty, Program Head) and the shared management shells behind
`/dean/academic-structure/{programs,courses,instruments}` (Secretary-owned components with
Dean-scoped headers).

### 6.2 Interaction-keyed route values

A few `route` values include the interaction that reached the state (for example
`/portal/respondents → Continue as Student`, `/secretary/courses → Add Course`,
`/secretary/school-years/[id]/rollover → Preview Rollover`). Those are workflow entry points, not
separate URLs.

### 6.3 Runtime-resolved identifiers

Program, term, assignment, roster, response and deployment identifiers were resolved from the
running application (never hard-coded from documentation) and are recorded resolved in
`manifest.csv`:

| Placeholder | Seeded identifier |
| --- | --- |
| `<bsitId>` | `3e2f8f2d-cef5-40e8-932a-b06939a0f7de` |
| `<beedId>` | `2c5c6ddb-7868-4a64-ac98-56b228dad77c` |
| `<activeTermId>` | `7a0211d0-5fa8-46e0-abff-9aed2f7d78a9` |
| `<completedTermId>` | `fda3bf25-5bab-45ec-a57e-0f679caae194` |

The student/alumni/industry slice recorded three UUIDs in abbreviated form in its ledger; they were
resolved from the seeded id constants and re-verified against the live routes
(`ac7ee020-…` = evaluation assignment, `fb000000-…` = alumni program-wide deployment,
`bbbbbbbb-…` / `cccccccc-…` = frozen alumni / industry reviews). Every resolved identifier in the
manifest returns the documented interface (see §11, check 6).

## 7. Skipped states and why (all four ledgers, consolidated)

| Skipped state | Where | Reason |
| --- | --- | --- |
| `/select-role` role-selection portal | all roles | Requires an account holding more than one assigned role. All twelve seeded demo accounts hold exactly one role (verified by opening the route for each; `ph-multi` holds two *programs*, not two roles). Creating a multi-role assignment is a data change, so the optional "active-role selection" Chapter 4 frame does not exist in this set. |
| POST-backed confirmations: user deactivate/delete, course delete/deactivate, program lifecycle, school-year activate/deactivate/archive, term Make Active / Complete / Cancel, instrument save, Run Rollover, "Agree and Continue with Google" | Secretary, Program Head, Faculty, Gen Ed | Every one is a write. Where the pre-submit state is documentation-relevant it was captured instead (row actions menu, edit dialogs, rollover confirmation + preview, legal-acknowledgement dialog). |
| Dean CILO reviews, Dean analytics, Dean reports | Dean | Deliberate `notFound()` fail-closed placeholders; no Dean navigation entry points at them. Nothing to document. |
| Dean program/course creation, deactivation, deletion, bulk actions | Dean | Mutating flows; only existing-record edit forms were opened, unsaved. |
| Consent/confirmation dialogs for deactivating or deleting programs, courses, instruments, majors | Secretary, Dean, Gen Ed | Only reachable by committing a destructive change. |
| Dean archived-target `(Archived)` labels | Dean | Not exercisable with the seeded periods: archived targets are hidden in ACTIVE periods, and the only completable snapshot that renders carries no recorded outcomes. |
| Dean oversight for the two 2025-2026 periods | Dean | Render the application error boundary instead of data (application defect, reproduced twice — §8.2). An error boundary from a read failure is not a designed product surface, so it is not framed. |
| Program Head publication **mobile configure step** | Program Head | The `datetime-local` Activation/Deadline inputs do not shrink into their grid column at 390 px (measured input `right=412` against a 390 px viewport, width 371 vs a 308 px column, no scroll container) → the control is clipped, so the frame would violate the no-clipped-content bar. Mobile coverage is provided by the Publish entry point frame plus the desktop configure frame. |
| Program Head publication **respondent preview** (desktop + mobile) | Program Head | Two independent reasons: the preview lists respondent names *and* emails and the captured deployment's preview included an address outside the seeded `@cloie.test` set (privacy rule); on mobile the step additionally clips the "Back to Configuration" action. The preview service itself is read-only and wrote nothing. |
| Program Head close/reopen/archive deployment confirmations, roster removal confirmation, roster CSV import write, outcome CSV import write, outcome archive/restore, instrument save/publish | Program Head | Final mutating actions; the PLO create/edit/import dialogs are captured with no file selected or no save. |
| Faculty CSV roster reconciliation (resolved-name confirm, import results), evaluation close/reopen confirmations, exclusion/reversal dialogs, instrument/ILO/CILO form validation, unsaved change prompts | Faculty, Gen Ed | Each requires uploading a file, writing a record, or submitting invalid data into a live workflow; only the pre-write wizard step and the empty forms are captured. |
| Empty-state variants (course with no CILOs, roster with no members, analytics scope with zero opportunities, unpublished tools list) | Faculty, Gen Ed | Not seeded; producing one requires a mutation or reseed. |
| Coordinator roster management and on-behalf publication | Gen Ed | The Coordinator scope grants neither, so no surface exists. |
| Loading and validation-error states for builder forms | Secretary, Dean, Program Head, Faculty | Require throttling the network or submitting invalid data; the captured loading/empty/validation exemplars come from surfaces that reach them read-only. |
| Student wizard qualitative section (4 of 4) and Review & Submit modal | Student | Only reachable by completing sections 1–3, which persists a section-scoped draft and creates a response row on a zero-response seeded evaluation. The equivalent render is captured from the seeded submitted response. |
| Student submission confirmation receipt | Student | Requires a real submission; the seeded submitted state is documented read-only (history list + frozen response detail). |
| Draft-saved feedback (`Draft restored` / saved clock) | Student, Alumni | No reachable seeded draft: the `demo-grad` drafts sit on deployments whose 2026-05-31 deadline has passed, and the open GESTECH evaluation has no response. All wizard frames therefore show `NOT SAVED`. |
| Student `IN PROGRESS` dashboard KPI / in-progress card | Student | No seeded in-progress response belongs to an evaluation the account can still open; the dashboard documents `IN PROGRESS 0`. |
| Alumni wizard qualitative section (5 of 5) and later quantitative sections | Alumni | Same reachability constraint as the student wizard; captured from the seeded submitted review. |
| Industry Partner interactive wizard and submission confirmation | Industry Partner | All four industry deployments for the account already carry submitted responses, so the wizard URL redirects to the frozen review (captured once); a new confirmation screen would require writing a response. |
| Student program-wide (central) deployment wizard | Student | No central assignment targets STUDENT for the account, and the graduate account's active central evaluation is already submitted. |
| Student / Alumni empty evaluation list | Student, Alumni | Both accounts have open pending evaluations; the empty-state pattern is documented from the Industry Partner pending tab. |
| Appearance "System" preference and the sign-out confirmation dialog | Shared | "System" is barely distinguishable from Light under the emulated light scheme; sign-out would begin session teardown. |
| Dark appearance in the gen-ed/faculty and student/external slices | Gen Ed, Faculty, Student, Alumni, Industry | Out of scope for those slices; the appearance states are owned by the `shared/` frames. |
| Server error / boundary-failure surfaces | all roles | Cannot be produced without breaking the running application. |
| `demo-grad@cloie.test` probe | Student | Probed for draft states and produced no frames (see the draft-saved skip); recorded as a deliberate deviation from the "primary account per role" rule. |

## 8. Follow-up observations (recorded, not fixed here)

### 8.1 Mobile `datetime-local` overflow on the Program Head publish form
At 390 px the Activation/Deadline `datetime-local` inputs do not shrink into their grid column:
measured input `right = 412` against a 390 px viewport (width 371 vs a 308 px column) with no
scroll container on the ancestor chain, so the control is clipped inside the frame. The mobile
configure step was therefore dropped from the set. Application code was intentionally not modified.

### 8.2 Dean college-oversight / learning-outcomes fails for two of the four offered periods
`/dean/college-oversight/learning-outcomes?period=9c9197c9-f726-4c97-81b2-bb964643b774`
(2025-2026 — 2nd Semester — 2nd Term) and `?period=fc937200-647b-4dec-ab86-9f0928fe3528`
(2025-2026 — 1st Semester — 1st Term) render the application error boundary
("We couldn't load this page"); reproduced twice per period during capture and again during
verification (§11, check 6). The ACTIVE period and the 2026-2027 completed snapshot render
correctly; the completed-period **empty** snapshot is captured as the E-9.7 exemplar.

### 8.3 Non-seeded rows in the dev database
`ILO-JRXR` and `ILO-39F5` were created by the `e2e/z-gen-ed-coordinator-scope` journey before this
run. They appear in the Gen Ed ILO catalog (6 of 7 ILOs visible in the desktop frame) and as extra
columns in the Faculty alignment matrix, and are captured as-is. A reseed would remove them.

### 8.4 Resolved privacy deviation — three `secretary/users` frames no longer render non-seeded personal addresses
The dev database holds accounts that are **not** part of the seeded `@cloie.test` demo set (and
that appear nowhere in the repository, including `prisma/seed`). An earlier capture of three
desktop account-management frames rendered three such addresses (one institutional, two
public-webmail; recorded in the original capture). All three frames were re-captured read-only
on the same route, viewport (1440x900) and states, with the list filtered to the seeded demo
accounts (`/secretary/users?q=demo-`, 9 of 41 users, ascending by name); the row-level actions menu
and the Edit User dialog were opened against the seeded `demo-ph@cloie.test` Program Head account:

- `secretary/secretary__users__list-default__desktop.png` — list filtered to the seeded demo accounts
- `secretary/secretary__users__actions-menu-open__desktop.png` — actions menu on the seeded `Demo Program Head` row
- `secretary/secretary__users__edit-user-dialog-open__desktop.png` — Edit User dialog for `demo-ph@cloie.test`, unsaved

Only seeded fictional `@cloie.test` accounts appear in the three retained frames (verified by
rendered-text scan, §11 check 7); the three former strings appear in no frame of the set. The
capture remained read-only — nothing was submitted, saved, deactivated or deleted — and the same
non-seeded account class is why the Program Head respondent-preview frames were excluded from the
set (§7). A reseed of the dev database would still remove the residue observed in §8.3.

### 8.5 Other documented-as-is behaviours
- `/dean/cilo-reviews`, `/dean/analytics`, `/dean/reports` are deliberate `notFound()` placeholders.
- `/program-head/programs/[programId]/reports` shows export buttons explicitly labelled as stubs.
- The student/alumni wizard header is authored `sticky top-0` but does not stick (the document, not
  `main`, is the scroll container), so scrolled wizard frames show content without the header.
- Wide tables, alignment matrices and analytics tab strips scroll inside their own containers
  (`overflow-x-auto`); page-level `scrollWidth` never exceeds `innerWidth`, so a partially visible
  last column/tab is the intended responsive pattern, not a layout defect.
- Mobile modal surfaces are bottom-anchored sheets (panel runs to the viewport bottom edge); their
  content and actions end inside the frame.

## 9. Privacy and confidentiality

- No token, cookie, environment value, API key, database URL or bearer credential appears in any
  frame or in the rendered text sampled during verification.
- Respondent-facing frames mask confidential free-text answers with opaque blocks (student history,
  alumni and industry submitted reviews); prompts and structure remain readable.
- Faculty and Program Head response surfaces show respondent status, quantitative answers and
  CILO/PLO bindings only — no free-text answer body is legible in any retained frame.
- Analytics frames are aggregate-only, above the confidentiality floor.
- The three Secretary account-management frames are filtered to the seeded demo accounts and show
  only seeded `@cloie.test` addresses (§8.4); the non-seeded address class is otherwise excluded
  from the set (§7).

## 10. Recommended Chapter 4 pair

| Frame | Viewport | Why |
| --- | --- | --- |
| `program-head/program-head__dashboard__default__desktop.png` | 1440x900 | Representative admin desktop dashboard: program-scoped KPIs (response completion, respondents, active evaluations, quantitative results by source) for the active period, inside the full authenticated chrome. |
| `student/student__evaluation-wizard__likert-rating-section__mobile.png` | 390x844 | Student mobile evaluation-wizard screen: the institution's core respondent workflow on a phone, with 48 px circular targets, numeric plus descriptor labels on every scale point and a 3+2 wrap that demonstrates the responsive and accessible treatment (also the strongest E-9.8 evidence in the set). |

The optional third candidate (the active-role selection frame) is not available because
`/select-role` is unreachable with the seeded single-role accounts (§7).

## 11. Verification results

Performed against the delivered files and the running application on 2026-09-14.

| # | Check | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Filename convention `<role>__<page-or-workflow>__<state>__<viewport>.png`, lowercase kebab, role segment = directory | **PASS** | 213/213 filenames match; 0 violations (role prefix, kebab-only segments, viewport suffix). |
| 2 | Every manifest row points to an existing PNG | **PASS** | 213 rows, 213 unique files, all present and non-empty. |
| 3 | Every PNG has a manifest row | **PASS** | Set equality between the 213 files on disk and the 213 `file` values; 0 orphans. |
| 4 | All eight roles have desktop + mobile evidence | **PASS** | Matrix in §2.1 (min 6 mobile / 7 desktop per role) **and** every PNG's IHDR pixel size equals its declared viewport — 129 × 1440x900, 84 × 390x844, 0 mismatches. |
| 5 | Spot-check for loading / error / clipped-dialog / overflow / tooltip / chrome defects | **PASS** | 26-frame visual re-check (desktop + mobile, dialogs, drawers, sheets, empty, validation, error-boundary, privacy-sensitive frames): no loading skeletons, no error surfaces, no browser chrome or dev overlays, no clipped controls, no tooltip overlays in the retained set. Bottom-of-viewport cropping is page content continuing below the fold; mobile sheets are viewport-anchored by design. The one known clipped control (PH mobile datetime inputs) is excluded from the set. |
| 6 | Canonical routes and role permissions match the running app | **PASS** | 120 route/permission cases driven with Playwright 1.62.1 and `dev-login` per account: 117 matched the documented expectation exactly; the 3 mismatches are expectation artifacts, each explained by documented behaviour — anonymous `/secretary/dashboard` redirects to `/portal/respondents`; `/program-head` with a single-program account redirects to its program dashboard; a Program Head opening another program's dashboard fails closed as `notFound` (stricter than the Unauthorized surface). Verified aliases: `/login`, `/portal`, `/secretary/courses/new`, `/secretary/learning-outcomes`, `/dean`, `/dean/programs`, `/dean/courses`, `/dean/instruments`, `/dean/course-assignments`, `/program-head`, `/program-head/dashboard`, legacy `.../cilo-reviews` → `.../responses`, `/faculty/cilo-evaluations/[id]` → `/faculty/analytics?evaluationId=…`. Verified `notFound()` by design: `/dean/cilo-reviews`, `/dean/analytics`, `/dean/reports`, `/program-head/programs/[programId]/profile`. Cross-role access renders the Unauthorized surface; both 2025-2026 Dean periods reproduce the error boundary (§8.2); every seeded UUID recorded in the manifest resolves to its documented interface. |
| 7 | No protected/confidential values | **PASS** | Secret-shaped scan of rendered text over the 120 verification routes: 0 hits for JWT, key, database-URL, bearer, service-role/env-name and long-hex patterns. An earlier capture of three Secretary account-management frames rendered non-seeded personal addresses; all three were re-captured read-only filtered to the seeded demo accounts (§8.4) and their rendered text now contains only `@cloie.test` addresses — the three former strings (one institutional, two public-webmail) appear in no frame of the set. The PH respondent-preview frames remain excluded for the same non-seeded-address class. |
| 8 | Final report | **PASS** | File count 213; coverage §2.1; skipped states §7; Chapter 4 pair §10. |

## 12. Reproducing the checks

1. Filenames, row coverage, pixel sizes: enumerate `**/*.png`, parse each PNG IHDR, compare against
   `manifest.csv`.
2. Routes/permissions: start the dev server on `http://127.0.0.1:3000`, open one Playwright
   context per account, authenticate with `POST /api/auth/dev-login` `{ "email": … }`, then visit
   the routes in the manifest and compare the rendered URL/title/text against `manifest.csv`.
3. Rendered-text secret scan: assert that the visible text of each sampled route contains no
   credential-shaped string and no address outside the seeded `@cloie.test` set.

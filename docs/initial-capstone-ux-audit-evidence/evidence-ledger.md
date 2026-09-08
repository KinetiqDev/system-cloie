# Week 1 audit evidence ledger

Audit date: September 7, 2026. Build: `main` at `992d572f0720609d70b29a079f78f12cc3f02221`.
Evidence directory: `docs/initial-capstone-ux-audit-evidence/` (relative links from `docs/initial-capstone-ux-audit.md`).

## Ledger

| Evidence ID | Role               | Page / Workflow                  | Checklist Criterion                                  | Issue # | Screenshot / Report Path                                                            | Historical PR / Commit                                                                          |
| ----------- | ------------------ | -------------------------------- | ---------------------------------------------------- | ------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| EV-01       | Alumni             | Dashboard                        | Content: instructions                                | 1       | `alumni-alumni-dashboard-desktop.png`                                               | Users CONTEXT profile-gate verdicts (only REJECTED blocks entry)                                |
| EV-02       | Industry Partner   | Evaluations                      | Content: instructions                                | 1       | `industry-partner-industry-partner-evaluations-desktop.png`                         | Same as EV-01                                                                                   |
| EV-03       | Program Head       | Program reports                  | Functionality: primary workflows                     | 2       | `ph-program-head-programs-f4062f5d-88af-4a1f-91f1-7da9722a3063-reports-desktop.png` | —                                                                                               |
| EV-04       | Program Head       | Top-level deep links             | Functionality: controls perform labeled action       | 3       | `sweep-results.json` (requested vs final URL per visit)                             | `src/app/(app)/program-head/*/page.tsx` redirect stubs                                          |
| EV-05       | Secretary          | Dashboard quick actions          | Content: labels                                      | 4       | `secretary-secretary-dashboard-desktop.png`                                         | ADR 0019 (no Secretary assignment mutation)                                                     |
| EV-06       | Faculty            | Course roster list               | Content: labels                                      | 5       | `faculty-faculty-course-rosters-desktop.png`                                        | Roster plain-language rework (`2a8d6ce`, `6e1279d`) rechecked, still resolved                   |
| EV-07       | Student            | Evaluations (dark mode)          | Accessibility: light/dark readability                | —       | `live-student-evaluations-dark.png`                                                 | ADR 0010 unified appearance; `CLOIE_APPEARANCE_ENABLED=true` locally                            |
| EV-08       | Student            | Evaluation wizard                | Usability: forms/feedback; Functionality: validation | —       | `live-student-wizard-section1.png`                                                  | Mobile lifecycle e2e (submit path) passes; live submit deliberately not executed                |
| EV-09       | Gen Ed Coordinator | CILO-to-ILO mapping review       | Content: outcome terms; Functionality: permissions   | —       | `live-gened-mapping-review.png`                                                     | ADR 0018 (ILO ownership transfer) rechecked, still resolved                                     |
| EV-10       | Faculty            | GE alignment workspace           | Content: outcome terms, manifestations               | —       | `live-faculty-ge-alignment.png`                                                     | Aggregate-only analytics rebuild (`4c3e9e2` follow-ups) rechecked, still resolved               |
| EV-11       | All roles          | 89 swept pages, desktop + mobile | Responsiveness: overflow; Functionality: errors      | —       | `sweep-results.json`                                                                | Mobile drawer work (`5208cc9`, `ae97c27` revert) rechecked via `mobile.spec.ts`, still resolved |

## Could not be verified and why

- Full submit path on the seeded GESTECH evaluations: a live submit would destroy the zero-response e2e fixture, so submission is covered by the passing mobile lifecycle suites instead of a live audit submit.
- Firefox/WebKit rendering: only Chromium was available in this environment.
- Physical-device mobile behavior (virtual keyboard, safe areas): viewport emulation plus the automated keyboard-obstruction proxy only.
- Screen-reader pass: axe-core, keyboard order, focus-ring, and announcement checks only; no NVDA/VoiceOver run.
- Google OAuth sign-in UI: test-auth sign-in used; the OAuth callback path was not exercised.
- Destructive flows (deletion, rollover, deactivation): not executed live to protect seed data; confirmation-text requirements are covered by existing tests and history.
- Report file contents: nothing to verify while exports remain stubs (issue 2).
- Dark mode on data-dense analytics pages: spot-checked on student surfaces only.
- Lighthouse/WAVE scores: not run; axe-core via the existing `a11y` suite served as the automated accessibility check.

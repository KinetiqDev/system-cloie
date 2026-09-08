# Initial capstone UX audit

**Week 1 deliverable | ITE 4 - Web Systems and Technologies 2**

| Field                        | Information                                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Name/Group                   | Abbegail D. Abebon, Andy Zane B. Egut, and Michael V. Gungob                                                                  |
| Section/Block                | [FILL IN]                                                                                                                     |
| Capstone Title               | PROJECT CLOIE: The Development of a System for Comprehensive Learning Outcomes and Instructional Evaluation                   |
| Date Submitted               | [FILL IN]                                                                                                                     |
| Instructor                   | Ms. Christine Marie D. Ordaneza, LPT                                                                                          |
| System Audited               | System CLOIE                                                                                                                  |
| System / Build Version       | 0.1.0 (commit `992d572f0720609d70b29a079f78f12cc3f02221`, branch `main`)                                                      |
| Audit Date(s)                | September 7, 2026                                                                                                             |
| Audit Time                   | 12:00-13:00 UTC (20:00-21:00 UTC+08:00)                                                                                       |
| Browser Used                 | Chromium via Playwright 1.62.1 and agent-browser 0.33.2                                                                       |
| Device(s) / Viewport(s) Used | Desktop 1440x900, mobile 390x844                                                                                              |
| Environment / URL            | Local development build at `http://127.0.0.1:3100` against the local Supabase Docker stack with the deterministic Prisma seed |

## Purpose of the audit

This initial UX audit examines System CLOIE before formal observation and testing with its intended users. The audit focuses on whether the current interface supports understandable, accessible, responsive, and functional workflows for the system's administrative, academic, and respondent users.

System CLOIE supports different user responsibilities. These include administrative setup by the Secretary, college-level oversight by the Dean, program-level management and evaluation review by Program Heads, General Education management by the General Education Coordinator, course-level outcomes and evaluation activities by Faculty, and evaluation-response workflows for Students, Alumni, and Industry Partners.

The audit will identify interface and interaction problems that may affect real users before formal user observation is conducted.

## Audit baseline

The audit ran against the repository at branch `main`, commit `992d572f0720609d70b29a079f78f12cc3f02221` (version `0.1.0`), served as a local development build (`pnpm dev`, Turbopack) on `http://127.0.0.1:3100` with the seeded local database. Test accounts came from the deterministic Prisma seed (`demo-secretary`, `demo-gened`, `demo-dean`, `demo-ph`, `demo-faculty`, `demo-student`, `demo-alumni`, `demo-industry`, plus `ph-multi` for program switching), signed in through the development test-auth path, which resolves through the normal System CLOIE session and authorization.

Historical evidence reviewed before the live pass: recent commits and pull requests touching analytics, course assignments, response review, instruments, the academic calendar, and mobile adaptations (including the mobile bottom-drawer work and its partial revert, the aggregate-only faculty analytics rebuild, and the curriculum-versioning removal in ADR 0021); the Playwright journeys for accessibility, mobile, denial, cross-role privacy, publication, student lifecycle, and secretary-dean oversight. Historical findings were used only as regression targets. Every Part 2 issue below was reproduced on the current build during this audit.

One environment note: the first pass failed on respondent surfaces because the generated Prisma client in `node_modules` predated the ADR 0021 column removal. Regenerating the client (`prisma generate`) and restarting the development server resolved it. This was stale local tooling, not a product defect, and the full sweep was re-run clean afterwards.

# Part 1: Audit checklist

## Instructions

Review the current System CLOIE beta build using the checklist below.

For each item, mark:

- **✓** if the criterion is met
- **✗** if the criterion is not met
- **Partial** if the criterion works but still has a noticeable problem

Use the Notes column to briefly state what was observed. For any failed or partial criterion that represents a meaningful UX problem, create a corresponding entry in Part 2.

Do not mark an item based only on what the code is intended to do. Verify the behavior in the running application.

| Dimension       | Checklist Item                                                                                                                                                   | Check (✓ / ✗ / Partial) | Notes                                                                                                                                                                                        |
| :-------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Usability       | Main navigation and page labels are understandable for the intended user role.                                                                                   | ✓                       | Role-scoped nav verified for all 8 roles; labels match the workflows each role owns.                                                                                                         |
| Usability       | Primary actions are easy to locate and distinguish from secondary actions.                                                                                       | ✓                       | Primary actions are prominent buttons; secondary actions sit in row menus. See issue 5 for one duplicated label.                                                                             |
| Usability       | Forms provide clear instructions, required-field indicators, and validation feedback.                                                                            | ✓                       | Secretary Add User shows inline errors (for example "Name is required") with helper text; CILO and wizard forms label every input.                                                           |
| Usability       | System feedback clearly confirms successful, failed, or incomplete actions.                                                                                      | ✓                       | Wizard shows draft status ("Not saved"); dashboards explain scope; guided error and empty states observed.                                                                                   |
| Usability       | The current Program, Course, Academic Period, or other working context is clear where applicable.                                                                | ✓                       | Program-scoped pages show breadcrumbs, program badges, and the selected academic period; multi-program switching shows a program chooser.                                                    |
| Accessibility   | Text has sufficient contrast against its background.                                                                                                             | ✓                       | No serious or critical axe-core violations on swept surfaces; light and dark spot-checks readable.                                                                                           |
| Accessibility   | Buttons, links, switches, inputs, and other interactive controls are visible and distinguishable.                                                                | ✓                       | Controls are labeled; history icon-buttons expose names such as "View Answers".                                                                                                              |
| Accessibility   | Keyboard focus is visible, and core workflows can be completed using keyboard navigation.                                                                        | ✓                       | 2px visible focus outline; tab order starts at nav; dialog focus-trap and reduced-motion checks pass in the automated suite.                                                                 |
| Accessibility   | Form fields have understandable labels, instructions, and error messages.                                                                                        | ✓                       | Verified on user creation, CILO creation, and the evaluation wizard.                                                                                                                         |
| Accessibility   | Controls and information remain readable and distinguishable in supported light and dark modes.                                                                  | ✓                       | Dark mode spot-checked on student evaluations and the wizard; no unreadable states found.                                                                                                    |
| Accessibility   | Meaningful icons, images, charts, and other visual information have accessible names, labels, or text alternatives where required.                               | ✓                       | Charts render as named regions with descriptions and exact-values table alternatives; status icons pair with text.                                                                           |
| Responsiveness  | Pages remain usable at common desktop and laptop widths.                                                                                                         | ✓                       | 1440x900 sweep across 89 page visits: no blocking layout faults.                                                                                                                             |
| Responsiveness  | Core pages remain usable on mobile-sized viewports where applicable.                                                                                             | ✓                       | 390x844 sweep of dashboards, lists, wizard, and responses; drawer navigation verified by the automated mobile suite.                                                                         |
| Responsiveness  | Tables, charts, dialogs, forms, and navigation do not overflow, overlap, or become unusable at supported screen sizes.                                           | ✓                       | Measured zero horizontal overflow on every swept page, both viewports; 200% zoom spot-check on student evaluations also shows zero overflow.                                                 |
| Responsiveness  | Important actions and information remain accessible without excessive horizontal scrolling or clipping.                                                          | ✓                       | Tables scroll inside labeled regions; row actions stay reachable; mobile cards stack with actions visible.                                                                                   |
| Functionality   | Primary role-specific workflows can be completed without unexpected errors.                                                                                      | Partial                 | All role workflows render and operate except Program Head report production, which is an explicit stub (issue 2).                                                                            |
| Functionality   | Buttons, links, forms, and controls perform the action indicated by their labels.                                                                                | Partial                 | In-app navigation works, but top-level Program Head deep links silently resolve to the program dashboard (issue 3).                                                                          |
| Functionality   | Validation prevents invalid or incomplete actions where required.                                                                                                | ✓                       | Empty user-creation submit blocked with inline errors; wizard requires section completion before review. Full submit was covered by the existing lifecycle tests, not by a live submit here. |
| Functionality   | Role permissions match the intended responsibilities of Secretary, Gen Ed Coordinator, Dean, Program Head, Faculty, Student, Alumni, and Industry Partner users. | ✓                       | Secretary course assignments are read-only with a stewardship notice; Gen Ed Coordinator owns ILOs without roster authority; denial suite passes.                                            |
| Functionality   | Users cannot access or modify information outside their authorized Program, Course, role, or academic scope.                                                     | ✓                       | Cross-program access returns scoped not-found pages with no data leak (automated denial suite passes).                                                                                       |
| Functionality   | Evaluation responses and respondent information are displayed according to the system's intended privacy and confidentiality rules.                              | ✓                       | Faculty analytics are aggregate-only with no respondent names; identified review stays Program-Head-only (automated privacy suite passes).                                                   |
| Content Quality | Terminology is consistent across pages and user roles.                                                                                                           | ✓                       | ILO, PLO, CILO, and Learning/Practice/Opportunity are used consistently; Tools consistently means evaluation instruments.                                                                    |
| Content Quality | Instructions and descriptions are understandable to the intended users.                                                                                          | Partial                 | Most guidance is plain and specific, but the pending-verification banner overstates its restriction (issue 1).                                                                               |
| Content Quality | Labels accurately describe the information, status, or action they represent.                                                                                    | Partial                 | Two wording problems: Secretary "manage its Student roster" overstates read-only authority (issue 4); faculty roster repeats "Open roster" as both status and action (issue 5).              |
| Content Quality | Learning-outcome terms such as ILO, PLO, CILO, and Learning/Practice/Opportunity are presented consistently and with enough context for the intended user.       | ✓                       | Alignment workspaces explain scope impact; Gen Ed review states it is read-only; analytics notes current-mapping methodology.                                                                |
| Content Quality | Tables, charts, analytics, statuses, and other data displays clearly communicate what the information represents.                                                | ✓                       | "How calculated" explainers, methodology notes, and exact-values alternatives present on dashboards and analytics.                                                                           |
| Content Quality | Empty states, warnings, confirmation messages, and help text provide useful guidance when needed.                                                                | ✓                       | Guided empty states observed on industry evaluations and the Dean roster deep link; destructive confirmations covered by existing tests.                                                     |

# Part 2: List of at least 5 issues

## Instructions

Record issues discovered during the Week 1 self-audit.

An issue should describe the **actual effect on the intended user**, not simply state that something "looks bad."

Where possible, connect each issue to the affected user role, page, or workflow.

Do not complete this section until the problem has actually been reproduced in the running System CLOIE build.

| #   | Issue Description                                                                                                                                                                                                                                                                                                               | Dimension       | Likely Impact on Real User                                                                                                           | Suggested Fix, optional                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | On the Alumni and Industry Partner dashboards and evaluation pages, the "Verification Pending" banner states "You have limited access to some features," but a pending account can fully complete evaluations: the domain contract gates entry only on rejected verification, and nothing functionally limits pending accounts. | Content Quality | A pending respondent may hold back from answering or contact support about access they already have, delaying stakeholder evidence.  | Name the actual limitation, if any; otherwise reword to status-only copy such as "Your profile is under review. You can still complete evaluations." |
| 2   | On the Program Head reports page, every report card offers only disabled "Export PDF Stub" and "Export Sheet Stub" buttons, so a Program Head cannot actually produce a report file for accreditation or program review.                                                                                                        | Functionality   | Program review work stalls at the last step; the Reports section promises evidence output it cannot deliver.                         | Implement at least one working export, or mark the section as forthcoming and hide it from the primary nav until then.                               |
| 3   | Top-level Program Head deep links (`/program-head/reports`, `/program-head/analytics`, `/program-head/tools`, `/program-head/courses`, `/program-head/outcomes`, `/program-head/course-assignments`) silently resolve to the program dashboard, discarding the requested destination with no notice.                            | Usability       | Bookmarks, shared links, and browser history entries land on the wrong page, confusing anyone following a reports or analytics link. | Preserve the destination through program selection, or show a notice that the section is program-scoped with a program picker.                       |
| 4   | On the Secretary dashboard, the "Find a Course Roster" quick action says "Open an assignment and manage its Student roster," but the Secretary role is read-only on course assignments and rosters per the assignment authority matrix.                                                                                         | Content Quality | A Secretary may expect editing powers they do not have, then distrust the interface when edits are unavailable.                      | Reword to "Open an assignment and review its Student roster."                                                                                        |
| 5   | On the Faculty course roster list, the State column shows an "Open roster" pill while the Action column shows an "Open roster" button for the same row, duplicating one action as both status and control.                                                                                                                      | Usability       | Faculty scanning the table must parse the same label twice to tell state from action, slowing roster triage.                         | Keep the action button and change the State pill to the actual state (for example "Active" or "Locked").                                             |

Add additional rows if more issues are found.

# Part 3: User observation / feedback plan

## 3a. Planned participants

System CLOIE has several distinct user groups whose interfaces and responsibilities differ. The observation activity should therefore include representative users from both management/academic roles and respondent roles.

| Participant, role/type              | Why Appropriate for This Capstone                                                                                                                                           | Task to Be Given                                                                                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secretary                           | The Secretary uses System CLOIE for administrative and academic setup that affects the data other roles depend on.                                                          | Review the Secretary dashboard; manage a prepared user or academic record; review Course Assignments; use an institutional evaluation Tool.                             |
| General Education Coordinator       | The Gen Ed Coordinator manages General Education context across Programs and is responsible for Institutional Learning Outcomes and General Education assignment oversight. | Review General Education status; locate a GE Course; manage a GE Course Assignment; review ILOs and CILO-to-ILO alignment; inspect analytics.                           |
| College Dean                        | The Dean uses System CLOIE for college-level academic structure and oversight.                                                                                              | Review the College dashboard; inspect Programs/Courses; review assignments, instruments, learning-outcome status, and enrollment information.                           |
| Program Head                        | Program Heads perform Program-specific management and use evaluation evidence for Program review.                                                                           | Select a Program; review Program status; manage a Course Assignment or PLO; review CILO alignment; use Tools; review Responses and Analytics.                           |
| Faculty Member                      | Faculty members manage Course-level outcomes, mappings, rosters, and Course-bound evaluation activities.                                                                    | Complete onboarding if using a new account; review an assigned Course and roster; manage CILOs; map outcomes and manifestations; publish or review a Course evaluation. |
| Student, representative year levels | Students are the primary users of Course-bound evaluations and may also receive Program-wide evaluations.                                                                   | Complete onboarding if using a new account; locate an evaluation; answer questions; save and resume; review; submit; inspect Submission History.                        |
| Alumni                              | Alumni provide post-graduation stakeholder feedback through Program evaluations.                                                                                            | Complete onboarding; locate an eligible evaluation; complete the evaluation; save/resume where applicable; review and submit; inspect history.                          |
| Industry Partner                    | Industry Partners provide external workplace or professional stakeholder evidence associated with Programs.                                                                 | Complete onboarding; identify the relevant evaluation; provide quantitative and qualitative feedback; review and submit; inspect history.                               |

## 3b. Planned observation questions

The facilitator will use neutral questions and avoid telling participants where to click or what answer is expected unless assistance becomes necessary.

1. **"What would you do next from this screen?"**
2. **"What do you think this page or section is for?"**
3. **"What information are you looking for right now?"**
4. **"What do you expect to happen when you choose that action?"**
5. **"Was anything on this screen unclear to you?"**
6. **"Was there anything you expected to find but could not?"**
7. **"What, if anything, made this task difficult?"**
8. **"If you could change one thing about this part of the system, what would you change?"**

Questions should be asked only when useful. Participants should first be allowed to attempt the assigned task without unnecessary prompting.

## 3c. Testing tool / method to be used

### Planned user-observation method

**Primary method:** In-person moderated task observation using role-specific System CLOIE task checklists.

During observation, the proponents will:

- give the participant a realistic task rather than step-by-step click instructions;
- observe the participant's actions before providing assistance;
- note hesitation, wrong turns, repeated actions, errors, confusion, and successful completion;
- record whether the participant required no assistance, minor assistance, or major assistance;
- record direct comments or suggestions when volunteered by the participant;
- avoid leading questions;
- administer a short feedback form after the assigned tasks.

### Planned Week 1 technical UX checks

The initial self-audit may use the following methods:

- manual walkthrough of the current System CLOIE build;
- keyboard-only navigation check;
- browser zoom/readability check;
- light and dark appearance review;
- Chrome/Chromium responsive viewport testing;
- representative desktop and mobile viewport checks;
- browser developer tools where necessary;
- accessibility or quality scanning tools where available;
- existing automated accessibility/mobile/browser tests as supporting technical evidence.

**Actual tools used during Week 1 audit:**
Playwright 1.62.1 (Chromium) audit sweep plus existing suites `a11y`, `mobile`, `denial`, and `cross-role-privacy`; agent-browser 0.33.2 for live interaction, keyboard, dark-mode, zoom, and screenshot evidence.

**Browser(s) used:**
Chromium (Playwright bundled build; agent-browser Chrome build).

**Device(s) / viewport(s) used:**
Desktop 1440x900 and mobile 390x844 viewports; 200% zoom spot-check on the student evaluations page.

**System / Build Version:**
0.1.0, branch `main`, commit `992d572f0720609d70b29a079f78f12cc3f02221`.

**Audit Date(s):**
September 7, 2026.

# Appendix A: Proof of audit activity

This appendix records evidence that the Week 1 UX audit was actually performed against System CLOIE.

## A1. Screenshot evidence

One screenshot per significant Part 2 issue, plus supporting captures. All files live in `initial-capstone-ux-audit-evidence/` next to this document. Captures are unedited viewport screenshots from the audit session on September 7, 2026 (12:00-13:00 UTC).

| Issue #    | Screenshot                                                                                                                                                                                                | Caption, what it shows                                                                                           | Date / Time Captured |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------- |
| 1          | [alumni-alumni-dashboard-desktop.png](initial-capstone-ux-audit-evidence/alumni-alumni-dashboard-desktop.png)                                                                                             | Alumni dashboard showing the "Verification Pending / limited access" banner above fully usable evaluation cards. | 2026-09-07 12:20 UTC |
| 1          | [industry-partner-industry-partner-evaluations-desktop.png](initial-capstone-ux-audit-evidence/industry-partner-industry-partner-evaluations-desktop.png)                                                 | Industry Partner evaluations page with the same pending banner above the working evaluation list.                | 2026-09-07 12:25 UTC |
| 2          | [ph-program-head-programs-f4062f5d-88af-4a1f-91f1-7da9722a3063-reports-desktop.png](initial-capstone-ux-audit-evidence/ph-program-head-programs-f4062f5d-88af-4a1f-91f1-7da9722a3063-reports-desktop.png) | Program Head reports page where every export control is a disabled stub button.                                  | 2026-09-07 12:35 UTC |
| 3          | [sweep-results.json](initial-capstone-ux-audit-evidence/sweep-results.json)                                                                                                                               | Sweep log recording each top-level `/program-head/*` URL resolving to the program dashboard URL.                 | 2026-09-07 12:30 UTC |
| 4          | [secretary-secretary-dashboard-desktop.png](initial-capstone-ux-audit-evidence/secretary-secretary-dashboard-desktop.png)                                                                                 | Secretary dashboard "Find a Course Roster" card using "manage its Student roster" wording.                       | 2026-09-07 12:15 UTC |
| 5          | [faculty-faculty-course-rosters-desktop.png](initial-capstone-ux-audit-evidence/faculty-faculty-course-rosters-desktop.png)                                                                               | Faculty roster table with "Open roster" repeated as State pill and Action button.                                | 2026-09-07 12:32 UTC |
| Supporting | [live-student-evaluations-dark.png](initial-capstone-ux-audit-evidence/live-student-evaluations-dark.png)                                                                                                 | Student evaluations page in dark mode, readable with the appearance menu open.                                   | 2026-09-07 12:10 UTC |
| Supporting | [live-student-wizard-section1.png](initial-capstone-ux-audit-evidence/live-student-wizard-section1.png)                                                                                                   | Student evaluation wizard section 1 with labeled rating groups and section progress.                             | 2026-09-07 12:40 UTC |
| Supporting | [live-gened-mapping-review.png](initial-capstone-ux-audit-evidence/live-gened-mapping-review.png)                                                                                                         | Gen Ed Coordinator CILO-to-ILO mapping review with read-only guidance.                                           | 2026-09-07 12:45 UTC |
| Supporting | [live-faculty-ge-alignment.png](initial-capstone-ux-audit-evidence/live-faculty-ge-alignment.png)                                                                                                         | Faculty GE alignment workspace with manifestation matrix and scope-impact notice.                                | 2026-09-07 12:47 UTC |

## A2. Automated tool report

Only tools actually run during this audit are listed. Automated checks support, but do not replace, the live browser verification above.

| Tool Used                                                                                         | Screenshot of Report                                                        | Score / Summary                                                                                                                                              |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Playwright `e2e/a11y.spec.ts` (axe-core serious/critical, keyboard, dialog focus, reduced motion) | Run log retained by CI; no failure screenshot (all green)                   | 6/6 passed on September 7, 2026                                                                                                                              |
| Playwright `e2e/mobile.spec.ts` + `e2e/denial.spec.ts` + `e2e/cross-role-privacy.spec.ts`         | Run log retained by CI; no failure screenshot (all green)                   | 6/6 passed on September 7, 2026 (drawer navigation, roster drawer, student and alumni lifecycles, cross-program denial, response privacy)                    |
| Playwright audit sweep (throwaway script, 89 page visits across 8 roles, desktop + mobile)        | [sweep-results.json](initial-capstone-ux-audit-evidence/sweep-results.json) | Zero pages with horizontal overflow; zero client errors; zero unexpected statuses. Run script removed after the audit; the JSON log is retained as evidence. |

One transient event: an earlier combined run showed a single axe failure on the privacy suite while three browsers loaded the development server at once; the exact trio re-run on the same build passed 6/6, and the privacy suite also passes in isolation. It was recorded as load-induced flake, not a product finding, and the seeded fixture rows touched by the mobile lifecycle tests were deleted afterwards to restore the zero-response fixture (verified by a final green `denial` run).

## A3. Certification of authenticity

We certify that we personally conducted the Week 1 Initial Capstone UX Audit described in this document against the System CLOIE build identified above. The checklist results, issues, screenshots, tool reports, and other evidence included in this document represent activities actually performed and findings actually observed.

| Printed Name       | Signature   |
| :----------------- | ----------- |
| Abbegail D. Abebon | [signature] |
| Andy Zane B. Egut  | [signature] |
| Michael V. Gungob  | [signature] |

**Date Signed:** [date]

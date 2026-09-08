---
target: course roster detail page
total_score: 15
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-09-07T23-40-55Z
slug: rse-assignments-components-course-roster-pages-tsx
---
# Critique: Course roster detail page (`CourseRosterDetailPage`)

Method: dual-agent (A: DesignReview · B: DetEvidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Sort toggle names destination, not state; RosterStateBanner renders null on ACTIVE; count gap unexplained |
| 2 | Match System / Real World | 1 | Ledger copy ("membership", "evaluation-eligible", clock-precision timestamps) instead of "my class list" |
| 3 | User Control and Freedom | 2 | No clear-search control, no bulk actions, no jump-to-page; destructive remove sits one tap away |
| 4 | Consistency and Standards | 1 | Two checkbox dialects on one route; "Active" = blue badge in header, neutral badge in rows; no title hierarchy between courseCode and courseTitle |
| 5 | Error Prevention | 2 | Preview-first CSV flow is good; include-removed and sort mutate instantly with no undo |
| 6 | Recognition Rather Than Recall | 1 | Course identity scrolls away; badge meanings (subset relation, warning codes) must be held in memory; no legend |
| 7 | Flexibility and Efficiency | 2 | No column sort, no export, no page-size; 120 students = 12 pages inside a 72rem sideways scroller |
| 8 | Aesthetic and Minimalist Design | 1 | Five stacked bordered boxes at one 24px rhythm; borders-in-borders; dual badges per row; "Not available" cells |
| 9 | Error Recovery | 2 | Detail empty state ("No students match this view.") offers no recovery link, unlike the discovery page |
| 10 | Help and Documentation | 1 | One accounting footnote ("counts exclude removed history") carries all explanation; warning badges lack what-to-do copy |
| **Total** | | **15/40** | **Critical — remedial-level usability debt on a daily-use Operate surface** |

## Design Specificity Verdict

**LLM assessment:** Token-compliant but authorship-generic. The page assembles shadcn Card/Badge/Table primitives correctly yet could be any SaaS admin roster; nothing says System CLOIE — no institutional calm, no evidence-chain character, no course identity as hero. The h1 is the generic string "Course roster" while the actual course (GEETHICS · Ethics) is demoted to a 1rem value inside a six-cell fact grid. The page describes a database, not a faculty member's class.

**Deterministic scan:** CLI detector: 0 findings (exit 0) on both source files — the static ruleset sees nothing; the page's problems are compositional, not markup-level. Live injected scan: 7 runtime anti-patterns — 4× nested-cards, 1× cramped-padding (table wrapper flush against its border), 1× overused-font (Inter 90% — by-design for an admin surface, noise), 1× first-viewport-column-overflow (app-shell artifact, not this page's defect).

**Visual overlays:** Overlays were injected by Assessment B in its own browser tab (now closed); no user-visible overlay remains open. Desktop + mobile screenshots confirmed the findings above.

## Overall Impression

The page is functionally correct and accessibility-disciplined — and visually incoherent. Your "looks so bad, I don't know why" has three names: **box-in-box-in-box monotony** (five stacked bordered containers at one uniform gap, confirmed by the detector's 4 nested-cards), **badge soup** (two status badges stacked per row in two different visual languages), and **an inverted hierarchy** where the page title is the generic words "Course roster" while the actual course identity is a small cell in a fact ledger. Nothing ranks. The eye gets six uppercase labels, two peer numbers, ten columns, and no story — so it reads it as clutter, correctly.

## What's Working

1. **Accessibility skeleton is genuinely present** — sr-only table caption, th scope=col/row, aria-live pagination, min-h-11 touch targets, tabular-nums, role=region scroller, focus rings. The bones are right; the presentation buries them.
2. **Lifecycle honesty in the model** — RosterStateBanner copy is state-specific, canWrite correctly conjoins canManage && canMutate && ACTIVE, removals preserve history with actor + date, counts explicitly exclude removed history. The rules are right.
3. **Preview-first CSV onboarding** — "Review parsed rows before anyone is added" is real error prevention, the strongest single interaction on the page.

## Priority Issues

**[P0] No course identity; inverted type hierarchy**
- Why: h1 = "Course roster" (1.25rem) while GEETHICS · Ethics sits at 1rem below, inside a six-cell dl grid of identical uppercase labels. A returning faculty member re-parses six labels to answer "which class is this?" — every count and badge below is meaningless without it.
- Fix: h1 becomes `GEETHICS · Ethics` at text-heading-xl; "Course roster" demotes to an eyebrow; the dl collapses to the four facts that actually vary (Program, Year level, Section, Academic Period) as a quiet inline strip.
- Suggested command: `/impeccable layout` (with `/impeccable clarify` follow-up for labels)

**[P1] Counts without a story — two false-peer cards**
- Why: "Active roster: 2" and "Currently evaluation-eligible: 2" render as independent facts in identical cards. Eligibility is a *subset* of roster; when the numbers diverge, the gap (who is ineligible, why) is arithmetic the user must do by scanning warning badges across the table.
- Fix: one evidence strip: `2 on roster → 2 ready for evaluation → 0 need attention`, the third value linking to a pre-filtered table view. One icon language, plain words.
- Suggested command: `/impeccable shape` (component concept), then `/impeccable layout`

**[P1] Badge soup + 10 columns where 5 would do**
- Why: min-w-[72rem] forces horizontal scroll on a first-class 412px PWA surface. Program repeats the context card, Class context repeats what is constant for the assignment, Major is mostly "Not available", Added carries clock precision, "Removal history" prints "Not removed" on every active row, and each row stacks two badges ("Active membership" + "Evaluation-eligible") in two different languages. The detector's cramped-padding flag lands here: cells run flush to the table border.
- Fix: cut to Student / Status (one badge: Ready · reason · Removed) / Added (date only) / Actions. Constant columns move to the header or an expandable row; Removal history column renders only when a removed row exists.
- Suggested command: `/impeccable distill`, then `/impeccable adapt` (mobile condensed rows already exist in the codebase — extend that pattern)

**[P2] Filter bar speaks three control dialects; sort state is invisible**
- Why: boxed Input + raw native checkbox (the only one on the route — discovery uses the design-system Checkbox) + a link-styled sort button labeled with its *destination* ("Sort by name descending" while sorted ascending). Jordan cannot tell what order the list is in; the inconsistency signals an unfinished surface.
- Fix: reuse Field/Checkbox from the discovery filters; sort becomes an aria-pressed toggle showing current state ("Name A→Z") with aria-sort on the Student column; add a clear-search affordance.
- Suggested command: `/impeccable clarify` (with consistency fixes in `/impeccable polish`)

**[P2] Detail empty state is a dead end**
- Why: "No students match this view." — no Clear search, no guidance, while the discovery page's empty state offers recovery. A low-literacy user who typos into the search box hits a wall.
- Fix: add the same clear-filters recovery link the discovery page uses; state what was filtered.
- Suggested command: `/impeccable onboard` (empty states), or fold into `/impeccable harden`

## Persona Red Flags

**Jordan (first-timer, low technical literacy — primary persona):** Blocked by the accounting footnote "Active roster and evaluation-eligible counts exclude removed history" (jargon, no action); by warning badges like "Profile incomplete" phrased as the student's fault with no what-do-I-do; by "Sort by name descending" naming the opposite of the current order; by clock-precision timestamps implying time matters. The question "are my students ready?" has no single on-page answer.

**Alex (power registrar):** 120 students = 12 pages of sideways scrolling in a 72rem table with Prev/Next-only pagination; no column sort, no export, no bulk actions; search debounces with no result-count feedback. Remove/Restore per-row only.

**Rena (Program Head, pre-publication reviewer):** Cannot answer "can we publish?" — the count gap has no drill-down, the blue "Published evaluation lock" badge sits next to warning badges hidden inside a scroller, and the Manage-roster CSV card splits the review flow mid-page. Rena needs the ineligible list one tap from the counts.

## Minor Observations

- Label case inconsistency: "Academic Period" (title case) vs five sentence-case siblings in the same dl.
- CountCards embeds icon chips inside CardDescription — icon + label reads as helper text rather than metric label.
- Two absence vocabularies in one table: "Not recorded" (dates) vs "Not available" (program/major).
- Pagination renders `<span />` placeholders, so "Page X of Y" sits off-center on first/last pages.
- Row hover (bg-muted/30) is the only row affordance — invisible on touch; mobile is a first-class surface.
- The Manage roster card's responsive class expression is the most complex on the page, serving one dialog trigger that arguably belongs in the page header.
- Mobile: table shows only Student + Program columns before sideways scroll; the two most scannable columns (Status, Actions) are the first casualties.

## Questions to Consider

- If the faculty member's only job is "confirm these are my students and they're ready," what would this page look like with exactly one number ("2 of 2 ready") and one list (the exceptions)?
- The dl treats Course code, Academic Period, and Class section as equals — but only one answers "which class am I holding?" What breaks if the header owns identity and the context strip is allowed to be boring?
- Every row re-declares Program, Class context, and "Not removed" — constants of the assignment. Whose anxiety does that repetition soothe, and what would we show if we trusted the header?
- Blue "Published evaluation lock" (celebratory) and amber "Profile incomplete" (alarm) share one table — are we reporting student standing, or laundering an SIS data-quality problem as a roster problem?

---
target: Program Head and General Education Coordinator outcomes surfaces
total_score: 25
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 0
timestamp: 2026-09-04T11-01-31Z
slug: tures-outcomes-components-gen-ed-outcomes-page-tsx
---

Method: dual-agent (A: OutcomesDesignScore · B: OutcomesTechnicalAudit)

## Design Health Score

| #         | Heuristic                       |     Score | Key issue                                                                                               |
| --------- | ------------------------------- | --------: | ------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     |         3 | Semantic state badges and legible KPIs; async reorder feedback remains limited.                         |
| 2         | Match System / Real World       |         3 | Course/CILO/outcome hierarchy matches the OBE domain.                                                   |
| 3         | User Control and Freedom        |         2 | Mapping reviews are correctly read-only but offer no direct repair handoff.                             |
| 4         | Consistency and Standards       |         4 | ILO and PLO catalogs now share one KPI and status language.                                             |
| 5         | Error Prevention                |         2 | Read-only review prevents accidental writes; catalog reorder still needs stronger save-state signaling. |
| 6         | Recognition Rather Than Recall  |         3 | Grouped mappings and wrapped badges keep relationships visible.                                         |
| 7         | Flexibility and Efficiency      |         2 | No filtering or prioritization for large mapping catalogs.                                              |
| 8         | Aesthetic and Minimalist Design |         3 | Clearer hierarchy; large mapping sets can still become dense.                                           |
| 9         | Error Recovery                  |         2 | Mapping gaps are visible, but the repair path is indirect.                                              |
| 10        | Help and Documentation          |         1 | ILO/PLO/CILO and manifestation semantics receive little contextual explanation.                         |
| **Total** |                                 | **25/40** | **Acceptable; substantial hierarchy and contrast improvement.**                                         |

## Design Specificity Verdict

The updated outcomes surfaces are recognizably System CLOIE: institutional/program outcome layers, CILO alignment status, scope labels, and read-only stewardship are visible in the structure rather than generic dashboard decoration. The deterministic Impeccable scan returned zero findings over the changed targets. Source-based contrast checks found all semantic badge pairings at WCAG AA or better in light and dark themes. Browser verification was authentication-limited: direct routes redirected to the respondent portal, so no valid post-change authenticated screenshot or axe result is claimed.

## Overall Impression

The annotations exposed one systemic problem: visually related outcome surfaces had diverged. The fix restores one visual grammar. KPI numbers now carry the page summary, status badges use meaning-specific tokens, and mapping cards present course identity before detailed CILO relationships.

## What’s Working

- Shared `OutcomeKpiGrid` keeps ILO and PLO summary behavior aligned.
- Semantic information/success/warning tokens replace hard-coded or ambiguous badge treatments and resolve across light/dark themes.
- Course code, scope, title, count, CILO group, readiness, and target manifestation now read in a stable hierarchy.
- Responsive badges wrap instead of hiding mapping content; the KPI grid becomes one column below 400px.

## Priority Issues

1. **[P2] Large mapping reviews still lack prioritization.** Long course catalogs require scrolling without filter or “needs mapping first” grouping. Add a compact status filter only when real data volume establishes the need. Suggested command: `/impeccable distill`.
2. **[P2] Reorder save state is too quiet.** Dragging changes order optimistically, but users do not get a durable Saving/Saved indicator; Program Head also retains a possible overlapping-save race. Add explicit adjacent status and reconcile the latest order. Suggested command: `/impeccable harden`.
3. **[P3] Domain abbreviations remain demanding for first-time users.** The pages assume ILO/PLO/CILO and manifestation literacy. Add concise contextual definitions where review decisions happen, not a permanent glossary wall. Suggested command: `/impeccable clarify`.

## Persona Red Flags

- **Alex, power user:** no status filter or risk-first ordering for large mapping reviews; scanning cost grows linearly.
- **Sam, accessibility-dependent:** source semantics improved through h2 course titles and labeled groups, but an authenticated keyboard/axe pass remains outstanding.
- **Casey, mobile user:** cards and wrapped badges remove horizontal loss; a long one-column KPI/mapping stack can still push actionable gaps below the fold.

## Minor Observations

- Program Head and General Education Coordinator mapping pages intentionally remain separate domain surfaces; their presentational structure is now parallel.
- The three status counts are all derived locally and use tabular figures.
- No new hard-coded color was introduced.

## Questions to Consider

- Should mapping review optimize for exhaustive evidence reading or fast identification of incomplete mappings?
- Should reorder become an explicit save workflow, or remain autosaved with visible status?
- Do first-time coordinators need inline terminology help, or is institutional training assumed?

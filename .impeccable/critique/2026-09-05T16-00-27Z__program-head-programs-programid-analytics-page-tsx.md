---
target: program head analytics dashboard
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-09-05T16-00-27Z
slug: program-head-programs-programid-analytics-page-tsx
---
### Method: dual-agent (A: AssessmentA · B: AssessmentB)

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Labeled Suspense skeletons and AI status work well; filter Apply provides no visual pending indicator until navigation lands. |
| 2 | Match System / Real World | 4 | Fluent OBE terminology and academic structure; hierarchical period trio mirrors institution, but interaction model is flawed. |
| 3 | User Control and Freedom | 3 | Scope-preserving navigation across tabs; desktop reset button is fake-disabled (pointer-events-none but keyboard activatable); no individual filter chip dismissal. |
| 4 | Consistency and Standards | 2 | **Design-system drift**: Raw native `<select>` used in analytics filters vs shadcn `@base-ui/react` Select in sibling pages; mismatched heights (`h-9` vs `h-8`); inconsistent count labels ("Filtered" vs "N active"). |
| 5 | Error Prevention | 2 | **Contradiction risk**: Three parallel selects (School Year, Semester, Academic Term) allow users to pick mutually incompatible options resulting in `IMPOSSIBLE_TERM_INSTANCE_ID` and unexpected empty screens. |
| 6 | Recognition Rather Than Recall | 3 | High visibility of tabs and popovers, but mobile tab bar hides scrollbar with no visual affordance that 6 tabs scroll horizontally. |
| 7 | Flexibility and Efficiency | 2 | Full URL deep-linking supported; lacks quick-filter chips, auto-apply, and table column sorting for rating volume. |
| 8 | Aesthetic and Minimalist Design | 3 | Focused content, but uniform `border-border bg-card` boxes create monochromatic blandness; categorical rainbow bar colors in single-measure ranking charts encode no actual meaning. |
| 9 | Error Recovery | 4 | Best-in-class contextual empty states: 4 distinct empty states with clear explanations and recovery action links; AI tab explains exact evidence math. |
| 10 | Help and Documentation | 3 | Traceable HowCalculated popovers and attribution disclosures inline; lacks high-level onboarding or orientation for first-time Program Heads. |
| **Total** | | **29/40** | **Good (address weak areas)** |

---

#### Technical Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 3 | WCAG AA contrast largely met; native `<select>` is `h-9` (36px) missing coarse pointer touch target (`pointer-coarse:min-h-11`); PLO details summary lacks focus-visible ring. |
| 2 | Performance | 4 | Server component data fetching; parallel tab resolving; dynamic `ssr: false` chart loading with accessible skeleton fallbacks; 0 client waterfalls. |
| 3 | Responsive Design | 3 | Solid drawer on mobile with `max-h-[88dvh]` and safe-area insets; table overflow containment; touch target gaps on native selects; hidden tab scroll affordance. |
| 4 | Theming | 4 | Complete token usage (0 hardcoded hex/rgb colors); full dark-mode parity; Recharts patterns for color-blind safety. |
| 5 | Implementation Integrity | 2 | Redundant period filters (School Year + Semester + Academic Term) creating empty-scope contradiction risks; native form elements bypassing shadcn/Base UI component library. |
| **Total** | | **16/20** | **Good (address weak dimensions)** |

---

#### Design Specificity Verdict

- **LLM Assessment**: System CLOIE has deeply grounded OBE domain substance (CILO→PLO mapping rules, stakeholder evidence separation, frozen instrument versions, defensible attribution notes) wrapped in a category-interchangeable generic dashboard skin. Every container is the exact same rounded rectangle on white/card background. The institution's ACD cyan and primary accents are absent, and single-measure ranking bars are painted arbitrary rainbow colors.
- **Deterministic Scan**: Mechanical detector completed with 0 errors across 9 files. The technical code is structurally sound, but the detector has no rule flagging raw `<select>` elements replacing project design-system components.

---

#### Priority Issues

1. **[P1] Redundant Hierarchical Period Filters**
   - *Impact*: School Year, Semester, and Academic Term are displayed as three separate peer dropdowns even though Academic Term already encapsulates School Year, Semester, and Term name. Selecting mismatched values leads to `IMPOSSIBLE_TERM_INSTANCE_ID` and silent zero-data states.
   - *Fix*: Collapse School Year and Semester down into a single comprehensive "Academic Term" filter with hierarchical formatted labels.
   - *Command*: `/impeccable distill`

2. **[P1] Raw Native `<select>` Elements Violate Design System**
   - *Impact*: Hand-rolled `h-9` native `<select>` inputs bypass shadcn/ui `@base-ui/react` primitives, breaking keyboard typeahead, popup styling, dark mode elegance, and the 44px coarse-touch target requirement.
   - *Fix*: Replace with `@base-ui/react` shadcn Select component with Field/FieldLabel, keyboard typeahead, and full touch-target support.
   - *Command*: `/impeccable shape`

3. **[P1] Inverted Heading Hierarchy & Flat Typography**
   - *Impact*: The most generic word "Analytics" is the large `h1`, while the specific Program name is relegated to small subtitle text. All chart cards and table titles share a flat 14px `text-title-sm`, making scanning difficult.
   - *Fix*: Promote the program name/code into primary visual focus with an analytics badge/chip, and elevate primary chart titles to `text-title-lg` with subtitle scope stamps.
   - *Command*: `/impeccable typeset`

4. **[P2] Monochromatic Blandness & Meaningless Bar Colors**
   - *Impact*: Dashboards lack visual vitality and institutional character. Conversely, single-measure PLO ranking charts use arbitrary cycling palette colors for each bar, confusing users into thinking color represents category.
   - *Fix*: Apply institutional brand accents (ACD cyan/navy highlights, card top/left subtle borders, scoped badges) and unify single-measure ranking bars with consistent, purposeful primary tints.
   - *Command*: `/impeccable colorize`

5. **[P2] Filter Control Integrity & Mobile Polish**
   - *Impact*: Desktop Reset button renders as a dead link with `pointer-events-none` when inactive instead of proper conditional rendering; drawer trigger says "N active" while desktop badge says "Filtered"; tab bar lacks visual horizontal scroll indicators.
   - *Fix*: Harmonize active count indicators, conditionally render reset CTAs, and ensure touch-friendly affordances across viewports.
   - *Command*: `/impeccable harden`

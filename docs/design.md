# DESIGN.md — System CLOIE

> **Status:** Approved unified light/dark design specification
> Light, Dark, and System are implemented on `main`; Dark/System selection is gated in primary Production behind the server-owned `CLOIE_APPEARANCE_ENABLED` release control (ADR 0010).
> **Reviewed against `main`:** 2026-08-21

## 1. Authority and Scope

This file defines System CLOIE's visual language, theme behavior, page patterns, components, responsive behavior, interaction, and accessibility. It applies to both light and dark themes.

| Subject                                        | Source of truth                              |
| ---------------------------------------------- | -------------------------------------------- |
| Architecture, stack, binding engineering rules | `AGENTS.md`                                  |
| Product workflows and requirements             | GitHub issues, feature `CONTEXT.md`          |
| Domain terms and invariants                    | `CONTEXT-MAP.md`, feature `CONTEXT.md`, ADRs |
| Visual and interaction behavior                | `docs/design.md`                             |
| Numerical design values                        | `src/styles/tokens.css`                      |
| Tailwind/shadcn mappings and type utilities    | `src/app/globals.css`                        |
| Current behavior                               | existing code and tests                      |
| Execution and verification                     | `AGENTS.md`                                  |

Surface conflicts explicitly. This file does not define product scope, authorization, database behavior, or engineering workflow.

**Keywords:** MUST/MUST NOT are binding; SHOULD/SHOULD NOT require a documented reason to deviate; MAY is optional.

---

## 2. Agent Workflow

Before changing UI:

1. Identify the role, domain, and page type.
2. Read the relevant context, ADRs, code, and tests.
3. Reuse the existing shell and `src/components/ui/` primitives.
4. Use semantic tokens; never choose light/dark values in components.
5. Cover relevant default, hover, focus, pressed, selected, disabled, loading, error, and empty states.
6. Verify light, dark, desktop, mobile, keyboard, contrast, and reduced motion.
7. Run focused tests, `pnpm lint`, and `pnpm build`.

A change is done when every step above holds:

- [ ] Correct role, domain, and page type
- [ ] Relevant context and current implementation inspected
- [ ] Existing shell and primitives reused
- [ ] Semantic tokens only
- [ ] Correct light/dark hierarchy
- [ ] Required component and system states covered
- [ ] Desktop and mobile verified
- [ ] Keyboard, focus, contrast, touch, and reduced motion verified
- [ ] Status/chart meaning is not color-only
- [ ] No forbidden pattern (§14)
- [ ] Focused tests, `pnpm lint`, and `pnpm build` pass
- [ ] Result is recognizably System CLOIE

---

## 3. Product Design Intent

- **Product:** institutional academic evaluation, learning-outcome monitoring, analytics, and reporting platform
- **Institution:** Assumption College of Davao
- **Administrative roles:** `SECRETARY`, `DEAN`, `PROGRAM_HEAD`, `FACULTY`
- **Respondent roles:** `STUDENT`, `ALUMNI`, `INDUSTRY_PARTNER`
- **Production identity:** one active account role; dev/demo role switching is environment-only
- **Character:** institutional, trustworthy, calm, precise, professional, orderly, analytical, restrained

### Experience Principles

1. **Clarity over decoration** — hierarchy, spacing, and restrained color establish structure.
2. **Role-aware UI** — users see only tools appropriate to their active role.
3. **Semantic tokens only** — components consume roles, not theme values.
4. **Legible status** — color is paired with text, icon, shape, or pattern.
5. **Adaptive by default** — meaning remains constant across themes and breakpoints.
6. **Accessibility by default** — contrast, focus, keyboard access, touch targets, and reduced motion are required.

---

## 4. Theme Architecture

### 4.1 Model and Status

System CLOIE has **Light**, **Dark**, and **System** appearance settings. Themes change resolved token values, not component structure, hierarchy, semantics, content, navigation, or responsive behavior.

> **Values adapt. Roles and meanings remain constant.**

| Appearance | Design   | Implementation on `main`                 |
| ---------- | -------- | ---------------------------------------- |
| Light      | Approved | Implemented                              |
| Dark       | Approved | Implemented, gated in primary Production |
| System     | Approved | Implemented, gated in primary Production |

In primary Production, Dark and System activate only when the server-only `CLOIE_APPEARANCE_ENABLED` release setting is exactly `"true"` (ADR 0010, `docs/runbooks/appearance-production-activation.md`). Development and the dedicated demo deployment render them directly.

### 4.2 Brand Roles

| Role                | Use                                         | Do not use as            |
| ------------------- | ------------------------------------------- | ------------------------ |
| Institutional navy  | formal ACD/report framing                   | routine action color     |
| Operational primary | CTA, links, active nav, selection, progress | status color             |
| ACD cyan accent     | analytics, categories, specialized accents  | default secondary action |
| Neutral secondary   | secondary actions, neutral controls         | brand accent             |
| Semantic colors     | success, warning, danger, information       | decoration/categories    |

**ACD cyan and neutral secondary actions are separate roles.**

### 4.3 Invariants

Unchanged across themes:

- typography, spacing, radii, sizes
- component anatomy and action hierarchy
- navigation, status meaning, copy
- responsive substitutions
- keyboard and screen-reader behavior

Theme-adaptive:

- surfaces, foregrounds, borders
- links, focus, selection
- semantic soft surfaces
- charts, overlays, logo containers

### 4.4 Appearance Selection

- Default new users to **System**.
- Explicit Light/Dark overrides the OS preference.
- Persist the choice and resolve it before first paint.
- Theme changes must not reset route, form, filter, scroll, or async state.
- Use text labels; do not rely on a sun/moon icon alone.
- Preferred placement: the standalone appearance trigger in the app topbar, mirrored on public routes (a dedicated `Settings → Appearance` route was removed during design-system implementation).

### 4.5 Logo Treatment

- Never recolor, invert, filter, crop, distort, or redraw official logos.
- System CLOIE is primary; the ACD seal is secondary.
- Light: use neutral surfaces and clear space.
- Dark: use a light brand-safe plate (`#FFFFFF` or `#F8FAFC`) with a subtle border.
- Warm colors inside logos are not general UI tokens.

---

## 5. Semantic Token System

### 5.1 Ownership and Layers

- `tokens.css` owns numerical values — this file defines roles and usage, never competing hex values.
- `globals.css` maps values to Tailwind/shadcn semantics.
- Components MUST use semantic classes such as `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `ring-ring`, and `bg-primary`.

Token layers:

1. **Brand reference:** ACD navy, ACD cyan, bright cyan, System blue
2. **Semantic UI:** background, card, muted, input, popover, border, foreground, primary, secondary, accent, link, ring, selected
3. **Status/visualization:** success, warning, danger, information, chart 1–5

### 5.2 Surface and Text Roles

Each role resolves per theme in `tokens.css`; the pairing across themes is part of the token contract:

background, card, surface-alternate, surface-muted, surface-hover, input, popover, scrim, border, border-strong, text-primary, text-secondary, text-muted, text-disabled, primary, link, focus-ring, selected-background/foreground, secondary-background/hover.

### 5.3 Brand Families

#### Institutional navy

Formal report and institutional framing only — never routine actions, ordinary cards, or decoration.

#### Operational primary

CTAs, links, active navigation, selection, progress. Hover/active deepen within the same family; soft/selected uses the family's tinted surface. Never a status color.

#### ACD cyan accent

Category badges, analytics accents, chart 2, and one separately named specialized action. It is not the default `secondary` button and not a second primary.

#### Neutral secondary action

Secondary buttons and neutral controls. Remains neutral in both themes; distinct from ACD cyan.

### 5.4 Status Tokens

| Status      | Meaning             | Usage                                                                              |
| ----------- | ------------------- | ---------------------------------------------------------------------------------- |
| Success     | completed, valid    | confirmation without replacing selection                                           |
| Warning     | attention required  | soft surfaces for alerts and badges                                                |
| Danger      | error, destructive  | soft danger for routine controls; filled reserved for confirmed destructive action |
| Information | neutral information | indigo; separate from links, focus, primary, and cyan                              |

Use soft surfaces for alerts and badges. Every status pairs color with text, icon, shape, or pattern.

### 5.5 Data Visualization

Five categorical chart series (`--chart-1` … `--chart-5`), theme-resolved in `tokens.css`.

- Chart colors are categorical, not semantic.
- Use visible legends, direct labels where practical, and marker/line/pattern distinction beyond five categories.
- Provide a text summary of the key insight.
- No glow, decorative chart animation, or additional chart library.

### 5.6 Semantic Mappings

- `primary`: operational primary
- `secondary`: neutral secondary action
- `accent`: neutral/contextual hover, not ACD cyan by default
- `brand-accent`: ACD cyan
- `ring`: dedicated focus ring
- `information`: indigo status
- `muted`: neutral surface/foreground
- `destructive`: danger
- `chart-*`: theme-resolved categorical palette
- `sidebar-*`: semantic navigation roles

---

## 6. Visual Foundations

### 6.1 Typography

- **Manrope 600/700:** display, headings, titles
- **Inter 400/500/600:** body, labels, controls
- **`tabular-nums`:** KPIs, percentages, counts, aligned table data

| Group   | Utilities                              |
| ------- | -------------------------------------- |
| Display | `.text-display-lg`, `.text-display-md` |
| Heading | `.text-heading-xl`, `lg`, `md`         |
| Title   | `.text-title-lg`, `md`, `sm`           |
| Body    | `.text-body-lg`, `md`, `sm`            |
| Label   | `.text-label-lg`, `md`, `sm`           |
| Caption | `.text-caption`                        |

Exact sizes live in `globals.css`.

- Use token utilities, not ad hoc type scales.
- Body copy stays at least `0.875rem`; no text below `0.75rem`.
- Headings use primary foreground, not cyan decoration.
- Legal content uses `.legal-prose`.

### 6.2 Spacing, Layout, and Density

- 4/8 px rhythm; prefer `gap-*` over `space-*`.
- Standard component gap: 16 px; section gap: 24 px.
- Admin pages: medium density; respondent/onboarding: low density.
- Touch targets: interactive controls carry `pointer-coarse:` overrides expanding them to ≥44 × 44 px on touch devices; fine-pointer sizes stay dense.

| Context         | Layout                                              |
| --------------- | --------------------------------------------------- |
| Operational app | existing `AppShell`, `max-w-[1600px]`, `p-4 sm:p-6` |
| Public/landing  | `max-w-7xl`                                         |
| Legal/prose     | `max-w-3xl`                                         |
| Focused form    | `max-w-2xl`                                         |
| KPI grid        | 1 / 2 / 4 columns                                   |
| Forms/wizards   | single column by default                            |

Reuse `app-shell.tsx`, `sidebar.tsx`, `topbar.tsx`, `mobile-nav.tsx`, and `mobile-sidebar-drawer.tsx`.

### 6.3 Radius, Borders, and Elevation

- Radius: 2 / 4 / 8 / 12 / 16 / 24 px.
- Inputs/lists: `rounded-lg`; cards/dialogs: `rounded-xl`; portal/hero: `rounded-2xl`.
- Normal cards use border/ring and minimal shadow.
- Strong elevation is overlay-only.
- Dark mode uses luminance and borders before shadow.
- Decorative blur is prohibited; backdrop blur is limited to overlays or approved landing chrome.

### 6.4 Iconography

Use `lucide-react` only, normally 16–24 px, with one outline stroke. Icon-only controls need an accessible name and adequate hit area. No emoji or additional icon library.

---

## 7. Page-Type Patterns

| Page type             | Density     | Structure                      | Emphasize                    | Avoid                  |
| --------------------- | ----------- | ------------------------------ | ---------------------------- | ---------------------- |
| Landing / portal      | low         | brand header, role cards       | trust, role paths            | admin density          |
| Auth / onboarding     | low         | focused centered form          | minimal distraction          | app chrome             |
| Operational dashboard | medium      | shell, KPIs, tools, tables     | scanability                  | hero styling           |
| Respondent flow       | low         | single-column wizard           | progress, mobile comfort     | sidebars/admin actions |
| Analytics             | medium-high | filters, KPIs, charts          | comparison, direct labels    | decorative charts      |
| Reports               | medium      | formal header, filters, export | evidence, legibility         | promotional styling    |
| Legal                 | low         | narrow prose                   | readability                  | extra controls         |
| Settings              | medium      | grouped forms                  | clear persistent preferences | analytics density      |

Theme selection must not change the page pattern.

### System States

- **Empty:** icon, title, explanation, recovery CTA
- **Loading:** structural skeleton; local spinner for small actions
- **Error:** cause, impact, recovery
- **Offline:** connection state, available capability, retry/status
- **Unauthorized:** reason and safe return path
- **No data:** distinguish absence from loading/failure

The installable PWA shell exists. Offline data caching and mutation queues remain out of scope unless ADR 0006 is reopened.

---

## 8. Shared Components

### 8.1 Required States

| State    | Requirement                                                           |
| -------- | --------------------------------------------------------------------- |
| Default  | canonical semantic tokens                                             |
| Hover    | subtle color/surface change                                           |
| Focus    | visible `ring-ring`                                                   |
| Pressed  | optional 1 px translation                                             |
| Selected | semantic surface plus accessible state                                |
| Disabled | noninteractive but readable; opacity unified at 60% across primitives |
| Loading  | preserve width; spinner and/or label                                  |
| Error    | adjacent semantic message                                             |
| Success  | confirmation without replacing selection                              |

### 8.2 Buttons

Variants:

- `default` — primary
- `secondary` — neutral secondary
- `outline`, `ghost`, `link`
- `destructive`
- `brand-accent` — specialized cyan
- existing icon sizes

Rules:

- `secondary` remains neutral in both themes.
- `brand-accent` is intentional, not a second primary.
- Routine destructive controls use soft danger; filled danger is confirmation-only.
- Async actions disable duplicate submission and show loading.
- Keep existing size names in `button.tsx`.

### 8.3 Form Controls

- Reuse existing Base UI/shadcn input, textarea, select, checkbox, radio, switch, label, helper, and error components.
- Every field has a visible label; errors/helper text appear beside the field.
- Checked controls use primary, not semantic success.
- Switch states: off = muted track with foreground knob; on = primary track with primary-foreground knob. Knob/track and track/page boundaries hold ≥3:1 in both themes.
- Dark fields use the semantic input surface and dedicated ring.
- Continue using `customZodResolver`.
- No placeholder-only labels.

### 8.4 Navigation

Navigation is centralized in `src/lib/constants/navigation.ts`.

- Administrative roles use mobile hamburger/drawer.
- Student, alumni, and industry partner use bottom navigation.
- Dean uses tablet icon rail and large-screen sidebar.
- Active states use selected/primary tokens.
- Theme does not change route grouping or navigation priority.
- Dark navigation uses light logo plates.
- Do not add per-page navigation or expose dev/demo switching in production.

### 8.5 Cards

Canonical: standard, KPI, chart, portal choice, formal institutional.

- Normal cards use neutral surfaces.
- Cyan is a small accent, category, or marker—not a decorative full-card fill.
- Navy is limited to formal institutional/report content.
- Portal cards may use slightly stronger hover elevation.
- Numeric values use tabular figures.

### 8.6 Tables and Lists

- Use semantic header, hover, selected, and expanded states.
- Contain wide tables in `overflow-x-auto`.
- Use `aria-sort`; keyboard-enable clickable rows.
- Status badges require text.
- Avoid zebra striping unless clearly needed.

### 8.7 Tabs, Badges, and Progress

- Supported tabs: pill and line.
- Honor the 44 px touch target on coarse pointers: horizontal lists grow to fit and triggers floor at `min-h-11`; desktop density is unchanged.
- Primary marks active tabs and progress.
- Cyan badges are categorical; semantic badges indicate status.
- Progress includes a text/count/percentage.
- Structure remains identical across themes.

### 8.8 Feedback, Loading, and Overlays

- Reuse `showToast` and root `ToastProvider`; do not add another toast system.
- Approved kinds: success, warning, error/danger, information.
- Use route skeletons, local spinners, actionable empty states, and adjacent `role="alert"` errors.
- Loading stays perceivable under reduced motion: spinner pairs a pulse fallback with text or skeleton context.
- Preserve current URL-toast consumption and cleanup; toasts are dismissible with a keyboard- and touch-operable control.
- Use Dialog on desktop and Drawer on mobile where established.
- Use `AlertDialog` for destructive confirmation.
- Overlays use semantic surface, border, and scrim tokens; strong shadows are overlay-only.

### 8.9 Data Visualization

- Render tooltips through the shared themed `ChartTooltip`; do not restyle per chart.
- Use Recharts; do not add another chart library.
- New/reworked charts should use shared shadcn-style wrappers when available.
- Prepare and authorize data on the server; keep chart client boundaries narrow.
- Use `--chart-*`, legends, tooltips, tabular values, low-contrast grids, and text summaries.
- Export may be offered for data-heavy views.
- Qualitative word clouds are single-series magnitude encodings: words may cycle
  the approved `--chart-1…5` tokens as solid fills (every token clears 4.5:1 on
  the card surface), but pattern hatching stays out of text glyphs. Pair the
  cloud with a bounded, sticky-header "Ranked" exact-values table inside the
  same fixed-height frame; opening exact values must never change page height.
  An exact-values percentage whose denominator depends on a display control is
  forbidden; exact counts only.

---

## 9. Module-Specific Rules

| Module                               | Emphasis                       | Required pattern                                                  |
| ------------------------------------ | ------------------------------ | ----------------------------------------------------------------- |
| Auth / sessions                      | focused public form            | never expose dev/demo auth in primary production                  |
| Academic calendar / structure        | managed records/forms          | existing shells; Dialog → Drawer where established                |
| Course assignments                   | dense roster/membership tables | domain `CONTEXT.md`, existing page shell and constraints          |
| Outcomes / instruments / evaluations | authoring/deployment           | progressive disclosure, explicit status, destructive confirmation |
| Responses                            | guided low-density flow        | `wizard-shell.tsx`, visible progress, mobile-first                |
| Analytics                            | KPIs, filters, charts          | theme chart tokens, legends, summaries, export                    |
| Reports                              | formal evidence/export         | limited institutional navy                                        |
| Dean PWA                             | stable installable shell       | offline data remains deferred by ADR 0006                         |
| Navigation                           | role-filtered structure        | edit central constants only                                       |

### 9.1 Instrument template builder actions

- Long instrument template builders keep document actions visible while users edit sections and questions.
- Desktop and tablet use a sticky page header below the application top bar.
- Mobile uses the same action toolbar as a fixed bottom bar with safe-area padding and at least 44 px touch targets.
- The builder reserves enough bottom space that the mobile toolbar never covers fields or section controls.
- The toolbar states `No pending changes`, `Unsaved changes`, `Saving...`, `Saved`, or `Save failed`; status never depends on color alone.
- Draft persistence uses `Save draft`. A separate `Continue to publish` action saves successfully before it enters the publication workflow.
- Management builders that do not publish use `Save template`. Institutional baseline copies use `Create program copy`.
- Back and internal navigation warn before they discard unsaved instrument template changes. Refresh and browser close use the native unsaved-change warning.
- Save remains in the builder and preserves the user's editing position. Success uses the shared toast and the toolbar status, not a modal.

---

## 10. Responsive Behavior

Tailwind defaults: `sm` 640, `md` 768, `lg` 1024, `xl` 1280.

- **Desktop:** expanded navigation, full chart/table density, multi-column cards, dialogs.
- **Tablet:** Dean icon rail, two-column cards, reduced chart density.
- **Mobile:** respondent bottom nav; admin hamburger/drawer; single-column forms; contained horizontal tables; `pb-safe`; touch targets per §6.2.

Appearance must not alter breakpoints, density, information hierarchy, navigation mode, or responsive substitution.

---

## 11. Interaction and Motion

- Hover: color, opacity, or surface change; never the only discovery method.
- Focus: visible on every surface; never remove the ring.
- Press: optional 1 px translation.
- Async: preserve width, prevent duplicates, communicate loading and result.
- Motion: 150–300 ms; animate opacity/transform, not layout dimensions.
- No decorative loops or blocked input; honor reduced motion.
- Resolve theme before first paint; avoid long page fades and flashes.

---

## 12. Accessibility

- Normal text: ≥4.5:1 contrast.
- Large text and meaningful non-text boundaries: ≥3:1 where applicable.
- Adjacent dark surfaces need visible luminance/border separation.
- All controls are keyboard-operable with logical, visible focus.
- Overlays trap and restore focus appropriately.
- Never communicate status or chart series by color alone.
- Errors state cause and recovery.
- Touch targets meet the §6.2 minimum and do not rely on hover.
- Charts use legends, labels, marker/line distinction, tooltips, and text summaries.
- Honor `prefers-reduced-motion`; loading remains understandable without animation.

---

## 13. Content and Copy

- Professional, institutional, direct.
- CTAs are imperative and role-specific.
- Use exact domain terminology from the relevant context.
- Empty states explain what happened and the next action.
- Errors provide cause and fix.
- Place helper copy beside complex inputs.
- Avoid technical jargon in respondent flows.

---

## 14. Allowed, Forbidden, and Exceptions

### Allowed

- semantic/shadcn token classes
- `cva`, `cn()`, Base UI, `data-slot`
- Lucide icons and token type utilities
- existing loading and toast systems
- Dialog → Drawer responsive adaptation
- Light / Dark / System control
- root-level theme token overrides
- brand-safe logo plates

### Forbidden

- raw hex in components
- component-local theme palettes or raw-color `dark:` overrides
- different component structure by theme
- gold as a general UI family
- cyan as default secondary action
- recolored/inverted logos
- pure-black, neon, glow, glassmorphism, decorative gradients
- Radix or another icon/chart/toast library
- emoji icons
- per-page navigation
- placeholder-only labels or color-only status
- decorative chart animation
- arbitrary z-index or ad hoc type scales

Existing semantic `dark:` selectors may remain only when resolving semantic variables/opacity, not an independent raw palette.

### Exceptions

Exceptions must be documented, scoped, and tokenized when reusable. Institutional navy on formal report cards is the canonical example; ordinary cards do not qualify. Raw-color exceptions are allowlisted in `src/features/design-system/data/raw-color-allowlist.ts`.

---

## 15. Visual References

Store companion boards at:

- `docs/assets/system-cloie-design-system-light.png`
- `docs/assets/system-cloie-design-system-dark.png`

The boards illustrate appearance. This file defines normative meaning and behavior. `tokens.css` remains authoritative for numerical values.

> **One design system. Two resolved themes. One semantic implementation contract.**

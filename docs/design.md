# DESIGN.md — System CLOIE

> **Status:** Approved unified light/dark design specification  
> **Repository status:** Light is implemented on `main`; dark and System appearance are approved but not yet implemented.  
> **Reviewed against `main`:** 2026-08-04

## 1. Authority and Scope

This file defines System CLOIE's visual language, theme behavior, page patterns, components, responsive behavior, interaction, and accessibility. It applies to both light and dark themes.

| Subject | Source of truth |
| --- | --- |
| Architecture, stack, binding engineering rules | `openspec/config.yaml` |
| Product workflows and requirements | `docs/cloie-prd.md`, `docs/cloie-srs.md` |
| Domain terms and invariants | `CONTEXT-MAP.md`, feature `CONTEXT.md`, ADRs |
| Visual and interaction behavior | `docs/design.md` |
| Numerical design values | `src/styles/tokens.css` |
| Tailwind/shadcn mappings and type utilities | `src/app/globals.css` |
| Current behavior | existing code and tests |
| Execution and verification | `AGENTS.md` |

Surface conflicts explicitly. This file does not define product scope, authorization, database behavior, or engineering workflow.

**Keywords:** MUST/MUST NOT are binding; SHOULD/SHOULD NOT require a documented reason to deviate; MAY is optional.

---

## 2. Implementing-Agent Quick Start

Before changing UI:

1. Identify the role, domain, and page type.
2. Read the relevant context, ADRs, code, and tests.
3. Reuse the existing shell and `src/components/ui/` primitives.
4. Use semantic tokens; never choose light/dark values in components.
5. Cover relevant default, hover, focus, pressed, selected, disabled, loading, error, and empty states.
6. Verify light, dark, desktop, mobile, keyboard, contrast, and reduced motion.
7. Run focused tests, `pnpm lint`, and `pnpm build`.

If dark mode is not yet implemented, follow this approved specification but do not improvise component-local palettes.

---

## 3. Product Design Intent

- **Product:** institutional academic evaluation, learning-outcome monitoring, analytics, and reporting platform
- **Institution:** Assumption College of Davao
- **Administrative roles:** `SECRETARY`, `DEAN`, `PROGRAM_HEAD`, `FACULTY`
- **Respondent roles:** `STUDENT`, `ALUMNI`, `INDUSTRY_PARTNER`
- **Production identity:** one active account role; dev/demo role switching is environment-only
- **Character:** institutional, trustworthy, calm, precise, professional, orderly, analytical, restrained
- **Avoid:** playful, trendy, decorative, noisy, gamified, highly saturated, legacy-portal-like, neon, or cyberpunk styling

### Experience Principles

1. **Clarity over decoration** — hierarchy, spacing, and restrained color establish structure.
2. **Role-aware UI** — users see only tools appropriate to their active role.
3. **Semantic tokens only** — components consume roles, not theme values.
4. **Legible status** — color is paired with text, icon, shape, or pattern.
5. **Adaptive by default** — meaning remains constant across themes and breakpoints.
6. **Accessibility by default** — contrast, focus, keyboard access, touch targets, and reduced motion are required.

---

## 4. Unified Theme Architecture

### 4.1 Theme Model and Status

System CLOIE has **Light**, **Dark**, and **System** appearance settings. Themes change resolved token values, not component structure, hierarchy, semantics, content, navigation, or responsive behavior.

> **Values adapt. Roles and meanings remain constant.**

| Appearance | Design | Implementation on `main` |
| --- | --- | --- |
| Light | Approved | Implemented |
| Dark | Approved | Not implemented |
| System | Approved | Not implemented |

Do not present dark mode as shipped until tokens, provider, persistence, first-paint resolution, and component verification are complete.

### 4.2 Brand Roles

| Role | Use | Do not use as |
| --- | --- | --- |
| Institutional navy | formal ACD/report framing | routine action color |
| Operational primary | CTA, links, active nav, selection, progress | status color |
| ACD cyan accent | analytics, categories, specialized accents | default secondary action |
| Neutral secondary | secondary actions, neutral controls | brand accent |
| Semantic colors | success, warning, danger, information | decoration/categories |

**ACD cyan and neutral secondary actions are separate roles.**

### 4.3 Theme Invariants

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
- Preferred placement: avatar menu and `Settings → Appearance`.

### 4.5 Logo Treatment

- Never recolor, invert, filter, crop, distort, or redraw official logos.
- System CLOIE is primary; the ACD seal is secondary.
- Light: use neutral surfaces and clear space.
- Dark: use a light brand-safe plate (`#FFFFFF` or `#F8FAFC`) with a subtle border.
- Warm colors inside logos are not general UI tokens.

---

## 5. Semantic Token System

### 5.1 Ownership and Layers

- `tokens.css` owns numerical values.
- `globals.css` maps them to Tailwind/shadcn semantics.
- `design.md` defines meaning and usage.

Components MUST use semantic classes such as `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `ring-ring`, and `bg-primary`.

Token layers:

1. **Brand reference:** ACD navy, ACD cyan, bright cyan, System blue
2. **Semantic UI:** background, card, muted, input, popover, border, foreground, primary, secondary, accent, link, ring, selected
3. **Status/visualization:** success, warning, danger, information, chart 1–5

### 5.2 Core Light–Dark Mapping

| Role | Light | Dark |
| --- | ---: | ---: |
| Background | `#F8FAFC` | `#0B1120` |
| Surface/card | `#FFFFFF` | `#111827` |
| Surface alternate | `#F1F5F9` | `#172033` |
| Surface muted | `#E2E8F0` | `#1E293B` |
| Surface hover | `#F1F5F9` | `#273449` |
| Input | `#FFFFFF` | `#0F172A` |
| Popover | `#FFFFFF` | `#172033` |
| Scrim | `rgba(15, 23, 42, 0.5)` | `rgba(2, 6, 23, 0.6)` |
| Border | `#E2E8F0` | `#334155` |
| Border strong | `#CBD5E1` | `#475569` |
| Text primary | `#0F172A` | `#F8FAFC` |
| Text secondary | `#334155` | `#CBD5E1` |
| Text muted | `#64748B` | `#94A3B8` |
| Text disabled | `#94A3B8` | `#64748B` |
| Primary | `#2563EB` | `#2563EB` |
| Link | `#1D4ED8` | `#60A5FA` |
| Focus ring | `#0284C7` | `#38BDF8` |
| Selected background | `#EFF6FF` | `#172554` |
| Selected foreground | `#1E40AF` | `#BFDBFE` |
| Neutral secondary | `#F1F5F9` | `#1E293B` |
| Secondary hover | `#E2E8F0` | `#273449` |

### 5.3 Brand and Interactive Families

#### Institutional navy

| Role | Value |
| --- | ---: |
| Reference | `#221D60` |
| Dark surface | `#1E1B4B` |
| Dark border | `#3730A3` |
| Dark foreground | `#C7D2FE` |

Use only for formal report/institutional framing.

#### Operational primary

| Role | Light/shared | Dark |
| --- | ---: | ---: |
| Primary | `#2563EB` | `#2563EB` |
| Hover | `#1D4ED8` | `#1D4ED8` |
| Active | `#1E40AF` | `#1E40AF` |
| Soft/selected | `#EFF6FF` | `#172554` |
| Highlight/link | `#1D4ED8` | `#60A5FA` |
| On primary | `#FFFFFF` | `#FFFFFF` |

#### ACD cyan accent

| Role | Light | Dark |
| --- | ---: | ---: |
| Accent | `#0369A1` | `#0369A1` |
| Hover | `#075985` | `#0E7490` |
| Active | `#0C4A6E` | `#075985` |
| Soft | `#F0F9FF` | `#082F49` |
| Border | `#BAE6FD` | `#0E7490` |
| Highlight | `#25AAE1` | `#38BDF8` |
| On accent | `#FFFFFF` | `#FFFFFF` |

Use for category badges, analytics accents, chart 2, and a separately named specialized action—not the default `secondary` button.

#### Neutral secondary action

| Role | Light | Dark |
| --- | ---: | ---: |
| Background | `#F1F5F9` | `#1E293B` |
| Hover | `#E2E8F0` | `#273449` |
| Border | `#CBD5E1` | `#475569` |
| Foreground | `#0F172A` | `#F8FAFC` |

### 5.4 Semantic Status Tokens

| Status | Light main / soft | Dark main / soft | Meaning |
| --- | --- | --- | --- |
| Success | `#047857` / `#ECFDF5` | `#34D399` / `#052E2B` | completed, valid |
| Warning | `#B45309` / `#FFFBEB` | `#FBBF24` / `#451A03` | attention required |
| Danger | `#B91C1C` / `#FEF2F2` | `#F87171` / `#450A0A` | error, destructive |
| Information | `#4F46E5` / `#EEF2FF` | `#A5B4FC` / `#1E1B4B` | neutral information |

Use soft surfaces for alerts and badges. Filled danger is reserved for the confirmed destructive action. Information is indigo and separate from links, focus, primary, and cyan.

### 5.5 Data Visualization

| Series | Light | Dark |
| --- | ---: | ---: |
| Chart 1 | `#2563EB` | `#60A5FA` |
| Chart 2 | `#0369A1` | `#22D3EE` |
| Chart 3 | `#047857` | `#34D399` |
| Chart 4 | `#7C3AED` | `#A78BFA` |
| Chart 5 | `#C2410C` | `#FB923C` |

- Chart colors are categorical, not semantic.
- Use visible legends, direct labels where practical, and marker/line/pattern distinction.
- Provide a text summary of the key insight.
- Do not use glow, decorative chart animation, or another chart library.

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

| Group | Utilities |
| --- | --- |
| Display | `.text-display-lg`, `.text-display-md` |
| Heading | `.text-heading-xl`, `lg`, `md` |
| Title | `.text-title-lg`, `md`, `sm` |
| Body | `.text-body-lg`, `md`, `sm` |
| Label | `.text-label-lg`, `md`, `sm` |
| Caption | `.text-caption` |

Exact sizes live in `globals.css`.

- Use token utilities, not ad hoc type scales.
- Body copy stays at least `0.875rem`; no text below `0.75rem`.
- Headings use primary foreground, not cyan decoration.
- Legal content uses `.legal-prose`.

### 6.2 Spacing, Layout, and Density

- 4/8 px rhythm; prefer `gap-*` over `space-*`.
- Standard component gap: 16 px; section gap: 24 px.
- Admin pages: medium density; respondent/onboarding: low density.
- Mobile targets: at least 44 × 44 px.

| Context | Layout |
| --- | --- |
| Operational app | existing `AppShell`, `max-w-[1600px]`, `p-4 sm:p-6` |
| Public/landing | `max-w-7xl` |
| Legal/prose | `max-w-3xl` |
| Focused form | `max-w-2xl` |
| KPI grid | 1 / 2 / 4 columns |
| Forms/wizards | single column by default |

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

| Page type | Density | Structure | Emphasize | Avoid |
| --- | --- | --- | --- | --- |
| Landing / portal | low | brand header, role cards | trust, role paths | admin density |
| Auth / onboarding | low | focused centered form | minimal distraction | app chrome |
| Operational dashboard | medium | shell, KPIs, tools, tables | scanability | hero styling |
| Respondent flow | low | single-column wizard | progress, mobile comfort | sidebars/admin actions |
| Analytics | medium-high | filters, KPIs, charts | comparison, direct labels | decorative charts |
| Reports | medium | formal header, filters, export | evidence, legibility | promotional styling |
| Legal | low | narrow prose | readability | extra controls |
| Settings | medium | grouped forms | clear persistent preferences | analytics density |

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

| State | Requirement |
| --- | --- |
| Default | canonical semantic tokens |
| Hover | subtle color/surface change |
| Focus | visible `ring-ring` |
| Pressed | optional 1 px translation |
| Selected | semantic surface plus accessible state |
| Disabled | noninteractive but readable |
| Loading | preserve width; spinner and/or label |
| Error | adjacent semantic message |
| Success | confirmation without replacing selection |

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
- Remove or retokenize hardcoded `cta-success`.

### 8.3 Form Controls

- Reuse existing Base UI/shadcn input, textarea, select, checkbox, radio, switch, label, helper, and error components.
- Every field has a visible label; errors/helper text appear beside the field.
- Checked controls use primary, not semantic success.
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
- Primary marks active tabs and progress.
- Cyan badges are categorical; semantic badges indicate status.
- Progress includes a text/count/percentage.
- Structure remains identical across themes.

### 8.8 Feedback, Loading, and Overlays

- Reuse `showToast` and root `ToastProvider`; do not add another toast system.
- Approved kinds: success, warning, error/danger, information.
- Use route skeletons, local spinners, actionable empty states, and adjacent `role="alert"` errors.
- Preserve current URL-toast consumption and cleanup.
- Use Dialog on desktop and Drawer on mobile where established.
- Use `AlertDialog` for destructive confirmation.
- Overlays use semantic surface, border, and scrim tokens; strong shadows are overlay-only.
- No dark-mode glow.

### 8.9 Data Visualization

- Use Recharts; do not add another chart library.
- New/reworked charts should use shared shadcn-style wrappers when available.
- Prepare and authorize data on the server; keep chart client boundaries narrow.
- Use `--chart-*`, legends, tooltips, tabular values, low-contrast grids, and text summaries.
- Export may be offered for data-heavy views.

---

## 9. Module-Specific Rules

| Module | Emphasis | Required pattern |
| --- | --- | --- |
| Auth / sessions | focused public form | never expose dev/demo auth in primary production |
| Academic calendar / structure | managed records/forms | existing shells; Dialog → Drawer where established |
| Course assignments | dense roster/membership tables | domain `CONTEXT.md`, existing page shell and constraints |
| Outcomes / instruments / evaluations | authoring/deployment | progressive disclosure, explicit status, destructive confirmation |
| Responses | guided low-density flow | `wizard-shell.tsx`, visible progress, mobile-first |
| Analytics | KPIs, filters, charts | theme chart tokens, legends, summaries, export |
| Reports | formal evidence/export | limited institutional navy |
| Dean PWA | stable installable shell | offline data remains deferred by ADR 0006 |
| Navigation | role-filtered structure | edit central constants only |

---

## 10. Responsive Behavior

Tailwind defaults: `sm` 640, `md` 768, `lg` 1024, `xl` 1280.

- **Desktop:** expanded navigation, full chart/table density, multi-column cards, dialogs.
- **Tablet:** Dean icon rail, two-column cards, reduced chart density.
- **Mobile:** respondent bottom nav; admin hamburger/drawer; single-column forms; contained horizontal tables; `pb-safe`; ≥44 px targets.

Appearance must not alter breakpoints, density, information hierarchy, navigation mode, or responsive substitution.

---

## 11. Interaction and Motion

- Hover: color, opacity, or surface change; never the only discovery method.
- Focus: visible on every surface; never remove the ring.
- Press: optional 1 px translation.
- Async: preserve width, prevent duplicates, communicate loading and result.
- Motion: 150–300 ms; animate opacity/transform, not layout dimensions.
- No decorative loops or blocked input; honor reduced motion.
- Resolve theme before first paint; avoid long page fades, flashes, and dark-mode glow.

---

## 12. Accessibility

- Normal text: ≥4.5:1 contrast.
- Large text and meaningful non-text boundaries: ≥3:1 where applicable.
- Adjacent dark surfaces need visible luminance/border separation.
- All controls are keyboard-operable with logical, visible focus.
- Overlays trap and restore focus appropriately.
- Never communicate status or chart series by color alone.
- Errors state cause and recovery.
- Mobile targets are ≥44 × 44 px and do not rely on hover.
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

## 14. Allowed and Forbidden Patterns

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

Exceptions must be documented, scoped, and tokenized when reusable. Example: institutional navy is valid for formal report cards, not ordinary cards.

---

## 15. Implementation Status and Known Gaps

Do not propagate these issues:

| Gap on `main` | Required direction |
| --- | --- |
| Legacy gold and light-only values in `tokens.css` | replace with approved light values and `.dark` overrides |
| No appearance provider/selector | add Light/Dark/System, persistence, OS detection, first-paint resolution |
| `accent` and `ring` coupled to legacy info blue | separate neutral accent, focus ring, indigo information |
| `bg-surface-hover` undefined | add semantic hover token |
| manifest/layout use `#0051C3`, primary is `#2563EB` | reconcile metadata with approved theme strategy |
| hardcoded `cta-success` | remove or replace with semantic variant |
| hardcoded chart palettes | migrate to theme `--chart-*` and support tokens |
| toast uses light hardcoded colors and lacks information | tokenize and add information |
| `text-display-sm` used but undefined | define or migrate usage |
| `CardAction` defined but not exported | export or remove |
| token comment references missing `design-system.txt` | reference `docs/design.md` |
| light-only raw surfaces remain | audit and replace with semantic classes |

Remove resolved entries promptly; this is not an issue archive.

---

## 16. Agent Review Checklist

- [ ] Correct role, domain, and page type
- [ ] Relevant context and current implementation inspected
- [ ] Existing shell and primitives reused
- [ ] Semantic tokens only
- [ ] Correct light/dark hierarchy
- [ ] Required component and system states covered
- [ ] Desktop and mobile verified
- [ ] Keyboard, focus, contrast, touch, and reduced motion verified
- [ ] Status/chart meaning is not color-only
- [ ] No forbidden pattern
- [ ] Focused tests, `pnpm lint`, and `pnpm build` pass
- [ ] Result is recognizably System CLOIE

---

## 17. Visual References

Store companion boards at:

- `docs/assets/system-cloie-design-system-light.png`
- `docs/assets/system-cloie-design-system-dark.png`

The boards illustrate appearance. This file defines normative meaning and behavior. `tokens.css` remains authoritative for numerical values.

> **One design system. Two resolved themes. One semantic implementation contract.**

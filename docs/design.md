# DESIGN.md — System CLOIE

## Scope

This file defines the visual language, interaction principles, page-type behavior, and UI consistency rules for System CLOIE. It is the authoritative human/AI reference for how the product should look, feel, and behave. It supersedes the missing `docs/design-system.txt` referenced by `src/styles/tokens.css`.

Use this file for:

- page-level design direction and visual hierarchy
- component styling and layout behavior
- interaction tone, motion, and feedback patterns
- module-specific UI guidance
- consistency constraints for engineers and AI coding agents

Do not use this file for:

- product scope definition (see `docs/cloie-prd.md`, `docs/cloie-srs.md`)
- engineering workflow rules (see `AGENTS.md`)
- stack rules (see `openspec/config.yaml`)

## Document Relationship

| Document | Primary Responsibility |
| --- | --- |
| `docs/cloie-prd.md` / `docs/cloie-srs.md` | product scope, workflows, user requirements |
| `AGENTS.md` | engineering workflow, verification, agent operating rules |
| `docs/design.md` | visual language, interaction guidance, page-type rules, UI consistency |
| `src/styles/tokens.css` + `src/app/globals.css` | canonical token *values* (single source of truth for numbers) |
| `src/features/<domain>/CONTEXT.md` | per-domain glossary and invariants |

If documents appear to conflict:

1. PRD/SRS win for product definition
2. `docs/design.md` wins for visual and interaction guidance
3. `AGENTS.md` wins for engineering execution rules
4. feature-level `spec.md` / `plan.md` apply only to the current implementation slice

## Product Intent

- **Product type**: Multi-role academic evaluation SaaS (institutional tool)
- **Primary users**: Assumption College of Davao — respondents (students, alumni, industry partners) and administrators (faculty, secretary, dean)
- **Primary jobs-to-be-done**: course evaluations, learning outcome assessment, program/major management, analytics and reporting, response collection
- **Desired product feeling**: institutional, trustworthy, calm, precise
- **Brand traits**: flat institutional, restrained, credible, professional, orderly
- **Anti-traits**: playful, trendy, decorative, noisy, gamified

## Experience Principles

1. **Clarity over decoration** — flat surfaces, minimal shadows, restrained color; every visual element earns its place.
2. **Role-aware UI** — each role sees only its own tools; navigation is driven by `src/lib/constants/navigation.ts` per-role groups.
3. **Token consistency** — semantic tokens only (`text-text-secondary`, `bg-primary`); no raw hex in components.
4. **Status must be legible** — semantic color (success/warning/danger/info) always paired with text or icon, never color alone.
5. **Responsive by default** — dashboards scale to desktop, flows adapt to mobile; bottom nav and drawer fallbacks are the norm on small screens.
6. **Accessibility as default** — AA contrast, visible focus rings, keyboard operability, reduced-motion support.

## Visual Theme and Atmosphere

Flat institutional style: white surfaces on a slate-tinted background (`#f8fafc`), a single blue primary (`#2563eb`), a gold secondary (`#d49900`) for academic accents, and very low shadows. Headings in Manrope, body in Inter. Emphasis comes from weight, spacing, and color tone rather than elevation or decoration. This system must work consistently across all page types below.

## Page Types

### Landing & Portal Choice (`src/app/page.tsx`, `src/features/portals/`)
- **Purpose**: introduce the system, route users into role portals
- **Density**: low; spacious hero with radial blue glow (`bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,var(--color-primary-soft),transparent)]`)
- **Primary action style**: large primary button cards (PortalChoiceCard, `hover:shadow-xl hover:shadow-primary/5 hover:ring-primary/20`)
- **Should emphasize**: brand, trust, clear role paths
- **Should avoid**: dense tables, admin chrome

### Auth & Onboarding (`src/app/(public)/`)
- **Purpose**: login, onboarding, portal entry, status
- **Density**: low; centered layout on `bg-[#f8fafc]`, `max-w-7xl` containers with `px-4 sm:px-6 lg:px-8`
- **Primary action style**: primary buttons
- **Should emphasize**: focus, minimal distraction
- **Should avoid**: navigation chrome

### Operational Dashboards (Secretary / Dean / Faculty)
- **Purpose**: day-to-day administration, CRUD, review
- **Density**: medium; stat grids `grid gap-4 md:grid-cols-2 xl:grid-cols-4`, cards `flex flex-col gap-6`
- **Primary action style**: primary button top-right of page header; destructive actions as secondary/outline buttons inside alert dialogs
- **Should emphasize**: data legibility, scanability, quick actions
- **Should avoid**: hero imagery, decorative gradients

### Respondent Flows (Student / Alumni / Industry Partner)
- **Purpose**: fill out evaluations and response forms
- **Density**: low; guided wizard (`src/features/responses/components/wizard-shell.tsx`), one step at a time
- **Primary action style**: prominent primary continue/submit button; progress feedback
- **Should emphasize**: progress clarity, mobile comfort, minimal cognitive load
- **Should avoid**: sidebars, admin actions

### Analytics (Faculty / Dean)
- **Purpose**: outcome metrics, charts, drill-down
- **Density**: medium-high; chart cards with Recharts via shadcn chart primitives
- **Primary action style**: contextual (filters, export, drill-down)
- **Should emphasize**: trends, comparisons, direct labeling
- **Should avoid**: decorative chart animation, color-only series distinction

### Legal Pages (`src/app/(legal)/`)
- **Purpose**: privacy policy, terms
- **Density**: low; `.legal-prose` styles, `max-w-3xl` text column
- **Primary action style**: none (informational)
- **Should emphasize**: readability
- **Should avoid**: anything beyond prose and minimal headers

### Empty / Error / Loading States
- **Empty**: icon-in-circle + `h3 text-lg font-medium` + `text-sm text-muted-foreground` + CTA button (see `course-assignments-table.tsx`)
- **Error**: `role="alert"` banners, `error-boundary.tsx`, route error files with return path
- **Loading**: route `loading.tsx` skeleton shells (`operational-route-loading.tsx`, `respondent-route-loading.tsx`) with `role="status" aria-busy`; `Skeleton` = `bg-muted animate-pulse rounded-md`

## Color System

### Core Roles

| Role | Token | Value |
| --- | --- | --- |
| Primary (brand, CTAs, active nav) | `--color-primary` | `#2563eb` |
| Primary hover / active | `--color-primary-hover` / `-active` | `#1d4ed8` / `#1e40af` |
| On primary | `--color-on-primary` | `#ffffff` |
| Primary soft / muted / border | — | `#eff6ff` / `#dbeafe` / `#bfdbfe` |
| Secondary (gold, academic accent) | `--color-secondary` | `#d49900` |
| Secondary hover / soft / on-secondary | — | `#b88200` / `#fff4d6` / `#2f2200` |
| Background (page) | `--color-background` | `#f8fafc` |
| Surface (cards, chrome) | `--color-surface` | `#ffffff` |
| Surface alt / muted | — | `#f1f5f9` / `#e2e8f0` |
| Border / border strong | — | `#e2e8f0` / `#cbd5e1` |
| Text primary / secondary / muted | — | `#0f172a` / `#334155` / `#64748b` |
| Success | `--color-success` | `#059669` (soft `#ecfdf5`) |
| Warning | `--color-warning` | `#d97706` (soft `#fffbeb`) |
| Danger | `--color-danger` | `#dc2626` (soft `#fef2f2`) |
| Info (interactive accent, rings) | `--color-info` | `#3b82f6` (soft `#eff6ff`) |
| Chart 1–5 | `--chart-1..5` | primary, secondary, success, info, warning |

All tokens are defined verbatim in `src/styles/tokens.css`; utility registration and shadcn semantic mapping (`--primary`, `--card`, `--ring`, `--sidebar-*`, etc.) live in `src/app/globals.css` (`@theme inline` + `:root`). Values change only in `tokens.css`.

### Color Usage Rules

- Use **primary** for primary CTAs, active navigation, links, and interactive accents.
- Use **gold secondary** sparingly for academic/status distinction (e.g. `--chart-2`, academic accents).
- Keep surfaces, borders, and most layout chrome **neutral**.
- Reserve **semantic colors** for status only; always pair with text/icon (badge, toast border, `*-soft` backgrounds).
- **Info** is the interactive accent: focus rings (`--ring`), hover accents, `accent` surfaces.
- Do not use semantic colors as dominant backgrounds; use `*-soft` tints instead.
- Chart/data visuals may use stronger color than layout chrome, but must keep ≥3:1 contrast vs background and pair with patterns/labels for series distinction.

## Typography

### Font Direction

- **Headings**: Manrope (600/700) via `next/font/google`, exposed as `font-heading`
- **Body**: Inter (400/500/600), exposed as `font-body` / `font-sans`
- **Numbers**: tabular figures where they must align (`tabular-nums` on `ProgressValue`, KPI counts)
- **Overall tone**: clear, professional, institutional

### Type Scale

| Style | Size / Line-height | Weight | Font | Utility |
| --- | --- | --- | --- | --- |
| Display lg | 3rem / 3.3rem | 700 | heading | `.text-display-lg` |
| Display md | 2.25rem / 2.7rem | 700 | heading | `.text-display-md` |
| Heading xl | 1.75rem / 2.25rem | 700 | heading | `.text-heading-xl` |
| Heading lg | 1.25rem / 1.625rem | 700 | heading | `.text-heading-lg` |
| Heading md | 1.125rem / 1.575rem | 600 | heading | `.text-heading-md` |
| Title lg / md / sm | 1.125 / 1 / 0.875rem | 600 | heading | `.text-title-*` |
| Body lg / md / sm | 1.125 / 1 / 0.875rem | 400 | body | `.text-body-*` |
| Label lg / md / sm | 0.875 / 0.8125 / 0.75rem | 600 | body | `.text-label-*` |
| Caption | 0.75rem / 1rem | 400 | body | `.text-caption` |

Base: body 1rem / line-height 1.6. Token utilities are defined in `globals.css` lines 250–353.

### Typography Rules

- Use token utility classes (`.text-heading-*`, `.text-body-*`, `.text-label-*`) instead of ad-hoc `text-2xl font-bold` — the scale above is the only sanctioned sizing.
- Page headers: `h1` page title + muted description; card titles `font-heading text-base font-medium`.
- Labels and metadata: `.text-label-sm` (600); eyebrows can use `text-label-sm font-semibold tracking-wider uppercase`.
- Body text: `text-text-secondary` for subtext, `text-text-muted` for captions/help.
- Long-form legal content uses `.legal-prose` (`text-base leading-relaxed text-text-secondary`).
- Never go below 0.75rem; body copy stays ≥0.875rem.

## Layout Principles

### Page Structure

- **App shell** (`src/components/layout/app-shell.tsx`): `Sidebar` (desktop) + main column → `Topbar` → `<main>` with `mx-auto w-full min-w-0 max-w-[1600px] p-4 pb-24 sm:p-6 lg:pb-8` (bottom padding clears mobile nav).
- **Max width**: `max-w-[1600px]` for operational pages; `max-w-7xl` for public/landing; `max-w-3xl` / `max-w-2xl` for forms and legal.
- **Grid**: Tailwind default; stat grids `grid gap-4 md:grid-cols-2 xl:grid-cols-4`; forms `flex flex-col gap-6`.
- **Spacing rhythm**: 4/8px increments; `gap-*` over `space-*`; page sections `gap-6`; card padding `p-4`/`py-4`.
- **Desktop**: sidebar `w-64` (dean: `w-16 md:flex lg:w-64`), topbar `h-16`, content `p-6`.
- **Mobile**: bottom nav `h-16` (`md:hidden`, `pb-safe`), content `p-4 pb-24`; dialogs become drawers below `md` (`use-media-query`).

### Spatial Rules

- Section spacing: `gap-6` / `space-y-6` between content blocks.
- Card padding: `py-4` default; inputs `h-8`.
- Alignment: left-aligned labels above fields; page header actions right-aligned.
- Density: medium for admin lists, low for wizard/respondent flows.
- Avoid: cramped touch targets, horizontal scroll on mobile, nested scroll regions.

## Surfaces, Borders, and Elevation

- **Radius scale**: 2 / 4 / 8 / 12 / 16 / 24px (`--radius-xs…2xl`); base `--radius: 0.5rem` (8px). Convention: `rounded-md` primitives, `rounded-lg` inputs/lists, `rounded-xl` cards/dialogs, `rounded-2xl` hero.
- **Border style**: 1px `border-border` (`#e2e8f0`); overlays use `ring-1 ring-foreground/10` instead of shadows (dropdown-menu, select, dialog).
- **Shadow style**: intentionally minimal — `--shadow-sm` `0 1px 2px rgba(0,0,0,0.05)` through `--shadow-xl`; `--shadow-modal: var(--shadow-lg)`; `shadow-sm` on profile/cards, `shadow-md/lg` on overlays.
- **Surface layering**: background → surface (cards) → surface-alt (secondary) → surface-muted (muted fills); elevation is flat, not stacked.
- **Hover elevation**: card hovers bump to `shadow-xl shadow-primary/5` + `ring-primary/20` (portal cards only); interactive rows use `hover:bg-muted`.
- **Modal/popover treatment**: `bg-popover` + `rounded-lg` + `shadow-md` + `ring-1 ring-foreground/10`; dialog overlay `bg-black/10 backdrop-blur-xs`; sheets `w-3/4 sm:max-w-sm`.

Guidance:

- Prefer border + spacing over shadows to separate elements.
- Use stronger elevation only for overlays (dialog, dropdown, tooltip) — never for content cards.
- Avoid decorative blur; `backdrop-blur` is reserved for overlays and the landing header.

## Component Styling

### Buttons (`src/components/ui/button.tsx`)

- **Variants**: `default` (`bg-primary text-primary-foreground`), `outline` (`border-border bg-background hover:bg-muted`), `secondary`, `ghost` (`hover:bg-muted`), `destructive` (`bg-destructive/10 text-destructive`), `link` (`text-primary underline`), `cta-success` (custom green).
- **Sizes**: `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`; icon-aware padding via `has-data-[icon=inline-end]`.
- **Behavior**: disabled during async (`loading` state with label swap or `Loader2 animate-spin`), press effect `active:translate-y-px`, `focus-visible:ring-3 ring-ring/50`.

### Inputs

- `Input` (`@base-ui/react/input`): `h-8 rounded-lg text-base md:text-sm`.
- `Textarea`: `field-sizing-content min-h-16`.
- `Checkbox`/`RadioGroup`/`Switch`/`Select`/`Tabs`: Base UI primitives, shadcn-style shells; `Select` and `Switch` triggers take `size: sm | default`.
- `Label`: visible label per field (never placeholder-only); `required` indicators; errors below the field.

### Navigation

- **Sidebar** (`sidebar.tsx`): `w-64`, header h-16 logo + "System CLOIE"; active link `bg-primary-soft text-primary`, inactive `text-text-secondary hover:bg-surface-hover`; badge count pill; user footer. Dean variant collapses to icon rail.
- **Topbar** (`topbar.tsx`): sticky `h-16 z-40 border-b bg-surface`, avatar `DropdownMenu` with logout.
- **Mobile**: bottom nav tab bar (`mobile-nav.tsx`, ≤5 items, icon + label) + custom drawer (`mobile-sidebar-drawer.tsx`).
- **Tabs**: `TabsList` variants `default` (pills) and `line` (underline indicator).
- **Links**: `navigation-link.tsx` wraps `next/link` with pending dot (`aria-live`).

### Cards

- `Card`: `rounded-xl ring-1 ring-foreground/10 py-4`; `size` via `data-size` (default | sm).
- KPI cards: `CardTitle` `font-heading text-base font-medium`, `CardDescription` `text-sm text-muted-foreground`, values `tabular-nums`.

### Tables and Lists

- `Table`: plain HTML, wrapped in `overflow-x-auto`; sticky-ish headers where needed; `has-aria-expanded` row state; sorting with `aria-sort`.
- Status: `Badge` (rounded-4xl, `text-xs`) with `default/secondary/destructive/outline/ghost/link` variants; KPI pills.
- Hover: `hover:bg-muted` rows; cursor-pointer on clickable rows.

### Data Visualization

- **Library**: Recharts 3 via shadcn chart primitives.
- **Colors**: `--chart-1..5` tokens (do not hardcode palettes — see Known Gaps).
- **Conventions**: legends visible, tooltips on hover/tap, `tabular-nums` values, gridlines low-contrast, `aria-label`/text summary describing key insight.

### Feedback and Status

- **Success / Warning / Error / Info**: semantic tokens + `*-soft` fills; toast borders colored per kind.
- **Loading**: skeletons for routes/panels, inline `Loader2 animate-spin` for buttons; spinner with label swap ("Processing...").
- **Toasts**: custom event system (`showToast(message, kind)` → `CustomEvent("cloie-toast")`), `ToastProvider` in root layout, bottom-right stack, auto-dismiss 4.5s, `?toast=` URL params consumed + cleaned. Do not add sonner or a second toast system.
- **Empty states**: icon-in-circle + title + description + CTA (`data-testid="empty-state"`).
- **Errors**: inline `role="alert"` banners; `AlertDialog` confirmation for destructive actions (with confirmation-code preflight in `secretary-programs-list.tsx`).

## Module-Specific Rules

| Module | Role | UI Emphasis | Notes for Agents |
| --- | --- | --- | --- |
| **Auth / Sessions** | login, onboarding, demo mode | centered public layout | Dev/demo auth uses `cloie_dev_auth` cookie + `@cloie.test` users; never surface demo auth in production UI |
| **Course Assignments** | roster & membership management | dense tables, badges, membership constraints | Follow `src/features/course-assignments/CONTEXT.md` invariants; use `course-assignments-page-shell.tsx` container |
| **Academic Structure** | programs, majors, school years | dialog + drawer (md switch), form shells | `manage-majors-dialog.tsx` pattern: Dialog desktop / Drawer mobile via `use-media-query` |
| **Responses** | respondent wizard flows | low density, single-column wizard | `wizard-shell.tsx` (heading in `font-heading`), progress indicators, mobile-first |
| **Analytics** | charts, KPIs, drill-down | chart cards, filters | Use `--chart-*` tokens; export/CSV where data-heavy |
| **Dean PWA** | offline cache contract | stable chrome, offline states | See `docs/adr/0006-dean-pwa-offline-cache-contract.md`; theme color `#0051C3` (see Known Gaps) |
| **Navigation** | per-role structure | role-filtered groups | Edit `src/lib/constants/navigation.ts`; don't add per-page nav schemes |

## Interaction Model

- **Tone**: responsive, quiet; hover → press → focus states via `transition-colors`, press `translate-y-px`.
- **Hover**: `hover:bg-muted` / `hover:bg-primary-hover`; color transitions only.
- **Focus**: visible `focus-visible:ring-3 ring-ring/50` (or `outline-ring/50`); never remove focus rings.
- **Motion**: 150–300ms micro-interactions; `tw-animate-css` utilities (`animate-in fade-in zoom-in-95 slide-in-from-*`, `duration-100`–`300`) driven by Base UI `data-open`/`data-closed` variants.
- **Philosophy**: motion conveys meaning (enter/exit of overlays) — no decorative animation loops; `motion-safe:` / `motion-reduce:` respected.
- **Error recovery**: inline error + retry/recovery path; `AlertDialog` before destructive; toasts auto-dismiss.

## Responsive Behavior

- **Breakpoints**: Tailwind defaults (`sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280); mobile-first.
- **Desktop (≥lg)**: sidebar + topbar + max-w-[1600px] content; tables and charts full width; charts up to full density.
- **Tablet (md–lg)**: dean sidebar collapses to icon rail (`md:pl-16`); card grids 2 columns; dialogs still usable.
- **Mobile (<md)**: sidebar → bottom nav; dialogs → `Drawer`; tables scroll horizontally within containers; forms single column with ≥44px targets; content `p-4 pb-24` so bottom nav never obscures content; `pb-safe` for gesture bars.

## Accessibility Expectations

- **Contrast**: token palette is AA-safe by construction (slate-based text on white/f8fafc); verify new pairings against 4.5:1.
- **Never color-only status**: pair semantic color with text/icon (badges, toasts, alerts).
- **Focus**: keep visible focus rings across all interactive elements.
- **Overlays**: readable (scrim `bg-black/10` + blur) and dismissible (close button, Escape, backdrop).
- **Motion**: `prefers-reduced-motion` honored via `motion-safe`/`motion-reduce`; tw-animate-css guards.
- **Tap targets**: ≥44px on mobile; icon buttons get padded hit areas.
- **Screen readers**: `role="status" aria-busy` loaders, `aria-live` pending indicators, `role="alert"` errors, descriptive labels.

## Content and Copy Tone

- **Voice**: professional, institutional, direct — Assumption College of Davao academic context.
- **CTA style**: imperative, role-specific ("Continue", "Save Changes", "Submit Evaluation", "Run Rollover").
- **Empty-state tone**: helpful + actionable ("No data yet" + what to do next).
- **Error-message tone**: cause + fix, not just "Invalid input".
- **Data-label tone**: plain, unambiguous (semester, section, outcomes, KPIs).
- **Guidance**: helper text below complex inputs; progressive disclosure in wizards.

## Allowed Patterns

- Semantic token classes (`text-text-secondary`, `bg-primary`, `border-border`) over raw hex.
- shadcn semantic classes (`text-muted-foreground`, `bg-muted`, `ring-ring`) — they map to the same values.
- `cva` variants + `cn()` (clsx + tailwind-merge); `@/*` aliases.
- `@base-ui/react` primitives with `render` prop (never Radix); `data-slot` attributes.
- lucide-react icons only; one stroke style; consistent 16–24px sizes.
- Token typography utilities (`.text-heading-*` etc.) over ad-hoc Tailwind sizing.
- Route `loading.tsx` skeleton shells and `Skeleton` for async content.
- `showToast` for transient feedback; `AlertDialog` for destructive confirmation.
- Dialog desktop → Drawer mobile switch below `md`.
- Empty-state pattern (icon + title + description + CTA).
- `gap-*` spacing; `size-*` shorthand; `motion-safe:` animation guards.

## Forbidden Patterns

- Raw hex colors in components (flagged violations: `cta-success` `bg-[#22C55E]`, `themeColor #0051C3`, hardcoded chart palette in `mean-bar-chart.tsx` — see Known Gaps).
- Radix UI packages; any new icon library; emoji as icons.
- Second toast/feedback system (sonner, etc.) while `toast.tsx` exists.
- Ad-hoc type sizing (`text-2xl font-bold`) where a token utility exists.
- Manual `dark:` overrides — dark-mode tokens are not defined yet (see Known Gaps); don't improvise a theme.
- New per-page navigation structures; edit `src/lib/constants/navigation.ts` instead.
- Animating width/height/top/left; decorative animation; blocking input during animation.
- Placeholder-only labels, errors only at top of form, hover-only interactions.
- `space-*` where `gap-*` works; arbitrary z-index values on overlays.

## Known Gaps (Do Not Propagate)

- **Dark mode**: `@custom-variant dark` declared, no dark token overrides exist; no theme toggle. Treat as unimplemented.
- **`text-display-sm`**: used in `portal-shell.tsx` / `legal-page-header.tsx` but not defined in the scale — add it to `globals.css` or migrate those usages.
- **Theme color mismatch**: `manifest.ts` / `layout.tsx` use `#0051C3`; primary token is `#2563eb`. Reconcile to one brand blue.
- **`bg-surface-hover`**: referenced by `sidebar.tsx` but not defined in `tokens.css`.
- **`CardAction`**: defined in `card.tsx` but not exported.
- **`docs/design-system.txt`**: missing; this document supersedes it as the design reference.
- **`cta-success` button variant**: hardcoded hex bypassing tokens.

## Agent Guidance

When generating or modifying UI for this product:

- Start with the correct page type before choosing patterns.
- Preserve one unified design language across all modules.
- Read values from `src/styles/tokens.css`; never invent colors, radii, or shadows.
- Reuse card shells, spacing rhythm, borders, and toolbar patterns before introducing new structures.
- Respect module-specific rules before applying generic dashboard or app patterns.
- Prefer user comprehension and workflow continuity over decorative complexity.
- Avoid introducing a second visual language without explicit approval.

## Design Review Checklist

Before considering a UI change complete, verify:

- Does it match the product intent?
- Does it follow the experience principles?
- Does it fit the correct page type?
- Does it reuse the existing visual language (tokens, components)?
- Does it respect module-specific rules?
- Does it avoid forbidden patterns?
- Does it stay usable on desktop and mobile?
- Does it maintain accessible contrast and focus states?
- Does it avoid unnecessary visual complexity?
- Would a new teammate recognize it as part of the same product?

## Quick Prompt Snippet

"Build this in the style described in `docs/design.md`. Follow the product intent, experience principles, page-type rules, module-specific constraints, color roles (values in `src/styles/tokens.css`), typography scale, spacing rhythm, and component styling exactly. Reuse existing patterns, avoid forbidden patterns, and preserve one unified visual language."

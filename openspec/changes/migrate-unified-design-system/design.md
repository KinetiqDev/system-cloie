## Context

`docs/design.md` is the approved visual and interaction contract. It defines one semantic implementation with Light, Dark, and System appearance modes, but the repository has only light values in `src/styles/tokens.css` and no provider, persistence, or first-paint resolver. `src/app/globals.css` already has `@custom-variant dark (&:is(.dark *))`, so a root `.dark` class can activate the existing Base UI semantic-opacity overrides once token values exist. Dark/System resolution is not safe to expose to an incompletely migrated primary Production surface, so rollout availability is a separate server-owned decision from a visitor's stored preference.

The audit verified the following implementation gaps:

- `src/styles/tokens.css` contains the legacy gold secondary family and references nonexistent `docs/design-system.txt`; it has no dark block or `--color-surface-hover` despite `src/components/layout/sidebar.tsx` and `mobile-sidebar-drawer.tsx` using `bg-surface-hover`.
- `src/app/globals.css` maps `accent`, `ring`, sidebar accent/ring, and information to the same legacy blue family. `--chart-2` resolves to legacy gold; the text-on-dark mapping is self-referential.
- `src/components/ui/button.tsx` has a hardcoded green `cta-success` variant, while the approved `brand-accent` variant does not exist. `src/components/ui/toast.tsx` hardcodes light palette classes and has no information kind. `CardAction` is not exported from `src/components/ui/card.tsx`.
- Five analytics components use raw arrays of 5 to 12 chart colors and no shared shadcn chart wrapper. The existing word cloud is the only non-Recharts visualization and also uses a raw palette.
- `src/app/(public)/layout.tsx`, `src/app/global-error.tsx`, `src/app/layout.tsx`, and `src/app/manifest.ts` retain raw legacy values. Feature code has at least 85 direct Tailwind palette matches across status badges, alerts, controls, and tables.
- `src/components/ui/` already supplies Base UI primitives for alert dialog, alert, badge, button, card, checkbox, dialog, drawer, dropdown menu, input, label, progress, radio group, select, separator, sheet, skeleton, switch, table, tabs, textarea, toast, and tooltip. The approved registry also provides compatible `chart`, `empty`, `field`, `popover`, and `spinner` primitives that fill genuine gaps. There is no existing showcase route.

The relevant contexts are Identity and Access, Academic Calendar, Academic Structure, and Course Catalog and Assignments. The design does not alter their vocabulary, authorization, lifecycle, ownership, or role-owned-route rules. ADR `0001-single-role-accounts.md` preserves one active account role. ADR `0006-dean-pwa-offline-cache-contract.md` keeps real offline detection, service workers, offline cache, and mutation handling out of scope. ADR `0008-dedicated-demo-deployment-authentication.md` requires development/demo tooling to fail closed in primary Production.

## Goals / Non-Goals

**Goals:**

- Establish `docs/design.md` as the implemented token, component, appearance, and responsive behavior contract.
- Make all themes resolve from semantic tokens without component-local Light/Dark palettes or changed content hierarchy.
- Preserve Server Components by isolating browser-only appearance and interactive showcase behavior in narrow Client Components.
- Normalize shared controls, feedback, chart presentation, navigation, and common status treatment before migrating feature pages.
- Provide a protected Design System Showcase that uses the real token and component layer as a repeatable light/dark, responsive, interaction, and accessibility surface.
- Replace raw visual values incrementally by domain and page pattern, with each slice keeping product behavior and authorization unchanged.

**Non-Goals:**

- Changing domain workflows, SystemRole authorization, account state, role-owned URLs, database data, or product navigation priority.
- Account-synced or database-persisted appearance preferences, Prisma schema changes, SQL migrations, generated Supabase type changes, or new API endpoints.
- A service worker, live offline detection, offline mutations, cached application data, or a network simulation feature. The showcase may render a static offline reference pattern only.
- Radix UI, another icon library, another chart library, another toast system, `next-themes`, TanStack Query, a component-authoring platform, or indiscriminate shadcn installation.
- A repository-wide automated replacement of color class names, wholesale generated-component overwrite, or a public documentation route.
- Declaring Dark or System available in primary Production until all affected shared and feature surfaces pass the completion gate.

## Decisions

### 1. Resolve one semantic token contract at the root

`src/styles/tokens.css` remains the sole owner of numerical values. It will define approved Light values in `:root` and their Dark counterparts in `.dark`; non-color foundation tokens remain theme invariant unless the approved design calls for adaptation. The source comment changes from `docs/design-system.txt` to `docs/design.md`.

The token taxonomy is deliberately three-layered:

| Layer | Examples | Consumer rule |
| --- | --- | --- |
| Brand reference | institutional navy, operational primary, ACD cyan | used only through a named semantic role; navy remains formal/report framing and cyan remains specialized accent |
| Semantic UI | background, card, input, popover, surface hover, border, foreground, muted, selected, link, ring, overlay, sidebar | all shared and feature components consume these roles, never a theme value |
| Status and visualization | success/warning/danger/information main, soft, border, foreground; chart 1-5; chart grid/tooltip/label support | status has text/icon support; charts are categorical and distinguish repeated colors by marker, line, or pattern |

`src/app/globals.css` maps that vocabulary into Tailwind and shadcn semantics. It will decouple neutral `accent`, dedicated `ring`, indigo `information`, neutral `secondary`, ACD `brand-accent`, and categorical `chart-*`; add the missing hover/input/popover/selection/overlay mappings; and map `sidebar-*` to navigation roles. A small named layer scale is added to the foundation only for existing shared sticky, overlay, and toast layers so shared components do not introduce arbitrary z-index values.

`src/app/manifest.ts` and `src/app/layout.tsx` will replace `#0051C3` with the approved metadata strategy. They will use the approved operational primary where a fixed browser chrome color is required; media-specific viewport metadata is only used if it remains consistent with explicit appearance changes.

This keeps existing semantic classes functional during migration, but shared primitives converge on canonical shadcn roles such as `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, and `ring-ring`. Feature migration maps each raw color to its meaning rather than mechanically replacing hue names.

**Alternative rejected:** per-component `dark:` raw palettes. They would duplicate Light/Dark values, make semantic parity untestable, and violate `docs/design.md`.

### 2. Use a lightweight first-paint appearance provider with browser-local persistence

The project will not add `next-themes`: it has no current dependency, the root `.dark` selector already exists, and the required behavior is small and local. The implementation creates:

- `src/features/design-system/lib/appearance.ts` for the serializable `"light" | "dark" | "system"` vocabulary, storage key, resolution rules, and safe parsing; and `src/features/design-system/services/resolve-appearance-availability.ts` for the server-owned rollout decision.
- `src/features/design-system/components/appearance-bootstrap-script.tsx` for an inline root bootstrap script that reads the persisted preference before React hydration, resolves System with `matchMedia`, applies/removes the root `.dark` class, sets the resolved color scheme, and safely falls back to System when storage is unavailable or malformed.
- `src/features/design-system/components/appearance-provider.tsx` as the narrow Client Component that keeps the root class synchronized after hydration, listens for OS changes only while the saved preference is System, and exposes the preference to controls without wrapping data reads or making route content client-owned.
- `src/features/design-system/components/appearance-selector.tsx` as an accessible client control with visible Light, Dark, and System labels and radio semantics.

`src/app/layout.tsx` remains a Server Component. It passes a server-resolved `appearanceEnabled` value to the bootstrap script and client provider, then renders the provider inside `<body>` around its already-server-rendered children and the existing `ToastProvider`. This is compatible with the existing `suppressHydrationWarning` on `<html>` and with Next App Router's Server Component interleaving. The provider performs no data fetch and does not own authorization, route, form, filter, scroll, or async state.

Preferences persist in browser storage, not in a user profile. This meets the approved persistence requirement without adding account data, a Server Action, database migration, or cross-device privacy surface. Where appearance is enabled, a first use without a valid value defaults to System and an explicit Light or Dark takes precedence over the OS. Where it is unavailable, the bootstrap and provider force the approved Light root tokens, ignore persisted preferences, and do not write storage. The control updates only root attributes/classes, so enabled theme changes preserve current UI state.

`src/components/layout/topbar.tsx` hosts the compact labeled selector in the existing avatar menu. `src/app/(app)/settings/appearance/page.tsx` supplies the durable full Appearance settings surface reached from that menu, rather than duplicating the form in each role profile. The shared authenticated `(app)` guard admits complete or deferred-enrollment active accounts under their one active account role; it does not create a role switch or change account state. When appearance is unavailable, the menu omits the control and Settings Appearance returns not-found rather than rendering a disabled cosmetic preference.

`resolveAppearanceAvailability` returns enabled for development and a valid dedicated demo deployment. It returns enabled for primary Production only when the new server-only `CLOIE_APPEARANCE_ENABLED` release setting is exactly `"true"`; before the final parity gate that value remains unset in primary Production. The setting is listed in `.env.example` as a release control, never exposed through `NEXT_PUBLIC_*`, and does not affect the separately protected showcase route. The final activation slice changes deployment configuration only after the visual matrix is complete.

Before implementation, the appearance slice verifies the effective production Content Security Policy. It uses Next's root `beforeInteractive` script mechanism only when the policy permits it. If `script-src` blocks the bootstrap, the slice MUST implement a nonce flow through the existing `src/proxy.ts` and root layout according to the version-matched Next CSP guidance, or keep appearance unavailable; it cannot ship a post-hydration fallback. This validation is a blocking acceptance condition, not an open implementation detail.

**Alternative rejected:** reading a theme cookie in the root layout. It would make the global root request-dependent solely for a cosmetic browser setting and is unnecessary when the bootstrap script can resolve before first paint. **Alternative rejected:** applying System immediately in primary Production before page migration; the release setting keeps primary Production Light-only until the migration completion gate verifies all target surfaces.

### 3. Retokenize and extend the real shared component layer before feature pages

The component inventory is based on `src/components/ui/`, the approved registry, and audited use rather than every shadcn item. Existing Base UI source remains the single primitive layer. New source primitives are added with the project-aware shadcn CLI and reviewed before use:

| Category | Existing production source | Change |
| --- | --- | --- |
| Actions | `button.tsx` | retain default, neutral secondary, outline, ghost, destructive, link, and current icon sizes; add specialized `brand-accent`; retain the deprecated `cta-success` only until its sole template-builder caller is migrated in the Instruments slice, then remove both together |
| Status and feedback | `badge.tsx`, `alert.tsx`, `toast.tsx` | add semantic success, warning, danger, information, neutral, and categorical accent treatments; retain one root `showToast`/`ToastProvider` event contract and add information rather than Sonner |
| Forms | input, textarea, select, checkbox, radio group, switch, label | retokenize existing controls; add shadcn Base UI `field.tsx` for visible-label, helper, error, disabled, and validation composition; keep `customZodResolver` |
| Data and loading | card, table, tabs, progress, skeleton | export `CardAction`; add `empty.tsx` and `spinner.tsx`; compose the shared Spinner with disabled Button loading affordance and preserved label/width; introduce a reusable KPI/card composition only if audit-confirmed duplicate anatomy cannot be handled with the canonical Card composition |
| Overlays and information | dialog, drawer, sheet, alert dialog, dropdown menu, tooltip | retokenize surfaces, borders, focus, and scrim; add missing `popover.tsx`; preserve Base UI title/focus-trap behavior and Dialog-to-Drawer responsive substitution |
| Visualization | Recharts feature components | add shadcn-compatible `chart.tsx` using existing Recharts; no chart library change |

`src/components/ui/button.tsx`, `badge.tsx`, `alert.tsx`, `card.tsx`, `toast.tsx`, form controls, overlay components, `table.tsx`, `tabs.tsx`, `progress.tsx`, `skeleton.tsx`, and `tooltip.tsx` receive semantic retokening only. Existing `dark:` selectors may remain where they adjust semantic opacity or Base UI state, but raw theme colors do not. `CardAction` is exported or removed based on actual consumer use; it is not left dead. The deprecated `cta-success` branch is a temporary compatibility exception: the foundation slice retokenizes it through the semantic success family, while the Instruments slice removes it only with `src/features/instruments/components/template-builder.tsx`, preventing an intermediate type failure.

Button loading is composed with the new Spinner, disabled semantic behavior, and a preserved label/width. Empty, loading, error, success, selected, focus, hover, pressed, and disabled appearances are defined for the applicable primitive rather than added as page-local classes. `text-display-sm` usages move to the approved type scale rather than inventing an unapproved display size. All text below the approved `0.75rem` minimum is assessed in its domain slice, with navigation labels and table metadata receiving legible token utilities.

**Alternative rejected:** a custom `StatusBadge` abstraction before status meanings are normalized. Extending the existing Badge and Alert variants solves the verified duplicate palette helpers without creating a second component layer. **Alternative rejected:** adding every registry component; components without an audited or approved design-system use case remain absent.

### 4. Make chart presentation theme-resolved and accessible

`src/components/ui/chart.tsx` becomes the one shared Recharts integration. It consumes `--chart-1` through `--chart-5` and supporting grid, tooltip, marker, and label tokens. Feature charts move from raw `COLORS` arrays to named chart configuration. The wrapper handles semantic tooltip/card surfaces, legend presentation, and responsive container behavior; domain components retain their aggregation, title, and empty/error copy.

The target set is `src/features/analytics/components/course-mean-pie-chart.tsx`, `faculty-cilo-analytics-chart.tsx`, `mean-bar-chart.tsx`, `stakeholder-mean-pie-chart.tsx`, and `qualitative-word-cloud.tsx`, plus their current dynamic loading fallback. Before those visual conversions, `get-faculty-analytics-data.ts`, `faculty-analytics-dashboard.tsx`, `faculty-qualitative-cloud.tsx`, `types.ts`, and `src/lib/actions/faculty-analytics-actions.ts` must stop serializing raw `qualitativeTexts` through the Client Component/Server Action boundary. The server computes only word-frequency tokens, response counts, and concise summary data; detailed response-review routes retain their independently authorized raw-text behavior and are not repurposed as chart DTOs. Recharts remains the only quantitative chart library. The existing word-cloud dependency is not expanded; its colors resolve from the same five CSS chart tokens and its visual result is paired with a text frequency summary.

The approved palette has five categorical colors, whereas current pie/word-cloud data can exceed five categories. Repeated colors must receive deterministic marker, line, or SVG pattern distinction and direct labels/legend text, never an expanded raw palette. Each chart exposes a concise textual insight and a tabular accessible alternative or summary. Server Components continue to prepare and authorize aggregate data; only Recharts/word-cloud rendering remains client-side.

**Alternative rejected:** retaining 12-color arrays because they improve visual differentiation. They violate the approved five-role palette, cannot adapt to Dark, and rely on color as the only distinction. **Alternative rejected:** replacing the word cloud or Recharts with a new visualization library.

### 5. Add an authenticated, environment-gated Design System Showcase

The showcase lives at `src/app/(app)/design-system/`, not under `(public)`. The parent `(app)` layout already provides server session resolution, `SessionGuard`, `AppShell`, and current-role navigation without creating a second shell. The route is intentionally URL-only; it does not enter role-primary navigation or production-facing public documentation.

Access is a server-side policy in `src/features/design-system/services/resolve-showcase-access.ts`:

| Environment | Route behavior |
| --- | --- |
| `NODE_ENV === "development"` | available to an authenticated account that passes the existing parent account-state guard |
| isolated dedicated demo deployment | available only when `getDemoAuthConfig()` returns a valid configuration |
| primary Production or malformed demo configuration | `notFound()` before showcase content is rendered |

The policy introduces no public environment flag and does not trust a client role. It leverages ADR 0008's existing fail-closed dedicated-demo identity checks. It accepts every authenticated active role because the route is static design reference content, but it neither changes that role nor exposes a role-owned domain operation. An ADR, `docs/adr/0009-protected-design-system-showcase.md`, records this environment/access boundary.

The route is organized under a new `src/features/design-system/` module and documented in `CONTEXT-MAP.md` and `src/features/design-system/CONTEXT.md`:

```text
src/app/(app)/design-system/
  layout.tsx                 # Server access boundary
  page.tsx                   # Server route composition
  loading.tsx                # existing structural loading composition
src/features/design-system/
  CONTEXT.md
  services/resolve-showcase-access.ts
  data/showcase-fixtures.ts  # typed, serializable, mutation-free data
  components/
    design-system-showcase-page.tsx
    showcase-section.tsx
    token-reference.tsx
    component-state-matrix.tsx
    showcase-section-registry.ts
    form-controls-showcase.tsx
    overlay-and-feedback-showcase.tsx
    chart-showcase.tsx
    navigation-showcase.tsx
    responsive-showcase.tsx
    appearance-provider.tsx
    appearance-bootstrap-script.tsx
    appearance-selector.tsx
```

The route page and static reference sections are Server Components. `showcase-section-registry.ts` is the single ordered composition seam: the scaffold establishes foundation entries; later dependency-ordered slices append their own feedback and chart entries without reopening the route page. Only these islands are client components: appearance selection, controlled form validation, overlay/dropdown/popover/tooltip triggers, toast trigger, sortable/selected table examples, interactive navigation/drawer preview, and Recharts/word-cloud rendering. Every client boundary is justified by event handlers, browser APIs, local interaction state, react-hook-form, or chart runtime. Fixture data is static and serializable; no Prisma read, Server Action, mutation, user data, or persistent cache is involved.

The information architecture is a table of contents plus sections for foundations; actions; controls and validation; cards/KPIs/tables/lists/tabs/badges/progress; feedback/loading/empty/error/offline-reference; overlays; visualization; role-aware navigation; responsive behavior; and appearance parity. It renders actual `src/components/ui/`, actual `src/components/layout/` presentation seams, central `src/lib/constants/navigation.ts` declarations, and approved chart wrappers. A small reusable navigation-list presentation seam will be extracted from existing layouts only if needed to render the same desktop sidebar, Dean tablet rail, admin drawer, and respondent bottom-navigation anatomy rather than a showcase-only imitation.

The Showcase includes default, hover, focus, pressed, selected, disabled, loading, error, and success examples where meaningful. It has labeled Light/Dark/System controls, desktop/tablet/mobile responsive views, keyboard/focus notes, accessible names, status text plus icon/shape, chart legend/tooltips/markers/summary, route skeletons from the actual loading components, and a clearly labeled static offline reference. The offline card demonstrates tokens and recovery copy only; it does not read `navigator.onLine` or imply offline functionality.

### 6. Migrate by semantic meaning and role-aware vertical slice, not global replacement

The token/provider foundation can be developed early and exercised on the protected showcase, but primary Production appearance selection is not enabled until all target shared and feature migrations pass. Each migration slice starts with a raw-value inventory for its owned paths, maps status/category meaning to an approved role, updates light and dark evidence, and removes only values whose meaning it has verified.

Migration order:

1. Foundations, metadata, root bootstrap/provider, public shell, and shared primitive retokening. The global error surface remains owned by the later legal/error slice.
2. Protected showcase scaffold and foundational/state sections, enabling immediate Light/Dark/System inspection in development and dedicated demo.
3. Shared chart wrapper and analytics/word-cloud conversion, including accessible alternatives and existing visualization fallbacks.
4. Role navigation shells, profile/settings entry points, and common status/feedback patterns.
5. Secretary user management; Academic Calendar; Academic Structure; Course Assignments and enrollment management as separate domain slices.
6. Instruments; evaluation deployment; outcomes; Faculty roster tools; and Program Head/Faculty authoring surfaces as separate domain slices.
7. Portal/public/onboarding; respondent response flow; respondent profile/history; and legal/error pages as separate page-family slices.
8. Completion audit, production appearance activation, documentation cleanup, and showcase inventory update.

This ordering avoids exposing a half-dark product, prioritizes shared components that affect every route, and leaves domain-specific logic in its existing feature module. The raw palette grep becomes a decreasing audit metric, not a blind replacement command. Existing semantic `dark:` opacity selectors and official logo pixels are reviewed as exceptions rather than automatically removed.

### 7. Verify the contract through the showcase and focused production surfaces

The showcase is the live reference and manual visual-regression surface. It is not a new visual-testing dependency. Until the repository's Playwright target is configured, verification uses focused Vitest/Testing Library tests, Chrome DevTools screenshots and accessibility tree checks, Lighthouse accessibility checks, and documented viewport/theme matrices.

Required matrix: Light, Dark, and System at 375px, 768px, 1024px, and 1440px; keyboard-only focus/activation; reduced motion; default/hover/pressed/disabled/error/loading/empty states; and chart series with more than five categories. Overlay tests verify title, focus trap, Escape, and focus restoration. Appearance tests cover invalid storage, OS change while System is selected, explicit override precedence, class resolution before hydration, persistence, and state preservation. Showcase route tests cover development availability, valid dedicated demo availability, primary Production not-found, and absence of fixture data mutations.

Before dedicated-demo browser traces, run `pnpm verify:production-auth-boundary`, `pnpm verify:dedicated-demo-auth-boundary`, and `pnpm verify:demo-target-isolation` against the appropriate configured targets. All slices finish with focused tests, `pnpm lint`, `pnpm test`, and `pnpm build`.

## Risks / Trade-offs

- [A root first-paint script and hydrated provider disagree] → Centralize parsing/resolution in one pure module, pass the same server availability decision into both, retain `suppressHydrationWarning` only on the root element, and test no-flash/class parity in browser evidence.
- [Primary Production enables Dark/System before migration parity] → Force Light and ignore storage unless the server-only `CLOIE_APPEARANCE_ENABLED` release setting is true; keep it unset until the final acceptance gate and test an OS-Dark primary-Production request explicitly.
- [A restrictive Content Security Policy blocks the bootstrap] → Make deployment-CSP verification a blocker; use nonce propagation through `src/proxy.ts` and the root layout when needed, otherwise do not enable appearance.
- [A color-hue replacement changes a domain status meaning] → Migrate by reviewed semantic intent, preserve text/icon labels, and keep raw-value audit scope per feature rather than applying a global codemod.
- [Five chart colors are insufficient for current category cardinality] → Use deterministic patterns/markers and direct labels in addition to the approved chart roles; provide a text alternative rather than extending the palette.
- [Chart migration preserves existing raw qualitative text in browser payloads] → First replace Faculty analytics Client Component/Server Action DTOs with server-computed aggregate counts and word-frequency tokens; test that chart DTOs exclude raw text, response rows, identifiers, and emails.
- [A protected showcase accidentally becomes public] → Enforce the route decision on the server with `getDemoAuthConfig()` and `notFound()`, never `NEXT_PUBLIC_*`; add direct-route tests and ADR 0009.
- [The showcase duplicates production UI] → Use the real tokens, `src/components/ui`, central navigation declarations, and reusable layout seams. Refactor presentation only when the same seam can replace existing layout duplication.
- [Accessibility state examples become static decoration] → Each interactive example uses the real component and is exercised by keyboard/focus tests; simulated state swatches are labeled as reference evidence, not a replacement for behavior.
- [Offline showcase examples are mistaken for an offline feature] → Label them reference-only and keep `navigator.onLine`, service workers, caching, and mutation guards out of this change per ADR 0006.

## Migration Plan

1. Record ADR 0009, create the design-system context/module, and establish the baseline raw-palette/component/state inventory without changing production appearance availability.
2. Resolve the deployment Content Security Policy and implement the matching first-paint bootstrap mechanism. Implement tokens, Tailwind/shadcn mappings, metadata values, bootstrap/provider infrastructure, and retokenized shared primitives. Keep primary Production Light-only by leaving `CLOIE_APPEARANCE_ENABLED` unset; verify Dark only through the protected development/dedicated-demo surface.
3. Add the protected showcase scaffold and static data, then layer interactive client islands as the corresponding shared primitives become available.
4. Replace raw qualitative text in Faculty analytics client DTOs with server-computed aggregates, then convert charts and navigation/feedback shared patterns. Migrate each listed domain slice with localized tests and visual evidence. Maintain existing server authorization, data reads, mutations, and URLs.
5. Complete the raw palette and type-scale audit, remove resolved entries from `docs/design.md` section 15, and update the showcase inventory to reflect shipped components rather than planned ones.
6. Enable the appearance control/default in primary Production only after the complete Light/Dark/System acceptance matrix passes. Roll back a deployment by removing the exposed selector/default while retaining safe Light token values; individual domain regressions roll back by reverting only that domain's semantic migration.
7. Run the complete quality gate and protected deployment-boundary checks. No database rollback or cache invalidation is required because this change stores no persistent application data.

## Open Questions

- Which existing KPI anatomy appears in enough independent modules to justify a shared KPI Card rather than documented Card composition? Confirm with a focused duplicate-structure audit before adding the component.
- Should the currently unused `sheet.tsx`, `tooltip.tsx`, and `radio-group.tsx` remain supported inventory entries after showcase coverage, or should a later maintenance change remove unused source? This change does not delete them without a product-use decision.

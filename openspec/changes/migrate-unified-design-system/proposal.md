## Why

System CLOIE has an approved unified Light, Dark, and System design contract in `docs/design.md`, but its implementation is light-only and its semantic token layer still contains legacy gold, coupled interaction roles, an undefined hover surface token, and component-specific visual values. The gap is observable in shared controls, charts, toast feedback, navigation, public/error shells, and raw palette usage, so a theme toggle alone would produce inconsistent and inaccessible dark-mode behavior.

This change establishes the approved design system as the implementation contract and adds a protected visual reference surface before incremental page migration spreads further divergence.

## What Changes

- Replace legacy and light-only foundations in `src/styles/tokens.css` with the approved semantic Light and Dark token values, including surfaces, text, interaction, status, visualization, elevation, and metadata color roles.
- Add a persisted Light, Dark, and System appearance preference that resolves before first paint, keeps all themes structurally identical, and exposes labeled controls through the avatar menu and Settings Appearance. The server-owned `CLOIE_APPEARANCE_ENABLED` release setting gates primary Production rollout until the cross-surface acceptance gate passes.
- Retokenize existing shared UI primitives, navigation shells, toast feedback, error/public shells, and status treatments; remove raw theme-specific colors and the hardcoded `cta-success` button treatment.
- Retokenize and verify `src/components/ui/field.tsx` and `src/components/ui/empty.tsx`, which already exist on `main`. Add only the shared primitives justified by the approved inventory and current gaps: a spinner, and a Recharts chart wrapper. Continue using Base UI, Lucide, the root toast system, and Recharts.
- Create a read-only Design System Showcase under the authenticated app shell. It is available only in development and the isolated dedicated demo deployment, fails closed in primary Production, uses typed static fixture data without database mutations, and becomes the visual-regression and accessibility reference for the implementation.
- Migrate existing pages in representative, role-aware vertical slices after the shared foundation has proved token parity, instead of using a risky repository-wide palette replacement.

## Capabilities

### New Capabilities
- `unified-appearance`: resolves, persists, and applies Light, Dark, and System appearance preferences without changing user state, route state, or authorization behavior.
- `semantic-ui-foundations`: provides approved theme-resolved design tokens, typography utilities, component variants, status roles, feedback roles, and visualization roles for all shared UI.
- `design-system-showcase`: provides a protected interactive reference route that renders production tokens and shared components with static representative data across theme, state, responsive, and accessibility coverage.
- `accessible-data-visualization`: provides shared theme-resolved Recharts presentation and accessible chart summaries for System CLOIE analytics surfaces.

### Modified Capabilities
- None. Existing OpenSpec specifications do not define the currently implemented visual component behavior.

## Impact

- **Classification:** cross-cutting feature and refactor work; the appearance preference and protected showcase route are new behavior, while token and component migration preserves product workflows and authorization behavior.
- **Affected application areas:** `src/styles/tokens.css`, `src/app/globals.css`, root/public/error layouts, `src/components/ui`, `src/components/layout`, `src/lib/constants/navigation.ts`, analytics components, and feature pages with raw palettes or ad hoc status patterns. The new implementation domain is `src/features/design-system/` and the new route is `src/app/(app)/design-system/`.
- **Affected contexts:** Identity and Access governs authenticated showcase access and the single active account role; Academic Calendar, Academic Structure, and Course Catalog and Assignments remain visual migration targets without changing their domain rules. ADR `0001-single-role-accounts.md`, ADR `0005-outcome-ownership-and-dean-oversight.md`, ADR `0006-dean-pwa-offline-cache-contract.md`, ADR `0008-dedicated-demo-deployment-authentication.md`, ADR `0009-program-head-selected-program-context.md`, and ADR `0010-unified-appearance-and-protected-showcase.md` remain binding.
- **Behavioral invariants:** all SystemRole authorization, account-state gates, role-owned routes, server-side data reads, domain mutation behavior, navigation information hierarchy, responsive substitutions, and normal product content remain unchanged across themes. Appearance changes must not reset route, form, filter, scroll, or async state.
- **Preserved baselines:** the current streamed `AuthenticatedAppShell` under `Suspense` in `src/app/(app)/layout.tsx`, the current `getDeepestMatchingNavItem` selection and Program Head path construction in `src/lib/constants/navigation.ts`, the canonical Program Head selected-Program routes under `src/app/(app)/program-head/programs/[programId]/...`, and the `PortalShell` card-count grid behavior from `bc07fd9` all remain as-is. Navigation deepest-match, pending, `aria-current`, focus containment, and responsive defect behaviors are owned by the concurrent `improve-navigation-rendering-and-caching` change.
- **Analytics DTO privacy:** this change does not implement the Faculty analytics qualitative-text removal. That privacy narrowing is a prerequisite supplied by `improve-navigation-rendering-and-caching` task 4.5. The chart migration slice in this change consumes that completed privacy contract before rendering any visualization.
- **Authorization, privacy, caching, and deployment:** no Prisma schema change, SQL migration, generated Supabase type edit, or persistent application data cache is proposed. The showcase is server-authorized, contains no institutional data, and is environment-gated per ADR 0010: development and dedicated demo only, unavailable in primary Production. No service worker, offline cache, mutation queue, Radix package, alternate icon/chart/toast system, `next-themes`, or client data cache is introduced. The design records an appearance storage and showcase fixture cache matrix covering key, scope, lifetime, tags, invalidation, authorization boundary, and stale behavior.
- **Dependencies:** may add approved shadcn Base UI source primitives already compatible with `base-nova` after inspecting generated source and package changes through dry-run. No new runtime visual library is required. Existing `@base-ui/react`, `lucide-react`, `recharts`, `react-hook-form`, `customZodResolver`, Vitest, and Testing Library remain the implementation base.

## Why Tokens, Appearance, Showcase, and Page Migrations Are Inseparable

Semantic tokens, the gated appearance provider, the protected showcase acceptance surface, and representative page migrations form one coherent change because:

1. Token parity without a runtime resolver cannot prove Dark correctness. The showcase is the only safe pre-Production surface where complete Light/Dark/System visual parity can be verified before primary Production enablement.
2. The appearance provider without verified page migrations risks shipping a broken Dark mode. Each domain slice validates both themes for its owned routes, making the rollout gate meaningful.
3. The showcase without production tokens and components degrades into a demo-only decoration. It must render real `src/components/ui/` primitives and central navigation declarations to serve as the visual-regression reference.
4. Foundation work without a protected inspection surface forces every Dark verification pass through role-owned authenticated routes, which mixes authorization testing with visual verification.
5. The server-owned rollout gate makes these four workstreams a single releasable unit: foundations, provider, showcase verification, and page migration completion all gate `CLOIE_APPEARANCE_ENABLED`.

## Why

System CLOIE has an approved unified Light, Dark, and System design contract in `docs/design.md`, but its implementation is light-only and its semantic token layer still contains legacy gold, coupled interaction roles, undefined hover tokens, raw feature palettes, and component-specific visual values. The gap is observable in shared controls, charts, toast feedback, navigation, public/error shells, and 85 direct Tailwind palette usages, so a theme toggle alone would produce inconsistent and inaccessible dark-mode behavior.

This change establishes the approved design system as the implementation contract and adds a protected visual reference surface before incremental page migration spreads further divergence.

## What Changes

- Replace legacy and light-only foundations in `src/styles/tokens.css` with the approved semantic Light and Dark token values, including surfaces, text, interaction, status, visualization, elevation, and metadata color roles.
- Add a persisted Light, Dark, and System appearance preference that resolves before first paint, keeps all themes structurally identical, and exposes labeled controls through the avatar menu and role-appropriate profile/settings surface.
- Retokenize existing shared UI primitives, navigation shells, toast feedback, error/public shells, charts, and status treatments; remove raw theme-specific colors and the hardcoded `cta-success` button treatment.
- Add only the shared primitives justified by the approved inventory and current gaps: form field composition/validation helpers, a spinner, empty-state composition, and Recharts chart wrappers. Continue using Base UI, Lucide, the root toast system, and Recharts.
- Create a read-only Design System Showcase under the authenticated app shell. It is available only in development and the isolated dedicated demo deployment, fails closed in primary Production, uses typed mock data without database mutations, and becomes the visual-regression and accessibility reference for the implementation.
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
- **Affected contexts:** Identity and Access governs authenticated showcase access and the single active account role; Academic Calendar, Academic Structure, and Course Catalog and Assignments remain visual migration targets without changing their domain rules. ADR `0001-single-role-accounts.md`, ADR `0005-outcome-ownership-and-dean-oversight.md`, ADR `0006-dean-pwa-offline-cache-contract.md`, and ADR `0008-dedicated-demo-deployment-authentication.md` remain binding.
- **Behavioral invariants:** all SystemRole authorization, account-state gates, role-owned routes, server-side data reads, domain mutation behavior, navigation information hierarchy, responsive substitutions, and normal product content remain unchanged across themes. Appearance changes must not reset route, form, filter, scroll, or async state.
- **Authorization, privacy, caching, and deployment:** no Prisma schema, SQL migration, generated Supabase type, or persistent data cache is proposed. The showcase is server-authorized, contains no institutional data, and is environment-gated: development and dedicated demo only, unavailable in primary Production. No service worker, offline cache, mutation queue, Radix package, alternate icon/chart/toast system, or client data cache is introduced.
- **Dependencies:** may add approved shadcn Base UI source primitives already compatible with `base-nova`; no new runtime visual library is required. Existing `@base-ui/react`, `lucide-react`, `recharts`, `react-hook-form`, `customZodResolver`, Vitest, and Testing Library remain the implementation base.

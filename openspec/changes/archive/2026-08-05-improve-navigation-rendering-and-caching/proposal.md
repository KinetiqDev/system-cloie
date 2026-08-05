## Why

Authenticated role-owned routes frequently block before the application shell or meaningful page content appears. The audit found only three route loading boundaries across roughly 97 pages, primary Course Assignment tables fetched after client hydration, oversized and sequential server reads, inconsistent route invalidation, and eager chart payloads. These issues are observable across Secretary, Dean, Program Head, Faculty, Student, Alumni, and Industry Partner experiences and make ordinary navigation feel unresponsive.

The work is needed now because the current behavior obscures successful navigation behind blank, stale, or late-rendering views. It must improve perceived and actual responsiveness without weakening server-side authorization, account-state gates, role-owned routes, or the existing no-offline-data policy.

## What Changes

- Establish meaningful loading and recovery boundaries for authenticated role-owned routes, keeping a stable authorized shell visible while route data resolves.
- Render initial high-traffic list and table data on the server; retain Client Components only for interactive controls, dialogs, charts, and follow-up state changes.
- Remove internal route-handler serialization from Dean Server Component reads and consolidate duplicate or sequential read paths without changing Dean oversight authorization.
- Make representative high-volume reads efficient through database pagination, batched eligibility checks, and parallel independent reads.
- Define consistent freshness and invalidation ownership for shared catalog and period read models while retaining request-time authorization and per-user data isolation.
- Defer heavy, nonessential client visualization and interaction payloads until the primary route content is usable, and narrow the interactive Faculty Analytics payload to server-computed aggregates so raw submitted qualitative response text never reaches the browser.
- Standardize role navigation active state, pending feedback, accessible control names, and responsive navigation behavior.
- Add focused regression, query-shape, invalidation, and browser-performance verification for the revised paths.

## Capabilities

### New Capabilities
- `role-route-rendering`: authenticated role-owned routes provide stable shells, meaningful loading states, localized recovery, and server-first initial content.
- `role-navigation-feedback`: desktop and mobile role navigation consistently reports active and pending destinations and remains accessible across route depth and viewport modes.
- `scoped-read-model-freshness`: shared catalog and academic-period read models have explicit freshness scopes and complete mutation invalidation without caching identity, authorization, or private respondent data.
- `responsive-read-model-efficiency`: high-traffic role views use bounded, batched, and parallel server reads appropriate to their authorization scope.
- `deferred-interactive-payloads`: nonessential charts and heavy interactive controls do not delay usable primary route content.

### Modified Capabilities
- None.

## Impact

- Affected application areas: `src/app/(app)`, `src/components/layout`, role dashboards and role-owned list routes, Dean oversight read models, course assignments, users, responses, analytics, academic calendar, and relevant Server Actions.
- Affected contexts: Identity and Access, Academic Calendar, Course Catalog and Assignments, and Academic Structure.
- Authorization and privacy: server-side role, program, course-assignment ownership, onboarding, enrollment, inactive-account, and external-verification checks remain required. Sessions, authorization decisions, user profiles, rosters, raw responses, student identifiers, and qualitative comments remain uncached across requests. The interactive Faculty Analytics Server Action and client-facing `FacultyAnalyticsData` DTO stop carrying raw submitted qualitative response text, raw response rows, respondent identifiers, and account emails while the server-authorized Faculty gate and evaluation ownership scope remain unchanged.
- Data model and deployment: no Prisma schema, SQL migration, generated Supabase type, service worker, offline cache, or new client data-fetching dependency is proposed.
- Dependencies: use the existing Next.js 16 App Router, React Suspense, Server Components, Server Actions, Prisma, shadcn/base-ui components, Vitest tooling, shadcn MCP resources, and Chrome DevTools evidence. Enabling Next.js Cache Components is explicitly out of scope and requires a separate reviewed change.

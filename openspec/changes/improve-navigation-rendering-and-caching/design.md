## Context

System CLOIE is a Next.js 16.2 App Router modular monolith with server-side Supabase session refresh, Prisma feature services, Server Actions, and role-owned routes. The authenticated `(app)` layout currently awaits `resolveAuthSession()` before rendering `AppShell`; role layouts and many pages/services call the same request-memoized resolver again. Most role routes have no `loading.tsx` or segment error boundary. The only existing route loading states are Student, Alumni, and Industry Partner dashboards.

The audit identified three visible failure shapes:

1. The authenticated shell cannot render until runtime session and account-state reads complete.
2. Several list pages, especially Course Assignments, render controls from the server but fetch their primary records through a Server Action after client hydration.
3. Heavy data and client dependencies are read or delivered as one monolithic page unit despite independent, below-the-fold, or shared portions.

Relevant constraints:

- `src/proxy.ts` and `src/lib/supabase/middleware.ts` retain Supabase cookie refresh behavior.
- Authorization, account-state gates, program scope, course-assignment ownership, and respondent eligibility remain server-side.
- A CLOIE account has exactly one active account role under ADR `0001-single-role-accounts.md`.
- ADR `0006-dean-pwa-offline-cache-contract.md` defers service workers and offline data. This change does not add them.
- Next.js Cache Components are not enabled and require a separate reviewed change. This change may use request memoization and explicitly scoped server read caching only where its key has no session-derived data.

## Goals / Non-Goals

**Goals:**

- Make authenticated route transitions show a stable role-aware shell and meaningful route fallback instead of a blank or apparently stalled view.
- Make initial content for representative high-traffic lists server-rendered and authorization-scoped.
- Localize render failures to the affected role or route section.
- Reduce repeated, sequential, N+1, and unbounded reads without changing business results.
- Establish explicit cache and invalidation ownership for safe catalog and academic-period read models.
- Keep client bundles focused on interaction and defer nonessential visualizations.
- Make desktop and mobile navigation active, pending, accessible, and consistent at nested route depth.

**Non-Goals:**

- Enabling Cache Components, partial prerendering, `unstable_instant`, or a whole-app static shell.
- Shared caching of sessions, authorization decisions, user profiles, student data, rosters, evaluation assignments, raw responses, or qualitative comments.
- Role switching, multi-role accounts, changes to onboarding/profile-gate decisions, or changes to role-owned URLs.
- A Prisma schema or Supabase migration, generated-type edit, service worker, offline mutation queue, TanStack Query, or another client data-fetching dependency.
- Rebuilding every route or consolidating unrelated product work in one pull request.

## Decisions

### 1. Treat the authenticated shell and route body as separate rendering units

`src/app/(app)/layout.tsx` SHALL stop making the entire route tree wait on a top-level session await before it can render a visual fallback. A small server-authenticated shell boundary will own session resolution, profile-gate enforcement, role-derived navigation input, and `AppShell`; it will be wrapped in an explicit Suspense boundary with an authenticated-shell skeleton. Child role pages remain below the existing role `SessionGuard` boundaries.

`loading.tsx` files will be placed at role dashboard/list/detail route segments where a full-page fallback matches the page geometry. Independent page regions will instead be split into async Server Components below local `<Suspense>` boundaries so headers, URL controls, and already-known content remain available while a slow region resolves. Role-level `error.tsx` files provide recovery while preserving the parent shell. Section boundaries will be added only where a distinct read model warrants distinct recovery.

This is preferred over a single `(app)/loading.tsx` because Next.js does not use same-segment `loading.tsx` to cover runtime data awaited by its sibling layout. It is preferred over client-side auth because client gating would expose timing and authorization behavior outside the server boundary.

Initial navigation shape:

```text
request
  -> proxy/session refresh
  -> authenticated shell boundary
       -> resolve session, enforce account state, render role AppShell
  -> role layout guard
  -> route loading fallback or local Suspense fallback
  -> authorized route Server Component data
  -> narrow interactive Client Components
```

Planned paths include:

- Modify `src/app/(app)/layout.tsx`, `src/features/auth/components/session-guard.tsx`, and `src/components/layout/app-shell.tsx` only as needed to express the boundary.
- Add role or section `loading.tsx` and `error.tsx` under `src/app/(app)/dean/`, `faculty/`, `secretary/`, `program-head/`, and high-value Student, Alumni, and Industry Partner list/detail routes.
- Add reusable server-safe skeleton presentation components under `src/components/layout/` or the owning feature only when more than one route uses the same geometry.

### 2. Server-render initial role-owned list data and make URL state authoritative

Course Assignment list pages will read their first authorized result in their Server Component route. The client shell will receive serializable initial data plus current filter/page state and will retain only controls requiring browser state: filter interaction, dialogs, confirm flows, and client-side pending affordances. Filter and pagination changes will be represented by URL search parameters and trigger a server navigation, rather than an initial `useEffect` Server Action read.

The same pattern applies to other audit-confirmed client-refetched primary views only after their server service and URL contract are verified. A Server Action remains for mutations and explicitly user-initiated refreshes when the resulting state cannot be represented as a route transition.

This is preferred over SWR, React Query, or a generic fetch wrapper because these views are server-authorized, linkable, and already have App Router navigation. It eliminates the hydration-only primary-data gap without adding a client cache or duplicating access checks.

The Course Assignment route contract is defined before any role route migrates:

| Query parameter | Valid form | Default and canonical behavior | Scope rule |
|---|---|---|---|
| `page` | one-based positive integer, maximum `10000` | omitted means page 1; invalid, zero, negative, or out-of-range values redirect to the canonical available page | never changes authorization scope |
| `termInstanceId`, `courseId`, `facultyId`, `programId` | one UUID value each | omitted means no filter; invalid values are removed through canonical redirect | Program Head ignores `programId` and derives managed-program scope from the validated Program Head assignment |
| `yearLevel`, `section`, `courseScope` | one current enum value | omitted means no filter; unsupported values are removed through canonical redirect | values filter only within server-authorized scope |
| `isActive` | `true`, `false`, or `all` | role route default applies when omitted; `all` is the canonical explicit all-statuses selection for all-program routes; invalid values are removed through canonical redirect | does not bypass academic-period lifecycle rules |
| `q` | trimmed text, maximum 100 characters | omitted means no text filter; empty or overlength values are removed through canonical redirect | server applies only to approved Course Assignment display fields |

All values are parsed server-side through one schema. Duplicate values use the first non-empty value and redirect to the normalized one-value URL. Unknown query keys are removed. The validated result is the only list-service input. Program Head scope is never accepted from URL input, and Program Head General Education visibility and management remain governed by the existing server policy.

Planned paths include:

- Modify `src/app/(app)/secretary/course-assignments/page.tsx`, `src/app/(app)/dean/academic-structure/course-assignments/page.tsx`, and `src/app/(app)/program-head/course-assignments/page.tsx`.
- Modify `src/features/course-assignments/components/course-assignments-page-shell.tsx`, `course-assignments-table.tsx`, and related filter types.
- Modify `src/features/course-assignments/services/list-course-assignments.ts` and action wrappers only to separate reads from writes and preserve role/program scope.

### 3. Call Dean read models directly from Server Components

Dean Server Component pages will call their authorized server read-model services directly instead of constructing an internal `Request`, invoking a route handler, serializing a response, and parsing it again. Route handlers under `src/app/api/dean/` remain when needed by a real external caller, but they and Server Components will delegate to the same service-layer authorization/read-model entry points.

Dean pages will preserve an explicit Dean role assertion before any college-wide result is returned. The role layout is not treated as the only safety mechanism for a reusable service or route handler.

This is preferred over preserving `fetchDeanRead` because the current indirection adds JSON work, makes error mapping indirect, and obscures the actual service dependency. It is preferred over deleting route-handler authorization because route handlers are independently reachable.

Planned paths include:

- Modify `src/app/(app)/dean/dashboard/page.tsx`, `src/app/(app)/dean/college-oversight/learning-outcomes/page.tsx`, `enrollments/page.tsx`, and `enrollments/roster/page.tsx`.
- Modify `src/features/dean/services/read-dean-oversight.ts` and `fetch-dean-read.ts`; delete `fetch-dean-read.ts` only after no server caller remains.
- Preserve and align `src/app/api/dean/**/*.ts` authorization behavior with the direct service entry points.

### 4. Optimize read shape before adding cross-request caching

High-cost reads will first be corrected at their source:

- Secretary Users will query the requested page/filter/sort in Prisma rather than load every user profile and paginate in the browser.
- Student assigned evaluations will batch eligibility input or incorporate eligibility into a bounded query so one course-bound assignment does not produce one additional database query.
- Faculty Dashboard will execute independent affiliation/KPI/analytics reads in parallel and keep aggregate shaping server-side.
- Program Head Dashboard will resolve the active Program Head assignment once per request and pass the scoped result into dependent reads.
- Alumni and Industry Partner layouts will use verification status already in the request-scoped auth snapshot unless a correctness boundary requires a fresh read.
- Dean dashboard/readiness paths will use purpose-built aggregate reads where a view needs totals rather than full detail objects.

Request-scoped deduplication remains `React.cache()` for session and active-period resolution. Any service that accepts an already-authorized scope will be allowed to receive that scope as an argument rather than re-resolve it; public route handlers will retain their own authorization entry point.

This is preferred over caching inefficient queries because caching a wide or N+1 query hides load temporarily but preserves bad latency at misses and makes invalidation unsafe.

### 5. Use an explicit freshness matrix for safe shared read models

Only server read models whose output is independent of the session and contains no private information may have persistent reuse. Implementation will centralize keys, tags, and invalidation calls near their owning feature or a small `src/lib/cache/` module rather than spread literal path strings through actions.

| Read model | Key dimensions | Scope | Lifetime/stale behavior | Tag/invalidation | Authorization boundary |
|---|---|---|---|---|---|
| Program catalog summary | none or active-state filter | institution-shared | short stale-while-revalidate window, selected by implementation measurement | `programs`; program CRUD and affiliation/count-affecting writes | caller still requires Secretary/Dean authorization before rendering |
| Course catalog summary | scope/program/major/active filters | institution-shared or program-scoped | short stale-while-revalidate window | `courses` plus program-specific tag; course, CILO, assignment count-affecting writes | caller keeps role/program authorization outside cache |
| Academic period list/active period | status and selected period ID | institution-shared | short window; active-period changes invalidate immediately | `academic-periods`, `active-academic-period`; school-year and lifecycle writes | caller keeps role authorization outside cache |
| Instrument catalog metadata | template/version and active filters | institution-shared | short window | `instrument-catalog`; template/version writes | caller keeps role authorization outside cache |
| Dean completed-period snapshot | period ID | institution-shared immutable snapshot | cacheable through snapshot revision; no stale active-period use | `dean-period-{id}`; explicit correction write | Dean service authorizes caller before returning cached projection |
| Session/profile/role/enrollment/affiliation | user ID and request cookies | private | request-only; no persistent cache | none | resolved and enforced per request |
| Rosters/evaluation assignments/responses/comments | user/course assignment/evaluation IDs | private | request-only; no persistent cache | route/action revalidation only | service authorizes each request |

Before a domain is converted, its cache contract SHALL name the exact Next.js cache mechanism and version-specific API; the key tuple and serialization; the complete response projection; the exact freshness and stale policy; every tag; every write that invalidates each tag; whether the deployed runtime shares the cache across instances; and the authorization check performed before invocation.

A persistent-cache function SHALL accept only declared primitive non-user key dimensions. It SHALL NOT accept cookies, headers, sessions, user IDs, roles, authorization scopes, private filter values, or an object from which those values can be read. Authorization occurs before calling the cache function and private reads remain outside it. The implementation MUST NOT enable Cache Components in `next.config.ts` in this change. Existing `revalidatePath()` calls remain valid during incremental migration; each converted domain must have a named invalidation helper and complete affected-route coverage before literals are removed.

### 6. Defer nonessential interactive payloads after primary content

Server Components will prepare authorized chart data. Prepared visualization props contain only the minimum aggregate or de-identified values required by the visualization. They MUST NOT contain respondent identifiers, account email, raw response rows, qualitative comments, or unused authorization context. Client-only charts, word clouds, drag-and-drop surfaces, and large form builders will use a route-local dynamic boundary when they are below the fold or entered by an explicit user action. The fallback reserves the visual geometry and must not contain sensitive data.

The first targets are Faculty Dashboard charts and Faculty Analytics. `recharts`, word-cloud code, and drag-and-drop modules will not be moved into the persistent navigation shell. Dynamic imports will be measured in a production build before they are expanded to other routes.

This is preferred over turning the whole page into a Client Component because headers and KPI content remain server-rendered and usable before visualization code downloads.

### 7. Keep navigation data declarative and add local pending feedback

`src/lib/constants/navigation.ts` remains the single route/navigation source. Every role navigation renderer will use the same normalized prefix-aware deepest-match selection rule. Each visible navigation surface exposes `aria-current="page"` only on that destination; ancestor groups may expand or provide context but do not claim current-page status when a deeper destination matches. Route links whose destination can be slow will show a subtle local pending state using App Router link-status support or an equivalent narrow client wrapper; the fallback does not replace route-level loading UI.

Dean mobile navigation will retain the current group-landing information architecture unless user testing shows it is insufficient. The implementation will remove duplicate/conflicting navigation semantics rather than introduce a second unrelated route model. All Base UI select triggers in filter bars receive visible or programmatic labels.

### 8. Verification is staged and production-oriented

Each slice must leave focused automated proof and run existing quality gates. The repository currently has Vitest but no browser E2E or bundle-analysis setup. The change will add only the smallest measurement support required to compare production output and browser navigation; it will not add a general test platform without a dedicated decision.

Required evidence per slice:

- Unit/route tests for role and account-state denial behavior.
- Component tests for active navigation, `aria-current`, and accessible labels.
- Service tests for pagination, batching, aggregate equality, and invalidation sets.
- Production `pnpm build`, then browser network evidence showing server-rendered initial data or deferred client chunks as applicable.
- `pnpm lint` and `pnpm test` for all slices; opt-in DB integration tests only against a disposable database.

### 8.1 Browser-evidence authentication contract

Production-build browser evidence SHALL use either a disposable environment with real Supabase-authenticated test accounts or the separately reviewed signed demo session from `openspec/changes/add-dedicated-demo-auth/` in an isolated dedicated demo deployment. The primary public Production deployment remains OAuth-only, and demo configuration SHALL fail closed there. `cloie_dev_auth` and `POST /api/auth/dev-login` SHALL NOT be used after `pnpm build` and `pnpm start`. Signed demo-session evidence SHALL be labeled as route/rendering evidence and SHALL NOT be treated as OAuth exchange or callback evidence.

Each baseline and final record SHALL identify the environment, test role, account state, route, viewport, throttle, and authentication setup without recording credentials or session tokens. The record SHALL include a Chrome DevTools performance trace using Fast 3G and 4x CPU throttling, its selected LCP element, LCP breakdown, and relevant document, fetch, and script requests. Lighthouse is used for accessibility and best-practice checks; it is not the sole performance proof.

## Risks / Trade-offs

- [Shell fallback could reveal role-neutral structure before the account-state gate finishes] -> The fallback contains no child content, user data, role names, or action affordances; protected route content renders only after server gate completion.
- [Moving client list reads to route state can reset transient filter UI] -> Preserve URL-derived filter values and keep unsaved dialog state client-local; do not encode sensitive or large state in the URL.
- [Direct Dean service calls can weaken route-handler protection if authorization is removed] -> Route handlers and direct services each retain explicit authorization tests; shared read helpers accept a validated scope rather than assume a layout ran.
- [Persistent catalog cache may return stale counts or omit a mutation path] -> Start with narrow, low-volatility projections; define complete tag ownership and retain path revalidation until mutation coverage tests pass.
- [Cache key accidentally captures session-derived data] -> Cache functions accept only explicit non-user keys and are invoked after authorization; private read models remain request-only.
- [Dynamic charts cause layout shift or inaccessible fallback] -> Skeleton dimensions match the resolved chart card, and fallback semantics provide an accessible loading label.
- [Additional boundaries fragment the UI] -> Prefer role/section boundaries with page-specific geometry; avoid a global spinner or one loading file per trivial route.
- [Query refactors alter academic results] -> Compare new aggregate/batched output to the current read model with unit and disposable-DB integration tests before replacement.

## Migration Plan

1. Baseline representative route network and bundle behavior in a production build using the dedicated isolated demo deployment and signed demo identities, or a separate disposable OAuth environment when authentication latency is in scope; record scope, authentication mode, and metrics in tests or change evidence.
2. Land rendering boundaries and navigation accessibility without changing data semantics. Rollback is file-level removal of new loading/error/dynamic wrappers.
3. Convert Course Assignments and Secretary Users to server-first, bounded reads with route tests. Keep existing action read path temporarily only where a client interaction still requires it; remove it after parity tests pass.
4. Replace Dean internal handler calls and optimize representative services one feature at a time. Roll back by restoring the previous service entry point if authorization or output parity fails.
5. Introduce cache tags/helpers for one safe catalog or period domain at a time. Retain `revalidatePath()` during the transition. Rollback by disabling only that domain cache helper and retaining request-time reads.
6. Add route-local dynamic boundaries for measured heavy payloads. Rollback by reverting the dynamic import without altering server data preparation.
7. Run `pnpm lint`, `pnpm test`, focused route/component suites, `pnpm build`, and opt-in disposable-DB tests where query semantics changed. No migration or deployment data backfill is required.

## Open Questions

- Which catalog projections have enough production read frequency and low enough mutation volatility to justify a persistent server cache after query-shape fixes? Baseline measurement decides this per domain.
- Should browser performance verification remain a documented manual gate or become CI once an existing deployment preview can provide authenticated seeded data safely?
- Does Dean mobile user testing confirm that bottom navigation plus grouped drawer is useful, or should one surface be removed in a later navigation-information-architecture change?
- Are completed-period readiness snapshot corrections currently governed by a domain write path that can emit a precise cache invalidation tag? If not, cache only the live request model until that write path exists.

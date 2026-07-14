# Dean PWA Offline Cache Contract

## Status

Deferred

## Context

The Wayfinder map [Dean dashboard information architecture](https://github.com/Tugeru/project-cloie/issues/103) (Issue #103) accepted the offline direction as a single line under `## Decisions so far`:

> PWA offline — cache last viewed read-only data with timestamp. All mutations require network.

The discrepancy inventory at `docs/agents/discrepancies-prd-srs-vs-current.md` §6 shows the user-added PRD/SRS defer advanced offline capabilities and treat the app as a "limited shell-style PWA"; the current decision tightens the rule to last-viewed read-only with a timestamp and a network requirement for mutations.

This ADR is the **implementation contract** for that line. It does not introduce new policy; it specifies the cache strategy, invalidation, sensitive-data limits, recovery, and failure-mode behavior the eventual implementation tickets (Issue #110) must respect. The work ticket is [Define safe offline cache contract for Dean PWA](https://github.com/Tugeru/project-cloie/issues/109). No service-worker code, no `next-pwa` / `@serwist` / `workbox` install, and no cache implementation is added by this ADR; the artifact records decisions for the build that follows.

## Current PWA / service-worker capability (audit)

Evidence was collected with the following commands (run from the repo root, scope excludes `node_modules` and `.next`):

```bash
rg -n 'service.?worker|workbox|sw\.js|next-pwa|@serwist' --glob '!node_modules' --glob '!.next' --glob '!.git'
rg -n 'navigator\.onLine|useOnline|isOffline' src/
rg -n 'Cache-Control|setHeader' src/ --glob '!node_modules' --glob '!.next'
rg -n '"use server"|next-action' src/
```

What exists today, with file:line citations:

- `src/app/manifest.ts:1`–`src/app/manifest.ts:33` — Next.js metadata manifest. Declares `name: "System CLOIE"`, `start_url: "/"`, `display: "standalone"`, theme color `#0051C3`, and three PNG icons (192, 512, 512 maskable) at `public/icons/`. No `start_url` query, no `scope` constraint, no SW registration hook.
- `src/app/layout.tsx:39`–`src/app/layout.tsx:44` — `viewport` export sets `themeColor: "#0051C3"`. No `appleWebApp` / `appleWebAppCapable` block, no `formatDetection` block, no SW `<script>` injection.
- `src/proxy.ts:1`–`src/proxy.ts:25` — auth/session middleware. Matchers explicitly skip `/_next/static`, `/_next/image`, `favicon.ico`, `logos/`, `assets/`, and image extensions (line 23). The proxy rewrites Server Action POSTs by setting `x-forwarded-host` from the `Origin` header (line 13) before calling `updateSession`.
- `src/lib/supabase/middleware.ts:5`–`src/lib/supabase/middleware.ts:41` — `updateSession` is a Supabase session-refresh pass that calls `supabase.auth.getUser()` and writes refreshed cookies. It does not set any `Cache-Control` header.
- `package.json:29`–`package.json:54` — runtime dependencies. `next: 16.2.4`, no `@serwist/next`, `@serwist/turbopack`, `@serwist/turbopack` is the only Turbopack-compatible SW integration as of the Serwist docs; the repo has none. `next-pwa` is not present.
- `public/icons/` — three PNG icons. `public/logos/` — three logo assets. No `public/sw.js`, no `public/service-worker.js`, no `public/~offline` fallback.
- `src/app/(app)/layout.tsx:6`–`src/app/(app)/layout.tsx:22` — `AppLayout` resolves the auth session and renders `AppShell` + `SessionGuard`. Server-rendered per request; no client-side data prefetch.
- `src/lib/actions/*.ts` (see `rg "use server" src/`) — every mutation surface is a `"use server"` file (count: 30). Mutations arrive at `src/proxy.ts:8` as POSTs with `next-action` header or `multipart/form-data` content type.
- `src/components/layout/app-shell.tsx`, `mobile-nav.tsx`, `mobile-sidebar-drawer.tsx`, `sidebar.tsx`, `topbar.tsx` — layout components. No `navigator.onLine` consumer, no offline badge, no last-viewed timestamp.

The repo-wide regex `rg -n 'service.?worker|workbox|sw\.js|next-pwa|@serwist' --glob '!node_modules' --glob '!.next' --glob '!.git'` returned **zero matches**. Confirmed twice (once at the start of the session, once after a clean re-run).

What is **missing**:

- No service worker file under `public/` and no `service-worker.js` / `sw.js` route handler.
- No `SerwistProvider` / `navigator.serviceWorker.register` call.
- No offline state hook (`useOnline` / `isOffline` / `navigator.onLine` consumer).
- No `Cache-Control` headers on any server response.
- No SW kill switch env var, no SW install/update prompt.
- No fallback `/~offline` page.
- No cache versioning, no last-viewed timestamp storage, no cache-size budget.

## Turbopack / Next.js 16 constraint

The repo's dev server is Turbopack (`package.json:7` runs `next dev --turbopack`; `next.config.ts:34`–`next.config.ts:40` configures Turbopack `resolveAlias`). The Next.js 16.2.4 bundled guide `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md` line 668 still notes that the Serwist integration "currently requires webpack configuration," but Serwist's current docs (`serwist.pages.dev/docs/next/turbo`) document a Turbopack path: `@serwist/turbopack` for `next.config.mjs` and a `createSerwistRoute` route handler at `app/serwist-route.ts` that emits a runtime-generated `sw.js` via the App Router. The repo's Turbopack setup does not block Serwist adoption. AGENTS.md also flags Tailwind-specific Turbopack aliases in `next.config.ts` and `.npmrc`; the SW integration is independent of those, but the Tailwind quirks must stay intact when SW is added.

## Decision

The contract below covers (a) what is cached, (b) the strategy per asset class, (c) invalidation, (d) sensitive-data limits, (e) offline UX, (f) mutation blocking, (g) recovery, and (h) failure modes. One contract, not a menu.

Dean-only offline delivery is deferred. Whole-app offline access is a future effort and depends on role scope, data sensitivity, cache boundaries, mutation rules, and recovery semantics for every role-owned route. This effort delivers Dean features online only. Do not install a Service Worker integration, register a Service Worker, add offline UI, cache APIs, or mutation guards here. The contract remains a design input when offline delivery resumes; it does not authorize implementation now.

### 1. Scope

- **Cached (app shell).** The static `/_next/static/*` build output, the manifest icons at `/icons/*`, the logos at `/logos/*`, the favicon, and the Next.js HTML document for the Dean dashboard root (`/dean`, `/dean/dashboard`, the read-only Dean group/list routes that are part of the Dean dashboard surface: dashboard, Learning Outcomes (read-only), Enrollments (read-only, drill-down included), Profile, and the group landing pages for `Academic Structure` and `College Oversight`). All shell assets are immutable-by-content.
- **Cached (last-viewed read-only data).** JSON responses for the Dean dashboard read-only fetches that have been rendered on the client. Specifically: Dean dashboard KPI/period-context data, the active-period Graduate Outcomes overview, the active-period CILO-and-mapping coverage, Enrollments program totals and the drill-down class/course data the Dean already opened. **Names appear only after an explicit drill-down** (map #103 *Decisions so far*); the drill-down response is what becomes cacheable at that level, not the program-totals level.
- **Never cached.**
  - Any response that contains a `students` array, student identifiers (student ID number, email, account email, enrollment record), or qualitative open-ended response text. The match rule is content-based: SW must inspect the response body and reject caching when any of these are present, not just rely on URL pattern.
  - Any export endpoint, including the Enrollments export path (map #103: "Exports exclude student identifiers" — caching the export artifact would still leak its existence and file metadata; the contract forbids caching it).
  - The Secretary, Program Head, Faculty, Student, Alumni, and Industry Partner dashboards. The SW only serves routes under `/dean/*`; the `Role-owned route` rule from `src/features/course-assignments/CONTEXT.md` and ADR 0005 §4 means role-owned routes are separate and the SW is Dean-scoped.
  - Server Actions (`POST` with `next-action` header, or `multipart/form-data`), any non-GET request, and any `Authorization` / `Cookie`-bearing GET that returns above the Dean dashboard scope.
  - The `Insights` group and its deferred children (Learning Evaluation Results, Analytics, Reports). Map #103 *Out of scope*.

### 2. Trigger / registration

- The SW registers **only** when the resolved session role is `College Dean`. A client component on `/dean` (and its sub-routes) calls `navigator.serviceWorker.register('/sw.js', { scope: '/dean', updateViaCache: 'none' })` once per session, gated on `'serviceWorker' in navigator`. Outside the Dean scope the call is never made; the SW never controls non-Dean routes.
- On update detection (`registration.waiting` exists, or `updatefound` + `installing.state === 'installed'`), the SW uses `skipWaiting: true` and `clientsClaim: true` so a page reload picks up the new version. The update is non-prompted: the next navigation uses the new SW. There is no "new version available" toast in this effort.
- The SW is **disabled in development** via the Serwist `disable` option, gated on `process.env.NODE_ENV === "development"`. The repo's existing `cloie_dev_auth` cookie is a dev-only auth path; the SW must not register under that mode. See AGENTS.md *Dev Auth Bypass*.
- The SW is **disabled** by an env flag `NEXT_PUBLIC_DISABLE_DEAN_PWA_SW` (read at build time via `disable` and at runtime by an inline check in the registration component) for incident response. The env flag is the kill switch.

### 3. Cache strategy per asset class

| Asset class | Strategy | Cache name | TTL | Notes |
|---|---|---|---|---|
| App shell HTML for `/dean/*` | `NetworkFirst` with `/~offline` fallback | `dean-shell-v1` | n/a | First paint = network; offline = `/~offline` page. Precache the `/~offline` route. |
| `/_next/static/*`, `/icons/*`, `/logos/*`, favicon, fonts | `CacheFirst` | `dean-static-v1` | indefinite (content-hashed) | Standard Workbox/Serwist content-hash precache. |
| Last-viewed Dean JSON (KPI, GO overview, CILO coverage, Enrollments totals) | `StaleWhileRevalidate` | `dean-json-v1` | `maxAgeSeconds: 24h`, `maxEntries: 60` | Show cached body immediately; revalidate in background. Hard TTL is the size cap, not a correctness rule. |
| Drill-down responses (already-drilled Enrollments class/course data, expanded structure/oversight group data) | `StaleWhileRevalidate` | `dean-drilldown-v1` | `maxAgeSeconds: 24h`, `maxEntries: 30` | Same hard TTL; smaller budget because drill-downs are heavier. |
| Mutations (POST `next-action`, `multipart/form-data`, anything with `Authorization` header on a non-Dean route) | **network-only**, never cached | n/a | n/a | SW does not intercept; the request goes through `src/proxy.ts` and the network. While offline, the SW rejects the fetch with a `TypeError` that the client treats as "mutation blocked while offline." |

The two `dean-json-v1` and `dean-drilldown-v1` caches are kept separate so a JSON size budget eviction does not wipe the user's last-viewed drill-down.

### 4. Invalidation

Server-driven invalidation hook via **deployment-versioned URL** + **`Cache-Control: no-cache` on the JSON responses**. Specifically:

- Every cached JSON URL is namespaced with `?v=<buildId>` where `<buildId>` is the Next.js build id (already available as `process.env.NEXT_PUBLIC_BUILD_ID` or via the `next-build-id` pattern). On a new deployment, all previously cached URLs become miss-against-network, and the SW refetches with the new build id. The old `dean-json-v1` entries age out under their TTL.
- The `Cache-Control` response header for cached JSON is `private, max-age=0, must-revalidate`. The SW still owns the cache; the header exists so non-SW-aware intermediaries do not serve stale data. This is a header the implementation must add at the response layer (no header is set today — see audit).
- The `ExpirationPlugin` is configured with `maxAgeSeconds: 24 * 60 * 60` and `maxEntries` per row above. Even if the versioned URL key somehow leaks, time + size cap the staleness.
- There is **no server-push invalidation** in this effort. No `BroadcastChannel` cache-bust message, no SW background-sync invalidation. The versioned URL + TTL pair is the contract.

### 5. Sensitive-data limits

- The content-based filter (decision §1) is the load-bearing rule. URL-pattern-only filtering is insufficient because the same JSON endpoint can return either a totals view (cacheable) or a names view (not cacheable) depending on the Dean's drill state. The SW must `response.clone().json()` and inspect before the response is written to the cache.
- The inspection rejects caching when the response body contains any of: a `students` key, a `student_id` / `studentId` / `email` / `account_email` field at any depth, raw open-ended response text under a `comments` / `responses` / `qualitative` key, or a `__export` discriminator. The implementation may use a small allowlist of cacheable response shapes instead of a denylist; the allowlist is the safer default.
- No query string with a student identifier, search filter, or pagination cursor beyond the first page is ever cached. Filters reset the cache key.
- The `/icons/` and `/logos/` static assets are safe to cache; none embed user data. The `apple-icon.png` and `icon.png` under `src/app/` are app-level icons and are also safe.
- The contract **does not** cache any response that includes the `Set-Cookie` header, regardless of role.

### 6. Offline state and timestamp UX

- A small client component on the Dean dashboard listens to `online` / `offline` events on `window` and reads `navigator.onLine` to render a single badge at the top of the Dean shell. States: `online`, `offline (showing cached data from <HH:MM>)`, `offline (no cached data for this view)`. The badge is plain text, not a toast.
- "Last viewed at" timestamp is stored per response key in IndexedDB (or the `Cache` API's response `Date` header if present). The badge reads the timestamp for the **currently rendered** route's primary data, not the most-recently-touched key. The timestamp format is the user's local timezone, RFC 3339 date + 24h time.
- While offline the Dean can navigate between already-cached pages. Navigation to a non-cached page shows the `/~offline` fallback (a simple "You're offline. This view has not been opened yet." page), **not** a server-rendered shell. The shell stays visible; only the body content swaps.
- The Enrollments export button is **disabled** (not hidden) while offline. Tooltip: "Exports require a network connection."

### 7. Mutation blocking

- The SW only intercepts GETs under `/dean/*` whose response passes the content filter. POST, PUT, PATCH, DELETE, and `multipart/form-data` requests under any path bypass the SW and go straight to the network via `fetch(event.request)`. The SW never caches them.
- The client side (forms that submit Server Actions) is wrapped in a tiny `useOnlineGuard()` hook. When `navigator.onLine === false` and the user attempts to submit a form, the form is **not** submitted; the form-level error region renders "This action requires a network connection. Your data has not been lost." This is in addition to the SW-level network-only behavior, not a replacement.
- The guard must respect `src/proxy.ts:13` — the `x-forwarded-host` rewrite happens server-side after the SW has already let the request through. The client form therefore submits to the standard endpoint; the proxy rewrite still applies. The SW does not interfere with that flow.
- There is no offline mutation queue, no IndexedDB write-behind, no background sync. The decision in map #103 is "all mutations require network," and this contract honors that strictly.

### 8. Recovery

- When the network returns, the next SW-intercepted GET hits the network; if it succeeds, the SW revalidates the cache under the existing entry. The badge clears on the next `online` event. No user action is required.
- On a deployment that bumps the build id, the badge briefly shows `offline (showing cached data from <HH:MM>)` for one paint cycle as the SW transitions; this is acceptable. The versioned URL ensures the next render is from the new build.
- The SW does **not** retry mutations; it does not queue them; it does not persist failed payloads. The user's "Your data has not been lost" message is the end of the offline-mutation story. When the network returns, the user re-submits. (This matches map #103 *Out of scope*: "Full offline mutations and sync.")
- There is no manual cache-clearing UI in this effort. The cache age out under the TTL.

### 9. Failure modes

| Failure | Behavior |
|---|---|
| SW fails to install (`navigator.serviceWorker.register` rejects) | The registration component logs to the console and continues; the app functions online-only. The Dean shell is unaffected. No toast, no banner. |
| SW fails to activate (cached entry can't be parsed) | The next `fetch` falls through to the network. The old cache entries age out under the TTL. The user sees a normal online experience. |
| Cache exceeds size budget (`maxEntries` reached) | `ExpirationPlugin` evicts least-recently-used entries. No user-visible state change. |
| Browser does not support SW (e.g. some embedded views, some private modes) | The registration component short-circuits. The Dean dashboard still works online. No offline view. |
| User is on Secretary / Program Head / Faculty / Student / Alumni / Industry Partner route | The SW is never registered. `Role-owned route` separation is preserved (see `src/features/course-assignments/CONTEXT.md` *Role-owned route*). |
| User logs out or session changes role away from `College Dean` | The registration component unregisters the SW on the next mount. The cache is cleared via `caches.delete('dean-shell-v1' | 'dean-static-v1' | 'dean-json-v1' | 'dean-drilldown-v1')` on logout. |
| Stale-while-revalidate returns a JSON that the content filter now rejects (schema drift) | The cached entry is dropped, the response is shown once to the caller, no cache write occurs, and the next revalidation retries. |
| `NEXT_PUBLIC_DISABLE_DEAN_PWA_SW` is set at runtime | The registration component short-circuits. Existing registrations are unregistered on the next page load. The cache is purged. |

## Consequences

- Future offline work has a defined Dean-only starting contract. It is intentionally small: app shell, last-viewed Dean read-only data, no mutations, no exports, no other roles, no Insights.
- The `Role-owned route` rule is preserved — the SW is Dean-scoped, the other role dashboards are not cached. ADR 0005 §4 and `src/features/course-assignments/CONTEXT.md` are respected.
- `src/proxy.ts` is not modified. The SW sits in front of the proxy, but the `x-forwarded-host` rewrite and the Supabase session refresh still run on every request that reaches the server. Mutations are not cached, so the SW never short-circuits the auth refresh.
- The cache is keyed by versioned URL and capped by TTL; no server push invalidation is required. The `Cache-Control` header for Dean JSON is a new addition the implementation must make at the response layer (no header is set today — see audit).
- The contract is a **decision**, not a build. Offline implementation is deferred from Issue #110 and this Dean IA delivery. A future whole-app offline effort must revisit role scope before choosing an SW library, response-header middleware, online guard, offline page, and logout unregistration behavior.
- The export-excludes-student-identifiers rule from map #103 is enforced in the contract by the "no exports cached" row of §1 and the content filter of §5. The Enrollments export button is disabled offline (§6), and the export endpoint itself is never cached.
- The contract does not address future Insights content, real-time subscriptions, or background sync. Those remain out of scope per map #103.
- The "no offline mutation queue" choice is a direct consequence of map #103 "All mutations require network." If a future effort reverses that, this ADR must be amended.

## Open questions (surface, do not decide here)

- **Single shared SW vs. per-role SW.** The contract scopes the SW to `/dean/*`. If a future effort adds offline support for other role-owned routes, the SW could be either (a) a single shared SW with route-aware caching rules, or (b) per-role SWs. Map #103 keeps role-owned routes separate; the contract respects that. Surfaced for a future ticket.
- **Kill switch.** The `NEXT_PUBLIC_DISABLE_DEAN_PWA_SW` env flag is a row of the contract (§2), not a separate ticket. If a stronger runtime kill is needed (admin API call that unregisters SWs across all clients), that is a future ticket.
- **Interaction with future Insights.** Map #103 defers Insights; the contract (§1) excludes it. When Insights lands, the cache rules for the new routes are a fresh decision, not an amendment to this ADR.
- **SW package placement.** The contract does not pick between installing `@serwist/next` + `@serwist/turbopack` in this repo, vendoring a minimal hand-written SW under `public/sw.js`, or building a thin custom wrapper. The implementation ticket decides. Serwist is the documented Turbopack-compatible path; a hand-written `public/sw.js` is the smallest possible dependency and matches Next.js's own PWA guide for non-Serwist setups.
- **iOS Safari storage behavior.** iOS Safari has a history of evicting SW caches aggressively. The contract does not promise persistence; the `ExpirationPlugin` is the only cap the contract imposes. If a future Dean user reports "offline view disappeared," the fix is a one-line TTL bump, not a re-design.

## Related

- Wayfinder map: [Dean dashboard information architecture](https://github.com/Tugeru/project-cloie/issues/103)
- Ticket: [Define safe offline cache contract for Dean PWA](https://github.com/Tugeru/project-cloie/issues/109)
- Adjacent ticket: [Specify Dean responsive navigation interactions](https://github.com/Tugeru/project-cloie/issues/108) — independent; not consumed here
- Consuming ticket: [Synthesize Dean IA into implementation tickets](https://github.com/Tugeru/project-cloie/issues/110)
- Discrepancy inventory: `docs/agents/discrepancies-prd-srs-vs-current.md` §6
- Outcome ownership ADR: `docs/adr/0005-outcome-ownership-and-dean-oversight.md`
- Vocabulary: `src/features/course-assignments/CONTEXT.md` (*Role-owned route*, *All-program Course assignment manager*), `src/features/auth/CONTEXT.md` (*Course-level CILO*)
- Audit targets: `src/app/manifest.ts`, `src/app/layout.tsx`, `src/proxy.ts`, `src/lib/supabase/middleware.ts`, `public/`, `package.json`, `next.config.ts`
- Background, non-authoritative: `docs/cloie-prd.md`, `docs/cloie-srs.md`

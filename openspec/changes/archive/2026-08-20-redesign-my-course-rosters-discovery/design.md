## Context

`src/app/(app)/faculty/course-rosters/page.tsx` is a Server Component route that validates `search`, `history`, and `page`, then calls `listAuthorizedCourseRosterAssignments` directly. The server service resolves the active `FACULTY` session, scopes assignments to the current Faculty owner, paginates the result, and prepares active-roster and current evaluation-eligible counts. `CourseRosterDiscoveryPage` in `src/features/course-assignments/components/course-roster-pages.tsx` renders that prepared result as one large card per Course assignment.

Current presentation is technically accessible but has visible design drift: a noninteractive blue "Faculty workspace" label resembles a link, the filter card is taller than its task requires, assignment cards repeat nested bordered metrics, Faculty identity repeats on every Faculty-owned assignment, lifecycle facts compete with primary Course context, and the result area has no compact scan mode. The Google Drive references establish the interaction model only: a compact results toolbar and explicit list/grid selector. CLOIE remains institutional, restrained, semantic-token-driven, and domain-specific.

The authenticated app layout is `force-dynamic`. Next.js 16.2.4 Cache Components are not enabled, partial prefetching from 16.3 is unavailable, and `openspec/config.yaml` requires a separate reviewed change before enabling Cache Components. Course roster reads, session resolution, and authorization decisions cannot be shared-cached. Existing `loading.tsx` provides route-transition feedback.

## Goals / Non-Goals

**Goals:**

- Make My Course Rosters faster to scan and visually consistent with CLOIE operational pages.
- Provide responsive List and Card presentations from the same authorized, prepared server result.
- Keep view, search, history, and pagination state coherent and addressable through the URL.
- Keep Course-assignment scope, lifecycle state, active-roster count, current evaluation-eligible count, and open-roster action clear in both presentations.
- Preserve Server Component data ownership and add only the smallest justified Client Component for view interaction.
- Provide meaningful loading, filtered-empty, unassigned-empty, safe-error, keyboard, focus, touch, light/dark, and reduced-motion behavior.

**Non-Goals:**

- No changes to Course-assignment discovery scope, roster membership, eligibility, lifecycle locks, detail-page behavior, Server Actions, or role authorization.
- No schema, migration, generated-type, API, internal HTTP, client-fetching, TanStack Query, persistent preference, local storage, service worker, or offline work.
- No Cache Components, Partial Prerendering, `use cache`, `unstable_cache`, shared roster cache, or manual router prefetch.
- No generic list/card framework for unrelated domains and no redesign of Secretary, Dean, or Program Head Course-assignment pages.
- No speculative sorting, bulk actions, row menus, infinite scrolling, virtualization, or new dependency.

## Decisions

### 1. Keep authorized reads and result rendering server-owned

`FacultyCourseRostersPage` remains a Server Component. It validates URL state and calls `listAuthorizedCourseRosterAssignments` directly. `CourseRosterDiscoveryPage`, List presentation, Card presentation, filters, empty state, and pagination remain Server Components. No authorized Course-assignment data is fetched or filtered in the browser.

`CourseRosterViewSelector` is one of two narrow new feature Client Components. It needs `useRouter` and `startTransition` to update the presentation URL without a document reload and to expose a pending disabled state. Its serializable interface is intentionally small:

```ts
type CourseRosterViewMode = "list" | "card";

type CourseRosterViewSelectorProps = {
  value: CourseRosterViewMode;
  search: string;
  includeHistory: boolean;
};
```

The selector receives no roster items, identifiers, authorization result, or mutation capability.

`CourseRosterRetry` is a second leaf Client Component used only when the server read returns a safe failure result. It calls `router.refresh()` from the current URL and owns only transition feedback. It receives no error diagnostics, authorization state, or roster data; safe error text and opaque support reference remain server-rendered.

Alternatives rejected:

- Make discovery subtree client-owned: expands hydration and duplicates URL/server state without user value.
- Native Link pair only: preserves RSC purity but bypasses the project rule that 2-7 mutually exclusive options use `ToggleGroup`, and lacks a transition-pending state.
- Generic `ListView<T>` module: speculative reuse; current need has one caller and domain-specific columns/cards.

### 2. Use validated URL state with List as default

Extend the Faculty route schema with optional `view: "list" | "card"`. Missing `view` resolves to `list`, matching the domain definition of My Course Rosters as a flat searchable assignment table and providing the efficient default. The canonical URL omits `view=list`; Card uses `view=card`.

State rules:

- Switching view preserves `search` and `history`, removes `page`, and replaces the current history entry.
- Search/history submission preserves Card mode through a hidden `view=card` input and resets page naturally.
- Pagination preserves Card mode and all active filters.
- Canonical page redirects preserve Card mode.
- Invalid view values follow existing malformed-query not-found behavior.

The view selector is not persisted in local storage or account data. URL state is sufficient for refresh, bookmark, back/forward, and shareability.

### 3. Add the project-native shadcn/Base UI Toggle Group

Add `toggle-group` with `pnpm dlx shadcn@latest add toggle-group`, then review the generated Base UI source before use. `CourseRosterViewSelector` composes a single-selection `ToggleGroup` with List and Card items, Lucide icons, visible text at available widths, selected state, group label, and coarse-pointer targets. It cannot be deselected to an empty mode.

No Radix package or hand-built segmented-control primitive is introduced. Existing `Button`, `Input`, `Checkbox`, `Field`, `Table`, `Card`, `Badge`, `Empty`, `Skeleton`, and semantic tokens are reused where composition permits.

### 4. Redesign page hierarchy around one compact filter surface and one results toolbar

The page becomes:

```text
Page heading and concise scope copy
Compact search/history surface
Results toolbar: title + count/history state + List/Card selector
Selected presentation
Pagination
```

- Replace the blue noninteractive workspace label with quiet role context or remove it; no static text resembles a link.
- Keep a visible Search assignments label and use shadcn field/input/button composition.
- Keep Include inactive and completed assignment history explicit and touch-safe using the project Checkbox/Field pattern.
- Reduce nested surfaces and repeated prose. Search remains a GET form with semantic URL state.
- Use the installed `Empty` composition instead of a custom empty card. Filtered empty state offers a clear-filters link; truly unassigned state explains that no Course assignments are available.

### 5. List presentation uses aligned desktop data and compact mobile rows

At `md` and wider, List uses the existing shadcn `Table` inside one contained neutral surface. The shared Table source is already a Client Component even though it owns no data fetching or state; this change does not expand that shared primitive's interface or move list selection into it. The discovery Server Component prepares each row's content and passes rendered children through the existing Table seam. Columns are Course, Program, Class, Academic Period, Active roster, Evaluation-eligible, State, and Action. Counts use tabular figures. Status uses text-bearing badges. `Open roster` is the only row action.

Below `md`, List renders compact stacked assignment rows rather than forcing a wide horizontal page scroll. Mobile rows preserve the same information priorities: Course, Program/Class/Period, counts, state, action. They use separators and restrained surfaces, not full nested KPI cards.

The repeated Faculty name/email is removed from discovery presentations because this role-owned page contains only assignments owned by the current Faculty user. Authorization and underlying data remain unchanged.

### 6. Card presentation uses responsive cards without cards inside cards

Card mode renders one column on mobile, two at `md`, and three at `xl` where the app shell allows. Each card uses full Card composition:

- Header: Course code, Course title, lifecycle badge.
- Content: Program, year level, Class section, Academic Period.
- Compact count pair: active roster and evaluation-eligible, with tabular figures and no nested bordered metric cards.
- Footer/action: one `Open roster` link styled through `buttonVariants`, not duplicated elsewhere in the card.

Cards use existing semantic surfaces, border/ring, radius, and interaction tokens. No gradients, glows, raw palette colors, decorative illustrations, or Google Drive visual assets are copied.

### 7. Preserve current request rendering; do not invent cache or prefetch work

Existing route `loading.tsx` remains the navigation fallback but is updated or specialized only if needed to match the compact filter and neutral result rows without depending on selected view. One authorized server read supplies both views, so switching view causes a normal RSC navigation and fresh request-scoped read. This is acceptable for at most 20 assignments per page and avoids unsafe cross-request caching.

No additional nested Suspense boundary is needed: header, filters, and results depend on the same route state, and no independent slow read was found. No manual `router.prefetch` is added. Existing Next `<Link>` automatic behavior remains; repeated dynamic roster links are not given eager prefetch overrides without measurement.

Cache matrix:

| Data/state | Key | Scope | Lifetime | Tags | Invalidation | Authorization boundary | Stale behavior |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Authorized Course-assignment discovery result | N/A | request-only | request | none | existing route navigation and mutation revalidation | existing server session and Faculty ownership checks | next request reads current data |
| Discovery view/search/history/page state | validated URL | request/navigation | URL lifetime | none | user navigation | no authorization value | server renders exact validated URL state |
| Selector pending state | N/A | one client leaf | current transition | none | transition completion | no roster data crosses boundary | disabled only while navigation is pending |

### 8. Keep the change local and inventory-complete

Exact file plan:

| Action | Path | Purpose |
| --- | --- | --- |
| Add through shadcn CLI | `src/components/ui/toggle-group.tsx` | Base UI single/multiple toggle-group primitive using project preset. |
| Add | `src/features/course-assignments/components/course-roster-view-selector.tsx` | Narrow feature Client Component that updates validated view URL state. |
| Add | `src/features/course-assignments/components/course-roster-retry.tsx` | Narrow feature Client Component that retries the current safe failed discovery read. |
| Modify | `src/app/(app)/faculty/course-rosters/page.tsx` | Validate/default view mode, preserve it through canonical redirects, pass it to discovery presentation. |
| Modify | `src/app/(app)/faculty/course-rosters/loading.tsx` | Use a roster-discovery loading composition if generic list skeleton no longer matches final hierarchy. |
| Modify | `src/features/course-assignments/components/course-roster-pages.tsx` | Redesign discovery heading, filters, toolbar, List/Card renderers, empty state, open links, and pagination; leave detail behavior unchanged. |
| Modify | `src/__tests__/app/course-roster-routes.test.tsx` | Cover view parsing/defaulting and canonical redirect preservation. |
| Modify | `src/__tests__/components/course-assignments/course-roster-pages.test.tsx` | Cover hierarchy, both views, URL preservation, responsive semantics, empty states, and unchanged actions/counts. |
| Modify | `src/features/design-system/data/production-surface-inventory.ts` | Give the new selector and Toggle Group exactly one inventory disposition and preserve existing entries. |

No ADR is required. This does not create a cross-domain presentation framework, enable a platform feature, alter authorization/caching policy, or reverse an accepted decision.

## Risks / Trade-offs

- [View switch performs another authorized server read] Mitigation: result size is already paginated to 20; no extra browser fetch layer or unsafe cache is added; measure before optimizing.
- [Desktop table becomes too wide] Mitigation: prioritize eight concise columns, keep one contained horizontal overflow fallback, and use a stacked List row below `md`.
- [List and Card markup drift] Mitigation: keep both renderers in the same discovery module and share small domain presenters such as state badge, class label, count pair, and open-roster link only when they reduce repeated knowledge.
- [Toggle can enter no-selection state] Mitigation: controlled single-selection handler ignores empty values and retains current mode.
- [View state gets dropped by forms or redirects] Mitigation: route and component tests cover search, history, pagination, canonical redirects, and page reset.
- [Existing shadcn Table adds a client-rendered primitive boundary] Mitigation: row selection, authorization, and content preparation remain in the Server Component; no browser data fetch or client-side authorization is introduced; changed-code audit confirms no boundary regression.
- [Client leaves cause unnecessary hydration] Mitigation: selector contains only two controls and scalar URL state; retry contains only one button and transition state; authorized data does not cross either boundary.
- [Default changes from current card stack to List] Mitigation: this intentionally restores the documented flat-table default; Card remains one action away and URL-addressable.
- [Visual verification remains incomplete in unit tests] Mitigation: verify 375, 768, 1024, and 1440 px in light/dark, keyboard, coarse pointer, and reduced motion; issue #143 remains owner for full workflow browser acceptance.

## Migration Plan

1. Add and review the Base UI Toggle Group source, then build the URL-state selector with component tests.
2. Extend route validation and canonical URL preservation without changing the read service.
3. Redesign discovery hierarchy and add List/Card presentations from the existing prepared assignment DTO.
4. Align loading and empty states, update production-surface inventory, and run focused route/component tests.
5. Verify light/dark and responsive behavior, then run `pnpm test`, `pnpm lint`, `pnpm build`, and changed-code Fallow audit.
6. Roll back by removing `view`, selector, and List renderer and restoring the current card-only discovery markup. No data, API, migration, cache, or deployment rollback exists.

## Open Questions

None. List is the documented default; Card is the alternate. URL-backed state, narrow Toggle Group client boundary, request-only reads, and no Cache Components are selected.

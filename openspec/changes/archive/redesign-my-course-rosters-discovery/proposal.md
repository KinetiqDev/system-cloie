## Why

My Course Rosters is functionally complete but visually drifts from CLOIE's operational-page design: filters consume too much vertical space, assignment cards repeat nested card-like metrics, actions compete with context, and the page offers no compact scan mode. Faculty need a responsive assignment discovery workspace that supports both efficient list scanning and a richer card view without moving authorized roster data or presentation state into client-owned fetching.

**Classification:** feature UI redesign within Course Catalog and Assignments, with Design System integration.

## What Changes

- Redesign the My Course Rosters heading, search/history controls, results toolbar, empty state, assignment presentation, and pagination around the approved operational-page hierarchy.
- Add an accessible List/Card view selector inspired by familiar file browsers while retaining CLOIE's institutional visual language and domain vocabulary.
- Make List the default compact view and provide Card as an alternate responsive view; both present Course-assignment scope, lifecycle state, active-roster count, current evaluation-eligible count, and one clear open-roster action.
- Store the selected presentation in validated URL state so it survives search, history filtering, pagination, refresh, bookmarks, and navigation without browser storage or client-owned server data.
- Keep the route and assignment rendering server-owned, with two narrow Client Component leaves: the shadcn/Base UI view selector and a safe-error retry control.
- Align route loading, empty, focus, touch, light/dark, and mobile/tablet/desktop states with `docs/design.md` and the production Design System.

## Capabilities

### New Capabilities

- `course-roster-discovery-presentation`: responsive, URL-addressable List and Card presentations for Faculty My Course Rosters, including shared filters, status/count hierarchy, empty state, pagination preservation, and accessible view selection.

### Modified Capabilities

None. Existing Course-assignment discovery, authorization, lifecycle, count, search, history, pagination, and detail-navigation behavior remains controlling; this change redesigns their presentation and adds a URL-backed display preference.

## Impact

- **Affected contexts:** Course Catalog and Assignments; Design System.
- **Affected modules:** Faculty Course-roster route URL parsing, Course-roster discovery Server Components, narrow view-selector and retry Client Components, shadcn/Base UI component inventory, route loading state, component/route tests, and production-surface inventory.
- **Related tracking:** builds on issue #136's authorized discovery behavior; issue #143 remains owner for complete browser-level roster workflow acceptance.
- **Authorization:** unchanged. Faculty-only discovery and all Course-assignment detail authorization remain server-enforced.
- **Privacy:** unchanged. Course-assignment roster data and counts remain request-scoped and are never shared-cached or fetched by a new client data layer.
- **Rendering and caching:** Server Components, direct server service calls, and route `loading.tsx` remain. No Partial Prerendering, Cache Components, persistent cache, browser data cache, TanStack Query, or speculative cache policy is added.
- **Prisma model, SQL migrations, generated Supabase types, Server Actions, deployment settings:** no effect.
- **Dependencies:** no new package. Implementation may add the existing shadcn Base UI `toggle-group` source component through the project CLI.
- **Preserved invariants:** role-owned routing; current-period default; optional history; safe failures; distinct active-roster and evaluation-eligible counts; lifecycle state visibility; server pagination; and existing open-roster destinations.

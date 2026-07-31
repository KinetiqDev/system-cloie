# Academic Period Cache Contract

## Scope

Issue #188 persistently reuses one institution-shared Academic Calendar read
model: the eligible Academic Period summary list used by Dean period
selectors.

The projection contains only:

- `id`
- `label`
- `status`

It contains no session, account, role, authorization, enrollment, roster,
student, respondent, response, or qualitative data.

## Candidate Inventory

The change-wide freshness inventory is explicit about which shared read models
are eligible for persistent reuse. Only the Academic Period summary projection
is converted by Issue #188; the other candidates remain request-scoped until
their projections and mutation coverage are measured.

| Read model                                                                                  | Cache status        | Exact API               | Key and serialization                                                         | Freshness/stale behavior                                  | Deployment sharing                                                               | Mutation-to-tag matrix                                                                               | Owner and authorization boundary                                              |
| ------------------------------------------------------------------------------------------- | ------------------- | ----------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Program catalog summary                                                                     | Not converted       | Not established         | Not established                                                               | Not established                                           | Not established                                                                  | Not established; program lifecycle writes remain request/path invalidation                           | Owning feature; Secretary/Dean authorize before reading                       |
| Course catalog summary                                                                      | Not converted       | Not established         | Not established                                                               | Not established                                           | Not established                                                                  | Not established; course, CILO, and assignment-count writes remain request/path invalidation          | Owning feature; caller authorizes program or all-program scope                |
| Academic Period summary list                                                                | Converted           | `unstable_cache`        | `academic-period-summaries-v1`; serialized `id`, `label`, `status` projection | 300 seconds; tag refresh uses `revalidateTag(tag, "max")` | Built-in deployment cache; multi-instance sharing requires platform coordination | `academic-periods` for school-year/period writes; `active-academic-period` for lifecycle transitions | `src/lib/cache/academic-periods.ts`; Dean authorizes before cached invocation |
| Instrument catalog metadata                                                                 | Not converted       | Not established         | Not established                                                               | Not established                                           | Not established                                                                  | Not established; template/version writes remain request/path invalidation                            | Owning feature; caller authorizes before reading                              |
| Dean completed-period snapshot                                                              | Request-scoped      | No persistent cache API | Period ID and immutable snapshot projection are read per request              | Immutable snapshot read; no stale active-period reuse     | Not applicable                                                                   | Explicit correction write controls snapshot freshness                                                | Dean read service authorizes before reading                                   |
| Session, profiles, affiliations, enrollments, rosters, assignments, responses, and comments | Never shared-cached | None                    | Request-scoped values only                                                    | Request-time resolution                                   | Not applicable                                                                   | Request/route invalidation only                                                                      | Owning service authorizes every request                                       |

Rows marked `Not converted` are deliberately ineligible for persistent reuse
until the listed contract dimensions and automated invalidation coverage are
established. Existing request-time reads remain the source of truth.

## Cache Mechanism

- Next.js version: `16.2.4`
- API: `unstable_cache` from `next/cache`
- Cache Components: disabled; `next.config.ts` does not enable them
- Cache key tuple: `[`"`academic-period-summaries-v1`"`]`
- Function arguments: none
- Serialization: the returned `AcademicPeriodSummary[]` projection
- Revalidation window: `300` seconds
- Revalidation behavior: time-based refresh, or tag-based stale-while-revalidate
  using `revalidateTag(tag, "max")`

The cached function accepts no cookies, headers, sessions, user IDs, roles,
authorization scopes, or objects containing those values. Dean authorization
occurs in `listDeanEligiblePeriods()` before the cached function is invoked.

## Tags

| Tag                      | Meaning                                        | Invalidated by                                                                                |
| ------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `academic-periods`       | Any eligible Academic Period summary changed   | School Year create/update/archive; Academic Period create/update/delete; lifecycle transition |
| `active-academic-period` | The active-period membership or status changed | Activation, completion, or cancellation lifecycle transitions                                 |

The cache owns tag invalidation through
`invalidateAcademicPeriodReadModelTags()`. It is called only after a
successful database write has committed. Failed authorization, validation,
not-found, immutable-state, uniqueness, and transaction-conflict results do
not invalidate tags.

## Route Transition

Existing route invalidation remains during migration through
`revalidateAcademicPeriodReadModelRoutes()`. The current route set is:

- `/dean/dashboard`
- `/dean/college-oversight/learning-outcomes`
- `/dean/college-oversight/enrollments`
- `/dean/college-oversight/enrollments/roster`

Secretary school-year actions retain their existing Secretary route
invalidation and invoke this route set after successful mutations.

## Deployment Behavior

The repository does not configure a custom `cacheHandler` or shared cache
backend. Next.js `unstable_cache` therefore uses the deployment's built-in
server cache behavior. In a multi-instance self-hosted deployment, cache data
and tag invalidation are local to the receiving instance unless the hosting
platform supplies shared coordination. Route invalidation is retained as a
transition safeguard; a future distributed-cache decision must define the
shared handler before relying on cross-instance tag freshness.

This server cache is unrelated to browser caching, service workers, PWA
offline data, or response `Cache-Control` relaxation. Dean API responses remain
`private, no-store`.

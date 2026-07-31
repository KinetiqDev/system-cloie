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

| Tag | Meaning | Invalidated by |
| --- | --- | --- |
| `academic-periods` | Any eligible Academic Period summary changed | School Year create/update/archive; Academic Period create/update/delete; lifecycle transition |
| `active-academic-period` | The active-period membership or status changed | Activation, completion, or cancellation lifecycle transitions |

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

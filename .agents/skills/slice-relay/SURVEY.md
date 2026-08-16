# Survey

The GraphQL fields are the source of truth for children; body text is the fallback when `subIssues` is empty.

## Children

Resolve owner/repo with `gh repo view --json nameWithOwner`. Run with `gh api graphql -F owner -F name -F number`:

```graphql
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      number
      title
      state
      parent { number title }
      subIssues(first: 50) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number
          title
          state
          issueDependenciesSummary { blockedBy }
          blockedBy(first: 20) { nodes { number title state } }
        }
      }
    }
  }
}
```

Follow `endCursor` until `hasNextPage` is false so every child is listed.

If `subIssues.nodes` is empty, collect children from every task-list issue ref (`#N`) in the parent body and from issues whose body starts with `Part of #<parent>`. A checkbox is not state — `gh issue view` is.

## Blockers

A child is **blocked** when `issueDependenciesSummary.blockedBy > 0`, any `blockedBy.nodes` entry is `OPEN`, or `## Blocked by` names an issue that is still open. `None — can start immediately` is not a blocker.

## Claims

Claims are **leases**. Before every claim, release, or frontier classification, invoke `/orca-cli`, resolve and retain its executable as `ORCA`, then run these read-only operations in this order:

```text
gh issue view <ticket> --json state
gh api --paginate "repos/<owner>/<repo>/issues/<ticket>/comments?per_page=100"
ORCA worktree current --json
ORCA worktree ps --json
```

Resolve `<owner>/<repo>` with `gh repo view --json nameWithOwner`. A failed GitHub or Orca lookup, or incomplete comment pagination, stops the relay before any GitHub write. Read the current worktree ID only from `worktree current --json` at `.result.worktree.id`; it must be the full canonical `<repo-id>::<absolute-path>` value. Never fall back to `hostname:pwd`.

An issue whose state is `CLOSED` is not claimable, regardless of historical markers. For an open issue, parse all paginated marker comments in ascending `created_at` order, breaking equal timestamps by numeric REST `id`. Retain these exact marker bodies:

```text
<!-- slice-relay-claim -->
claimed by worktree `<id>` on parent #<parent>
```

```text
<!-- slice-relay-release -->
released by worktree `<id>`
```

A valid claim or release exactly matches its two-line form and uses a canonical ID. For each ID, its last valid marker determines whether that ID has an unreleased claim. A comment containing either marker HTML comment with an invalid body or a legacy `hostname:path` ID is **unverifiable**: report the ticket number, comment URL or ID, and body; do not write a claim or release. This deliberately blocks malformed or non-Orca claim evidence instead of bypassing it.

An unreleased canonical claim is **running** only when its exact full ID is in the fresh `worktree ps --json` output and that entry has `liveTerminalCount > 0` or `hasAttachedPty: true`. An absent entry, or one with neither terminal signal, is **stale**.

The lease audit itself is read-only. It returns one of the outcomes below; acquire a claim only when the calling workflow needs this worktree to own that ticket. In particular, a parent classifying sibling frontier tickets must not acquire their claims.

| Audit result | Required action |
| --- | --- |
| no unreleased valid claims | `claimable`: an acquiring workflow posts one claim using this worktree's canonical ID, assigns `@me`, then repeats this entire audit |
| the earliest valid running unreleased claim is self and the current worktree is running | `owned`: continue without posting a comment or changing assignees |
| the earliest valid running unreleased claim is foreign | `held`: name every running holder and stop without posting |
| only unreleased foreign stale claims | `claimable`: an acquiring workflow posts one self claim without releasing or impersonating the stale worktree, assigns `@me`, then repeats this entire audit |
| invalid or unverifiable marker, closed issue, failed GitHub/Orca lookup, or incomplete pagination | stop before every GitHub write and surface the failed evidence |

To acquire a claimable ticket, post the exact claim body, run `gh issue edit <ticket> --add-assignee @me`, then repeat the full audit. The repeat resolves concurrent writes: the earliest valid running unreleased claim wins. If a foreign running claim is earlier than the self claim, post exactly one release for the current worktree ID and return `held`; otherwise return `owned`.

Write a release only for this worktree's own unreleased claim when it backs off or cannot deliver its baton. Closing an issue terminates every lease.

## Tags

For each open child other than this worktree's active `owned` leg, exactly one:

| Tag | Evidence |
| --- | --- |
| blocked | an open native blocker, or an open issue in `## Blocked by` |
| claimed | the lease audit returns `held` |
| frontier | the lease audit returns `claimable` |

List the set in parent order (sub-issue order, else task-list order).

---
name: babysit-pr
description: Drive a branch from working tree to merge-ready pull request — commit, verify, push, open the PR with its evidence, then babysit CI and the Greptile verdict until the merge gates hold. Use when the user asks to babysit a PR, make a PR merge-ready or production-ready, push a branch and open its PR, fix failing CI or a merge conflict, or answer review feedback on the current branch.
argument-hint: "[PR_NUMBER|PR_URL] [merge]"
---

# Babysit PR

A PR is finished when **the merge gates** hold, not when the code is written. Three gates, all independent, all required:

1. **CI green** on the PR's current head SHA.
2. **Verdict positive** — the PR body records the Greptile review as 5/5 and states it is clear to merge.
3. **Threads resolved** — every review thread this change raised is resolved.

Plus a **freshness** check before any readiness claim: the branch contains the current base. Green CI on a stale branch is not readiness.

One rule runs underneath all of it: **red gets looked at.** A failing check is a fact about the code, so the work is making the code right. A change that turns the check green without moving the behavior is worse than the red check, because it ends the looking.

## Invocation

```text
/babysit-pr                # the PR on this branch, or start one
/babysit-pr 658            # a specific PR
/babysit-pr 658 merge      # drive to the gates, then merge
```

`merge` is the only path that merges; without it, stop at the gates and report. Invoking this skill authorizes pushing to the branch that owns the PR and, when `merge` is present, merging it. It authorizes nothing on another branch or another PR.

When the work is a GitHub ticket slice, `/ship-slice` owns ticket-to-branch and hands off here at the PR. This skill starts from a branch that knows what it delivers.

## 0. Preflight

```bash
cd "$(git rev-parse --show-toplevel)"
gh auth status
BASE="$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name)"
git fetch origin "$BASE"
git status --short --branch
```

Require an authenticated `gh`, a resolved `$BASE`, and the delivering branch checked out. An uncommitted tree is a report, not a commit — name the files and stop rather than sweeping someone's work into the PR.

One PR per branch. When a PR already exists, resolve it and start at step 5:

```bash
gh pr view --json number,url,state,isDraft,headRefOid,baseRefName
```

Done when: `$BASE` is resolved, the tree state is known, and the PR — existing or pending — is identified.

## 1. Commit the change

Group commits by logical unit with conventional subjects (`/git-commit`). The diff is the deliverable: no debug logging, temporary bypasses, TODOs standing in for required work, or secrets and agent scratch files.

```bash
git status
git diff
git log --oneline "origin/$BASE"..HEAD
```

Done when: the tree is clean and the log reads as one coherent change.

## 2. Verify before pushing

A CI round costs minutes; a local run costs seconds. Narrowest first:

```bash
pnpm vitest run <touched tests>
pnpm format:check:changed
pnpm lint:changed
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

Add the gates this diff selects — [CI-GATES.md](CI-GATES.md) maps every check to its local command:

```bash
pnpm exec tsx scripts/run-fallow-audit.ts "$(git merge-base origin/$BASE HEAD)"
RUN_DATABASE_INTEGRATION_TESTS=1 pnpm test:db   # disposable database only
pnpm test:auth-integration
pnpm test:e2e
```

Run `/code-review` against `origin/$BASE` now rather than after the push: a finding fixed here costs one commit, and the same finding found by CI or Greptile costs a round each.

UI changes get a look in a running application at desktop and mobile widths (`/agent-browser`, `/playwright-cli`).

Done when: every command that applies to this diff passes and `/code-review` returns no unresolved finding.

## 3. Push and open the PR

```bash
git push -u origin HEAD
gh pr create --base "$BASE" --title "<type>(<scope>): <summary>" --body-file <body>
```

The title is the conventional-commit subject. The body follows [PR-BODY.md](PR-BODY.md) — read it before writing, and fill Verification from commands that actually ran.

`Closes #<N>` when the change delivers a ticket, `Refs #<N>` when it is part of one. The Greptile score is Greptile's to write; step 5 reads it back.

Done when: exactly one PR exists for this branch, targeting `$BASE`, with a body whose every claim is a command that ran.

## 4. Get fresh

The base moves while you work. Before the first push and before every readiness claim:

```bash
git rev-list --count HEAD.."origin/$BASE"          # 0 means fresh
git merge-base --is-ancestor "origin/$BASE" HEAD
```

A non-zero count means rebase:

```bash
git rebase "origin/$BASE"
```

Resolve conflicts in this order: the ticket's spec, current base behavior, this branch's acceptance criteria, repository domain conventions. Then re-run step 2 and push:

```bash
git push --force-with-lease
```

A rejected lease means someone else pushed: stop, re-fetch, and report. `--force` destroys their work.

Done when: the readiness check exits 0 and step 2 passes on the rebased head.

## 5. The round

One round is collect → triage → fix → push → resolve → wait. Repeat until the gates hold or a stop condition trips. A push makes a new head SHA, and every check, run, and verdict from the old one is stale — discard it.

### Collect

```bash
gh pr checks <PR> --json name,state,bucket,link,workflow
gh pr view <PR> --json body,mergeable,mergeStateStatus,headRefOid
```

Buckets are `pass`, `fail`, `pending`, `skipping`, `cancel`. Read the buckets rather than the exit code. `skipping` is risk selection working — an unselected gate is not a failure. An empty `pending` bucket is the wait condition; when nothing settles inside roughly 30 minutes, name the checks that never finished and report them.

`mergeStateStatus: UNKNOWN` means GitHub is still computing. Read it again in a few seconds; it is not clean.

Review threads are only reachable through GraphQL:

```bash
OWNER="$(gh repo view --json nameWithOwner -q .nameWithOwner | cut -d/ -f1)"
REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner | cut -d/ -f2)"
gh api graphql -F owner="$OWNER" -F name="$REPO" -F pr=<PR> -f query='
  query($owner:String!,$name:String!,$pr:Int!) {
    repository(owner:$owner, name:$name) {
      pullRequest(number:$pr) {
        reviewThreads(first:100) { nodes {
          id isResolved isOutdated path
          comments(first:20) { nodes { author { login __typename } body } }
        } }
      }
    }
  }'
```

Classify each unresolved thread by its first comment's author: bot (`greptile-apps`, `llamapreview`, any `__typename: Bot`) or human. When in doubt it is human — an extra open bot thread costs one line in the report, and a misread human thread costs a colleague's comment.

### Triage each thread

Fix it, decline it with a recorded reason, or escalate it. Escalate anything that questions scope, design, or product behavior: that is the author's call.

Replies stay rare. One short reply on a declined thread, naming the reason once, is the whole budget — the code is the reply everywhere else.

### Read a failing job

```bash
JOB_ID=<last path segment of the check's `link`>
gh run view --job "$JOB_ID" --log-failed > /tmp/job.log
grep -nEi '##\[error\]|FAIL |✕|Error:|exit code' /tmp/job.log | head -20
```

`--log-failed` returns the whole job — commonly ~2000 lines that end in container teardown — so search the markers and read around them.

Settle two things before editing. **Whose failure is it:** GitHub tests the merge of this branch with the base, so a failure in code the diff never touched belongs to the base until proven otherwise. **Can you reproduce it locally:** a failure you can trigger yourself is one round; a CI-only failure costs a full cycle per attempt.

### Fix at the root cause

| What failed                            | Root-cause fix                                                                                                                                 | Shortcut that only paints it green                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| A test                                 | Fix the code the test describes. When the change intentionally moves the asserted behavior, move the test with it and record that in the body. | Skipping it, deleting it, `.only`, weakening the assertion, loosening tolerances, wrapping it in a retry |
| A visual baseline                      | Review the rendered change, then update only the baselines the intended layout change moved.                                                   | Refreshing baselines unreviewed, raising pixel tolerance, dropping a viewport or journey                 |
| An uncovered line or inventory finding | Write the test that exercises it.                                                                                                              | Ignore pragmas, deleting code to lift the ratio, refreshing a Fallow baseline                            |
| Lint or format                         | Run the repository's own fixer and keep its output.                                                                                            | Blanket or file-scope disable comments                                                                   |
| Typecheck or build                     | Fix the types.                                                                                                                                 | `any`, `@ts-ignore`, `as unknown as`, loosening `tsconfig`                                               |
| A database invariant                   | Fix the invariant or the migration, replayed against a disposable database.                                                                    | Asserting less, skipping the suite, pointing the suite at shared or production data                      |
| An auth or browser journey             | Fix the behavior the journey proves, reproduced locally before pushing.                                                                        | Raising `retries`, dropping the journey, enabling a demo or CI sign-in shortcut in the app               |
| A gate that did not select             | Report the selector gap — the classifier has a documented contract.                                                                            | Editing `.github/workflows/` or `scripts/ci/` to skip or narrow a gate                                   |
| Infrastructure                         | One evidence-backed `gh run rerun <run-id> --failed` for a runner timeout, registry 5xx, or network error.                                     | Reruns on hope; a second identical failure is real, not flake                                            |

When the honest fix is a product decision, a genuinely wrong test, or a gate that cannot pass without weakening, stop and report:

```text
BLOCKED: PR #<P> — <check>
Cause: <what actually fails and why>
Needs: <the decision only a human can make>
```

A reported blocker is a finish.

### Push, then resolve

```bash
git commit -m "<type>(<scope>): <fix>"
git push
```

Then resolve the bot threads you actually fixed or recorded a rejection for:

```bash
gh api graphql -F id="$THREAD_ID" -f query='
  mutation($id:ID!) {
    resolveReviewThread(input:{threadId:$id}) { thread { id isResolved } }
  }'
```

A human's thread stays open. You fixed what they raised; closing it is their call.

### Get a verdict

A green `Greptile Review` check means Greptile finished scanning. The verdict is what Greptile wrote into the PR body and its general comment:

```bash
gh pr view <PR> --json body -q .body
gh api --paginate "repos/$OWNER/$REPO/issues/<PR>/comments" \
  --jq '.[] | select(.user.login | test("greptile")) | .body'
```

Gate 2 holds when the body records the review as **5/5** and clear to merge for the current head. A lower score, or a verdict for an older head, means the review is unfinished: keep fixing what Greptile raised and push — it re-reviews each push. When it has not reviewed the current head at all, ask:

```bash
gh pr comment <PR> --body "@greptile review"
```

Copy the verdict from what Greptile posted. The score is never authored here, and Greptile's own block in the body is left exactly as written.

### Stop conditions

Stop and report when:

- Five rounds have run.
- The same check failed twice after two different fixes — it is not converging.
- A round produced more failing checks than the round before it.
- `mergeStateStatus: BLOCKED` for something unfixable from here: a missing approval, a required check that never runs.
- `--force-with-lease` was rejected, or the PR closed or merged mid-run.
- The base moved twice in one run.
- A fix needs a product decision.
- A human review thread is still open while everything else is green.

Done when: all three gates hold on the current head and step 4's readiness check exits 0.

## 6. Report

Lead with the state, then the evidence.

```text
MERGE_READY: PR #<P>, head <sha>          # add `issue #<N>` when the PR closes a ticket
```

Then, briefly: rounds run; what was fixed and pushed; what was declined and why; anything escalated; CI state per check; merge state; the freshness result. State plainly that no check was weakened — the reader is deciding whether to trust this run.

On `BLOCKED`, report the block in that form and leave the branch as it is.

## When `merge` is present

Merge only with the three gates green and the branch fresh. This repository merges with merge commits — recent `main` history is two-parent, not squash:

```bash
gh pr merge <PR> --merge
gh pr view <PR> --json state,mergedAt,mergeCommit
```

Confirm through GitHub that it merged, then report the merge commit. `merge` is not permission past a red gate: report the gate instead.

## Reference

- [PR-BODY.md](PR-BODY.md) — the body skeleton, what each section proves, and the Greptile block it leaves alone.
- [CI-GATES.md](CI-GATES.md) — every check on a PR, the local command that reproduces it, what selects it, and the evidence the body records.

## Reach for

| When                                        | Skill                                                                |
| ------------------------------------------- | -------------------------------------------------------------------- |
| The change is a GitHub ticket slice         | `/ship-slice` — owns ticket to branch, then hands off here           |
| Before the push, and after Greptile fixes   | `/code-review`                                                       |
| A failure you cannot explain                | `/diagnosing-bugs`                                                   |
| New behavior needs new tests                | `/tdd`                                                               |
| Fallow Audit Gate findings                  | `/fallow` — trace before deleting; fixes start from dry-run evidence |
| Schema, migrations, RLS, Supabase           | `/supabase`, `/supabase-postgres-best-practices`                     |
| Browser journeys, desktop and mobile proof  | `/playwright-cli`, `/agent-browser`                                  |
| Conventional commits                        | `/git-commit`                                                        |
| Where a rule lives, or two sources disagree | `/cloie-knowledge`                                                   |

# Launch

A launch is a full handoff: new independent worktree, baton delivered, then this session stops watching that worker. Invoke `/orca-cli` and follow its current guide before any Orca command.

## Agent

Map the call's agent onto Orca's `--agent` id:

| said | `--agent` |
| --- | --- |
| `omp`, `oh-my-pi`, `oh my pi` | `omp` |
| `pi` | `pi` |
| `opencode` | `opencode` |
| anything else | the id as given |

Copy **model** and **effort** into the baton. Use `worktree create --agent <id> --prompt` when that launches the agent. Take the two-step custom-argv path in the orca-cli guide only when the user named launch flags `--agent` cannot take.

## Worktree

Each slice is its own PR off the repo default base. Create an independent top-level worktree: `--no-parent`, omit `--base-branch`, `--setup run`, `--agent <id> --prompt "<baton>"`, name `slice-<N>-<slug>`.

Create worktrees only for frontier tickets within the relay's bounded-wave cap ([SKILL.md](SKILL.md) step 3): at most two live slice sessions, this session's own included. Tickets beyond the cap stay unclaimed for a later wave. Record the complete `worktree.id` from the creation receipt. If Orca cannot launch, leave that ticket unclaimed and record `Orca unavailable` as the reason — this session still ships its own slice.

Verify a launch before delivering its baton: `ORCA worktree ps --json` lists the receipt's complete `worktree.id` with a live terminal (`liveTerminalCount > 0` or `hasAttachedPty: true`). A dead or absent worktree is recreated — never hand a baton to a worktree that is not running.

## Baton

The baton starts with the slash so the next agent user-invokes this skill. Label the ticket as `Assigned slice`; assignment is not a claim. The receiving child must invoke `/slice-relay`, perform the lease audit from [SURVEY.md](SURVEY.md), and proceed only when that audit returns `owned`.

```text
/slice-relay <parent> <agent> <model> <effort>

You are a leg of a slice relay on parent #<parent> (<parent title>).
Assigned slice: #<N> (<slice title>).
Close only the assigned slice ticket after its lease audit returns owned; the parent stays open.

Invoke /slice-relay with the arguments above, then follow it.
```

Drop the `model` / `effort` tokens when the call did not name them. One launch per assigned ticket; the receipt's complete `worktree.id` is the proof the baton was delivered. A launch failure leaves the ticket unclaimed.

## Teardown

One worktree, one slice: a slice worktree lives until its PR merges, then it is deleted.

- After the slice's PR merges and this session has no further launches to make (relay step 5 exits), delete the worktree: `ORCA worktree rm --worktree current`.
- Teardown applies only to a slice worktree: skip it when `ORCA worktree current --json` shows `isMainWorktree: true`. The main worktree is never deleted.
- Verify removal with `ORCA worktree list --json` — the worktree's complete ID must be absent. A worktree that survives the first attempt is retried with `--force`, then reported if it still remains.

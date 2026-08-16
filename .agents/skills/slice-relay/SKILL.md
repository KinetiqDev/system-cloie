---
name: slice-relay
description: Relay a parent GitHub tracker through its vertical slices — one session, one slice, baton on.
argument-hint: "<parent-issue> <agent> [model] [effort]"

---

# Slice Relay

A **relay**: this session ships one vertical slice of a parent tracker, then passes the **baton**. Sibling **frontier** tickets get their own worktrees. The relay is over when every child of the parent is closed.

`/ship-slice` ships. This skill surveys lease ownership, fans out, and continues.

## 1. Read the call

Take from the invocation or the baton that started this session:

- **parent** — tracker issue number
- **agent** — coding agent for every launch this run (`omp` / `oh-my-pi`, `pi`, `opencode`, or another Orca `--agent` id)
- **model**, **effort** — optional; copy onto every baton
- **assigned slice** — optional; the ticket this session was assigned to audit and acquire

Stop and ask if parent or agent is missing.

Done when: parent, agent, and any model/effort/assigned-slice are written down.

## 2. Survey the frontier

Load [SURVEY.md](SURVEY.md) and run its query on the given number. If `parent` is set, that parent is the tracker and the given number is the assigned slice — re-run the query on the parent. Before classifying each open unblocked child, run its lease audit.

The **frontier** is the open children whose lease audit returns `claimable`. Tag an open unblocked child `claimed` only when its audit returns `held`. An `owned` ticket is this worktree's active leg, not another frontier ticket. Surface an `unverifiable` audit as a stopped relay condition with its ticket and comment evidence.

- No open children → the relay is over. Stop.
- Open children, empty frontier with no active leg → name every verified holder or blocker and stop.

Done when: every open child is tagged frontier, claimed, or blocked, or identified as this worktree's active owned leg, with the evidence in SURVEY.md.

## 3. Claim the wave

A **claim** is acquired only by the worktree that will ship that ticket. Audit and acquire only this session's ticket using [SURVEY.md](SURVEY.md).

- For a baton-assigned ticket, retain it only when its audit returns `owned`. A `held` result exits before shipping. A `claimable` result acquires the lease, then proceeds only after the repeat audit returns `owned`; an `unverifiable` result stops with evidence.
- Without an assigned ticket, audit the first frontier ticket in parent order. Acquire it through the shared procedure; it becomes this session's slice only after the result is `owned`.
- For every remaining frontier ticket, create one sibling worktree per [LAUNCH.md](LAUNCH.md). Do not claim it on the child's behalf; its `Assigned slice` baton requires the child to invoke this skill, audit, and acquire its own lease.

The blocking graph is the parallelism contract: every frontier ticket is parallel.

If the user asked to supervise, monitor, or wait on the wave, load [SUPERVISE.md](SUPERVISE.md) instead of launching full handoffs.

Set the active worktree comment to `relay: shipping #<slice> of #<parent>`.

Done when: this session's ticket is this worktree's `owned` lease, and every other frontier ticket is either a launched sibling with an assignment baton delivered or still unclaimed with a written reason.

## 4. Ship

Run `/ship-slice` on this session's ticket.

Done when: `/ship-slice`'s Done when is met for this session's ticket.

## 5. Pass the baton

Re-run the survey in SURVEY.md.

- No open children → the relay is over. Stop.
- Frontier remains → launch one worktree per frontier ticket (LAUNCH.md) without claiming on its behalf. This session keeps none. Deliver each assignment baton and stop monitoring.
- Frontier empty, open children remain → name each as claimed or blocked and stop.

Done when: one of those three exits is taken, and every baton launch (if any) carries the same parent, agent, model, and effort as this call.

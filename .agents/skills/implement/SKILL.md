---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

## Verification gate

Before review, run every verification command the repo defines (`pnpm test`, `pnpm lint`, `pnpm build` — take the full list from `AGENTS.md` and `package.json` scripts). Fix failures and rerun until the gate is green: every command exits clean.

## Review

Run /code-review on the diff since the point the work started from (the branch's merge-base). It dispatches the Standards and Spec reviews as parallel sub-agents and aggregates their findings. Address blocking findings, rerun the verification gate after each fix round, and resubmit for review until the report comes back with no blocking findings.

## Commit

Commit to the current branch only when both hold: the verification gate is green and the latest review reports no blocking findings.

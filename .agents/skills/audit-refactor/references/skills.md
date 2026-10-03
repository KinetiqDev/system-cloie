# Skills used by the audit workflow

## Selection prompt

Use this instruction before each phase:

> Inspect the skills available in this environment. Choose the narrowest skills relevant to the repository, the current finding, and the verification needed. Read their instructions before use. Prefer project-local guidance when the repository names it authoritative. Explain a conflict rather than silently mixing incompatible workflows. Use additional skills when they improve evidence or execution, not merely because their names sound relevant.

This workflow selects audit, implementation, testing, and review skills by phase. A findings-only skill does not authorize edits. The user's invocation of `audit-refactor` authorizes implementation within the stated scope.

## Audit and architecture references

These skills informed the original whole-repository audit:

| Skill                 | Reference                                                       | Applicable work                                                                                                                                                                         |
| --------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fallow`              | [Fallow instructions](skill://fallow)                           | Dead-code tracing, duplication, complexity, architecture boundaries, fix previews, and before-and-after reports. Installed CLI help and repository policy determine supported commands. |
| `ponytail-audit`      | [Whole-repository simplification audit](skill://ponytail-audit) | Deletion-first candidate discovery and largest-cut ranking. Its original workflow ends at findings, so the implementation steps live in `audit-refactor`.                               |
| `codebase-design`     | [Module design guidance](skill://codebase-design)               | The deletion test, authoritative ownership, useful interfaces, and the cost of extra layers.                                                                                            |
| `next-best-practices` | [Next.js guidance](skill://next-best-practices)                 | App Router conventions, Server Components, Client Components, Server Actions, and rendering. Installed Next.js documentation governs version-specific behavior.                         |
| `cloie-knowledge`     | [System CLOIE source navigation](skill://cloie-knowledge)       | Domain contracts, ADRs, source authority, and conflicts in System CLOIE.                                                                                                                |
| `graphify`            | [Graph navigation](skill://graphify)                            | Existing code and domain relationships. Generated graph output provides leads that require source verification.                                                                         |

The original audit used `ponytail-audit` candidate tags: `delete:`, `stdlib:`, `native:`, `yagni:`, and `shrink:`. Those tags describe the proposed cut. P0 through P3 describe priority.

## Verification and review references

These skills informed verification and review during the original audit:

| Skill                              | Reference                                                       | Applicable work                                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `diagnosing-bugs`                  | [Failure diagnosis](skill://diagnosing-bugs)                    | Reproduction, a focused feedback loop, failure attribution, and regression proof.                                                      |
| `tdd`                              | [Behavioral test guidance](skill://tdd)                         | Meaningful regression tests at the consumer interface. For an existing refactor, retain existing behavioral tests before adding tests. |
| `supabase`                         | [Supabase guidance](skill://supabase)                           | Authentication clients, database targets, migrations, RLS, and verification safety.                                                    |
| `supabase-postgres-best-practices` | [PostgreSQL guidance](skill://supabase-postgres-best-practices) | Queries, transaction behavior, locking, schema changes, and database constraints.                                                      |
| `agent-browser`                    | [Browser workflow](skill://agent-browser)                       | Running-application checks with real interactions at desktop and mobile sizes. Read the installed CLI's current workflow before use.   |
| `playwright-cli`                   | [Playwright workflow](skill://playwright-cli)                   | Existing browser journeys and Playwright-based checks. Choose one browser workflow for a scenario rather than duplicating the run.     |
| `code-review`                      | [Code review guidance](skill://code-review)                     | Standards and requirement reviews. Provide the real starting snapshot and the current task as the requirement source.                  |
| `unslop`                           | [Prose editing rules](skill://unslop)                           | Clear progress notes, reports, documentation, and commit messages.                                                                     |
| `git-commit`                       | [Conventional commit workflow](skill://git-commit)              | A separately requested commit step, with focused staging and normal hooks.                                                             |

## Additional skills by finding

The available skill inventory may contain more specific guidance than the original audit used. Relevant branches include the following:

- UI primitives or component inventory: `shadcn`.
- Responsive composition, visual changes, or accessibility: `impeccable`, `frontend-design`, or `web-design-guidelines`.
- Domain vocabulary or a durable architecture decision: `domain-modeling`.
- A difficult design with competing options: `grilling`, `prototype`, or `paseo-committee`.
- Credential, service, or infrastructure prerequisites requiring human action: `wizard`.
- A separate security investigation: `security-reviewer` tooling and the repository's security workflow.

These names are selection leads, not a requirement to load every skill. Follow the actual inventory and repository rules.

## Authoring references

The reusable workflow was packaged using [writing-for-agents](skill://writing-for-agents), [skill invocation mechanics](skill://writing-for-agents/SKILL-MECHANICS.md), [technical-writing](skill://technical-writing), and [unslop](skill://unslop).

`disable-model-invocation: true` makes `audit-refactor` user-invoked. Its description is a human-facing summary, not an automatic trigger.

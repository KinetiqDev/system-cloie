---
title: Knowledge Base Navigation for Agents
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# Knowledge Base Navigation for Agents

How to orient in this repository: which sources answer which kind of question, what to do when sources disagree, and how to keep the knowledge base true when behavior changes. The reference chain starts in [AGENTS.md](../../AGENTS.md).

## Source Roles and Authority

| Source                                                                               | Answers                                                                                | Authority                                                      |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Code and tests (`src/**`, `e2e/**`)                                                  | What the system actually does today                                                    | Current behavior — highest                                     |
| `src/features/<domain>/CONTEXT.md`                                                   | Domain terminology, rules, invariants                                                  | Current domain intent (must match code)                        |
| [docs/adr/](../adr/)                                                                 | Durable architectural decisions and their context                                      | Durable decisions                                              |
| `docs/product/`, `docs/architecture/`, `docs/operations/`                            | Maintained explanation of behavior, structure, and operations                          | Maintained explanation (must match code)                       |
| [docs/capstone/guide/](../capstone/guide/), [docs/institutional/](../institutional/) | External requirements the system must satisfy (capstone guide, institutional policies) | External authoritative requirements — not implementation specs |
| [docs/history/](../history/), `docs/openspec-deprecation-migration-report.md`        | How the project got here; retired plans and change artifacts                           | Historical — never describes current behavior                  |
| `graphify-out/` ([docs/tooling/graphify.md](../tooling/graphify.md))                 | Cross-domain navigation over the current tree                                          | Generated navigation aid — verify before use                   |

Precedence: implementation and tests settle what **is**; CONTEXT.md and maintained docs explain what **is meant**; ADRs settle what **was decided and why**; external guides settle what **must be true**; history explains what **used to be**.

## Conflict-Handling Protocol

When two sources disagree, never silently reconcile. Record, in the change or document where the conflict surfaces:

1. **Which sources conflict** (paths).
2. **What each says** (quote or precise paraphrase).
3. **Each source's authority type** (from the table above).
4. **The conflict class**:
   - **Implementation drift** — code diverged from CONTEXT.md / ADR / maintained docs. Fix is a code or docs change plus a record of which side was wrong.
   - **Documentation drift** — maintained docs disagree with each other or lag a decided change.
   - **Outdated historical material** — a historical document says something a current source contradicts; the historical document stays as-is (it is not wrong for its date), and the current source governs.
   - **Unresolved product intent** — authoritative sources genuinely disagree and no decision exists; escalate rather than pick a side.
5. Any `[unclear in source]` markers or unverifiable claims carried forward.

## Maintenance Workflow

Run this when a change alters behavior, structure, or domain rules:

1. Orient at [AGENTS.md](../../AGENTS.md).
2. Open [docs/index.md](../index.md), the documentation front door.
3. Discover domains through [CONTEXT-MAP.md](../../CONTEXT-MAP.md); for cross-domain discovery use graphify (`query`/`explain`/`path`, see [docs/tooling/graphify.md](../tooling/graphify.md)).
4. Read the affected `src/features/<domain>/CONTEXT.md` and related ADRs.
5. Verify the docs' claims against implementation and tests before relying on them.
6. Make the change.
7. Update the affected CONTEXT.md, ADR (only for durable decisions), maintained docs, and evidence.
8. Commit code, tests, and documentation together.
9. Run `graphify . --update` so the generated navigation reflects the new state.

## See Also

- [docs/tooling/graphify.md](../tooling/graphify.md) — graph commands and verified flags
- [docs/tooling/obsidian.md](../tooling/obsidian.md) — vault and link conventions
- [CONTEXT-MAP.md](../../CONTEXT-MAP.md) — domain-context index

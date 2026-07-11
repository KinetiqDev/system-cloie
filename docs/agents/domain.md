# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Layout

This repo uses a multi-context domain-doc layout: root `CONTEXT-MAP.md` points to module-level `CONTEXT.md` files, with repo-level ADRs in `docs/adr/`.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root to find the context relevant to the task.
- The relevant module-level **`CONTEXT.md`** file listed in the map.
- **`docs/adr/`** for ADRs that touch the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates them lazily when terms or decisions actually get resolved.

## File structure

Multi-context repo:

```
/
|-- CONTEXT-MAP.md
|-- docs/adr/
|   |-- 0001-single-role-accounts.md
|   `-- 0002-separate-domain-users-from-auth-identities.md
`-- src/features/
    `-- auth/
        `-- CONTEXT.md
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal - either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) - but worth reopening because..._

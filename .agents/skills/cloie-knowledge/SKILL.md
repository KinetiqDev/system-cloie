---
name: cloie-knowledge
description: "Use when working in the System CLOIE repository and you need to find authoritative knowledge: where domain contracts, decisions, external requirements, and historical material live, how to navigate them, and how to handle conflicting sources. Covers orientation order, graphify cross-domain discovery, and verification-before-conclusion rules."
---

# CLOIE Knowledge Navigation

Orientation order for any non-trivial task in this repository:

1. **Start at `AGENTS.md`** (repo root) — project overview, engineering principles, and the reference chain.
2. **`docs/index.md`** is the documentation front door.
3. **`CONTEXT-MAP.md`** lists every bounded domain with links to its context.
4. **`src/features/<domain>/CONTEXT.md`** is the contract for one domain: terminology, rules, invariants.
5. **Read ADRs (`docs/adr/`) before any architecture change** — they record decided constraints and their rationale.

Cross-domain discovery uses the graphify knowledge graph — `graphify query "…"`, `graphify explain "X"`, `graphify path "A" "B"` against `graphify-out/graph.json` (build first with `graphify .`). Verified commands, flags, and CLOIE query patterns: [docs/tooling/graphify.md](../../../docs/tooling/graphify.md).

Authority rules:

- Verify every conclusion against implementation and tests — docs and graph output are leads, not proof.
- Historical docs (`docs/history/**`) never describe current behavior.
- `docs/capstone/guide/` and `docs/institutional/` are external authoritative requirements, not implementation specs; preserve their wording verbatim.
- `graphify-out/` is generated navigation, disposable and never authoritative.

Conflicts: never silently reconcile. Record the conflicting sources, what each says, each source's authority type, and the conflict class — implementation drift, documentation drift, outdated historical, or unresolved product intent. Full protocol and the maintenance workflow: [docs/agents/knowledge-base.md](../../../docs/agents/knowledge-base.md).

When behavior changes, update the affected CONTEXT.md, ADR, and maintained docs in the same change, then run `graphify . --update`.

Link to these documents; never copy their content here.

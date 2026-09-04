---
title: Graphify Knowledge Graph Runbook
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# Graphify Knowledge Graph Runbook

Graphify turns a folder of code and documents into a persistent knowledge graph that agents query for cross-domain navigation. In this repository it is a **navigation aid, not evidence**: graph output must always be verified against implementation and tests (same policy as static-analysis findings — see [AGENTS.md](../../AGENTS.md) and [docs/agents/fallow.md](../agents/fallow.md)). The agent-facing rules for when to consult the graph live in [docs/agents/knowledge-base.md](../agents/knowledge-base.md).

All commands below were verified against the installed binary on 2026-09-04 (`graphify --help`; build, update, cluster-only, query, path, and explain exercised on a throwaway corpus).

## Installation

- Installed as a uv tool: `uv tool install graphifyy` (note the double-y package name; the command it provides is `graphify`).
- `graphify --version` → `graphify 0.9.53`; `uv tool list` shows `graphifyy v0.9.53` providing `graphify` and `graphify-mcp`.
- The package also ships `graphify-mcp` (MCP server transport); it is not wired into this repository.

## Project-Local Skill

The project-local agent skill lives at `.agents/skills/graphify/` (`SKILL.md` plus `references/*.md` covering query/path/explain, incremental update, extraction spec, exports, hooks, and more) and was installed with:

    graphify agents install --project

Verified output: `skill installed -> .agents/skills/graphify/SKILL.md` and `references -> .agents/skills/graphify/references` ("Project-scoped install. Add to version control: `git add .agents/`"). The skill directory is committed and is the local copy of the upstream manual — consult it (or `graphify --help`) for the full command surface; this runbook does not duplicate it.

## Building and Updating

| Command                 | Verified behavior                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `graphify .`            | Full build: scans, extracts, writes `graphify-out/`, then suggests `graphify cluster-only .` to generate the report |
| `graphify . --update`   | Incremental: re-extracts only new/changed files, prunes deleted ones, replaces their nodes, and backs up the prior curated graph to a dated folder before writing |
| `graphify cluster-only .` | Re-runs clustering/community naming from the existing graph and regenerates `GRAPH_REPORT.md`, `graph.json`, `graph.html` |

After a `--update`, the build prints `incremental summary: N files cached/unchanged, M re-extracted, K deleted`. Regenerate the report with `graphify cluster-only .` when you want refreshed communities and visualization.

## Output Location

Everything graphify generates lands in `graphify-out/` (verified contents: `graph.json`, `graph.html`, `GRAPH_REPORT.md`, plus internal `cache/` and `manifest.json` state):

- The directory is **generated and disposable** — delete it and rebuild any time with `graphify .`.
- Never move generated files into `docs/`, and never commit them (`graphify-out/` is gitignored).
- `GRAPH_REPORT.md` is a generated convenience summary, **not an authoritative document**; the authoritative sources are the ones listed in [docs/agents/knowledge-base.md](../agents/knowledge-base.md).

## Exclusions (.graphifyignore)

The repo-root `.graphifyignore` controls what the scanner skips; it removes non-product noise and material that must not feed current-system retrieval. Current exclusions: `graphify-out/**` (its own output), `.obsidian/**` (local editor state), `docs/_sources/**` (raw source documents, whose Markdown transcriptions live under `docs/capstone/guide/` and `docs/institutional/`), `docs/_private/**` (restricted evidence), `docs/history/**` (historical material — retained but deliberately excluded from current-system retrieval), `.agents/skills/**` (generic agent skills), `openspec/**` (deprecated tree), and generated/build/test output (`.next/**`, `coverage/**`, `playwright-report/**`, `test-results/**`, `artifacts/**`, `node_modules/**`).

The deliberate exclusions of `docs/history/**` and `docs/_sources/**` mean graph queries only ever see current-state material; historical questions must go to the historical documents directly.

## Queries (Verified Forms)

The repository graph does not exist yet; build it with `graphify .` first. Once built (default graph path `graphify-out/graph.json`):

- `graphify query "<question>"` — BFS traversal, broad context (verified: `Traversal: BFS depth=2`, ranked nodes/edges). Flags: `--dfs` (trace a specific chain), `--budget N` (token cap, default 2000), `--graph <path>`.
- `graphify path "A" "B"` — shortest path between two nodes. Verified default is undirected; a miss reports `No directed path found ... Re-run with --undirected`. Flags: `--directed` / `--undirected`, `--graph <path>`.
- `graphify explain "X"` — plain-language explanation of a node and its neighbors (verified: node ID, source location, type, community, degree, connections).
- `graphify affected "X"` — reverse traversal to nodes impacted by `X` (from `--help`).
- `graphify god-nodes` — most-connected nodes, the architectural hubs (from `--help`).

Typical CLOIE starting points:

- Domain-contract lookup: `graphify query "responses one-response invariant lifecycle"`
- Response-to-analytics flow: `graphify path "Responses" "Analytics"` or `graphify query "how do submitted responses become analytics evidence"`
- Role-scope control: `graphify query "role scope authorization program head"`
- CILO-to-PLO mapping: `graphify path "CILO" "PLO"`
- CourseAssignment contract: `graphify explain "CourseAssignment"`
- Response-to-PLO evidence trail: `graphify path "Response" "PLO"`

Query results name nodes with `source_file`/location and edge confidence tags (`EXTRACTED`/`INFERRED`); always open the cited source before trusting a conclusion.

## Maintenance

When behavior changes, run `graphify . --update` after committing so the graph reflects the new state — this is step 13 of the knowledge-base maintenance workflow in [docs/agents/knowledge-base.md](../agents/knowledge-base.md).

## References

- Skill: `.agents/skills/graphify/SKILL.md` and `.agents/skills/graphify/references/` — the full upstream manual; last checked against graphify 0.9.53 on 2026-09-04. When the skill references drift from the installed binary, `graphify --help` is authoritative.
- Knowledge-navigation rules: [docs/agents/knowledge-base.md](../agents/knowledge-base.md)
- Domain discovery: [CONTEXT-MAP.md](../../CONTEXT-MAP.md)

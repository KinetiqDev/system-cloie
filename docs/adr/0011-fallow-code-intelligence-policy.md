# ADR 0011: Fallow Code Intelligence Policy

- **Status:** Accepted
- **Date:** 2026-08-06
- **Amendment:** 2026-08-19 — the OpenCode MCP transport (`opencode.json`) is deprecated and removed; Fallow access is CLI-only (`pnpm exec fallow …`). All other policy sections stand.
- **Contexts:** Developer Experience, Engineering Process, Architecture

## Decision

The repository adopts Fallow (pinned `2.54.3`) as its code-intelligence tool for agents and CI, governed by a durable policy: a **baseline-backed changed-file gate** in CI, **narrow seams** as the only boundary restrictions, **report-only full scans**, and **human-gated mutation**. Full-project reports never block the pipeline; only new, unmatched findings in changed files can fail the gate. Agents never delete or refactor on a finding without tracing it first.

Fallow operates on the repository as static analysis only. It does not write to the database, does not touch Supabase, and does not collect runtime telemetry.

## Context

The codebase shipped a Fallow integration (`scripts/run-fallow-audit.ts`, `.fallowrc.json`, `fallow-baselines/`) with the expectation that agents consult Fallow evidence before acting on findings and that CI gates changed files against baselines. Issue #246 formalizes that expectation into a durable policy and wires Fallow into the agent tooling as a project-local MCP server.

At initial scan the repository shows ~248 dead-code findings, ~16.7% duplication, and a `B` complexity grade. Most dead-code findings are intentional: Next.js entry points and route handlers, Server Actions, generated types, the shadcn/ui public inventory, and dynamically consumed members are framework- or convention-reachable in ways static analysis cannot see. Gating the full project on those findings today would force unrelated cleanup or blanket suppression, neither of which is this policy's purpose.

ADR 0010 precedent applies: like the appearance bootstrap and showcase, this change adds no database, auth, or caching surface. Issue #174 tracks the architectural decomposition (feature public APIs, service hotspots) that report intake feeds; this ADR does not implement it.

## Options Considered

### Unbaselined full-project gate in CI

Rejected. With ~248 current findings, a full-project gate would fail the pipeline until unrelated cleanup lands, motivating suppression and blocking merged work. A gate must measure the change, not the accumulated backlog.

### Generic architecture preset (layered, hexagonal, feature-sliced)

Rejected. Sanctioned composition here — Server Actions in feature services calling shared domain services — is misclassified by generic layer rules as an unauthorized dependency, producing false boundary violations and teaching agents to distrust the tool.

### Fallow remote/extends configuration or runtime coverage

Rejected. Remote rules and runtime coverage (paid) introduce external or licensed dependencies that are not currently justified; a self-contained project-local server with deterministic tooling is the baseline.

## Decision Details

### 1. Baseline-backed changed-file gate

- CI runs the Fallow audit gate (`scripts/run-fallow-audit.ts`) against the change base with per-category identity baselines (`fallow-baselines/{dead-code,health,dupes}.json`).
- Only new findings unmatched by the baselines in files touched by the change can fail the build; the gate's verdict is recorded in `artifacts/fallow/audit.json` and `audit.sarif`.
- Baselines are identity-based (fallow-specific issue IDs), not count-based, so they cannot mask new occurrences of a known issue.

### 2. Narrow seams only

- The enforced boundary restrictions are the two rules in `.fallowrc.json`: `ui-primitives` (`src/components/ui/**`) may import only same-zone peers and `shared`; `shared` (`src/lib/**`) may import only same-zone peers and `types`. Same-zone peer imports are automatic; the `allow` lists add the only permitted cross-zone targets.
- Every other classified zone — including `features` (`src/features/**`), `server-actions` (`src/lib/actions/**`), `routes`, and `hooks` — is unrestricted during the initial rollout, because sanctioned composition (Server Actions in feature services calling shared domain services) must not be flagged.
- Any new boundary rule requires a focused proposal naming the two modules, the direction, the invariants it protects, and the tests that prove enforcement, before it is added to the configuration.

### 3. Report-only full scans

- Full-project commands (`dead-code`, `dupes`, `health`, `flags`) are read-only and informational.
- Reports feed a focused issue intake: trace, verify protected categories, file a `ready-for-agent` issue with evidence, and link the tracked refactor (#174) instead of parallel tickets.

### 4. Human-gated mutation

- Agents and CI never run `pnpm exec fallow fix --yes`, `fix_apply` (MCP), or baseline refresh unattended.
- Fixes begin with dry-run evidence (`pnpm exec fallow fix --dry-run` / `fix_preview`), and the resulting diff goes through normal review.
- Baseline refresh (`pnpm fallow:baseline`) runs only from a clean, up-to-date `main` worktree, and its diff is reviewed before commit.

### 5. Protected categories

Next.js entry points and route handlers (`src/app/**`), Server Actions (`"use server"`), generated types (`src/types/supabase-database.ts`), the shadcn/ui public inventory (`src/components/ui/**`), dynamic consumers, and domain context (`CONTEXT.md` glossaries and invariants) are treated as intentionally reachable. Before any deletion or refactor, agents must trace the finding, check these categories, and identify the module's interface, seams, tests, and preserved authorization and lifecycle invariants.

### 6. Tooling and upgrade policy

- Fallow is accessed through the project-local CLI (`pnpm exec fallow …`). The OpenCode MCP server wiring declared in `opencode.json` was deprecated and removed on 2026-08-19.
- A Fallow version upgrade requires maintainer re-verification: rerun the guidance tests, review the command surface, regenerate baselines, and update `docs/agents/fallow.md` before relying on new capabilities.
- Only commands verified against the installed binary are documented; the binary's `--help` is authoritative over third-party references.

## Consequences

- **Positive:** agents get deterministic, project-local code intelligence; CI gates measure only change-introduced risk; sanctioned composition stays unflagged; suppression pressure is minimized because baselines capture the known backlog.
- **Negative:** full-project findings remain visible and require intake discipline to avoid noise; baselines must be regenerated and reviewed on version upgrades; the gate is a changed-file safety net, not a code-quality score.
- **Exclusions:** no database, auth, Supabase, or cache changes; no CODEOWNERS; no PR comments or GitHub Code Scanning integration; no remote rule sources; no runtime coverage; no automatic mutation.

## References

- Issue #246 — Fallow: configure agent workflow and durable policy
- Issue #174 — SC-07: establish feature public APIs and decompose service hotspots
- Retired change artifacts: the original OpenSpec change was retired with the OpenSpec deprecation (preserved in git history; see `docs/openspec-deprecation-migration-report.md`)
- Runbook: `docs/agents/fallow.md`
- Skill: `.agents/skills/fallow/SKILL.md`

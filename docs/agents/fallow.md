# Fallow Code Intelligence Runbook

Project-local Fallow analysis for agents: what is wired, what is safe, and what to do before changing code based on a finding. Policy lives in `docs/adr/0011-fallow-code-intelligence-policy.md`; agent-facing rules live in `AGENTS.md` and the `.agents/skills/fallow` skill.

## Scope And Safety

- Fallow is static analysis. A finding is **evidence, not instruction** — confirm it against the code before acting on it.
- All commands below run through the project installation (`pnpm exec fallow …`); no global or `npx` installs are documented or required.
- Fallow never writes to the database, touches Supabase, or collects runtime telemetry.
- This runbook does not implement a refactor. The tracked refactor work lives in issue #174 (SC-07 — establish feature public APIs and decompose service hotspots); report intake here feeds it, it does not replace it.

## Agent Access

The project-local Fallow MCP server wiring (`opencode.json`, `pnpm exec fallow-mcp`) was deprecated and removed on 2026-08-19. Fallow is accessed through the CLI (`pnpm exec fallow …`) or the project package scripts; agents do not rely on MCP tooling for Fallow.

## Trace-Before-Change Workflow

Before deleting **anything** Fallow reports unused — an export, a file, a dependency, a class member — or before refactoring for complexity/duplication:

1. **Trace the finding**: `pnpm exec fallow dead-code --trace <file>:<export>` (or the equivalent `audit`/`dupes`/`health` trace forms).
2. **Verify the protected categories**: `src/app/**` and route handlers (Next.js entry points), `"use server"` Server Actions, `src/types/supabase-database.ts` (generated types), `src/components/ui/**` (shadcn public inventory — intentionally unconsumed exports are fine), any dynamic consumer (`import(...)` with variables, framework-invoked members), and domain context (`CONTEXT.md` glossaries and invariants). These are treated as intentionally reachable.
3. **Propose with evidence**: for fixes use `pnpm exec fallow fix --dry-run` first (see Fixes); for refactors identify the module's interface, its seams, the tests that pin its behavior, and the authorization and lifecycle invariants the module preserves.
4. **Gate**: run `audit` against the change base before finishing the change.

## Project Commands

All verified against the installed binary (see `pnpm exec fallow --help`):

| Command | Purpose |
| --- | --- |
| `pnpm exec fallow dead-code --format json --quiet` | Unused files/exports/deps/types, circular deps, boundary violations |
| `pnpm exec fallow dupes --format json --quiet` | Duplication / clone groups |
| `pnpm exec fallow health --format json --quiet` | Complexity hotspots and refactoring targets |
| `pnpm exec fallow flags --format json --quiet` | Feature-flag patterns |
| `pnpm exec fallow audit --base <ref> --format json --quiet` | Changed-files audit with verdict (used by the CI gate) |
| `pnpm exec fallow fix --dry-run --format json --quiet` | Dry-run preview of auto-fix candidates |
| `pnpm exec fallow list --entry-points --format json --quiet` | Discovered entry points |
| `pnpm exec fallow config --path` | Which config file was loaded |

Package scripts (see `package.json`): `pnpm fallow:audit`, `pnpm fallow:dead-code`, `pnpm fallow:dupes`, `pnpm fallow:health`, `pnpm fallow:flags`, `pnpm fallow:reports`, `pnpm fallow:baseline`.

## Fixes (Dry-Run Only)

- Start every fix from dry-run evidence: `pnpm exec fallow fix --dry-run`. Review the proposed diff like any code change.
- **Never run `pnpm exec fallow fix --yes`** in CI or unattended. Prefer the dry-run preview over any mutation path.
- Low-confidence candidates that Fallow skips stay skipped; the repo does not add blanket suppressions to force them through.

## Baseline Maintenance (Human-Gated)

`pnpm fallow:baseline` regenerates `fallow-baselines/*.json`. It is **human-gated**:

- Run only from a clean, up-to-date `main` worktree, never unattended and never in CI.
- The refresh does not modify production code, but the diff must be reviewed for scope before it is committed.
- Agents must not run it as part of a feature change.

## Artifacts And Reports

- The PR gate (`scripts/run-fallow-audit.ts`, invoked by the CI workflow) writes `artifacts/fallow/audit.json` and `audit.sarif`.
- Exit codes: `0` clean/pass, `1` issues found (gate outcome), `2` tool error. The gate fails only on new findings unmatched by `fallow-baselines/*.json`; the verdict lives in the `verdict` field of the JSON.
- The complete report runner (`pnpm fallow:reports`, script `scripts/run-fallow-reports.ts`, invoked post-merge, weekly, and manually by the CI workflow) writes `artifacts/fallow/<command>.json` and `<command>.sarif` for `dead-code` (unused code and the boundary inventory), `dupes`, `health` (hotspots and targets), and `flags`. Each command runs twice — `--format json --quiet` and `--format sarif --quiet` — because `--sarif-file` is a no-op for these commands in fallow 2.54.3; SARIF is captured from stdout instead. Stale report artifacts from a previous run are removed before reporting so a failed run can never upload an outdated report.
- Report exit codes: `0` and `1` are completed report states (findings are retained in the artifacts, not failures); the runner exits `2` on a tool or configuration failure (spawn/signal failure, unexpected exit status). Reports are preserved without parsing, re-scoring, or suppression, and never run `pnpm exec fallow fix`.
- Full-project reports are read-only (`--format json --quiet` runs above) and are used for report-to-issue intake:
  1. Confirm the finding with a trace and the protected-category check above.
  2. File a focused issue naming the file, the finding type, and the traced evidence; label it `ready-for-agent`.
  3. If the finding belongs to the tracked refactor (issue #174), the stabilization tracker (issue #167), or the codebase-improvement backlog, link it there instead of creating a parallel ticket.

### Current Follow-Up Candidates

Initial reports point at these evidence-backed candidates; each needs a focused domain/seam design before any code change (see issue #174 for the refactor scope and issue #167 for the stabilization backlog — referencing them here does not implement them). The first report intake (2026-08-07) filed these focused issues:

- **Traced dead code** — unused exports/files after trace verification (e.g. framework-discovered Server Actions with non-obvious consumers must be traced before removal). Intake issue: open a new ticket per traced finding or link to #167.
- **Duplicate modules/workflows** — the duplicated evaluation/instrument workflows and mirrored respondent route families are the high-value clone clusters. Intake issues: #287 (mirrored respondent route pages), #288 (responses list-student-* service pair), #290 (fallow verification fixtures and report scripts).
- **Complexity hotspots** — health report targets; the `edit-user-by-secretary` service module is the leading hotspot candidate. Intake issues: #286 (edit-user-by-secretary, parent #174), #289 (get-student-assigned-evaluation-session, parent #174).
- **Dedicated seam designs** — future cross-domain seam work (e.g. `auth <-> users`, `instruments <-> evaluations`, layout/auth coupling); requires a focused proposal naming the module, interface, seam, preserved invariants, and migration tests.

## References

- Skill: `.agents/skills/fallow/SKILL.md`
- CLI reference: `.agents/skills/fallow/references/cli-reference.md` (note: its command TOC is ahead of the installed 2.54.3 — the binary's `--help` is authoritative)
- Policy: `docs/adr/0011-fallow-code-intelligence-policy.md`
- Change: `openspec/changes/integrate-fallow-code-intelligence/`
- Tests: `src/__tests__/config/fallow-agent-guidance.test.ts`, `src/__tests__/config/fallow-config.test.ts`

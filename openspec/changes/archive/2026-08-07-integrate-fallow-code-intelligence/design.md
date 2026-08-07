## Context

System CLOIE is a Next.js modular monolith with route composition in `src/app/`, Server Actions in `src/lib/actions/`, domain modules in `src/features/`, shared infrastructure in `src/lib/`, and Base UI primitives in `src/components/ui/`. `fallow@2.54.3` is already installed and discovers the Next.js, Vitest, ESLint, Prettier, Tailwind, Prisma, and TypeScript entry points, but `.fallowrc.json` only ignores two dependencies and no script or workflow invokes it.

The initial scan found 248 dead-code findings, 593 clone groups (16.7% duplicated lines), 185 functions over the default complexity thresholds, zero circular dependencies, and a B health score. These are useful signals, but several categories require context: the standard shadcn source inventory contains intentionally unconsumed exports, framework-discovered Server Actions can have non-obvious consumers, generated Supabase types are a contract, `react-dom` is a Next.js production dependency despite a test-only signal, and the valid `shadcn/tailwind.css` import is unresolved by Fallow's CSS resolver.

The existing workflow in `.github/workflows/ci.yml` runs lint, tests, and build for `main`; it has no full Git history, report artifact, or analysis gate. Repository Actions defaults to read-only permissions and `main` has no branch protection or CODEOWNERS policy. OpenCode has no project configuration, while `fallow-mcp` is present in the installed package and successfully exposes its stdio tool inventory at version 2.54.3.

The affected domain contexts are Identity and Access, Academic Calendar, Course Catalog and Assignments, and Academic Structure because their modules are measured by the new reports. Their terminology, lifecycle, authorization, and role-owned-route rules remain unchanged. ADRs 0001, 0002, 0003, 0005, 0006, 0008, and 0009 remain binding: no account-role, domain-identity, Course Assignment, PWA, demo-auth, or Program Head selected Program behavior is changed by this tooling.

## Goals / Non-Goals

**Goals:**

- Make Fallow a reproducible project-local tool through `pnpm` scripts and an exact package version.
- Prevent a pull request from introducing new, baseline-unmatched dead-code, duplication, complexity, or enforced-seam findings.
- Preserve legacy findings as reviewable evidence rather than making every existing contributor fix unrelated debt.
- Publish periodic complete-codebase reports that rank cleanup, duplicate-code, complexity, churn, and future refactoring work.
- Enforce only import directions proven by the current graph and make broader architectural relationships observable before they become restrictive.
- Give OpenCode agents structured local analysis and a safe trace-before-change workflow.

**Non-Goals:**

- Removing findings, auto-applying Fallow fixes, refactoring product modules, changing public feature interfaces, or converting Fallow suggestions into automatic work.
- Defining or enforcing a generic feature-sliced, hexagonal, or layered preset over System CLOIE's current domain composition.
- Restricting legitimate cross-domain relationships such as Identity and Access to Users, Course Catalog and Assignments to Academic Calendar, or the existing Server Action to feature-service composition.
- Adding CODEOWNERS, mandatory pull-request comments, Code Scanning uploads, Git hooks, runtime coverage collection, telemetry, a remote Fallow `extends` source, or an external Fallow GitHub Action.
- Creating a database migration, generated-type change, server/client rendering change, persistent application-data cache, service worker, or authorization policy change.

## Decisions

### 1. Pin and invoke the project-local Fallow CLI

`package.json` changes `fallow` from `^2.54.3` to the exact `2.54.3` already represented in `pnpm-lock.yaml`. All scripts and workflows invoke `pnpm exec fallow`, so results, baseline schema, and MCP behavior do not drift with a globally installed binary or a future compatible-range release.

The scripts expose direct analyzer commands and a small report orchestrator. The orchestrator does not parse, re-score, or suppress Fallow JSON; it only preserves every report and gives Fallow's documented process codes explicit workflow semantics:

| Script             | Purpose                                                      | Exit behavior                                                                                             |
| ------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `fallow:audit`     | Changed-file audit; caller supplies a base ref               | Exit `0` for pass/warn, `1` for unmatched error-severity findings, `2` for execution/configuration errors |
| `fallow:dead-code` | Complete dead-code/circular/seam inventory                   | Direct report command                                                                                     |
| `fallow:dupes`     | Complete clone inventory                                     | Direct report command                                                                                     |
| `fallow:health`    | Complete score, hotspot, and refactoring-target report       | Direct report command                                                                                     |
| `fallow:flags`     | Complete feature-flag inventory                              | Direct report command                                                                                     |
| `fallow:reports`   | Run and retain the complete report set                       | Treat process codes `0` and `1` as completed report states; fail on `2` or any other execution error      |
| `fallow:baseline`  | Explicitly regenerate all three committed identity baselines | Maintenance-only command                                                                                  |

`scripts/run-fallow-reports.ts` owns complete-report process handling. For each report command it runs Fallow once for JSON and once for SARIF, capturing each format from stdout because `--sarif-file` is a no-op in Fallow 2.54.3. It records the per-command result and retains artifacts when Fallow returns `1` for findings. It exits nonzero only for `2`, a spawn/signal failure, or another unexpected execution failure. This lets scheduled, manual, and post-merge reports retain legacy evidence without presenting analyzer findings as workflow failures.

`scripts/refresh-fallow-baselines.ts` owns the multi-command baseline transaction. It writes all three matching Fallow subcommands to a temporary staging directory, accepts their normal finding exit code while rejecting runtime/config failures, and validates each output's schema/version before publication. The complete validated generation is then published as one directory swap with an explicit commit point: the current `fallow-baselines/` generation is parked at `.fallow-baselines-previous`, the staged generation is renamed into `fallow-baselines/` (the commit point; readers never observe a mixed generation, though they may briefly observe none), the installed generation is re-validated, and the parked generation is removed. Any failure before the commit point restores the previous generation byte-for-byte and cleans all temporary output. An interruption is healed by the next run (after the crashed run's lock is removed), which restores the previous generation or completes a fully installed commit. After the commit point, removal of the parked generation is deferred cleanup, never a rollback. A single-writer lock file is created exclusively and never reclaimed automatically, so a concurrent or crashed refresh is refused with removal instructions. It records only static-analysis identifiers, never environment values or application data.

**Alternative rejected:** invoking `npx fallow` or a globally installed binary. Either can select a version different from the lockfile and invalidate baseline identity semantics. **Alternative rejected:** building a custom Node parser/scorecard around Fallow JSON. The CLI already owns its finding model, baseline matching, and severity behavior.

### 2. Commit identity baselines and gate changed files

The baseline files live in tracked `fallow-baselines/`, separate from `.fallow/` cache data. `.fallow/` stays ignored and is never an authoritative baseline. The `.fallowrc.json` `audit` section points to the three committed baseline paths so `fallow audit` removes baseline-matched findings from its verdict.

Baselines are refreshed only from an up-to-date clean checkout of `main`, after reviewing the complete report and configuration diff. The refresh script does not run in pull-request CI and does not accept a dirty worktree by default. A baseline update is an explicit reviewed maintenance change, not a way to silence a finding introduced by a pull request.

The Fallow policy keeps legitimate baseline evidence visible in full reports. The pull-request gate evaluates only changed files against the three identity baselines. It invokes `fallow audit` without `--fail-on-issues`: Fallow's native audit verdict exits `0` for pass or warning-only results, `1` only for unmatched error-severity findings, and `2` for runtime/configuration errors. Warning findings remain in the artifact and do not fail the job. The initial policy ignores `react-dom` as a dependency because Next.js requires it at runtime, keeps `unresolved-imports` at `warn` until the valid shadcn CSS resolver mismatch is resolved, and retains default error severity for unused dependencies, circular dependencies, dead code, duplicate exports, and enforced seam violations.

**Alternative rejected:** a count-only baseline. Deleting an old finding while introducing an unrelated new one can leave a count unchanged. **Alternative rejected:** a full-project `--fail-on-issues` gate. It would require unrelated cleanup for every change and motivate unsafe blanket suppression.

### 3. Use a separate, least-privilege code-intelligence workflow

`.github/workflows/code-intelligence.yml` owns Fallow CI; `.github/workflows/ci.yml` retains lint, tests, and build. The workflow has `contents: read`, uses `actions/checkout@v4` with `fetch-depth: 0`, and installs dependencies through the existing pinned pnpm/Node 22 pattern.

On pull requests to `main`, the workflow verifies `github.event.pull_request.base.sha` is present, then invokes `scripts/run-fallow-audit.ts` against that base SHA. The runner invokes the project-local Fallow binary once with `--format json` and once with `--format sarif`, capturing each from stdout because `--sarif-file` is a no-op in Fallow 2.54.3. It uploads the JSON and SARIF artifacts with `actions/upload-artifact@v4` using `if: always()`, then propagates the saved result. Exit `1` is the intended unmatched error-severity quality-gate failure; exit `2` is a distinct execution/configuration failure. Full history makes the base diff and churn calculation deterministic.

On a weekly schedule and `workflow_dispatch`, a non-blocking report job runs `pnpm fallow:reports` for complete dead-code, duplication, health/hotspot/target, flag, and boundary inventories. The runner treats finding exit `1` as an uploaded report result, but fails for exit `2` or another execution/configuration failure after uploading available diagnostics with `if: always()`. The job does not upload SARIF to GitHub Code Scanning, write issue comments, inspect secrets, or require `pull-requests: write`/`security-events: write` permissions. A push to `main` runs the same complete report after the merge, establishing current maintainability evidence without blocking deployment on legacy debt.

**Alternative rejected:** an external Fallow Action. Its version/input compatibility was not verified against 2.54.3 and would add another versioned execution surface. **Alternative rejected:** combining the audit into the existing build job. Keeping a separate named check makes quality-gate status, report retention, and failure ownership clear without extending test/build privileges or semantics.

### 4. Enforce only proven import seams

`.fallowrc.json` declares zones for tests, routes/proxy, Server Actions, feature modules, shared presentation, UI primitives, shared infrastructure, hooks, generated/application types, and scripts/Prisma. It explicitly restricts only two current, zero-violation directions:

| Importing zone                                          | Allowed zones                    | Evidence                                                                                                                             |
| ------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `ui-primitives` (`src/components/ui/**`)                | itself, `shared` (`src/lib/**`)  | Current primitives import peers and `@/lib/utils`; they do not import features, routes, or shared presentation.                      |
| `shared` (`src/lib/**`, excluding `src/lib/actions/**`) | itself, `types` (`src/types/**`) | Shared infrastructure has no feature/route/presentation imports; Supabase adapters legitimately import the generated database types. |

Fallow allows self imports automatically. `src/lib/actions/**` is classified before `src/lib/**` and is intentionally unrestricted because its established interface composes feature schemas and services. Routes, features, shared presentation, hooks, tests, scripts, and Prisma are classified for reporting but have no restrictive rule during this change.

This reflects actual System CLOIE seams rather than a generic preset. The known relationships `auth <-> users`, `instruments <-> evaluations`, layout/auth coupling, and feature-to-feature dependencies remain evidence for future deepening work. Any stricter policy requires a focused proposal that names the domain module, its interface, the seam being changed, preserved authorization invariants, and migration tests.

**Alternative rejected:** Fallow `feature-sliced`, `layered`, or `hexagonal` presets. They would misclassify the sanctioned Server Action/feature-service pattern and create noise rather than locality. **Alternative rejected:** no boundary zones. A no-op policy cannot detect new upward imports into shared infrastructure or UI primitives.

### 5. Integrate OpenCode through local MCP and concise durable guidance

New root `opencode.json` declares the `fallow` local MCP server as `pnpm exec fallow-mcp`, with the project-local package responsible for its version. The verified 2.54.3 server exposes analysis, changed-file audit, duplication, trace, health, feature-flag, and boundary tools; destructive fixes remain an explicit human-reviewed CLI workflow.

`AGENTS.md`, `docs/skills.md`, and `docs/agents/fallow.md` define the standard operating loop:

1. Before deleting a file, export, or dependency, trace the Fallow finding and inspect runtime/framework ownership.
2. Before a broad refactor or code review, inspect health targets, hotspot data, clone traces, and affected tests.
3. Before a pull request or commit, run the changed-code audit against the merge base.
4. Run `fix --dry-run` before any proposed Fallow fix; never run `fix --yes` in CI or as an unattended agent action.
5. Treat static results as evidence. Verify Next.js entry points, Server Actions, generated code, public shadcn inventory, and dynamic consumers before editing.

The `.agents/skills/fallow/` directory is tracked in the repository and predates this change; this change does not extend it and does not rely on it. The repository-visible guidance in this design and in `AGENTS.md` only documents commands verified by `fallow@2.54.3` and always invokes Fallow through `pnpm exec fallow`.

### 6. Record the quality-policy decision and remediation intake

`docs/adr/0011-fallow-code-intelligence-policy.md` records the durable policy: baseline-backed newly introduced debt is gated; full reports prioritize work but do not authorize changes; initial seams are intentionally narrow; telemetry, automatic mutation, and cloud/runtime collection are excluded. This prevents future contributors from weakening the gate with blanket baseline refreshes or treating a report as an instruction to bypass domain context.

`docs/agents/fallow.md` names the baseline snapshot, known exceptions, initial recurring report cadence, and remediation intake rules. It groups future work by evidence and domain: unused files/exports after trace verification, high-value duplicate service/workflow clusters, critical complexity hotspots, and future cross-domain seam design. The document references existing tracker issues #167 and #174 instead of claiming their scope.

## Risks / Trade-offs

- [Baseline updates could hide new debt] -> Refresh only from clean `main`, commit baseline deltas with their report, and keep the refresh command out of CI.
- [The audit lacks the pull-request base commit] -> Use full checkout history and the event's base SHA; treat a missing base/ref as a job failure rather than silently widening or narrowing analysis.
- [Fallow misclassifies framework conventions] -> Retain full artifacts, keep known `react-dom` handling explicit, warn on the known CSS resolver mismatch, trace before removal, and add narrow evidence-based exceptions instead of global rule disablement.
- [A restrictive zone blocks established architecture] -> Start with two zero-violation leaf/shared rules; classify remaining zones without rules; require a dedicated seam design before adding cross-domain restrictions.
- [A Fallow upgrade changes output/baseline semantics] -> Pin the package exactly, regenerate and review baselines as part of an explicit upgrade, and verify scripts/CI/MCP before merging it.
- [Agents act on static analysis as proof] -> Keep the trace-before-change protocol in AGENTS and MCP guidance; prohibit unattended `fix --yes` and baseline refreshes.
- [Scheduled reports expose sensitive data] -> Static reports contain paths, symbols, and metrics only; no runtime coverage, telemetry, application data, credentials, or generated output that embeds secrets is collected.

## Migration Plan

1. Add the pinned package scripts, Fallow policy, baseline-refresh script, initial seam zones, and ADR. Validate the policy with zero baseline and boundary regressions.
2. Generate committed identity baselines from a clean current `main` checkout. Review their content and verify a second run matches them.
3. Add the code-intelligence workflow with PR audit artifacts and scheduled/manual/full-main reports. Validate its YAML and locally reproduce its PR-base command.
4. Add local MCP configuration and agent/operations documentation. Restart OpenCode after configuration changes and verify the MCP initialization/tool inventory.
5. Run focused configuration tests, `pnpm lint`, `pnpm test`, and `pnpm build`. After merge, review the first scheduled report and create only focused remediation issues.

Rollback removes the standalone workflow, scripts, MCP entry, and policy/baseline files as one infrastructure revert. It does not require database, deployment, cache, session, or domain-data recovery. If the PR audit produces unexpected findings, retain artifacts, adjust only the reviewed Fallow configuration or baseline through a new commit, and never disable the entire workflow silently.

## Open Questions

- Should the first post-adoption remediation slice target the high-leverage `edit-user-by-secretary` module, the duplicated evaluation/instrument workflow, or the mirrored respondent route families? The answer requires a focused domain/seam design, not this tooling change.
- When Fallow gains a version-verified type-aware mode and typed Node output contract, should the project upgrade and add it to the agent workflow? This change keeps 2.54.3 capabilities only.
- Should a future governance change introduce CODEOWNERS? Ownership reports are useful, but a repository-wide ownership policy is outside this change.

## Why

System CLOIE already ships `fallow@2.54.3`, but it has no project scripts, CI gate, committed regression baselines, architecture policy, or OpenCode integration. The current static scan identifies meaningful maintainability signals, but its 248 legacy dead-code findings, 16.7% duplication, and high-complexity modules make an unbaselined full-project failure gate both noisy and unsafe.

This change turns Fallow into an evidence-based code intelligence platform: it prevents newly introduced structural debt on pull requests while giving maintainers and agents repeatable reports to prioritize deliberate cleanup and module-deepening work.

## What Changes

- Add version-accurate `pnpm` scripts for changed-code audits, full dead-code scans, duplication reports, health/hotspot reports, feature-flag inventory, and explicit baseline refreshes using the project-local Fallow binary.
- Expand `.fallowrc.json` from a dependency-ignore list into an explicit project policy: preserve known framework/runtime exceptions, define committed identity baselines, set analysis scopes, and introduce only evidence-backed architecture zones.
- Commit Fallow baselines generated from a clean `main` worktree so existing findings remain visible but only newly introduced findings fail the pull-request quality gate.
- Extend GitHub Actions with a separate code-intelligence job. It will fetch the pull-request base, run the baseline-backed changed-file audit, publish machine-readable results, and retain reports for review without requiring an unverified third-party Fallow action.
- Add scheduled and manually dispatched full-codebase reports for dead code, duplication, complexity, churn hotspots, and refactoring targets. These reports inform issue prioritization and do not automatically modify production code.
- Configure a project-local OpenCode `fallow-mcp` server and provide concise, version-aligned agent guidance for safely tracing findings before deletion or refactoring.
- Document a staged architecture-policy rollout: initially protect only proven shared/UI/route seams, report broader feature relationships, and defer cross-domain restriction until an approved domain seam design exists.
- Record how Fallow findings feed focused remediation issues, including high-value existing hotspots and duplication candidates, without bundling their product refactors into this infrastructure change.

## Capabilities

### New Capabilities

- `code-intelligence-quality-gate`: provides baseline-backed, pull-request-scoped Fallow analysis and durable CI reports for newly introduced dead code, duplication, and complexity risk.
- `codebase-intelligence-observability`: provides repeatable full-codebase health, hotspot, duplication, feature-flag, and architecture reports for maintainers and agents without treating existing findings as automatic changes.
- `architecture-seam-policy`: defines the initial Fallow-enforced import directions for verified shared, primitive, action, feature, and route seams and a controlled expansion path for domain relationships.
- `agent-code-intelligence-workflow`: makes Fallow's project-local analysis available to OpenCode agents and documents the trace-before-change workflow for cleanup and refactoring decisions.

### Modified Capabilities

- None. Existing OpenSpec specifications do not define code-intelligence CI, static-analysis policy, or agent tooling behavior.

## Impact

- **Classification:** infrastructure and maintainability work. It adds quality feedback and engineering workflow behavior; it does not change academic workflows, role-owned routes, authorization, account state, or user-visible product behavior.
- **Affected paths:** `.fallowrc.json`, `package.json`, new `.github/workflows/code-intelligence.yml`, committed Fallow baseline files, `AGENTS.md`, `docs/skills.md`, new Fallow operations documentation, and new project-level `opencode.json` MCP configuration. `.github/workflows/ci.yml` is inspected but remains unchanged. The tracked `.agents/skills/fallow/` skill predates this change and is not an input to it; repository-visible guidance documents only commands verified against the pinned `fallow@2.54.3`.
- **Architecture:** System CLOIE remains a modular monolith under `src/features/<domain>/`. Initial policy protects proven one-way seams: routes may compose modules, Server Actions may compose feature services, UI primitives may depend only on primitives and shared utilities, and shared infrastructure may not depend on feature or route modules. Existing cross-domain dependencies remain observable rather than prohibited until their domain seams are designed.
- **Baseline evidence:** the initial standard scan finds 248 dead-code issues, zero circular dependencies, 16.7% code duplication, and a B health score. The critical existing functions and duplicate role-page/service clusters become remediation candidates, not blocking preconditions for this change.
- **Known analyzer exceptions:** `react-dom` remains a production dependency required by Next.js despite a test-only-dependency signal. `src/app/globals.css` imports `shadcn/tailwind.css`, which exists in the installed package but is unresolved by Fallow's CSS resolver. Generated Supabase types, standard shadcn inventory exports, framework entry points, and Server Actions require evidence review before any removal.
- **CI and deployment:** GitHub Actions receives a read-only analysis job with `contents: read` permissions. It uploads artifacts rather than attempting Code Scanning/SARIF submission or PR comments, which would require permissions and plan assumptions not presently configured. The existing lint, test, and production-build job remains intact.
- **Data and security:** no Prisma model, SQL migration, generated Supabase type, application cache, auth configuration, telemetry, runtime coverage upload, or production credential is added. Fallow telemetry remains off; agent and CI integrations use only local static analysis.
- **Related work:** issue #174 tracks feature public APIs and service hotspots, and #167 tracks broader stabilization. This change supplies reproducible evidence for those and future focused issues without taking ownership of their product/module refactors.

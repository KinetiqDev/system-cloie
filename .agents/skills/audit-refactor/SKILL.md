---
name: audit-refactor
description: Audit the whole repository, implement verified simplifications, and prove that intended behavior is preserved.
disable-model-invocation: true
---

# Audit and simplify the codebase

Run the full process: understand, audit, prioritize, refactor, verify, and review. Continue through implementation unless the user requests findings only. Prefer deletion and existing implementations over new layers. Reduce concepts without making code harder to read.

Use the [reusable audit prompt](references/prompt.md) when starting another audit. Consult the [skill references](references/skills.md) at the relevant steps.

## 1. Establish scope and contracts

1. Inspect the working tree before editing. Record existing changes so you can separate your work from the user's work.
2. Read the repository's engineering rules, domain contexts, architecture decisions, package manifests, and CI configuration.
3. Map every major domain and execution path, including routes, components, state, authorization, data access, schemas, scripts, tests, and dependencies.
4. Keep an audit coverage list. Record inspected areas, excluded generated or external material, and unresolved areas.
5. Inspect the available skills. Read the narrowest relevant guidance before applying a technique. Use the selection prompt in the skill references.
6. Record the behavior each proposed change must preserve: public interfaces, routes, authorization, privacy, data contracts, transactions, accessibility, and responsive interactions.

In System CLOIE, start at `CONTEXT-MAP.md`, then read the affected domain's `CONTEXT.md` and relevant `docs/adr/` decisions. Treat generated graph data as navigation, not evidence.

Complete this step when every major area has an owner or an explicit exclusion, and the protected contracts are recorded.

## 2. Capture the baseline

1. Discover verification commands from the manifest and CI. Record commands, environments, exit statuses, and meaningful output.
2. Run the applicable tests, type checks, lint checks, formatting checks, and production build before editing.
3. Run Fallow using its installed command surface and project configuration. Capture whole-repository dead-code, duplication, and health reports.
4. Record source lines, file counts, dependency counts, and static-analysis findings with commands that can reproduce the measurements.
5. Check database and browser prerequisites before running integration checks. Use a verified disposable database for mutable scenarios.
6. Record existing failures separately from new failures. Preserve the checks and meaningful assertions.

Keep reports and throwaway scripts outside tracked source where practical. Limit raw output to relevant summaries and retain the complete artifact for investigation.

Complete this step when the baseline distinguishes working checks, existing failures, and checks blocked by missing prerequisites.

## 3. Audit and trace candidates

Inspect each area for the following problems:

- Dead code, unused dependencies, abandoned flags, obsolete schemas, compatibility paths, and unreachable scripts.
- Delegating wrappers, one-product factories, single-implementation interfaces, unnecessary providers, and excessive indirection.
- Duplicate business rules, answer projections, validation, persistence, configuration, or markup that already has a shared owner.
- State, effects, memoization, callbacks, and defensive branches that do not preserve a real behavior.
- Large modules with unrelated responsibilities, or fragmented workflows that require unnecessary file jumps.
- Custom components that duplicate the existing component system, including inconsistent hard-coded values or routes.
- Tests for removed behavior, exact source text, incidental wiring, obsolete architecture, or duplicated assertions without additional coverage.
- Comments that narrate the code instead of explaining a domain rule, constraint, security decision, or external workaround.

Treat Fallow results as leads. For each significant candidate:

1. Read the implementation and its domain contract.
2. Trace imports, language-server references, re-exports, dynamic loads, subprocess arguments, configuration, routes, and framework entry points.
3. Read the consumer behavior and relevant tests.
4. Distinguish an unused export modifier from an unused body. A locally called function still has a purpose.
5. Compare duplicated implementations statement by statement. Check errors, precedence, ordering, timestamps, row shapes, fallbacks, and side effects.
6. Apply the deletion test: determine whether removing the module removes complexity or merely pushes complexity into callers.
7. Record the minimal replacement, affected callers, preserved invariants, regression risk, and expected reduction.

Preserve framework entry points, Server Actions, generated types, public UI inventory, and dynamic consumers until tracing proves the specific code unreachable. File size and low consumer count alone do not justify a refactor.

For System CLOIE, follow ADR 0011 and `docs/agents/fallow.md`. Preview supported Fallow fixes before mutation. Leave committed baselines unchanged unless the repository's refresh conditions are met.

Complete this step when every recommended cut has caller evidence and a behavioral verification plan. Assign each remaining lead a disposition: implement, retain with reason, defer with reason, or blocked with a named prerequisite.

## 4. Prioritize and delegate

1. Separate verified correctness, security, integrity, and reliability defects from simplification findings.
2. Rank findings by priority, then by expected conceptual reduction and net code reduction within each priority.
3. Implement P0 defects first when the authorized scope permits the fix. Surface contract-breaking changes before proceeding.
4. Implement P1 improvements and high-confidence P2 cuts. Leave subjective P3 cleanup alone unless another change makes it necessary.
5. After initial inspection, delegate independent areas when delegation improves coverage or throughput.
6. Give each worker exact owned paths, requirements, shared interfaces, preserved invariants, and expected evidence.
7. Give overlapping files one integration owner. Require read-only audit workers to return findings without edits.

Use this priority scale:

- P0: a verified defect that threatens correctness, security, integrity, or production reliability.
- P1: duplication, dead implementation, or unnecessary architecture that materially harms maintainability.
- P2: a clear local simplification with low regression risk.
- P3: a cosmetic or subjective change with little measurable benefit.

Workers finish their edits without running shared builds, tests, lint, or formatters. The integration owner runs checks after each completed batch. Sequential verification avoids concurrent builds, shared fixture mutations, and duplicate check runs.

Complete this step when selected findings have bounded ownership and the parent retains responsibility for integration and verification.

## 5. Apply complete, incremental refactors

1. Make the smallest change that removes the verified problem.
2. Reuse an existing authoritative implementation before adding a helper. Add a shared module only for real consumers or a concrete domain contract.
3. Keep authorization and eligibility at their existing owners. Share persistence or derivation only where the behavior is identical.
4. Preserve transaction ownership, lock-before-read ordering, section scope, replacement semantics, error messages, and finalized-state rules.
5. Migrate every affected caller. Remove obsolete imports, aliases, wrappers, test mocks, and inventory entries in the same batch.
6. Remove tests for deleted behavior. Retain behavior-level coverage for surviving workflows.
7. Add a regression test only for a plausible consumer-visible failure or uncertain edge. Test boundaries, precedence, transitions, and errors rather than copies of the implementation.
8. Keep useful reasoning comments. Remove narrated code and commented-out implementations in the touched area.

Complete each batch when the old path is removed, every caller uses the intended path, and the changed behavior is ready to exercise.

## 6. Prove behavior and investigate failures

1. Run targeted tests for the completed batch.
2. Exercise the real changed path. Tests alone do not prove runtime behavior.
3. For UI changes, use the running application at representative desktop and mobile sizes. Check navigation, controls, labels, keyboard access, and horizontal overflow.
4. For persistence changes, exercise real writes against a verified disposable database. Prefer rollback-isolated checks when existing fixture data must remain unchanged.
5. Verify invariants with independent expected values: section isolation, full submission replacement, frozen timestamps, double-submit rejection, and post-submission write rejection where applicable.
6. Diagnose every failure. Compare the failure with the baseline and trace the changed execution path before changing code.
7. If a test races an asynchronous transition, await that transition at the test's interaction boundary. Keep the assertions and production contract intact.
8. After fixes, run targeted checks and the broadest practical suite sequentially: tests, type checks, lint, formatting, production build, integration checks, and Fallow.

Do not obtain a green result by weakening assertions, increasing timeouts without evidence, adding ignores, disabling rules, or removing meaningful coverage. A failed-then-passed retry is flaky evidence, not a clean first-run result.

If a browser fixture has already been consumed, preserve the existing data. Use another isolated fixture or a rollback scenario. Report which journey remains unverified and the prerequisite needed to run it.

Complete this step when every changed contract has exercised evidence, introduced failures are resolved, and unavailable checks have precise limitations.

## 7. Review, measure, and deliver

1. Review the actual task diff against the starting snapshot. Separate any pre-existing user changes.
2. Check that each new helper removes more concepts than it adds. Look for missed duplicates and unnecessary exported types.
3. Recheck authorization, privacy, responsive behavior, caller migration, test value, and important comments.
4. For substantial independent changes, obtain focused reviews of server behavior and frontend behavior. Resolve blocking findings.
5. Update maintained architecture or domain documentation when ownership or behavior changes. Record a new ADR only for a durable cross-cutting decision.
6. Remove throwaway scripts and temporary fixtures after smoke proof. Stop owned services and close owned browser sessions.
7. Rerun affected verification after the final review or edit.
8. Compare baseline and final measurements using the same scope and commands.
9. Report completed changes, retained findings, verification results, existing failures, and exact blockers. Commit or push only when the user requests that action.

Use the following report structure:

- Highest-priority findings and the simplifications implemented, largest cuts first.
- Dead code removed, authoritative logic reused, and tests removed, migrated, or added with reasons.
- Source lines, files, exports, dependencies, duplication, and test counts before and after when measured.
- Exact verification commands and observed results, including runtime smoke checks.
- Remaining issues and unavailable verification, with reasons and prerequisites.

End only when the authorized deliverable is complete or a named prerequisite blocks the remaining work. Do not claim that regressions are impossible. State what the exercised checks establish.

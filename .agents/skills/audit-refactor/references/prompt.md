# Reusable audit prompt

The prompt below requests the full workflow. A findings-only request is a separate scope.

## Full audit through implementation

```text
Use /audit-refactor for this repository.

Act as a senior engineer responsible for simplifying the current codebase while preserving intended behavior. Audit the whole tree rather than only the current diff. Proceed from investigation through implementation, verification, testing, and final review.

Inspect the skills available in this environment. Read the narrowest relevant instructions before use. Consider additional skills for the framework, architecture, components, domain contracts, database, testing, diagnosis, and review. Follow repository-specific rules over generic advice. Name conflicting guidance instead of silently mixing workflows.

First map the domains, execution paths, contracts, tests, scripts, configuration, and dependencies. Capture baseline verification and run Fallow. Keep a coverage list so every major area is accounted for.

Find dead code, duplicate responsibilities, obsolete tests, unnecessary wrappers, premature abstractions, excessive state, fragmented workflows, and bloated implementations. Trace consumers, dynamic usage, framework conventions, and domain invariants before recommending deletion or refactoring.

Rank concrete findings as P0, P1, P2, or P3. Rank the largest useful cuts first within each priority. Separate correctness and security defects from simplification findings. Preserve public interfaces, routes, database behavior, authorization, privacy, accessibility, responsive interactions, and business rules unless a verified defect requires an authorized change.

Implement P0 and P1 changes within scope, then high-confidence P2 improvements. Prefer deletion, direct code, existing components, and one authoritative implementation. Avoid speculative abstractions and broad rewrites. Migrate every affected caller and remove obsolete paths in the same batch.

Delegate independent areas when delegation improves coverage. Keep one integration owner. Give workers non-overlapping files and explicit preserved contracts. Workers return findings or completed edits without running shared checks. Run verification sequentially after each integrated batch.

Retain meaningful behavior tests. Remove tests for deleted behavior, source-text assertions, incidental wiring, and obsolete architecture. Add regression coverage for plausible consumer-visible failures or uncertain edges. Preserve assertions when correcting asynchronous test races.

Exercise the changed code in the real runtime. Check UI workflows at desktop and mobile sizes. Use a verified disposable database for mutable checks. Prefer rollback-isolated scenarios when existing fixture data must remain unchanged.

Run targeted checks, then the broadest practical tests, type checks, lint, formatting, build, integration checks, and Fallow. Diagnose failures against the baseline. Resolve introduced regressions without weakening checks. Report existing failures and unavailable verification with exact evidence and prerequisites.

Review the final task diff. Update affected maintained documentation, remove temporary artifacts, and rerun affected verification after the final edits. Commit or push only if I request that action separately.

Finish with a concise report: highest-priority findings, completed cuts, architectural reuse, test changes and reasons, Fallow results, reproducible before-and-after measurements, verification commands and results, and remaining issues. Distinguish exercised evidence from inference. Do not claim that regressions are impossible.
```

## Optional constraints

These additions narrow the prompt without changing the verification requirement:

- Named subsystem: "Limit implementation to the named subsystem. Record findings elsewhere without changing those files."
- Dependency freeze: "Keep dependency versions and the lockfile unchanged."
- Existing local data: "Preserve local data. Use rollback checks or an isolated database for mutable verification."
- Findings only: "Stop after the verified ranked findings. Apply no edits."
- Commit request: "After successful verification and review, create focused Conventional Commits. Do not push."

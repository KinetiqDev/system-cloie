# Codebase Intelligence Observability

## Purpose

Define reproducible Fallow reports and safe, explicit baseline maintenance for repository-wide maintainability evidence.

## Requirements

### Requirement: Maintainers can run reproducible code-intelligence reports

The repository SHALL expose `pnpm` scripts for complete dead-code, duplication, health/hotspot/target, and feature-flag analysis using the pinned project-local Fallow version. These report scripts SHALL not modify source code or baseline files. A report orchestrator SHALL retain findings emitted with process code `0` or `1` and SHALL fail only on Fallow process code `2` or another unexpected execution error.

#### Scenario: Maintainer requests a full health report

- **WHEN** a maintainer runs the documented health script
- **THEN** the report includes project health, complexity findings, churn hotspots, and refactoring targets from the current checkout without modifying application files

#### Scenario: Maintainer requests duplicate-code evidence

- **WHEN** a maintainer runs the documented duplication script
- **THEN** the report identifies clone groups and their source locations without extracting, suppressing, or deleting code

### Requirement: Complete codebase reports run outside the pull-request gate

The repository SHALL run complete code-intelligence reports on `main` after a merge and through scheduled or manually dispatched workflows. Complete reports SHALL be retained as artifacts and SHALL not fail solely because of legacy baseline findings.

#### Scenario: Scheduled report observes legacy complexity hotspots

- **WHEN** the scheduled code-intelligence workflow finds a pre-existing critical complexity hotspot
- **THEN** it uploads the complete report for prioritization without changing the hotspot or failing unrelated product delivery

#### Scenario: Manual report is requested

- **WHEN** a maintainer manually dispatches the code-intelligence workflow
- **THEN** the workflow produces the same complete report set as the scheduled run against the selected repository revision

#### Scenario: Full report finds existing error-severity evidence

- **WHEN** a complete report command returns process code `1` after finding existing error-severity evidence
- **THEN** the orchestrator retains the complete artifacts and the scheduled, manual, or post-merge workflow does not fail solely for those findings

#### Scenario: Full report cannot execute

- **WHEN** a complete report command returns process code `2` or another unexpected execution error
- **THEN** the orchestrator uploads available diagnostics and the workflow fails so maintainers can repair the analyzer or configuration

### Requirement: Baseline changes are explicit and reviewable

The repository SHALL store dead-code, health, and duplication identity baselines in tracked files. A baseline refresh SHALL run only through the documented explicit command from a clean current `main` checkout and SHALL fail if the analyzer cannot produce all three baseline types. It SHALL stage and validate the complete set before publication and SHALL publish the generation with an explicit commit point: any failure or interruption before the commit point leaves the prior set unchanged, an interruption at or after the commit point retains the complete new generation, and the next run SHALL heal either state. A mixed generation SHALL never be published.

#### Scenario: Maintainer refreshes a baseline from clean main

- **WHEN** a maintainer runs the documented baseline refresh command from an up-to-date clean `main` checkout
- **THEN** the command replaces all three tracked baseline files with outputs from the pinned analyzer version

#### Scenario: Maintainer attempts a baseline refresh from a dirty worktree

- **WHEN** a maintainer runs the baseline refresh command with tracked or untracked worktree changes
- **THEN** the command refuses to overwrite baselines and explains that baselines must represent a reviewed clean `main` state

#### Scenario: One baseline command fails during a refresh

- **WHEN** one analyzer command fails or produces invalid output after another baseline output has been staged
- **THEN** the command removes temporary output, exits unsuccessfully, and leaves every existing tracked baseline unchanged

#### Scenario: A refresh is interrupted before the commit point

- **WHEN** a refresh is interrupted (or fails) after staging output but before the staged generation becomes reader-visible
- **THEN** the next run (after the crashed run's lock file is removed) heals the state: the previous generation is restored byte-for-byte, abandoned temporary output is removed, and the refresh proceeds

#### Scenario: A refresh is interrupted at or after the commit point

- **WHEN** a refresh is interrupted after the staged generation has become reader-visible but before the parked generation is removed
- **THEN** the next run (after the crashed run's lock file is removed) completes the commit: the fully installed generation is retained and the parked generation is removed

#### Scenario: A refresh runs while another refresh is active

- **WHEN** a second refresh is invoked while the single-writer lock is held (including a lock left by a crashed refresh)
- **THEN** the command refuses with the recorded lock owner and explicit removal instructions, and never modifies the lock, staging, parked, or published generations

# Agent Code Intelligence Workflow

## Purpose

Define project-local Fallow access and safe agent behavior when static analysis identifies cleanup or refactoring candidates.

## Requirements

### Requirement: OpenCode agents can access project-local Fallow analysis

The repository SHALL configure an OpenCode local MCP server that executes the Fallow version installed by the project. Agent guidance SHALL document only Fallow capabilities verified for that pinned version.

#### Scenario: Agent starts in the repository after dependency installation

- **WHEN** an OpenCode session loads the project configuration
- **THEN** the session can invoke the local Fallow MCP analysis tools without a globally installed Fallow binary or a remote credential

#### Scenario: Installed Fallow version changes

- **WHEN** a change updates the pinned Fallow version
- **THEN** maintainers verify the MCP initialization and revise project guidance before documenting newly available commands

### Requirement: Agents verify a finding before changing code

Before deleting an export, file, dependency, or class member based on a Fallow finding, an agent SHALL trace the finding and inspect framework, generated-code, public-inventory, dynamic-consumer, and domain-context evidence. Before refactoring for complexity or duplication, an agent SHALL identify the affected module interface, seam, existing tests, and preserved behavior.

#### Scenario: Fallow marks a Server Action export unused

- **WHEN** an agent receives an unused-export finding for a Server Action
- **THEN** the agent traces its consumers and verifies the applicable Next.js form/action usage before proposing removal or suppression

#### Scenario: Fallow marks a complex domain module as a refactoring target

- **WHEN** an agent uses a health report to prioritize a complex feature module
- **THEN** the agent preserves the module's domain authorization and lifecycle behavior and proposes a focused seam design before restructuring it

### Requirement: Automated Fallow mutation remains human-reviewed

Agents and CI SHALL NOT execute `fallow fix --yes` or refresh committed baselines as an unattended action. Any proposed Fallow fix SHALL start with a dry run and reviewable diff.

#### Scenario: Agent identifies auto-fixable unused exports

- **WHEN** an agent finds auto-fixable unused exports
- **THEN** it runs or presents a dry-run preview and waits for normal code review before applying changes

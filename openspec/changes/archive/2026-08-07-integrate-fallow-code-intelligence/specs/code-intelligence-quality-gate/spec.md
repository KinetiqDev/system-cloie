## ADDED Requirements

### Requirement: Pull requests receive a baseline-backed Fallow quality gate

The repository SHALL run project-local Fallow analysis for every pull request targeting `main`. The gate SHALL compare changed-file findings with committed dead-code, health, and duplication identity baselines and SHALL fail only when the pull request introduces an unmatched error-severity finding. It SHALL use Fallow's native audit verdict without `--fail-on-issues`, where exit `0` represents pass or warning-only results, exit `1` represents an error-severity finding, and exit `2` represents an execution or configuration error.

#### Scenario: Pull request introduces an unmatched dead-code finding
- **WHEN** a pull request targeting `main` introduces an error-severity dead-code finding in a changed file that is absent from the committed dead-code baseline
- **THEN** the code-intelligence job fails after publishing the audit reports

#### Scenario: Pull request touches legacy code with an existing baseline finding
- **WHEN** a pull request changes a file that has a finding recorded in the corresponding committed baseline without introducing a new finding
- **THEN** the job does not fail solely because of that baseline-matched finding

#### Scenario: Pull request introduces a warning-severity finding
- **WHEN** a pull request targeting `main` introduces an unmatched warning-severity finding in a changed file
- **THEN** the audit produces a warning result, retains the finding in its artifacts, and the job exits successfully

#### Scenario: Pull request base cannot be resolved
- **WHEN** the code-intelligence job cannot obtain the pull request base commit required for changed-file analysis
- **THEN** the job fails with a configuration error and does not substitute a full-project or unknown-base audit

#### Scenario: Audit process fails before producing a verdict
- **WHEN** Fallow exits with process code `2` because of an invalid configuration, unavailable base ref, or another execution failure
- **THEN** the job publishes every artifact that was produced and fails as an execution/configuration error rather than reporting a quality-gate regression

### Requirement: Quality-gate reports remain available after success or failure

The pull-request job SHALL produce machine-readable JSON and SARIF audit reports by running the project-local audit once for each format and capturing each report from stdout. It SHALL not rely on `--sarif-file`, which is a no-op in Fallow 2.54.3. The job SHALL upload every report produced before status propagation whether the audit passes or fails.

#### Scenario: Pull request audit fails
- **WHEN** the changed-file audit returns an unmatched error-severity finding
- **THEN** the workflow retains the generated JSON and SARIF artifacts before reporting the failing job result

#### Scenario: Pull request audit passes
- **WHEN** the changed-file audit has no unmatched error-severity finding
- **THEN** the workflow retains the generated JSON and SARIF artifacts for review

#### Scenario: Audit execution fails after producing diagnostics
- **WHEN** Fallow returns process code `2` after producing one or more audit reports
- **THEN** the workflow uploads every available JSON or SARIF report before failing the job as an execution/configuration error

### Requirement: The quality gate uses least-privilege local analysis

The code-intelligence workflow SHALL invoke the Fallow version installed from the repository lockfile and SHALL require only repository-content read access. It SHALL NOT upload results to GitHub Code Scanning, write pull-request comments, enable telemetry, invoke a remote Fallow configuration, or execute automated source fixes.

#### Scenario: Workflow executes on an untrusted pull request
- **WHEN** the code-intelligence workflow analyzes a pull request
- **THEN** it uses the checked-out project-local Fallow binary with read-only repository permissions and does not require a write token or a project secret

## ADDED Requirements

### Requirement: Dedicated demo authentication is deployment-scoped and fail-closed
The system MUST expose dedicated demo authentication only when the server is running in an explicitly identified isolated demo deployment with the required server-only signing secret and configured demo-user allowlist. The primary public Production deployment MUST remain OAuth-only.

#### Scenario: Demo authentication is disabled by default
- **WHEN** the dedicated demo deployment configuration is absent, incomplete, or invalid
- **THEN** the demo role switcher is not rendered, the demo login route is unavailable, and normal OAuth entry remains unchanged

#### Scenario: Primary Production receives demo configuration
- **WHEN** the server identifies itself as the primary public Production deployment, even if a demo flag or secret is present
- **THEN** dedicated demo authentication remains unavailable and the server does not create a demo session

#### Scenario: Dedicated demo deployment has valid configuration
- **WHEN** an isolated demo deployment has the explicit demo marker, signing secret, and non-empty allowlist configured
- **THEN** the server may render the demo role switcher and accept the dedicated demo login flow

### Requirement: Demo role switching uses the seeded role catalog
The system MUST reuse the configured seeded demo-user catalog and MUST accept only a catalog identifier or email that resolves to an allowlisted seeded account. The client MUST NOT choose or submit an authorization role as the source of truth.

#### Scenario: User selects a configured demo account
- **WHEN** a user selects a demo account shown by the role switcher
- **THEN** the server resolves the account from the server-side catalog and creates a session only for the matching active Prisma user

#### Scenario: User submits an unknown demo account
- **WHEN** a request submits an email or identifier that is not in the configured allowlist and catalog
- **THEN** the server rejects the request without querying or creating a session for an arbitrary account

#### Scenario: Client submits a different role than the catalog role
- **WHEN** a request attempts to pair a known demo account with a different client-provided role
- **THEN** the server ignores or rejects the client role and derives the active account role from the Prisma user record

### Requirement: Demo sessions are integrity-protected and short-lived
The system MUST use a separate, signed, httpOnly demo-session cookie for dedicated demo authentication. The cookie MUST contain no authorization decision that is not re-derived server-side, MUST expire within the configured short lifetime, and MUST be rejected when its signature, format, or expiry is invalid.

#### Scenario: Valid demo session is read
- **WHEN** a request presents a well-formed unexpired demo cookie with a valid signature and allowlisted user identifier
- **THEN** the server resolves the corresponding Prisma user and continues through the normal authentication snapshot and route authorization flow

#### Scenario: Demo session is forged or malformed
- **WHEN** a request presents a missing, malformed, tampered, or incorrectly signed demo cookie
- **THEN** the server treats the request as unauthenticated and does not use cookie-provided role, email, or scope data

#### Scenario: Demo session expires
- **WHEN** a request presents a demo cookie past its expiry time
- **THEN** the server treats the request as unauthenticated and clears or replaces the expired cookie where the response can do so

### Requirement: Demo identity does not bypass authorization or account-state rules
Dedicated demo authentication MUST supply identity only. Existing server-side role access, account-state, program scope, Course Assignment ownership, respondent eligibility, and mutation authorization MUST remain authoritative for demo sessions.

#### Scenario: Complete demo account opens its authorized route
- **WHEN** a complete active demo account requests a route allowed for its active account role
- **THEN** the route renders the same authorized read model and scope as the corresponding real account state

#### Scenario: Demo account requests a wrong-role route
- **WHEN** an authenticated demo account requests a route outside its active account role
- **THEN** the existing unauthorized or role-aware redirect behavior applies

#### Scenario: Demo account lacks a required role condition
- **WHEN** a demo account is inactive, incomplete, unverified, lacks active enrollment or affiliation, or lacks required program/course ownership
- **THEN** the existing account-status, onboarding, access-denial, or empty-result behavior applies without a demo bypass

### Requirement: Demo deployment data is isolated and resettable
The dedicated demo deployment MUST use an isolated demo database or dataset containing no primary institutional data. Demo data and mutations MUST be resettable through an idempotent documented procedure.

#### Scenario: Demo deployment is provisioned
- **WHEN** the demo deployment is prepared for browser testing or demonstration
- **THEN** its database connection and seeded fixtures are verified as isolated from the primary public Production dataset

#### Scenario: Demo data is reset
- **WHEN** an operator runs the documented reset procedure
- **THEN** the seeded demo accounts and supporting academic data return to the known baseline without changing the primary Production dataset

### Requirement: Production-build browser evidence identifies demo authentication limits
The system's browser-evidence procedure MUST allow the dedicated demo session for production-mode route, rendering, and performance measurements while explicitly identifying that the trace does not measure OAuth exchange or OAuth callback latency.

#### Scenario: Performance trace uses the dedicated demo deployment
- **WHEN** an operator captures a production-build trace from the dedicated demo deployment
- **THEN** the evidence records the deployment class and authentication mode, captures the required LCP and network data, and excludes credentials, cookies, tokens, and private response bodies

#### Scenario: OAuth latency is evaluated
- **WHEN** an operator needs to measure Google OAuth or Supabase Auth exchange latency
- **THEN** the operator uses a separate real Supabase-authenticated evidence path rather than treating a signed demo-session trace as OAuth evidence

### Requirement: Development authentication remains separate
The existing `cloie_dev_auth` cookie, development role switcher behavior, and `POST /api/auth/dev-login` route MUST remain development-only and MUST NOT be enabled by the dedicated demo configuration.

#### Scenario: Production-mode server receives the development login request
- **WHEN** a production build or deployed server receives `POST /api/auth/dev-login`
- **THEN** the route remains unavailable regardless of dedicated demo configuration

#### Scenario: Dedicated demo server receives the demo login request
- **WHEN** a valid dedicated demo deployment receives the separate demo login request
- **THEN** it uses the dedicated signed demo session contract and does not write `cloie_dev_auth`

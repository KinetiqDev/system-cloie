## ADDED Requirements

### Requirement: Role-specific acknowledgement trigger
The system SHALL open the legal acknowledgement experience only after a visitor activates a role-specific Google authentication action from the public role selection portal.

#### Scenario: Visitor selects a configured role
- **WHEN** a visitor activates `Continue as Student`, `Continue as Alumni`, `Continue as Industry Partner`, `Continue as Faculty`, `Continue as Program Head`, `Continue as Dean`, or `Continue as Secretary`
- **THEN** the system opens the acknowledgement dialog with the selected role and does not start OAuth yet

#### Scenario: Visitor only views a portal
- **WHEN** a visitor opens `/portal/staff` or `/portal/respondents` without activating a role action
- **THEN** the acknowledgement dialog remains closed and no OAuth request is made

### Requirement: Concise legal summary and actions
The acknowledgement dialog SHALL contain concise Privacy Notice and Terms of Use summaries, links to `/privacy` and `/terms`, a required acknowledgement checkbox, `Cancel`, and `Agree and Continue with Google`.

#### Scenario: Dialog content is presented
- **WHEN** the acknowledgement dialog opens
- **THEN** the dialog exposes an accessible title and description, both legal summaries, both full-document links, the acknowledgement checkbox, `Cancel`, and `Agree and Continue with Google`

#### Scenario: Visitor cancels acknowledgement
- **WHEN** the visitor activates `Cancel`, the close control, or Escape
- **THEN** the dialog closes, no OAuth request starts, and the acknowledgement state is reset for the next role attempt

### Requirement: Required acknowledgement gates OAuth
The system MUST NOT start Google OAuth from a role-specific public action until the visitor has checked the required acknowledgement checkbox.

#### Scenario: Checkbox is unchecked
- **WHEN** the acknowledgement checkbox is unchecked
- **THEN** `Agree and Continue with Google` is disabled or otherwise non-activatable and no OAuth request is started

#### Scenario: Checkbox is checked
- **WHEN** the visitor checks the acknowledgement checkbox and activates `Agree and Continue with Google`
- **THEN** the system proceeds to the acknowledgement ticket step and starts OAuth only after that step succeeds

#### Scenario: Visitor unchecks before continuing
- **WHEN** the visitor checks the acknowledgement checkbox and then unchecks it
- **THEN** the primary action becomes unavailable again and OAuth remains unstarted

### Requirement: Intent-bound acknowledgement ticket
Before starting OAuth, the system SHALL issue a short-lived, signed acknowledgement ticket bound to the selected role intent and current Privacy Notice and Terms of Use versions.

#### Scenario: Valid acknowledgement ticket is issued
- **WHEN** the visitor submits a valid acknowledgement for a recognized role intent and current legal versions
- **THEN** the server issues a secure, httpOnly, same-site, short-lived ticket without placing identity or authorization data in the ticket payload

#### Scenario: Invalid acknowledgement request
- **WHEN** the acknowledgement endpoint receives an unknown intent, malformed body, or stale legal version
- **THEN** the server rejects the request, does not issue a ticket, and the dialog exposes a recoverable error without starting OAuth

#### Scenario: Network or server failure before OAuth
- **WHEN** the acknowledgement ticket request fails
- **THEN** the system does not start OAuth, clears its submitting state, and allows the visitor to retry or cancel

### Requirement: Preserve the selected role through OAuth
The system SHALL preserve the selected role using the existing validated callback intent contract when OAuth starts after acknowledgement.

#### Scenario: Student intent is continued
- **WHEN** a visitor acknowledges the documents from the Student role action
- **THEN** the OAuth callback request carries `intent=student`

#### Scenario: Industry Partner intent is continued
- **WHEN** a visitor acknowledges the documents from the Industry Partner role action
- **THEN** the OAuth callback request carries the canonical `intent=industry-partner` value accepted by the callback

#### Scenario: All configured roles are continued
- **WHEN** the visitor acknowledges any configured role action
- **THEN** the callback intent matches that role and no role is replaced by a client-selected fallback or another role

### Requirement: Callback ticket validation
The authentication callback SHALL verify the acknowledgement ticket before continuing account creation, account linking, or post-login destination resolution.

#### Scenario: Valid ticket and OAuth code
- **WHEN** the callback receives a valid OAuth code and a valid, unexpired, correctly signed ticket whose intent matches the callback intent
- **THEN** the callback proceeds through the existing Supabase exchange and account-resolution flow

#### Scenario: Missing or invalid ticket
- **WHEN** the callback receives an OAuth code without a valid matching acknowledgement ticket
- **THEN** the callback rejects the acknowledgement-gated flow, does not create or link a domain account, and redirects to a safe public acknowledgement or role-selection recovery destination

#### Scenario: Expired or stale ticket
- **WHEN** the callback receives a ticket past its expiry or tied to an outdated legal version
- **THEN** the callback rejects the ticket and does not continue account creation or linking

#### Scenario: Ticket intent mismatch
- **WHEN** the callback intent differs from the intent encoded in the ticket
- **THEN** the callback rejects the ticket and does not treat either client value as authorization

#### Scenario: Ticket is cleared after callback attempt
- **WHEN** the callback handles a valid or invalid acknowledgement ticket
- **THEN** the ticket is cleared or invalidated so it is not retained as a reusable browser credential

### Requirement: Preserve existing server-side authorization behavior
Legal acknowledgement SHALL NOT replace or weaken existing callback validation for the stored `UserRole`, internal ACD email requirements, pre-provisioned roles, onboarding gates, inactive accounts, external verification, or post-login destination resolution.

#### Scenario: Stored role differs from selected intent
- **WHEN** a valid legal ticket accompanies an OAuth callback whose selected intent differs from the stored account role
- **THEN** the existing role-mismatch handling signs out or rejects the flow and does not switch or add an account role

#### Scenario: Internal role uses an invalid email domain
- **WHEN** a valid legal ticket accompanies a callback for an internal role authenticated with a non-ACD email
- **THEN** the existing invalid-domain handling rejects the flow

#### Scenario: Pre-provisioned role is not provisioned
- **WHEN** a new or roleless account uses a valid legal ticket for Secretary, Dean, or Program Head without required provisioning
- **THEN** the existing pre-provisioning handling rejects the self-service claim

#### Scenario: Existing account state requires onboarding or status handling
- **WHEN** a valid legal ticket accompanies an otherwise successful callback for an incomplete, deferred, pending, rejected, or inactive account
- **THEN** the existing profile-gate or status destination remains authoritative

### Requirement: Accessible modal interaction
The acknowledgement dialog SHALL be operable with keyboard and assistive technology and SHALL manage focus using the existing Base UI Dialog primitive.

#### Scenario: Dialog opens from keyboard
- **WHEN** a visitor activates a role action with the keyboard
- **THEN** focus moves into the dialog, the dialog has an accessible name and description, and focus cannot escape while it is open

#### Scenario: Dialog closes
- **WHEN** the visitor cancels or presses Escape
- **THEN** focus returns to the role action that opened the dialog and no acknowledgement or OAuth action is performed

#### Scenario: Checkbox is labelled
- **WHEN** assistive technology inspects the acknowledgement control
- **THEN** the checkbox has an explicit accessible label that describes acknowledgement of both legal documents

#### Scenario: Loading and error state is presented
- **WHEN** the acknowledgement ticket or OAuth initiation is pending or fails
- **THEN** the dialog exposes a clear status, prevents duplicate submissions, and leaves a keyboard-accessible recovery path

### Requirement: Separate non-OAuth authentication paths
The legal OAuth acknowledgement flow SHALL NOT silently alter development authentication or dedicated-demo authentication behavior.

#### Scenario: Development role switcher is used
- **WHEN** a development-only role switcher starts its existing development login path
- **THEN** it continues to use the development-only cookie flow and does not invoke Google OAuth acknowledgement

#### Scenario: Dedicated demo role switcher is used
- **WHEN** the dedicated demo role switcher starts its existing signed demo session path
- **THEN** it continues to use the isolated demo authentication path and does not create a production legal acceptance or OAuth ticket

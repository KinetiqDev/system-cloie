# Google-Authoritative Name Linking

## Purpose

Define how real Supabase Google OAuth supplies a canonical account name during new account creation and first identity linking while preserving stored names and existing authorization behavior after linking.

## Requirements

### Requirement: Google provider metadata resolves the canonical account name

For real Supabase Google OAuth callbacks, the system SHALL resolve the canonical account name from provider metadata using this precedence: `name`, then `full_name`, then `given_name` plus `family_name`. It SHALL never derive a name from the email local part or invent a placeholder.

#### Scenario: Provider display name is present

- **GIVEN** the authenticated Google metadata contains `name = "Jane Doe"` and any other name claims
- **WHEN** the server resolves the account name
- **THEN** it SHALL use `Jane Doe` as the canonical name

#### Scenario: Full name is the first usable value

- **GIVEN** the authenticated Google metadata has no usable `name` but has `full_name = "Juan Dela Cruz"`
- **WHEN** the server resolves the account name
- **THEN** it SHALL use `Juan Dela Cruz` without splitting it into first and last names

#### Scenario: Separate provider name parts are the fallback

- **GIVEN** the authenticated Google metadata has no usable `name` or `full_name` but has usable `given_name` and `family_name`
- **WHEN** the server resolves the account name
- **THEN** it SHALL combine those values in provider order as the canonical name

#### Scenario: Provider supplies no usable name

- **GIVEN** a real OAuth callback contains no usable complete provider name
- **WHEN** the server processes a new account or first OAuth link
- **THEN** it SHALL fail safely before creating or linking the domain User and SHALL not use the email local part or a placeholder

### Requirement: First OAuth link replaces an unlinked provisional name

A Secretary-created account with a required provisional `User.name` and no linked `auth_user_id` SHALL be matched by exact normalized account email during the first OAuth callback. When the provider supplies a usable name, the callback SHALL atomically set `auth_user_id` and replace the provisional name with the Google-derived account name.

#### Scenario: New self-service account is created

- **GIVEN** no User exists for the normalized OAuth email and the selected role is eligible for self-service
- **WHEN** the OAuth callback receives a usable Google-derived name
- **THEN** it SHALL create one domain User with that name and the selected single CLOIE account role

#### Scenario: Secretary-created Student links for the first time

- **GIVEN** a Secretary-created STUDENT User has a provisional name, a matching normalized email, and `auth_user_id = null`
- **WHEN** the Student completes Google OAuth with a usable provider name
- **THEN** the callback SHALL link the Auth identity, replace the provisional name, and preserve the existing complete Student profile and enrollment records

#### Scenario: First link lacks a usable provider name

- **GIVEN** an unlinked Secretary-created User matches the normalized OAuth email
- **WHEN** the provider supplies no usable name
- **THEN** the callback SHALL leave the provisional name and null `auth_user_id` unchanged and SHALL return a safe missing-name outcome

### Requirement: Linked OAuth accounts preserve their stored name

Once a domain User has a non-null `auth_user_id`, later real Google OAuth callbacks SHALL preserve the stored canonical `User.name` regardless of changed or missing provider metadata. An authorized Secretary correction SHALL remain effective on later logins.

#### Scenario: Google profile name changes after linking

- **GIVEN** a User is already linked and stores `Jane Doe`
- **WHEN** Google later supplies `Jane Smith`
- **THEN** the callback SHALL authenticate the existing User and SHALL preserve `Jane Doe`

#### Scenario: Later callback has no name metadata

- **GIVEN** a User is already linked and stores `Madonna`
- **WHEN** a later OAuth callback has no usable provider name
- **THEN** the callback SHALL preserve `Madonna` and SHALL continue the existing account-state and post-login flow

#### Scenario: Secretary correction survives login

- **GIVEN** a Secretary has corrected a linked User.name to `Maria Dela Cruz`
- **WHEN** the User signs in again through Google OAuth
- **THEN** the callback SHALL preserve `Maria Dela Cruz`

### Requirement: Linked identity conflicts fail closed

If a normalized email match belongs to a User whose non-null `auth_user_id` differs from the authenticated Supabase Auth ID, the callback SHALL reject the attempt safely. It SHALL not replace the existing Auth link, overwrite the canonical name, or disclose internal identity details.

#### Scenario: Different Auth identity presents an already-linked email

- **GIVEN** a User is linked to Auth identity A
- **WHEN** Auth identity B presents the same normalized account email
- **THEN** the callback SHALL sign out or otherwise terminate the rejected session, preserve the User record, and show a safe identity-conflict outcome

### Requirement: Google name authority does not alter existing access invariants

The first-link name behavior SHALL preserve server-side role intent validation, exact internal email-domain rules, pre-provisioning rules, account-state gates, one-role accounts, role-specific onboarding, enrollment behavior, and post-login destination resolution.

#### Scenario: Role intent does not match the stored role

- **GIVEN** an already-linked User has role FACULTY
- **WHEN** the User completes OAuth with STUDENT intent
- **THEN** the callback SHALL preserve the existing role-mismatch denial regardless of provider name metadata

#### Scenario: Inactive account attempts first link

- **GIVEN** a Secretary-created inactive User has a provisional name and no Auth link
- **WHEN** the matching Google identity completes OAuth
- **THEN** the callback SHALL preserve the inactive-account denial and SHALL not link or replace the name

#### Scenario: Bootstrap Secretary uses real provider identity

- **GIVEN** the configured bootstrap Secretary email is authenticating through real Google OAuth and no Secretary exists
- **WHEN** Google supplies a usable name
- **THEN** the bootstrap User SHALL use that Google-derived name and SHALL retain only the existing bootstrap role exception

### Requirement: Non-OAuth authentication retains fixture-controlled names

Development authentication and dedicated demo authentication SHALL use the seeded domain User identity and SHALL not invoke Google name derivation or first-link replacement.

#### Scenario: Development role switcher authenticates a seeded Student

- **GIVEN** development authentication selects a seeded STUDENT User
- **WHEN** the development cookie is issued and read
- **THEN** the seeded canonical name SHALL be used without provider metadata or OAuth linking

#### Scenario: Dedicated demo role switcher authenticates a seeded Faculty

- **GIVEN** the dedicated demo deployment selects an allowlisted FACULTY User
- **WHEN** the signed demo session is created
- **THEN** the seeded canonical name SHALL remain fixture-controlled and existing authorization/account-state checks SHALL run unchanged

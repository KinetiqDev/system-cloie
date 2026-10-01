# External Registration Carries the Chosen Role into Onboarding

**Status:** Accepted

External registration (`/register/external`) carries the Alumni / Industry Partner choice through both verification paths into the role's real onboarding form, because the onboarding forms — not the entry form — own the role-specific fields. The email path pins the chosen role beside the address in the verification-step hand-off and writes it atomically with account creation at code verification; the Google path binds the chosen role's ticket intent instead of the role-less `external` entrance intent. A verified external identity is never role-less, and the code step redirects into the chosen onboarding through the ordinary post-login resolver.

## Context

Two defects surfaced from real use of the entry path:

1. After completing Google OAuth from `/register/external`, the person landed back on `/register/external`. The page bound the role-less `external` entrance intent to the Google action, so the callback — which resolves nothing and creates nothing for a role-less intent with no matching account — signed the new holder out and returned them to registration, discarding the role they had chosen.
2. Choosing Alumni or Industry Partner on the registration form changed nothing on the form itself. The form collects the same three transport fields for both roles; the role-specific fields (program and graduation year for Alumni; company, position, and program affiliations for Industry Partner) live on the role's onboarding form, which the email path never routed into — verification created a role-less account and left the person on the code step with no destination.

A registration form that asked for the role-specific fields up front would duplicate the onboarding forms, fork the domain-write seams (`createAlumniProfile`, `createIndustryPartnerProfile`), and ask for profile data before inbox control is proven.

## Decision

1. `/register/external` binds the chosen role's ticket intent (`alumni` / `industry-partner`) to its Google action, exactly as the email action already carries the role. `/login/external` keeps the role-less `external` intent: returning holders resolve through their existing session, and only a genuinely unknown address falls back to registration.
2. The verification-step hand-off pins the chosen role beside the address in a second `httpOnly`, `Path=/verify-email` cookie with the same lifetime. Both values are the requester's own submitted input and neither is trusted for authorization — the role is re-validated against the external self-service set at every use.
3. `linkExternalVerifiedIdentity` writes the role in the same transaction that creates or claims the account. A brand-new account is never created without a role; a roleless unlinked account stays unclaimed when no valid external role was recorded. A caller-supplied value outside the external set cannot grant a role; claiming an external-eligible unlinked account grants the requested role but never touches an internal (Secretary-provisioned, Google-owned) account.
4. `verifyExternalCode` redirects a successfully verified identity through the ordinary post-login resolver with the verified role selected, landing the person on the Alumni or Industry Partner onboarding form. The chosen role must belong to the verified account and takes precedence over an older active-role cookie; account inactivity and external rejection gates still apply. When no usable role resolves, the neutral completion message stays, so the response reveals nothing about account existence.
5. Role-specific fields stay on the onboarding forms. The entry form collects identity transport only (name, address, credential, role choice); program, graduation year, company, and affiliations are collected after verification, where the authenticated domain-user seam already enforces them.

## Consequences

- The external role choice is load-bearing exactly once per path: as the ticket intent on the Google path, as the pinned role cookie (with Auth metadata as fallback) on the email path. Both narrow to Alumni / Industry Partner at the write seam, so a forged pin degrades to "no role remembered" rather than an internal grant.
- A person who verifies from a different browser than the one that registered loses the pinned role but keeps the Auth-metadata role — registration still writes `requested_role` into user metadata, and the linkage service prefers the pin but accepts metadata. Both narrow identically.
- `User` rows are never created role-less by the external entry path. The `verify-email` cold path (editable address, server-gated) is unchanged.
- The `NEXT_REDIRECT` digest guard is shared (`src/lib/utils/next-redirect.ts`) between the client role switcher and the verification action, since both await a navigating Server Action.

## Related

- `src/features/entry/components/external-register-form.tsx`
- `src/lib/actions/external-entry-actions.ts`
- `src/features/users/services/link-external-identity.ts`
- `src/features/entry/services/pending-external-registration.ts`
- `src/features/entry/services/resolve-external-post-verification-destination.ts`
- [ADR 0001](0001-complete-secretary-created-accounts.md) (role completeness at creation)
- [ADR 0014](0014-google-authoritative-account-names.md) (name authority; password names collected, never derived)
- [ADR 0031](0031-prove-the-current-sign-in-method-before-internal-authorization.md) (linkage ownership, method proof)
- [ADR 0032](0032-entry-flow-address-handoff-and-server-resolved-legal-gate.md) (address hand-off shape this extends)

---
status: accepted
supersedes: none
---

# Prove the current sign-in method before internal authorization

## Context

Alumni and Industry Partner may authenticate with an email address and a password, verified by a six-digit code, or by a recovery code ([ADR 0001](../adr/0001-complete-secretary-created-accounts.md) records the pre-existing Google-only assumption this change relaxes). Supabase Auth now owns several credential kinds on one Auth identity, and ADR 0022 authorizes from one server-resolved active role. That combination creates a decision ADR 0022 does not make: which sign-in method established the session that produced the active role.

Two facts about GoTrue make the obvious implementation wrong.

First, `amr` does not name the provider. GoTrue reports **every** OAuth provider sign-in as the single method `oauth`; the supported values are `oauth`, `password`, `otp`, `recovery`, `totp`, `sso/saml`, `magiclink`, `anonymous`, and similar. A resolver that matches `google` in `amr` therefore never matches a real Google sign-in, and every internal role fails closed for all legitimate internal users.

Second, the only provider field is `app_metadata.provider`, which is **not session-scoped**. A password identity that once signed in through Google keeps `provider: google` indefinitely, so `app_metadata` alone cannot establish the method of the current session. `user_metadata` is worse: the account holder can edit it, so it is never evidence.

The same gap exists at the OAuth callback. GoTrue serves every OAuth provider through one PKCE code exchange, so a code presented at `/api/auth/callback` may have come from any enabled provider, or from a magic-link code, while the callback previously assumed Google before binding an account or replacing a provisional name.

## Decision

System CLOIE treats the current sign-in method as a **proved, server-verified fact** and refuses internal authorization without it.

1. A session is a **proved Google session** only when all of the following hold: the verified access-token claims resolve `amr` to `oauth`; the recorded `app_metadata.provider` is `google`; no proved `password`, `otp`, or `recovery` method is present in `amr`; and no other method is present. Anything else resolves to no proved method, or to a proved non-Google method. Both deny every internal role.
2. A proved credential method **outranks** OAuth when a claim carries both. Recovery and ambiguous OTP outrank password, so a mixed claim cannot turn a code session into normal workspace authority.
3. `user_metadata` is never consulted as evidence of a method or a provider. `app_metadata` is only corroboration for an `oauth` session, never a session method on its own.
4. System CLOIE enables **Google as its only OAuth provider** on every target (see `[auth.external.google]` in `supabase/config.toml`; every other external provider is disabled). Adding an OAuth provider requires revisiting this ADR, because the single-`amr` `oauth` value would then be ambiguous.
5. The OAuth callback proves Google **before** any first-link, role claim, account creation, or provisional-name replacement, and refuses the session otherwise.
6. Internal Server Actions re-prove the method from verified claims at the action boundary. Authorization is not inherited from a page, and a linked account does not make a password session acceptable. The centralized session boundary enforces this for every internal caller at once: it resolves the profile gate from the **selected** role and then withholds that role from the session whenever the gate denies access (`AUTH_METHOD_MISMATCH`, `INACTIVE`, `REJECTED_EXTERNAL_ACCOUNT`, `FACULTY_APPROVAL_PENDING`, `FACULTY_REQUEST_REJECTED`, `STUDENT_PLACEMENT_REQUIRED`). Because internal authorization reads `activeRole`, a null active role fails every role guard closed without a per-action guard.
7. Domain linkage ownership is explicit: a password-verified identity may claim only an **external-eligible** unlinked account. An unlinked account holding an internal role is Secretary-provisioned, stays Google-owned, and is never claimed by the password path — otherwise the account's own Google sign-in would later fail closed as an identity conflict.
8. GoTrue v2.196.0 emits `amr: otp` for both signup verification and recovery. System CLOIE uses the strict `signup` verification type, which rejects recovery codes, and signs a short-lived signup proof bound to the verified token's subject, session ID, and expiry. The session resolver accepts OTP for external onboarding only with that exact proof. Raw OTP, recovery, and unproved sessions cannot enter any workspace. Password-update success and failure both end the recovery session; logout clears signup proof.

## Considered options

- **Match `google` in `amr`** — rejected: no real Google session carries that value, so every internal role would fail closed.
- **Trust `app_metadata.provider` as the session method** — rejected: it is not session-scoped, so a Google-then-password identity would keep a Google method for a password session.
- **Trust `user_metadata`** — rejected: the account holder can write it.
- **Record the method in a System CLOIE column at callback time** — deferred: it would add a second source of truth for a fact the verified claims already carry, and it is unnecessary while Google is the only OAuth provider. Revisit if a second provider is enabled.
- **Rely on the initiate endpoint being Google-only** — rejected: the callback is a public HTTP endpoint and the code exchange does not carry the originating provider, so the callback must prove the provider itself.

## Consequences

- Internal workspaces require a current Google sign-in, enforced at the centralized session boundary, at the OAuth callback, and at internal Server Actions. A recovery session is confined to changing the credential.
- A denied gate withholds the role rather than erasing it: `roles` still carries the assigned-role set and the gate still names the role behind a method mismatch, so `/select-role` and `switchActiveRole` can still deliberately move to a role the session may actually use (switching re-resolves the gate and rebuilds the destination). Gates that only redirect — role selection, role-specific onboarding, deferred enrollment — keep the active role so those entry routes stay reachable.
- `STUDENT_PLACEMENT_REQUIRED` withholds the Student role even though the session is otherwise a proved Google session: placement is institution-recorded, so the account waits for the Secretary's office rather than entering any Student workspace. `FACULTY_ONBOARDING_REQUIRED` keeps its role, because the explicit Faculty registration request is the one self-service step a person may still complete.
- Gates that already own a method check remain, and are now defense in depth rather than the only defense: `canViewCourseRoster` and `canDeployCourseBoundEvaluation` check `INACTIVE` only, so a method mismatch is still refused by the withheld active role rather than by those policies.
- Alumni and Industry Partner accept either method, and the external email path is the only writer of password credentials — Supabase Auth holds them, and the application schema has no password column.
- Enabling a second OAuth provider on any target is a security change, not a configuration detail.
- The resolver, the callback, and the internal actions each own one explicit proof, so a regression is testable at each boundary.

## Related

- `src/features/auth/services/resolve-auth-method.ts`
- `src/features/auth/services/resolve-auth-session.ts`
- `src/features/users/services/resolve-profile-gate.ts`
- `src/app/api/auth/callback/route.ts`
- `src/lib/actions/faculty-actions.ts`
- `src/lib/actions/external-entry-actions.ts`
- `docs/adr/0001-complete-secretary-created-accounts.md`
- `docs/adr/0022-multi-role-accounts-with-active-role-context.md`

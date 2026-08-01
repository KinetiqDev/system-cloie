## Why

System CLOIE currently has draft Privacy Notice and Terms of Use content in repository documentation, but the corresponding `/privacy` and `/terms` routes do not render a user-facing experience. Public role selection also starts Google OAuth immediately, so users are not given a concise, accessible review of the privacy and acceptable-use expectations before authentication. This change establishes a trustworthy public legal surface and a role-aware acknowledgement step without weakening the existing server-side Identity and Access rules.

## What Changes

- Add native, public Server Component pages for `/privacy` and `/terms` using hand-authored typed React content derived from the repository Markdown references.
- Do not import, parse, render, or load the Markdown files in the application or build process.
- Add a shared legal page shell with CLOIE branding, document metadata, table of contents, anchored sections, cross-links, responsive long-form typography, and legal footer navigation.
- Add static SEO metadata for both public legal routes and visibly identify unresolved draft/institutional-approval fields until approved values are available.
- Add a pre-OAuth acknowledgement dialog to every role-specific public Google sign-in action.
- Include concise Privacy Notice and Terms of Use summaries, links to the full pages, a required acknowledgement checkbox, `Cancel`, and `Agree and Continue with Google`.
- Prevent the supported UI from starting Google OAuth until acknowledgement is checked.
- Preserve the selected role using the existing validated OAuth intent values and preserve all callback-side role mismatch, domain, provisioning, onboarding, and account-state checks.
- Keep development and dedicated-demo authentication paths separate from the Google OAuth acknowledgement flow.
- Add focused unit, route, callback, accessibility, and responsive behavior coverage.

### Unchanged

- The single-role account invariant remains unchanged.
- Authorization remains server-side and continues to resolve the stored account role and scope.
- Supabase Auth, Google OAuth, `src/proxy.ts`, and the existing callback destination rules remain the authentication foundation.
- No new client data-fetching dependency, service worker, offline cache, or broad architectural refactor is introduced.
- No durable legal-acceptance database record is introduced in this change unless a separately approved requirement adds that audit obligation.

## Capabilities

### New Capabilities

- `public-legal-documents`: Public, native Privacy Notice and Terms of Use pages provide readable, navigable, responsive, metadata-rich legal documents without runtime dependence on Markdown files.
- `pre-oauth-legal-acknowledgement`: Role-specific Google authentication actions require an accessible legal summary acknowledgement before OAuth begins and preserve the selected role through the existing callback flow.

### Modified Capabilities

- None.

## Impact

- Affected contexts: Identity and Access and the public role selection portal; the legal experience is a supporting cross-context capability.
- Affected routes: `/(legal)/privacy`, `/(legal)/terms`, public portal navigation, and role-card authentication actions.
- Expected files include `src/features/legal/**`, `src/app/(legal)/**`, `src/features/portals/components/role-selection-card.tsx`, `src/features/auth/components/google-signin-button.tsx`, relevant public layouts, and authentication regression tests.
- A server-issued short-lived acknowledgement ticket is issued after the acknowledgement is checked; it is server-only, signed, expiring, intent-bound, and must not replace server-side role authorization.
- No Prisma model, SQL migration, generated Supabase type, cache, or deployment configuration change is required for the signed-ticket acknowledgement flow.
- If institutional auditability requires durable acceptance records, that is a follow-up schema change with its own migration, retention, versioning, and privacy review.

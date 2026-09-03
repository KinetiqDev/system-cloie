# Legal

Legal defines the privacy notice and terms of use content versioning for System CLOIE, plus the signed acknowledgement ticket that gates role selection until the user accepts the current versions.

## Documents and versions

**Legal document kind**:
Either `privacy` (System CLOIE Privacy Notice) or `terms` (System CLOIE Terms of Use). Each kind pins its current version from `LEGAL_VERSIONS` (currently `1.0` for both) and carries approval status, effective date, and last-updated metadata on the document.
_Avoid_: Policy page, terms doc

**Pending institutional approval**:
A draft document state in which the effective date and last-updated fields hold the placeholder "Pending institutional approval" and the document must be reviewed and approved by Assumption College of Davao's authorized institutional representative, Data Protection Officer, and ICTC before production use.
_Avoid_: Published, finalized, in force

## Acknowledgement gate

**Acknowledgement ticket**:
An HMAC-SHA256-signed base64url token whose payload binds the chosen role intent plus the pinned privacy and terms versions, with a 15-minute expiry (plus 60 seconds of clock skew). It is verified in the OAuth callback before the Google code exchange proceeds, so a missing, expired, tampered, or intent/version-mismatched ticket redirects to the site root.
_Avoid_: Consent token, OAuth state parameter

**Acknowledgement cookie**:
The `cloie_legal_ack` cookie that carries the acknowledgement ticket from the acknowledgement route to the OAuth callback. It is httpOnly with `sameSite: lax`, scoped to `/api/auth`, and cleared (maxAge zero) once the callback finishes with it.
_Avoid_: Persistent login cookie, session cookie

## Privacy disclosure

**Non-anonymous disclosure**:
The privacy notice statement that evaluation submissions are not completely anonymous: System CLOIE retains an internal link between the respondent and the assigned evaluation for verification, security, and data-integrity purposes, while evaluation results are intended to appear in aggregated or de-identified reports.
_Avoid_: Fully anonymous feedback, untraceable submission

## Design boundaries

**Typed legal content**:
Privacy and terms content is authored as typed structured content rendered by Server Components — not Markdown imports and not a CMS — with stable section anchors, a table of contents, and draft pages excluded from indexing.
_Avoid_: Markdown pipeline, headless CMS, ad-hoc JSX copy

**No durable acceptance record**:
The acknowledgement gate intentionally persists no per-account acceptance evidence; the signed ticket proves acknowledgement per sign-in flow only. A durable per-account LegalAcceptance record requires a separately approved change if the institution requires audit evidence.
_Avoid_: Acceptance history table, implied stored consent

# Public Entry Flows Carry the Chosen Address in a Short-Lived Cookie

**Status:** Accepted

System CLOIE's public email-first entry flows (external registration, 6-digit verification, recovery) hand the address a person already supplied from one step to the next through a short-lived, `httpOnly`, `Path=/verify-email` cookie rather than a query parameter, and the code step presents the legal acknowledgement control only when the server cannot already resolve a valid ticket for that browser. The server-side legal gate does not weaken: every gated Server Action still verifies the ticket on every call, and a missing or expired ticket fails closed.

## Context

Three defects surfaced from real use of the entry path: the code step asked a person to retype an address they had just entered, registration ended in a message plus a link instead of continuing into the code step, and the privacy/terms acknowledgement was repeated on the verification page, where a person could not tell whether they had already accepted it.

A fourth constraint shaped the solution. The acknowledgement ticket is HMAC-signed, `httpOnly`, and expires after 15 minutes. Any change that makes the ticket easier to hold — re-issuing it on every verification submit, or removing the control outright — either silently extends a deliberate control or dead-ends a person who opened the code step directly or returns after the window closes.

## Considered Options

- **Query parameter (`/verify-email?email=…`).** Rejected: it places a personal address in the address bar, browser history, `Referer` headers, and proxy logs. Note this is the pre-existing pattern on `/forgot-password` and `/reset-password`, which remain unchanged by this decision.
- **`sessionStorage` on the client.** Rejected: the code step is a Server Component today, and a client-only address would either force a client boundary or produce a visible flash of empty field.
- **Unsigned, unscoped, session-lifetime cookie.** Rejected: the value is only needed until the code arrives, and a fixed short lifetime matches the provider's signup-code lifetime instead of outliving it.
- **Cookie plus server-resolved acknowledgement state.** Accepted.

## Consequences

- The pinned value is the requester's own submitted address, re-displayed to that same browser. It is never trusted for authorization; every Server Action re-validates and re-normalizes the address it acts on. An unusable cookie value degrades to the editable address field rather than failing the step.
- The pin is released when the code verifies, so the code step stops showing a spent address.
- The acknowledgement control appears on the code step when the server has no valid ticket, and is omitted when it does. A submission that returns `LEGAL_ACKNOWLEDGEMENT_REQUIRED` re-opens the control in place, so an expiry between render and submit is a one-click recovery rather than a dead end.
- The registration response stays enumeration-neutral across the hand-off: the notice on the code step is identical whether mail was sent, a duplicate was absorbed, or the transport threw, and it carries an informational icon rather than a success tick so the icon never asserts more than the copy.
- A person who registered the wrong address has no in-place correction (the provider account already exists), so the code step offers an explicit route back to registration.
- Future entry flows that carry a person's own input across steps should follow this shape: short-lived, `httpOnly`, path-scoped, re-validated server-side, and degrading to an editable field when absent.

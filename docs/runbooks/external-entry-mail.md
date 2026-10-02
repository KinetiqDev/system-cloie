# External Entry Mail Runbook

This is the operator-facing procedure for making Supabase Auth actually deliver the verification and password-recovery mail that System CLOIE's external entry flow depends on. It covers self-hosted staging, the dedicated demo deployment, disposable CI, and primary Production. It complements [supabase/README.md](../../supabase/README.md) and [ADR 0020](../adr/0020-self-hosted-supabase-target-neutral-backends.md).

A Git commit documents this procedure but never performs its deployment action.

## Why The Application Owns No Mail

System CLOIE never sends mail itself. `src/lib/actions/external-entry-actions.ts` calls `supabase.auth.signUp`, `resend`, `verifyOtp`, and `resetPasswordForEmail`, so GoTrue on the target instance is the only sender. There is no SMTP host, username, or API key in this repository's environment contract, and there must not be one. Every value below belongs to the `system-cloie-infra` Supabase resource.

Adding a mail provider credential to `.env`, `.env.local`, `.env.example`, or the System CLOIE Coolify resource is out of scope and a security defect.

## Scope And Safety

- Configure each target instance separately. Staging, dedicated demo, disposable CI, and primary Production are separate security boundaries and never share SMTP credentials.
- Keep the dedicated demo deployment on the bundled catch-all mailer. Demo audience members are seeded accounts, and a real relay would send mail to addresses that were never verified.
- Disposable CI keeps the catch-all mailer. The real Auth integration gate asserts local captured codes and provider behavior; Playwright UI journeys do not assert live inbox delivery.
- Never add a payment method to the mail provider. See the cost guardrails below.

## The Three Failure Modes

A person who registers an external account sees one neutral screen regardless of outcome, so a mail failure is silent by design. Three causes account for nearly every report.

**Autoconfirm switched on.** With `ENABLE_EMAIL_AUTOCONFIRM=true`, `signUp` confirms the address immediately, issues a session, and sends no mail. The person waits for a code that will never arrive. This must be `false`, because `linkExternalVerifiedIdentity` runs only after a verified `verifyOtp`.

**SMTP still pointing at the bundled catch-all.** A stock self-hosted stack ships `SMTP_HOST=supabase-mail` with a placeholder credential. GoTrue accepts the send, the bundled catcher keeps it, and the real inbox stays empty. The application cannot detect this.

**Link-only templates.** The entry flow verifies with a six-digit code through `verifyOtp`, and recovery does the same. GoTrue's built-in confirmation and recovery templates render only `{{ .ConfirmationURL }}`, so a correct mail arrives that the person cannot use. The repository already holds the correct bodies at `supabase/templates/confirm_signup.html` and `supabase/templates/recovery.html`, and both render `{{ .Token }}`.

## Cost Guardrails

Self-hosting exists to avoid a per-request bill, and a transactional mail relay is the one place that bill can appear. These rules keep the setup at zero cost.

**Never enter a payment method.** Every recommended provider below stops sending at its free ceiling rather than charging. A provider that requires a card to send free mail is disqualified, because an unattended upgrade turns a free tier into a charge.

**Pick a relay whose free tier exceeds realistic volume.** Registration mail volume is bounded by the number of Alumni and Industry Partner accounts, not by traffic. A free daily ceiling in the hundreds is several orders of magnitude more than the platform will ever send.

| Provider                     | Free ceiling                            | Domain verification | Notes                                                              |
| ---------------------------- | --------------------------------------- | ------------------- | ------------------------------------------------------------------ |
| Brevo (recommended default)  | 300 per day, 300 SMTP requests per hour | Yes, SPF and DKIM   | Largest free SMTP headroom. No card required. Verified 2026-09-29. |
| Resend                       | 3,000 per month, 100 per day            | Yes, SPF and DKIM   | Generous monthly cap, tighter daily cap.                           |
| Mailgun                      | 100 per day                             | Yes, SPF and DKIM   | Lowest headroom of the three.                                      |
| ACD Google Workspace mailbox | 2,000 per day                           | Not applicable      | Sends as a `gmail.com` or Workspace address. Fallback only.        |

**Verify the figures at purchase time.** Free-tier limits change without notice. Confirm the current ceiling in the provider's own documentation before relying on a number from this runbook, and record the date checked.

**Prefer a daily ceiling over a monthly one.** Brevo's daily cap is the safer default. A daily cap throttles for one day, whereas exhausting a monthly cap can persist for the rest of the billing month and block every new external registration.

**Expect a retry queue, not a bill.** Brevo holds up to 1,000 additional transactional mails past the daily ceiling and delivers nothing beyond that queue. A provider that silently starts charging at its free ceiling is disqualified outright.

**Set the relay limit low enough that abuse cannot reach the ceiling.** GoTrue's per-instance rate limit is the hard backstop. The recommended `GOTRUE_RATE_LIMIT_EMAIL_SENT` value of `20` per hour is two orders of magnitude above expected traffic, sits under every recommended provider's hourly throughput cap, and cannot reach 300 in a day without deliberate abuse.

**Keep a single relay.** Do not configure a failover relay. A secondary relay converts a delivery outage into a second bill and a second failure surface.

**Rotate, do not upgrade.** When a credential expires, replace it. Do not respond to a quota ceiling by purchasing capacity for a platform that does not need it.

## SMTP Credentials

Start from `supabase/mail.env.example`. It carries every variable below as a
`<<FILL: ...>>` token, so nothing has to be typed from memory, and an
unreplaced token is not a working host, which means the instance fails closed
rather than sending mail from a stranger's domain. Copy it to `mail.env` in the
Supabase deployment repository and check for leftovers before restarting Auth:

```bash
grep -nE '^[[:space:]]*[A-Z0-9_]+=.*<<FILL' mail.env \
  && echo "STOP: placeholders remain" || echo "ready"
```

The pattern inspects uncommented assignments only, so a filled value is required
for every key the instance actually reads.

The template is tracked in this repository; `supabase/mail.env` is ignored, and
a filled copy does not belong in this repository at all.

Set these on the target instance. Where a value is set decides the variable name: variables injected into the Auth container use the `GOTRUE_*` names, while values in the Compose `.env` file use the short names that `docker-compose.yml` maps into them.

| Compose `.env`     | Container env             | Value                                                   |
| ------------------ | ------------------------- | ------------------------------------------------------- |
| `SMTP_HOST`        | `GOTRUE_SMTP_HOST`        | Provider relay host, for example `smtp.brevo.com`       |
| `SMTP_PORT`        | `GOTRUE_SMTP_PORT`        | `587` for STARTTLS, `465` for implicit TLS              |
| `SMTP_USER`        | `GOTRUE_SMTP_USER`        | Provider username or SMTP key                           |
| `SMTP_PASS`        | `GOTRUE_SMTP_PASS`        | Provider SMTP key                                       |
| `SMTP_ADMIN_EMAIL` | `GOTRUE_SMTP_ADMIN_EMAIL` | The From address, on a domain this institution controls |
| `SMTP_SENDER_NAME` | `GOTRUE_SMTP_SENDER_NAME` | `System CLOIE`                                          |

`SMTP_USER_NAME` is not a recognised variable and resolves to nothing. Upstream Compose maps `SMTP_SENDER_NAME`.

Publish SPF and DKIM records for the sending domain before going live. An authenticated relay still lands in spam when the domain is unauthenticated, and alumni addresses at corporate and university domains filter hardest. Sending needs SPF and DKIM only; no MX change is required.

## Auth Switches

| Setting                        | Value                                         | Reason                                                               |
| ------------------------------ | --------------------------------------------- | -------------------------------------------------------------------- |
| `ENABLE_EMAIL_SIGNUP`          | `true`                                        | External password signup                                             |
| `ENABLE_EMAIL_AUTOCONFIRM`     | `false`                                       | An unverified address must never reach domain linkage                |
| `GOTRUE_MAILER_OTP_LENGTH`     | `6`                                           | Matches the code field in the entry form                             |
| `GOTRUE_MAILER_OTP_EXP`        | `3600`, at or below `GOTRUE_SECURITY_MAX_AGE` | A code must not outlive the session that issued it                   |
| `GOTRUE_MAILER_MAX_FREQUENCY`  | `1m`                                          | Default per-address mail spacing                                     |
| `GOTRUE_PASSWORD_MIN_LENGTH`   | `8`                                           | The application schema requires 8; the CLI local config still says 6 |
| `GOTRUE_RATE_LIMIT_EMAIL_SENT` | `20`                                          | Keeps a misbehaving client far below any free daily ceiling          |
| `GOTRUE_RATE_LIMIT_OTP`        | `30`                                          | The entry form allows 10 verify attempts per minute per address      |
| `SITE_URL`                     | System CLOIE origin                           | Becomes `GOTRUE_SITE_URL`                                            |
| `ADDITIONAL_REDIRECT_URLS`     | System CLOIE origin                           | Becomes `GOTRUE_URI_ALLOW_LIST`                                      |

Leave `GOTRUE_MAILER_URLPATHS_CONFIRMATION` and `GOTRUE_MAILER_URLPATHS_RECOVERY` unset. They default to `/verify` on the Auth origin and only matter for link-based templates, which this platform does not use.

## Code Templates

GoTrue does not read templates from disk or from a table. At send time it issues an HTTP GET against the configured template URL, and it treats a non-200 response or a timeout as a send failure. A template URL the Auth container cannot reach looks exactly like a mail outage.

Serve the two repository templates over HTTPS from a host the Auth container can reach, then point the mailer at them.

```bash
GOTRUE_MAILER_TEMPLATES_CONFIRMATION=https://<reachable-host>/confirm_signup.html
GOTRUE_MAILER_TEMPLATES_RECOVERY=https://<reachable-host>/recovery.html
GOTRUE_MAILER_TEMPLATES_SUBJECT_CONFIRMATION=Your System CLOIE verification code
GOTRUE_MAILER_TEMPLATES_SUBJECT_RECOVERY=Your System CLOIE password recovery code
```

Source of truth for both bodies:

- `supabase/templates/confirm_signup.html`
- `supabase/templates/recovery.html`

Each body must keep `{{ .Token }}`. A template that drops the token reintroduces the link-only failure while still sending mail.

The Auth container sits on the private Docker network, so a public HTTPS URL is the reliable choice. Confirm the URL returns 200 from inside the network before going live:

```bash
docker compose exec auth wget -qO- https://<reachable-host>/confirm_signup.html
```

## Application Environment

One value affects mail, and it already exists in the documented contract:

```bash
NEXT_PUBLIC_SITE_URL=https://<production-origin>
```

`getSiteUrl` uses it for `emailRedirectTo` and the recovery `redirectTo`. Left unset, the app falls back to the proxy's `Host` and `x-forwarded-proto` headers, which is usually correct but leaves the recovery link dependent on proxy configuration. No other application variable is required, and none should be added.

## Local Development

The local CLI Docker stack already works and needs no change. `supabase/config.toml` sets `enable_signup`, `enable_confirmations`, `secure_password_change`, `otp_length = 6`, `otp_expiry = 3600`, and a 60-second resend cooldown, and the bundled catcher keeps mail local. Local mail is never delivered to a real inbox, by design.

```bash
pnpm supabase:start
```

Restart the local stack after editing `supabase/config.toml`. To inspect captured mail, open the catcher interface on port `54324`.

`pnpm test:auth-integration` starts the local stack only when needed, runs real signup, strict signup-purpose verification, code reuse rejection, duplicate signup, and password recovery against the catcher, then stops only a stack it started. The opt-in suite refuses non-loopback endpoints. CI selects this gate for credential, legal, Auth configuration, template, and verification-infrastructure changes. These checks do not certify SMTP, sending-domain authentication, Google linking, or institutional approval on a deployment target.

## Verification

Restart the Auth service after any change, then exercise the real flow. A settings endpoint check alone proves nothing about delivery.

1. Confirm Auth settings and that email signup is enabled:

```bash
curl -fsS -H "apikey: <PUBLISHABLE_KEY>" https://api.system-cloie.app/auth/v1/settings
```

2. Confirm autoconfirm is off and email signup is on in that response. `mailer_autoconfirm` must be `false`.

3. Register a throwaway address at `/register/external` and complete the acknowledgement.

4. Read the Auth service log and confirm all three:

- the send returns 200 from the relay;
- the template fetch returns 200;
- no rate-limit message appears.

5. Confirm the received mail contains a six-digit code, not a link, and that the code completes `/verify-email`.

6. Exercise password recovery end to end and confirm the recovery mail carries a code that `/reset-password` accepts.

7. Confirm the account reaches the `PENDING_EXTERNAL_VERIFICATION` state and no domain `User` row exists before verification completes.

8. Repeat steps 3 to 7 on the primary Production origin, not only on staging.

## Troubleshooting

| Symptom                                | Cause                                                                    | Fix                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| No mail at all, code page loads        | Autoconfirm on                                                           | Set `ENABLE_EMAIL_AUTOCONFIRM=false` and restart Auth                            |
| No mail at all, log shows success      | Catch-all host still configured                                          | Replace `SMTP_HOST` and the credentials with the real relay                      |
| Mail arrives with a link, no code      | Default template in use                                                  | Set both `GOTRUE_MAILER_TEMPLATES_*` values                                      |
| `template_body_http_error` in the log  | Template URL unreachable from the container                              | Fix reachability, then re-test with the in-container `wget` command              |
| Second and later attempts never arrive | Rate limit too low, or the app's own 60-second cooldown is being ignored | Raise `GOTRUE_RATE_LIMIT_EMAIL_SENT`; confirm the per-address cooldown is intact |
| Mail lands in spam                     | Missing SPF or DKIM                                                      | Publish both records for the sending domain                                      |
| Recovery mail is unusable              | Recovery template drops the token                                        | Restore `{{ .Token }}` in the recovery body                                      |
| `redirect_to` rejected                 | Origin not allowlisted                                                   | Add the origin to `ADDITIONAL_REDIRECT_URLS`                                     |

## Rollback

1. Unset `GOTRUE_MAILER_TEMPLATES_CONFIRMATION` and `GOTRUE_MAILER_TEMPLATES_RECOVERY` if the templates are the problem, and restart Auth. GoTrue falls back to its built-in templates.
2. Restore `SMTP_HOST=supabase-mail` with the stock placeholder credentials to stop outbound mail entirely. The external entry flow degrades to sending nothing rather than misdelivering mail.
3. Never roll back by enabling `ENABLE_EMAIL_AUTOCONFIRM` to make a screen look successful. That lets an unverified address reach domain linkage and breaks the entry invariant.

Rollback is a real loss of function, not a silent degradation. Record it, and prefer a forward fix.

## Evidence Limits

Record the target, the provider chosen, the free ceiling confirmed, and the date it was confirmed. Never record SMTP credentials, provider API keys, or full Authorization headers in an issue comment, a log excerpt, a screenshot, or a commit. Redact the relay password and the From address if the address is a personal mailbox.

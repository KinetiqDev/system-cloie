# External Entry Mail Runbook

This is the operator-facing procedure for making Supabase Auth actually deliver the verification and password-recovery mail that System CLOIE's external entry flow depends on. It covers self-hosted staging, the dedicated demo deployment, disposable CI, and primary Production. It complements [supabase/README.md](../../supabase/README.md) and [ADR 0020](../adr/0020-self-hosted-supabase-target-neutral-backends.md).

A Git commit documents this procedure but never performs its deployment action.

## Why The Application Owns No Mail

System CLOIE never sends mail itself. `src/lib/actions/external-entry-actions.ts` calls `supabase.auth.signUp`, `resend`, `verifyOtp`, and `resetPasswordForEmail`, so GoTrue on the target instance is the only sender. There is no SMTP host, username, or API key in this repository's application environment contract, and there must not be one. `.env.example` documents the application-only contract and deliberately carries no mail value; every value below belongs to the `system-cloie-infra` Supabase resource, applied through `supabase/docker-compose.auth-mail.yml` and `supabase/mail.env.example`.

Adding a mail provider credential to `.env`, `.env.local`, `.env.example`, or the System CLOIE Coolify resource is out of scope and a security defect.

Private setup worksheets may be prepared locally at the operator's request. They are ignored by Git, have owner-only permissions, and do not apply themselves:

- `.env.application.local` holds application URLs, database connections, HMAC signers and disabled optional features. Next.js does not automatically load this filename; copy completed values to the application deployment environment.
- `supabase/mail.env` holds the Brevo SMTP login/key, verified sender, template URLs and Auth defaults. Move the completed file to the infrastructure deployment beside its existing Compose stack before using it. Never enable real delivery on the local CLI, demo or CI stack.
- `supabase/.env.auth.local` holds the Google OAuth fields for the existing self-hosted Auth service. Copy them into the infrastructure base environment and ensure the documented Compose mappings exist. Keep existing database and JWT secrets unchanged.

Replace every active `<<FILL: ...>>` assignment before deployment. Preserve existing working credentials. The tracked `.env.example` and `supabase/mail.env.example` remain credential-free templates; the private worksheets are not committed or deployed automatically.

## Scope And Safety

- Configure each target instance separately. Staging, dedicated demo, disposable CI, and primary Production are separate security boundaries and never share SMTP credentials.
- Keep the dedicated demo deployment on the bundled catch-all mailer. Demo audience members are seeded accounts, and a real relay would send mail to addresses that were never verified.
- Disposable CI keeps the catch-all mailer. The real Auth integration gate asserts local captured codes and provider behavior; Playwright UI journeys do not assert live inbox delivery.
- Never add a payment method to the mail provider. See the cost guardrails below.

## The Three Failure Modes

A person who registers an external account sees one neutral screen regardless of outcome, so a mail failure is silent by design. Three causes account for nearly every report.

**Autoconfirm switched on.** With `ENABLE_EMAIL_AUTOCONFIRM=true`, `signUp` confirms the address immediately, issues a session, and sends no mail. The person waits for a code that will never arrive. This must be `false`, because `linkExternalVerifiedIdentity` runs only after a verified `verifyOtp`.

**SMTP still pointing at the bundled catch-all.** A stock self-hosted stack ships `SMTP_HOST=supabase-mail` with a placeholder credential. GoTrue accepts the send, the bundled catcher keeps it, and the real inbox stays empty. The application cannot detect this.

**Link-only templates.** The entry flow verifies with a six-digit code through `verifyOtp`, and recovery does the same. GoTrue's built-in confirmation and recovery templates render only `{{ .ConfirmationURL }}`, so a correct mail arrives that the person cannot use. The canonical bodies are `public/auth-email/confirm_signup.html` and `public/auth-email/recovery.html`, and both render `{{ .Token }}`.

## Cost Guardrails

Self-hosting exists to avoid a per-request bill, and a transactional mail relay is the one place that bill can appear. These rules keep the setup at zero cost.

**Never enter a payment method.** Every provider below stops sending at its free ceiling rather than charging. A provider that requires a card to send free mail is disqualified, because an unattended upgrade turns a free tier into a charge.

**Check expected volume before choosing a free tier.** Count signup, resend, recovery and other Auth mail together. A burst of legitimate registrations can exhaust a daily quota; there is no measured production volume in this runbook.

| Provider                     | Published free ceiling                                            | Domain verification | Notes                                                                                   |
| ---------------------------- | ----------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------- |
| Brevo (recommended default)  | 300 email sends per day, plus a retry queue of up to 1,000        | Yes, SPF and DKIM   | No card required. Free sends carry a "Sent with Brevo" footer. Verified 2026-10-04.     |
| Resend                       | 100 transactional emails per day, 3,000 per month                 | Yes, SPF and DKIM   | Sent **and** received (inbound) mail both count against the quota. Verified 2026-10-04. |
| Mailgun                      | Confirm in Mailgun's own documentation before relying on a figure | Yes, SPF and DKIM   | Not verified for this runbook; do not quote a number from memory.                       |
| ACD Google Workspace mailbox | Governed by the Workspace account's own sending limits            | Not applicable      | Sends as a `gmail.com` or Workspace address. Fallback only.                             |

Sources, checked 2026-10-04:

- Brevo free-plan limits: <https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan> — "The Free plan includes 300 email sends per day"; past that "up to 1,000 additional emails are held in a retry queue", and emails beyond the queue are not delivered.
- Brevo free SMTP, no card: <https://www.brevo.com/free-smtp-server> — 300 emails/day, "No credit card, no commitment".
- Resend quotas: <https://resend.com/docs/knowledge-base/account-quotas-and-limits> — "daily email quota of 100 emails/day and 3,000 emails/month", counting both sent and received mail, resetting at midnight UTC.

**Free-tier limits change without notice.** These are the providers' own published figures on the date above, not a promise. Re-confirm the current ceiling in the provider's documentation before relying on it, record the date you checked, and read the recorded value back in the runbook when it changes.

**Prefer a daily ceiling over a monthly one.** Brevo's daily cap is the safer default. A daily cap throttles for one day, whereas exhausting a monthly cap can persist for the rest of the billing month and block every new external registration.

**Expect a retry queue, not a bill.** Brevo holds up to 1,000 additional transactional mails past the daily ceiling and delivers nothing beyond that queue. A provider that silently starts charging at its free ceiling is disqualified outright.

**Set the relay limit low enough that abuse cannot quietly reach the ceiling.** GoTrue's `GOTRUE_RATE_LIMIT_EMAIL_SENT` is the hard backstop: an interval limiter checked inside `sendEmail` before the relay is contacted, with no client-IP key, so a distributed abuse pattern cannot sidestep it.

At `20` sends per hour, sustained usage can reach 480 sends in a day, above Brevo's 300-send free ceiling. The Auth limiter reduces throughput but does not enforce a daily provider budget. Monitor both Auth rate-limit errors and the provider's remaining quota; neither an exhausted quota nor a delayed code is proof of abuse.

**Keep a single relay.** Do not configure a failover relay. A secondary relay converts a delivery outage into a second bill and a second failure surface.

**Rotate, do not upgrade.** When a credential expires, replace it. Do not respond to a quota ceiling by purchasing capacity for a platform that does not need it.

## Installing The Overlay

`supabase/docker-compose.auth-mail.yml` is the deployable artifact. It is an add-on to the upstream self-hosted Compose stack in `system-cloie-infra/supabase/`, never a stack of its own: it declares only `services.auth.environment`, so the database, PostgREST, realtime, JWT keys, dashboard credentials, phone auth and OAuth providers are inherited from the base file untouched.

It exists because upstream `docker-compose.yml` maps the SMTP relay block and the signup/autoconfirm switches but ships **no** mapping for the OTP lifetime, OTP length, mail cooldown, password minimum, secure password change, secure email change, custom templates or subjects, or any rate limit. An instance configured only from upstream `.env.example` therefore runs on GoTrue's own defaults — including a 86400-second (24 hour) OTP lifetime, because `internal/conf/configuration.go` sets `Mailer.OtpExp = 86400` when the value is zero.

`supabase/config.toml` does **not** apply here. It configures the local Supabase CLI Docker stack only; a remote self-hosted instance reads nothing from it. Update both declarations together. `src/__tests__/config/email-otp-lifetime.test.ts` checks that they declare the same ten-minute window; it cannot check a live deployment.

From the directory holding the upstream `docker-compose.yml`:

```bash
cp <path-to>/supabase/mail.env.example mail.env
chmod 600 mail.env
# Fill every active <<FILL: ...>> assignment. Do not proceed while any remain:
if grep -qE '^[[:space:]]*[A-Z0-9_]+=.*<<FILL' mail.env; then
  echo "STOP: placeholders remain"
  exit 1
fi

docker compose --env-file .env --env-file mail.env \
  -f docker-compose.yml \
  -f <path-to>/supabase/docker-compose.auth-mail.yml \
  up -d --force-recreate auth
```

**Load both env files.** `--env-file .env` supplies the base stack's values such as `POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRY`, `API_EXTERNAL_URL`, `POSTGRES_HOST` and `POSTGRES_PORT`. `--env-file mail.env` supplies the mail settings. Compose applies them in order: overlapping `SITE_URL`, redirect and SMTP assignments intentionally resolve to the `mail.env` value. Keep database, JWT and unrelated infrastructure secrets in the base file.

Environment changes require container recreation. `docker compose restart auth` keeps the original environment. `up -d` recreates a container when its resolved configuration changes; `--force-recreate` explicitly requests recreation for this rollout.

Verify the resolved configuration without starting or restarting anything. This exercises the same interpolation `up` uses, so a missing secret or origin fails here instead of on a live instance:

```bash
docker compose --env-file .env --env-file mail.env \
  -f docker-compose.yml \
  -f <path-to>/supabase/docker-compose.auth-mail.yml \
  config --quiet
```

Do not dump `docker compose config` or the container's full environment: both can expose SMTP, database and JWT secrets. After recreation, print only the nonsecret settings:

```bash
docker compose --env-file .env --env-file mail.env \
  -f docker-compose.yml \
  -f <path-to>/supabase/docker-compose.auth-mail.yml \
  exec -T auth sh -c '
    printf "email_enabled=%s autoconfirm=%s expiry_seconds=%s code_length=%s password_minimum=%s resend_cooldown=%s\n" \
      "$GOTRUE_EXTERNAL_EMAIL_ENABLED" "$GOTRUE_MAILER_AUTOCONFIRM" \
      "$GOTRUE_MAILER_OTP_EXP" "$GOTRUE_MAILER_OTP_LENGTH" \
      "$GOTRUE_PASSWORD_MIN_LENGTH" "$GOTRUE_SMTP_MAX_FREQUENCY"
  '
```

Expected: `email_enabled=true autoconfirm=false expiry_seconds=600 code_length=6 password_minimum=8 resend_cooldown=1m`. `${VAR:?message}` rejects empty values, not nonempty placeholder strings, so the placeholder check remains required.

The template is tracked in this repository; `supabase/mail.env` is ignored, and a filled copy does not belong in this repository at all.

## SMTP Credentials

Set these on the target instance. Where a value is set decides the variable name: variables injected into the Auth container use the `GOTRUE_*` names, while values in the Compose environment file use the short names the overlay maps into them.

| Compose env file   | Container env             | Value                                                   |
| ------------------ | ------------------------- | ------------------------------------------------------- |
| `SMTP_HOST`        | `GOTRUE_SMTP_HOST`        | Provider relay host, for example `smtp-relay.brevo.com` |
| `SMTP_PORT`        | `GOTRUE_SMTP_PORT`        | `587` for STARTTLS, `465` for implicit TLS              |
| `SMTP_USER`        | `GOTRUE_SMTP_USER`        | Provider username or SMTP key                           |
| `SMTP_PASS`        | `GOTRUE_SMTP_PASS`        | Provider SMTP key                                       |
| `SMTP_ADMIN_EMAIL` | `GOTRUE_SMTP_ADMIN_EMAIL` | The From address, on a domain this institution controls |
| `SMTP_SENDER_NAME` | `GOTRUE_SMTP_SENDER_NAME` | `System CLOIE`                                          |

`SMTP_USER_NAME` is not a recognised variable and resolves to nothing. Upstream Compose maps `SMTP_SENDER_NAME`.

For Brevo, create the key at <https://app.brevo.com/settings/keys/smtp>. The SMTP login is a sender address Brevo issues and the SMTP key is its password; the full key is displayed exactly once, so store it immediately. See <https://help.brevo.com/hc/en-us/articles/7959631848850-Create-and-manage-your-SMTP-keys>.

Brevo's official SMTP example uses `smtp-relay.brevo.com` on port `587`: <https://developers.brevo.com/docs/node-smtp-relay-example>. Copy the dashboard's SMTP login and SMTP key; the account password and REST API key are not SMTP credentials.

Authenticate the sending domain using the DNS records the provider supplies. For Brevo, follow its Brevo-code, DKIM and DMARC instructions rather than inventing an SPF record. Preserve existing mail records; do not create a second SPF TXT record or change the institution's MX records just to send Auth mail. See <https://help.brevo.com/hc/en-us/articles/12163873383186-Authenticate-your-domain-with-Brevo-Brevo-code-DKIM-DMARC>.

## Auth Switches

Every value below is mapped explicitly by `supabase/docker-compose.auth-mail.yml`. Nothing here relies on a GoTrue default.

| Compose env file             | Container env                                              | Value                             | Reason                                                                                                                                 |
| ---------------------------- | ---------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `SITE_URL`                   | `GOTRUE_SITE_URL`                                          | System CLOIE origin               | The application's redirect targets must resolve here                                                                                   |
| `ADDITIONAL_REDIRECT_URLS`   | `GOTRUE_URI_ALLOW_LIST`                                    | Exact callback and code-page URLs | Include `/api/auth/callback`, `/verify-email` and `/reset-password` on every approved application origin                               |
| `ENABLE_EMAIL_SIGNUP`        | `GOTRUE_EXTERNAL_EMAIL_ENABLED`                            | `true`                            | External password signup                                                                                                               |
| `ENABLE_EMAIL_AUTOCONFIRM`   | `GOTRUE_MAILER_AUTOCONFIRM`                                | `false`                           | An unverified address must never reach domain linkage                                                                                  |
| `MAILER_OTP_EXP`             | `GOTRUE_MAILER_OTP_EXP`                                    | `600`                             | Ten minutes, in seconds, for every emailed code                                                                                        |
| `MAILER_OTP_LENGTH`          | `GOTRUE_MAILER_OTP_LENGTH`                                 | `6`                               | Matches the code field in the entry form                                                                                               |
| `SMTP_MAX_FREQUENCY`         | `GOTRUE_SMTP_MAX_FREQUENCY`                                | `1m`                              | Default per-address mail spacing                                                                                                       |
| `PASSWORD_MIN_LENGTH`        | `GOTRUE_PASSWORD_MIN_LENGTH`                               | `8`                               | The application schema requires 8; GoTrue's own floor is 6                                                                             |
| `SECURE_PASSWORD_CHANGE`     | `GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION` | `true`                            | Reauthentication is required for password changes from older sessions; workspace confinement is enforced separately by the application |
| `MAILER_SECURE_EMAIL_CHANGE` | `GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED`                | `true`                            | An address change is confirmed on the old and the new address                                                                          |
| `RATE_LIMIT_EMAIL_SENT`      | `GOTRUE_RATE_LIMIT_EMAIL_SENT`                             | `20`                              | Bounds outbound mail before the relay is contacted                                                                                     |
| `RATE_LIMIT_OTP`             | `GOTRUE_RATE_LIMIT_OTP`                                    | `30`                              | Bounds the send endpoints per client IP                                                                                                |

Three naming corrections, because getting any of them wrong leaves the setting silently at its default:

- The per-address mail cooldown is **`GOTRUE_SMTP_MAX_FREQUENCY`**, mapped from `SMTP_MAX_FREQUENCY`. There is no `GOTRUE_MAILER_MAX_FREQUENCY`.
- **`GOTRUE_SECURITY_MAX_AGE` does not exist in Supabase Auth.** Nothing clamps the OTP lifetime against it, so do not add it as a safety setting or reject `600` against it. `GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION` is a real setting with a confusingly similar name, and means something entirely different.
- `GOTRUE_RATE_LIMIT_OTP` gates the **send** endpoints (`/signup`, `/recover`, `/resend`, `/otp`, `/magiclink`, and `PUT /user`), per client IP. It does not gate code verification. `POST /verify` is `GOTRUE_RATE_LIMIT_VERIFY` and returns `over_request_rate_limit`, not `over_email_send_rate_limit`. Raising `GOTRUE_RATE_LIMIT_OTP` in response to a verification 429 changes nothing about verification.

Both per-IP limiters read the client IP from `GOTRUE_RATE_LIMIT_HEADER`, which is unset by default. While it is unset, GoTrue logs a warning and skips per-IP limiting entirely, leaving only the process-global mail limiter in force. The overlay deliberately does not set it: a rate-limit header is only trustworthy if the reverse proxy **overwrites** it, and choosing one for an arbitrary deployment would make the limit bypassable rather than effective. Investigate what your gateway sets and overwrites before turning it on, and set it to a header the client cannot forge.

Leave `GOTRUE_MAILER_URLPATHS_CONFIRMATION` and `GOTRUE_MAILER_URLPATHS_RECOVERY` alone. They build link targets for link-based templates, which this platform does not use. Their stock `/auth/v1/verify` value is harmless because the templates in use render `{{ .Token }}` instead of a link.

## Code Templates

GoTrue does not read templates from disk or from a table. At send time it issues an HTTP GET against the configured template URL, and it treats a non-200 response or a timeout as a send failure. A template URL the Auth container cannot reach looks exactly like a mail outage.

Deploy the System CLOIE application first. Next.js serves the two canonical files under `public/auth-email/` as unauthenticated static HTML. Set the template URLs to this application's HTTPS origin:

```bash
GOTRUE_MAILER_TEMPLATES_CONFIRMATION=https://<app-domain>/auth-email/confirm_signup.html
GOTRUE_MAILER_TEMPLATES_RECOVERY=https://<app-domain>/auth-email/recovery.html
GOTRUE_MAILER_SUBJECTS_CONFIRMATION=Your System CLOIE verification code
GOTRUE_MAILER_SUBJECTS_RECOVERY=Your System CLOIE password recovery code
```

The subject variables are `MAILER_SUBJECTS_*` / `GOTRUE_MAILER_SUBJECTS_*`. There is no `GOTRUE_MAILER_TEMPLATES_SUBJECT_*`; a value under that name resolves to nothing and the stock subject is used instead.

GoTrue caches each fetched body for `GOTRUE_MAILER_TEMPLATE_MAX_AGE`, 10 minutes by default, so an edited template takes up to ten minutes to appear in a send. Re-serve the files and restart Auth when you change them; do not judge a template edit by the next send alone.

Source of truth for both bodies:

- `public/auth-email/confirm_signup.html`
- `public/auth-email/recovery.html`

Each body must keep `{{ .Token }}`. A template that drops the token reintroduces the link-only failure while still sending mail.

The public responses contain only fixed email copy and the literal `{{ .Token }}` placeholder. Supabase substitutes a code after fetching the template; this application endpoint never receives or renders an issued code, email address or credential. The request proxy excludes only these two exact static paths, leaving protected application routes unchanged. Keep scripts, user data and secrets out of these files. The local CLI also reads these same files through `content_path`, so no copying or generation step is needed.

Use the trusted application HTTPS origin, not an arbitrary third-party template host. Template availability now depends on the application being reachable from Auth; an application outage can also prevent verification and recovery mail. Public files are already included in the deployment image. Do not add an authentication challenge or access-protection page in front of these two URLs.

The Auth container sits on the private Docker network, so a public HTTPS URL is the reliable choice. Confirm the URL returns 200 from inside the network before going live:

```bash
docker compose exec auth wget -qO- https://<app-domain>/auth-email/confirm_signup.html
docker compose exec auth wget -qO- https://<app-domain>/auth-email/recovery.html
```

## Application Environment

One value affects mail, and it already exists in the documented contract:

```bash
NEXT_PUBLIC_SITE_URL=https://<production-origin>
```

`getSiteUrl` uses it for `emailRedirectTo` and the recovery `redirectTo`. Left unset, the app falls back to the proxy's `Host` and `x-forwarded-proto` headers, which is usually correct but leaves the recovery link dependent on proxy configuration. No other application variable is required, and none should be added.

### Required application values and separate services

Use `.env.example` for the application resource, not the Supabase resource:

| Values                                                      | Where to obtain them                                                                                                                                                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The configured self-hosted API origin and its public anon key. The URL must be browser-reachable; never substitute a service-role key.                                                                              |
| `NEXT_PUBLIC_SITE_URL`                                      | The application HTTPS origin, matching the mail file's `SITE_URL`. Public values must be present when building Next.js.                                                                                             |
| `DATABASE_URL`, `DIRECT_URL`                                | Existing self-hosted PostgreSQL connection strings. Runtime may use the pooler; schema commands use the direct connection. Keep passwords server-only.                                                              |
| `CLOIE_DEPLOYMENT_KIND`, `CLOIE_BACKEND_ID`                 | `production` and an operator-assigned opaque backend identifier on primary production. Set primary/demo identity fields according to `.env.example` and the dedicated-demo runbook when those targets are operated. |
| `CLOIE_LEGAL_TICKET_SECRET`                                 | A fresh server-only random signer, at least 32 characters. Required for the legal gate and verified signup-session proof.                                                                                           |
| `CONFIRMATION_SECRET`                                       | A separate server-only random signer for protected Secretary confirmations.                                                                                                                                         |
| `BOOTSTRAP_SECRETARY_EMAIL`                                 | The eligible institutional address for the first Secretary, only when bootstrap setup is needed.                                                                                                                    |

Generate each application signer separately with `openssl rand -hex 32`. Preserve existing working secrets; rotating the legal signer invalidates tickets and signup proofs. A secret generated in a local environment file does not automatically reach a remote deployment.

Keep `CLOIE_DEMO_ENABLED` and `CLOIE_CI_TEST_ENABLED` disabled on primary production. Demo identities, allowlists and session secrets belong only on the isolated demo target. Existing GitHub Actions workflows create disposable test credentials and capture mail; no production SMTP or database credentials need to be added as GitHub secrets.

Google remains required for internal roles. In the base Supabase Compose Auth environment, enable `GOTRUE_EXTERNAL_GOOGLE_ENABLED`, map `GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID` and `GOTRUE_EXTERNAL_GOOGLE_SECRET` from the Google Cloud OAuth client, and configure `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI` as the actual Auth callback. Register that exact callback in Google Cloud. Local CLI values are `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; remotely the credential belongs on Supabase, not Next.js. This mail overlay preserves existing Google settings.

Required services are the existing self-hosted Supabase stack, the Next.js application, one SMTP relay for real delivery, DNS access to authenticate the sender domain, and an HTTP(S) host serving the two mail templates. AI Insights is optional and separately configured by `CLOIE_AI_*`; it is not needed for authentication, email delivery or ordinary evaluation workflows.

## Local Development

The local CLI Docker stack already works and needs no change. `supabase/config.toml` sets `enable_signup`, `enable_confirmations`, `secure_password_change`, `double_confirm_changes`, `minimum_password_length = 8`, `otp_length = 6`, `otp_expiry = 600`, and a 60-second resend cooldown, and the bundled catcher keeps mail local. Local mail is never delivered to a real inbox, by design.

```bash
pnpm supabase:start
```

Restart the local stack after editing `supabase/config.toml`. To inspect captured mail, open the catcher interface on port `54324`.

`pnpm test:auth-integration` starts the local stack only when needed, runs real signup, strict signup-purpose verification, code reuse rejection, duplicate signup, and password recovery against the catcher, then stops only a stack it started. The opt-in suite refuses non-loopback endpoints. CI selects this gate for credential, legal, Auth configuration, template, and verification-infrastructure changes. Direct Faculty-request, approval, onboarding, external-entry, Alumni-profile, and Industry Partner-profile actions also select database and real Auth checks, because their authorization cannot rely on a page gate. These checks do not certify SMTP, sending-domain authentication, Google linking, or institutional approval on a deployment target.

## Verification

Recreate the Auth container (`up -d --force-recreate auth`) after any change, then exercise the real flow. A settings endpoint check alone proves nothing about delivery.

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

The overlay's mapping has been exercised end to end against a disposable
self-hosted instance: signup, code verification, unverified sign-in denial,
code-reuse rejection, the eight-character password minimum, password recovery
with a subsequent password update, and the ten-minute boundary — a code at 599
seconds was accepted and codes at 601 seconds were rejected for both signup and
recovery. That proves the mapping and the `600` value, not delivery to a real
inbox; delivery still needs steps 3 to 6 above against the target relay.

On GoTrue v2.196.0, shortening the lifetime has no grace period: verification compares the stored send timestamp with the running configuration. A code sent nine minutes before recreation with `600` has one minute left; one sent more than ten minutes earlier is expired. Recheck this behavior before an Auth upgrade, because newer experimental one-time-token verification can use an expiry fixed at issuance.

## Troubleshooting

| Symptom                                        | Cause                                                      | Fix                                                                                                                   |
| ---------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| No mail at all, code page loads                | Autoconfirm on                                             | Set `ENABLE_EMAIL_AUTOCONFIRM=false` and recreate Auth                                                                |
| No mail at all, log shows success              | Catch-all host still configured                            | Replace `SMTP_HOST` and the credentials with the real relay                                                           |
| Mail arrives with a link, no code              | Default template in use                                    | Set both `GOTRUE_MAILER_TEMPLATES_*` values                                                                           |
| `template_body_http_error` in the log          | Template URL unreachable from the container                | Fix reachability, then re-test with the in-container `wget` command                                                   |
| Second and later attempts never arrive         | Per-address cooldown too long, or the mail limiter reached | Check `GOTRUE_SMTP_MAX_FREQUENCY` first; only then consider `GOTRUE_RATE_LIMIT_EMAIL_SENT`                            |
| Verification returns `over_request_rate_limit` | Verify endpoint's configured limiter, not a mail problem   | Inspect trusted client-IP handling, recent attempts and `GOTRUE_RATE_LIMIT_VERIFY`; do not automatically raise limits |
| Mail lands in spam                             | Missing SPF or DKIM                                        | Publish both records for the sending domain                                                                           |
| Recovery mail is unusable                      | Recovery template drops the token                          | Restore `{{ .Token }}` in the recovery body                                                                           |
| `redirect_to` rejected                         | Origin not allowlisted                                     | Add the origin to `ADDITIONAL_REDIRECT_URLS`                                                                          |

## Rollback

1. Unset `GOTRUE_MAILER_TEMPLATES_CONFIRMATION` and `GOTRUE_MAILER_TEMPLATES_RECOVERY` if the templates are the problem, and recreate Auth. GoTrue falls back to its built-in templates, which deliver a link the entry form cannot use — usable only as a deliberate outage, not as a working state.
2. To stop real delivery, explicitly point the Auth SMTP settings at an isolated mail catcher and recreate Auth, or suspend external registration while repairing delivery. Removing this overlay alone does not restore a catcher: the base `.env` may still contain real relay credentials.
3. Never roll back by enabling `ENABLE_EMAIL_AUTOCONFIRM` to make a screen look successful. That lets an unverified address reach domain linkage and breaks the entry invariant.

Rollback is a real loss of function, not a silent degradation. Record it, and prefer a forward fix.

## Evidence Limits

Record the target, the provider chosen, the free ceiling confirmed, and the date it was confirmed. Never record SMTP credentials, provider API keys, or full Authorization headers in an issue comment, a log excerpt, a screenshot, or a commit. Redact the relay password and the From address if the address is a personal mailbox.

# Ten-Minute Email OTP Expiry

## Context

Every six-digit code System CLOIE sends (signup verification, password recovery) is minted, stored, and expiry-checked entirely inside Supabase Auth (GoTrue). The application stores no code and computes no expiry — confirmed: no `verification_code` / `token_hash` / `expires_at` column exists in `prisma/**`, `supabase/migrations/**`, or `src/types/supabase-database.ts`. Code lifetime is one instance setting, currently `3600` seconds in both places the repo declares it.

The ask is to make that window 10 minutes, for the verification code and every other six-digit code sent to Gmail. Upstream `supabase/auth@master` confirms a single value, `Mailer.OtpExp` (`GOTRUE_MAILER_OTP_EXP`), governs all of them: `internal/api/mail.go` passes `config.Mailer.OtpExpAsDuration()` into `CreateOneTimeToken` from `sendConfirmation:359`, `sendPasswordRecovery:438`, `sendInvite:396`, `sendMagicLink:522`, `sendReauthenticationOtp:479`, and the email-change senders `583`/`589`. Verification recomputes `sentAt + OtpExp` live via `isOtpExpired` in `internal/api/verify.go` for both `ConfirmationToken` and `RecoveryToken`. So one setting change covers "all the other stuff"; the rest of this work is making the repository's declared contract and its user-facing copy agree with it, and adding the missing guard that stops it drifting back.

End state: `600` seconds everywhere, a value-pinning regression test, copy that names the window, and one app constant that stops outliving the code it exists to serve.

## Approach

Steps are ordered; each leaves the tree buildable and the existing suite green.

### 1. Set the declared lifetime to 600 seconds

Two files declare it, and they must not drift — a target that reads one and not the other would silently run at the old lifetime.

- `supabase/config.toml:236` — change `otp_expiry = 3600` to `otp_expiry = 600`. Leave the comment on line 235 (`# Number of seconds before the email OTP expires (defaults to 1 hour).`) as-is: it describes the upstream CLI default, not this repository's value. Do not touch `otp_length = 6` (line 234) or `max_frequency = "60s"` (line 232); both are independent of the expiry and 60 s of resend cooldown inside a 10-minute window is not a trap.
- `supabase/mail.env.example:95` — change `MAILER_OTP_EXP="3600"` to `MAILER_OTP_EXP="600"`.

These are the only two runtime values. There is no migration and no Prisma change; the OTP never enters the `public` schema.

### 2. Remove the false constraint the docs assert about that value

`GOTRUE_SECURITY_MAX_AGE` does not exist in `supabase/auth`. Upstream `SecurityConfiguration` (`internal/conf/configuration.go:931-943`) contains only Captcha, RefreshToken\*, ManualLinkingEnabled, DbEncryption and similar; the string is absent from `configuration.go`, `example.env`, `example.docker.env`, and `README.md`, and from tags v1.22.9 / v1.58.0. Nothing clamps OTP expiry against it, and `Validate()` imposes nothing at all. Leaving the claim in place would have an operator rejecting `600` against a knob that does not exist.

- `docs/runbooks/external-entry-mail.md:98` — rewrite the table row so the value cell reads `600` and the reason cell drops the `at or below GOTRUE_SECURITY_MAX_AGE` clause, stating instead that a shorter window retroactively kills codes already in flight after a restart (see Verification, which is where an operator proves it).
- `docs/runbooks/external-entry-mail.md:146` — the local-development paragraph; change `otp_expiry = 3600` to `otp_expiry = 600`.
- `supabase/README.md:16` — the issue #649 local-settings sentence; change `otp_expiry = 3600` to `otp_expiry = 600`.
- `supabase/README.md:46-48` — the `GOTRUE_MAILER_OTP_EXP` bullet; keep `GOTRUE_MAILER_OTP_LENGTH=6` and `GOTRUE_MAILER_AUTOCONFIRM=false`, replace the `GOTRUE_SECURITY_MAX_AGE` sentence with the plain fact that the value is in seconds and applies to every emailed code, verification and recovery alike.

The mail overlay also makes the existing credential policy explicit. Local `minimum_password_length = 8` matches the application schema and self-hosted `PASSWORD_MIN_LENGTH=8`. The corrected cooldown key is `GOTRUE_SMTP_MAX_FREQUENCY`; `GOTRUE_RATE_LIMIT_OTP` controls sending, not verification. The overlay requires an explicit `MAILER_OTP_EXP` rather than maintaining a third default.

### 3. Stop the pending-registration cookie outliving the code

`src/features/entry/services/pending-external-registration.ts:31` currently reads `const PENDING_VERIFICATION_MAX_AGE_SECONDS = 60 * 60;` under a comment that says it "Matches the configured signup-code lifetime". At a 600-second provider lifetime that comment becomes false and the pin outlives its own reason to exist, which is the exact property ADR 0032 rejected when it chose a fixed short lifetime ("a fixed short lifetime matches the provider's signup-code lifetime instead of outliving it").

- Change line 31 to `const PENDING_VERIFICATION_MAX_AGE_SECONDS = 60 * 10;`.
- Rewrite the doc comment on lines 27-30 to say the pin mirrors the ten-minute code lifetime rather than restating a generic match.

`cookieOptions()` (line 43) already feeds this constant into both cookies, so `cloie_pending_verify_email` and `cloie_pending_external_role` both tighten with no other edit.

Losing the role pin at ten minutes is acceptable and already handled: `verifyExternalCode` falls back to the account's `requested_role` user metadata when no pin resolves (`external-entry-actions.ts:313-316`), and ADR 0033 records that fallback as the accepted behaviour. No new fallback branch.

### 4. State the window in the copy a person actually reads

Four strings currently describe the lifetime vaguely or not at all. Once this repository pins `600` for every deployment it operates, a concrete number is accurate everywhere, so replace the number-free phrasing.

- `public/auth-email/confirm_signup.html:7` — `<p>The code expires shortly and can only be used once.</p>` becomes `<p>The code expires 10 minutes after it is sent and can only be used once.</p>`
- `public/auth-email/recovery.html:8` — the same replacement for `The code expires shortly` inside that paragraph; keep the rest of the sentence ("It confirms control of this email address only; it does not grant access to any workspace.") and keep `{{ .Token }}` on line 6 of both files untouched.
- `src/features/entry/components/verify-email-form.tsx:219-220` — the hint under the code field becomes `The code expires 10 minutes after it is sent. No dashboard or evaluation access is granted before verification.` Keep it inside the existing `{!errors.token && …}` guard and keep `id="verify-code-hint"`, because line 214 wires `aria-describedby` to that id.
- `src/lib/actions/external-entry-actions.ts:65-66` — `NEUTRAL_RESEND_MESSAGE` becomes `"If a verification is pending for this email, a new code has been sent. Codes expire 10 minutes after they are sent; wait for the cooldown before requesting again."`

The enumeration-neutral property of that message is unchanged: it is still returned identically whether or not a code was actually sent.

Deliberately unchanged, because they already describe the behaviour correctly: the verify failure at `external-entry-actions.ts:303` ("That code did not match or has expired…"), the recovery failure at line 418-420, `PENDING_VERIFICATION_NOTICE` (`pending-external-registration.ts:40-41`), and the expired-code FAQ answer (`entry-help-faq.tsx:29-33`) — none of them states a duration.

Two template edits mean operators must re-serve both files from wherever `GOTRUE_MAILER_TEMPLATES_CONFIRMATION` / `GOTRUE_MAILER_TEMPLATES_RECOVERY` point and restart Auth, per `docs/runbooks/external-entry-mail.md:108-132`. That is an operator step on a deployment target, not a code change; say so in the hand-off notes so it is not mistaken for "committed and live".

No live countdown is added to the form. The client cannot know when the code was issued on a cold visit, so a real countdown needs a server-timestamp hand-off that nothing in this ask requires — the form already counts down the 60-second resend cooldown at `verify-email-form.tsx:112-116`. Add one if the person-facing demand for it appears.

### 5. Add the missing guard that pins the value

No test anywhere asserts the configured OTP lifetime. `src/__tests__/config/risk-selection.test.ts:152-179` pins which paths _select_ the real-Auth gate but never the expiry value, so a silent revert of `600` back to `3600` turns nothing red. And no runtime assertion is possible: upstream `internal/api/settings.go` exposes only `external`, `disable_signup`, `mailer_autoconfirm`, `phone_autoconfirm`, `sms_provider`, `saml_*`, and `passkeys_enabled` — there is no `mailer_otp_expiry` key to read, which is why the existing `beforeAll` at `external-auth-real-gotrue.test.ts:208-220` can only assert `mailer_autoconfirm`.

So the invariant has to be a cross-file configuration contract: the local stack and the operator template must declare the same lifetime, and it must be ten minutes.

- New file `src/__tests__/config/email-otp-lifetime.test.ts`, Node environment (a `.ts` test with no JSX lands in the `node` project under `vitest.config.ts:53-57`).
- Read `supabase/config.toml` and `supabase/mail.env.example` with `readFileSync(path.join(process.cwd(), …), "utf8")` — the same convention as `src/__tests__/config/supabase-cli-scripts.test.ts:10`.
- No TOML parser is installed and none is needed: take the `[auth.email]` section with a `config.slice(config.indexOf("[auth.email]"))` guard up to the next `[auth.` line, then `/^otp_expiry\s*=\s*(\d+)\s*$/m`; read the operator value with `/^MAILER_OTP_EXP\s*=\s*"(\d+)"/m`.
- Three assertions: both files parse to a number, the two numbers are equal, and the shared value is `600`. Name the failure messages after the deployment they protect ("the local stack and every self-hosted target must declare the same code lifetime"), not after the regex.
- The file must contain neither `RUN_DATABASE_INTEGRATION_TESTS` nor `skipIf`, so `scripts/lib/database-suite-discovery.ts:49-51` never classifies it as a database suite and `pnpm verify:database-suites` stays unaffected.

Do not extend this into a check that greps TypeScript source for `60 * 10`; that pins an implementation spelling rather than the contract and will break on a harmless refactor.

## Critical files & anchors

- `supabase/config.toml:236` — `otp_expiry`; the local-stack declaration the CLI turns into `GOTRUE_MAILER_OTP_EXP` (upstream `supabase/cli@develop:packages/stack/src/services/AuthSettings.ts:197`).
- `supabase/mail.env.example:95` — `MAILER_OTP_EXP`; the operator template every self-hosted target is configured from. Repo `supabase/supabase@master:docker/docker-compose.yml` ships no such variable, so an instance that never receives this line runs at GoTrue's own 86400-second default.
- `src/features/entry/services/pending-external-registration.ts:27-31` — the cookie lifetime and the comment tying it to the provider's code lifetime; the only application-side constant that mirrors the setting.
- `src/lib/actions/external-entry-actions.ts:65-66` — `NEUTRAL_RESEND_MESSAGE`, the one server string that describes the lifetime to a person, and the one whose neutrality must survive the edit.
- `scripts/ci/lib/risk-domains.mjs` — `AUTH_INTEGRATION_PREFIXES`; confirms `supabase/config.toml`, `public/auth-email/`, `src/features/entry/`, and `src/lib/actions/external-entry-actions.ts` all select the real-GoTrue gate for this change, which is the gate that can catch a bad edit here.

## Verification

Run from the repository root. Node and pnpm are already present; `pnpm install --frozen-lockfile` is not needed since no dependency changes.

**1. The value-pinning test fails before the edit and passes after.** New-behavior check.

```
pnpm vitest run src/__tests__/config/email-otp-lifetime.test.ts
```

Expected: passing after step 5. Before step 1, with `3600` still in both files, it must fail on the `600` assertion. Confirm that direction by running it once against the pre-edit values — a test that has never been seen red proves nothing.

**2. Nothing else in the repository still claims an hour.**

```
grep -rn "3600" supabase/config.toml supabase/mail.env.example docs/runbooks/external-entry-mail.md supabase/README.md
```

Expected: no hit naming an OTP or code lifetime. Any surviving `3600` in these four files must be `jwt_expiry`, which is an access-token lifetime and independent of the OTP (`supabase/config.toml:166`).

**3. The real GoTrue path still works end to end.** This is the load-bearing check for step 1 — it starts the disposable local CLI Docker stack, sends a real code, captures it from the bundled mail catcher, and verifies it.

```
pnpm supabase:stop
pnpm supabase:start
pnpm test:auth-integration
```

Expected: the `external entry against real Supabase Auth (649)` suite passes, including `requires inbox verification before a password session exists`, which asserts the captured code matches `/^\d{6}$/`, that an unverified address cannot sign in, and that the code establishes a session whose `amr` contains `otp`. The code is captured and verified within seconds of sending, well inside ten minutes. Then `pnpm supabase:stop`.

**4. The knob is genuinely live — prove expiry, not just a number in a file.** No endpoint reports the configured value, so prove it by temporarily shrinking the window on the local stack.

```
# in supabase/config.toml, temporarily
otp_expiry = 10
```

```bash
pnpm supabase:stop && pnpm supabase:start
```

Open `http://127.0.0.1:54324` (the bundled mail catcher), register any address at `/register/external`, wait roughly 12 seconds, then submit the captured six-digit code at `/verify-email`.

Expected observable output: the code input shows `Enter the 6-digit code from your email.` only while the field is malformed; a well-formed but stale code produces the server error `That code did not match or has expired. Check the latest email or request a new code.` and no session is created. Re-entering the same code before the 10-second window closes succeeds, which is the control that proves the failure was the clock and not a bad code. Restore `otp_expiry = 600`, then `pnpm supabase:stop && pnpm supabase:start`.

If the local stack cannot be started in this environment, say so and mark this step unproven rather than passing it — step 3 plus step 1 is strong evidence the setting parses, but only step 4 proves it is _enforced_.

**5. Full suites and the affected journeys.**

```
pnpm test
```

Expected: both projects green. The copy edits are invisible to the suite by construction — `grep -rn "expires after its lifetime\|expires shortly\|Codes expire" src/__tests__ e2e` returns nothing, and `e2e/public-entry.spec.ts:172-182` asserts only the H1, the two field labels, and the two button names, none of which changed.

```
pnpm test:e2e
```

Expected: green, including the signed-out `verify, forgot, and reset pages render their code and password flows` journey. `/verify-email` is not in the curated visual baseline (`e2e/visual-baseline.spec.ts` snapshots `/login/student`, not `/verify-email`), so no snapshot regeneration is required; if the run does report a visual diff for this route, regenerate rather than suppress.

**6. State the deployment consequence.** On GoTrue v2.196.0's default path, lowering `GOTRUE_MAILER_OTP_EXP` shortens outstanding codes immediately: a code sent one minute before recreation has nine minutes left, one sent nine minutes earlier has one minute left, and one older than ten minutes is expired. There is no grace period. Recheck newer experimental verification paths before an Auth upgrade; this behavior must be stated in the deployment hand-off.

## Assumptions & contingencies

- **Number in user-facing copy.** Assumption: stating "10 minutes" is acceptable even though the app reads the value from no runtime source. Recommended default is to state it, because this repository pins the value for every deployment it operates and the current number-free phrasing ("The code expires after its lifetime") reads as broken to a person waiting on a code. Override: revert step 4 to keep copy number-free and rely on the mail alone.
- **Role pin drops with the code.** Assumption: expiring `cloie_pending_external_role` at ten minutes is correct rather than a regression. It follows ADR 0032's own rule, and the metadata fallback in `verifyExternalCode` covers a person who takes longer. If the role-routing loss proves real in use, the fix is a separate longer-lived pin with its own constant and its own ADR amendment — do not widen this one.
- **No application-side expiry check.** Assumption: relying entirely on GoTrue to enforce the window is acceptable. Adding a server-side timestamp in `verifyExternalCode` would duplicate a check the provider already performs and would break the enumeration-neutral response. If a future requirement needs the app to know the remaining window, that is a new slice.
- **Rate limits stay as they are.** Diagnose 429 responses before changing limits. `over_email_send_rate_limit` is outbound mail throttling; `over_request_rate_limit` may be endpoint verification throttling. `GOTRUE_RATE_LIMIT_OTP` controls sending rather than verification, and raising it does not fix either an exhausted provider quota or the verification limiter. Preserve the current limits unless deployment evidence justifies a separate change.
- **If the pinned value is rejected on operator grounds.** If a target cannot take 600, do not special-case it in the application. Change that instance's `MAILER_OTP_EXP`, and expect step 5's contract test to fail for any target whose template was edited away from `600` — that failure is the intended signal, and the operator's `mail.env` lives outside this repository, so the template must stay at the platform's canonical value.

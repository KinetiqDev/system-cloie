/**
 * Real Supabase Auth + mail-catcher integration (issue #649).
 *
 * The signed CI cookie session cannot prove password, six-digit code,
 * recovery, or provider-linking behavior: it bypasses GoTrue entirely. This
 * suite exercises the actual credential owner against the disposable local
 * Supabase stack (`pnpm supabase:start`), whose bundled catcher keeps mail in
 * the container.
 *
 * Target safety: the gate never reads NEXT_PUBLIC_SUPABASE_* as a fallback and
 * refuses any endpoint that is not a loopback address, so running it with a
 * developer's default `.env` cannot mutate a hosted or demo project. Endpoints
 * come only from `scripts/ci/run-auth-integration.ts`, which is the local CLI
 * stack by construction.
 *
 * Gate: RUN_AUTH_INTEGRATION_TESTS=1 plus CLOIE_AUTH_INTEGRATION_*. Missing
 * variables fail closed rather than silently skipping a gate someone asked for.
 *
 * What this proves that no other gate can:
 * - signup never autoconfirms (the invariant the whole entry flow rests on:
 *   no domain linkage before verification);
 * - the confirmation mail carries a usable six-digit code, not a link;
 * - an unconfirmed address cannot obtain a password session;
 * - the real token claims are `otp` for a verification code and `password` for
 *   a credential sign-in, which is what the internal-role method gate reads;
 * - a code is single-use, and a duplicate signup creates no second identity;
 * - recovery carries its own code, and the replaced credential stops working.
 *
 * Recovery confinement to the credential change is an application gate
 * (`confirmPasswordRecovery` ends the session, and the profile gate refuses
 * non-Google methods for internal roles); this suite proves only what GoTrue
 * itself guarantees.
 */
import { createClient } from "@supabase/supabase-js";
import { SystemRole } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { resolveAuthMethodFromClaims } from "../../features/auth/services/resolve-auth-method";
import {
  rememberVerifiedSignupSession,
  SIGNUP_SESSION_COOKIE_NAME,
  verifySignupSessionProof,
} from "../../features/auth/services/signup-session-proof";
import { resolveProfileGate } from "../../features/users/services/resolve-profile-gate";

// The signed signup proof is written through `cookies()`. Mocking only that
// boundary keeps the proof itself real: the HMAC, the session binding, and the
// claims all come from GoTrue and are validated by the production verifier.
const { cookieStore } = vi.hoisted(() => ({
  cookieStore: { get: vi.fn(), set: vi.fn() },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

// The proof signer refuses secrets under 32 characters, so the gate provides
// an isolated disposable value instead of inheriting a developer environment.
vi.stubEnv("CLOIE_LEGAL_TICKET_SECRET", "ci-auth-integration-ticket-secret-0123456789");

// The proof cookie name is asserted rather than hardcoded so a rename cannot
// silently leave the gate checking a cookie the app never writes.
const PROOF_COOKIE_NAME = SIGNUP_SESSION_COOKIE_NAME;
const AUTH_URL = process.env.CLOIE_AUTH_INTEGRATION_URL;
const ANON_KEY = process.env.CLOIE_AUTH_INTEGRATION_ANON_KEY;
const MAIL_URL = process.env.CLOIE_AUTH_INTEGRATION_MAIL_URL;
const SERVICE_KEY = process.env.CLOIE_AUTH_INTEGRATION_SERVICE_KEY;

const PASSWORD = "integration-password-1";
const REPLACED_PASSWORD = "replacement-password-2";

const LOOPBACK_HOSTS = ["127.0.0.1", "localhost", "[::1]"];

/** Loopback-only: this suite mutates Auth, so a remote target must be refused. */
function requireLoopbackEndpoint(value: string | undefined): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  return url.protocol === "http:" && LOOPBACK_HOSTS.includes(url.hostname) ? value : null;
}

const requested = process.env.RUN_AUTH_INTEGRATION_TESTS === "1";
const authUrl = requireLoopbackEndpoint(AUTH_URL);
const mailUrl = requireLoopbackEndpoint(MAIL_URL);
const configured = Boolean(authUrl && mailUrl && ANON_KEY && SERVICE_KEY);

type CaughtMessage = { Text?: string; HTML?: string };

/** Decode the JWT payload without verifying it; the claims are the evidence. */
function readClaims(accessToken: string): Record<string, unknown> {
  const payload = accessToken.split(".")[1];
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
}

/** The `amr` entries GoTrue recorded for the credential that opened the session. */
function amrMethods(accessToken: string): string[] {
  const amr = readClaims(accessToken).amr;
  if (!Array.isArray(amr)) return [];
  return amr.map((entry) => {
    if (typeof entry === "object" && entry !== null && "method" in entry)
      return String(entry.method);
    return String(entry);
  });
}

/**
 * Unique per call and independent of `Date.now()`, which the repository test
 * setup freezes globally — a timestamp-derived address would collide across
 * runs and be rejected as a duplicate signup.
 */
let addressCounter = 0;
function uniqueEmail(label: string): string {
  addressCounter += 1;
  return `ci-auth-${label}-${process.pid}-${addressCounter}@example.test`;
}

describe("external entry against real Supabase Auth (649)", () => {
  // Fail closed: a requested-but-unusable gate is a red run, never a silent skip.
  const suite = configured ? describe : describe.skip;

  suite("configured against a disposable local stack", () => {
    const createdUserIds: string[] = [];

    function client() {
      return createClient(authUrl as string, ANON_KEY as string, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }

    async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
      return fetch(`${authUrl}/auth/v1${path}`, {
        ...init,
        headers: { apikey: ANON_KEY as string, ...(init.headers ?? {}) },
      });
    }

    /**
     * Await the caught message for `email`. GoTrue hands mail to the SMTP
     * catcher inside another container and exposes no in-process signal for
     * it, so delivery is awaited by re-reading the catcher listing on a bounded
     * interval rather than a guessed sleep. The overall bound is real-clock and
     * therefore cannot use fake timers.
     */
    async function awaitCode(email: string, subject: string): Promise<string> {
      const deadline = performance.now() + 30_000;
      for (;;) {
        if (performance.now() > deadline) {
          throw new Error(`No ${subject} mail captured for ${email}.`);
        }
        const listing = (await (await fetch(`${mailUrl}/api/v1/messages?limit=50`)).json()) as {
          messages: Array<{ ID: string; Subject: string; To: Array<{ Address: string }> }>;
        };
        const match = listing.messages.find(
          (message) =>
            message.Subject.includes(subject) &&
            message.To.some((recipient) => recipient.Address === email)
        );
        if (match) {
          const full = (await (await fetch(`${mailUrl}/api/v1/message/${match.ID}`)).json()) as
            | CaughtMessage
            | undefined;
          // A link-only confirmation body carries no bare six-digit code, so
          // this extraction is itself the assertion that the code is usable.
          const code = (full?.Text ?? full?.HTML ?? "").match(/\b(\d{6})\b/)?.[1];
          if (code) return code;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    async function register(email: string): Promise<void> {
      const { error } = await client().auth.signUp({
        email,
        password: PASSWORD,
        options: { data: { display_name: "Integration Alumni" } },
      });
      expect(error, `signup failed for ${email}`).toBeNull();
    }

    async function registerVerified(label: string): Promise<{ email: string; token: string }> {
      const email = uniqueEmail(label);
      await register(email);
      const code = await awaitCode(email, "verification code");
      // The strict purpose the application uses for real signup verification.
      const verified = await client().auth.verifyOtp({ email, token: code, type: "signup" });
      expect(verified.error, "the captured code must verify").toBeNull();
      const token = verified.data.session!.access_token;
      createdUserIds.push(String(readClaims(token).sub));
      return { email, token };
    }

    beforeAll(async () => {
      // An autoconfirming instance makes every assertion below vacuous, so the
      // gate refuses to run rather than reporting meaningless passes.
      const settings = (await (await authFetch("/settings")).json()) as {
        mailer_autoconfirm?: boolean;
        external?: { email?: boolean };
      };
      expect(settings.external?.email, "email signup must be enabled").toBe(true);
      expect(
        settings.mailer_autoconfirm,
        "autoconfirm must be off or verification proves nothing"
      ).toBe(false);
    });

    afterAll(async () => {
      // Cleanup is keyed to the ids this suite created, never a listing sweep:
      // a broad delete could remove identities the environment depends on.
      for (const userId of createdUserIds) {
        await authFetch(`/admin/users/${userId}`, {
          method: "DELETE",
          headers: { authorization: `Bearer ${SERVICE_KEY}` },
        });
      }
    });

    it("requires inbox verification before a password session exists", async () => {
      const email = uniqueEmail("unverified");
      await register(email);

      const code = await awaitCode(email, "verification code");
      expect(code, "the confirmation mail must carry a six-digit code, not a link").toMatch(
        /^\d{6}$/
      );

      const unverified = await client().auth.signInWithPassword({ email, password: PASSWORD });
      expect(unverified.error, "an unverified address must not sign in").toBeTruthy();

      const verified = await client().auth.verifyOtp({ email, token: code, type: "signup" });
      expect(verified.error).toBeNull();
      expect(
        amrMethods(verified.data.session!.access_token),
        "a verification code must establish an otp session"
      ).toContain("otp");

      const signedIn = await client().auth.signInWithPassword({ email, password: PASSWORD });
      expect(signedIn.error).toBeNull();
      const passwordToken = signedIn.data.session!.access_token;
      expect(
        amrMethods(passwordToken),
        "a credential sign-in must record a password method, the claim the internal-role gate refuses"
      ).toContain("password");
      createdUserIds.push(String(readClaims(passwordToken).sub));
    });

    it("rejects a reused verification code and a duplicate signup for the same address", async () => {
      const { email } = await registerVerified("reuse");

      const code = await awaitCode(email, "verification code");
      const reused = await client().auth.verifyOtp({ email, token: code, type: "signup" });
      expect(reused.error, "a six-digit code must be single-use").toBeTruthy();

      const duplicate = await client().auth.signUp({ email, password: PASSWORD });
      expect(
        duplicate.error,
        "a duplicate address must not silently create a second identity"
      ).toBeTruthy();
    });

    // The external entry flow (issue #649) depends on these two boundaries, so
    // they are consumer contracts rather than incidental provider behavior:
    // the signup purpose is verified with the STRICT `signup` OTP type, which
    // GoTrue accepts for a confirmation code and refuses for a recovery code.
    // Under the permissive `email` type a recovery code is accepted and yields
    // a session indistinguishable from signup verification, which would let a
    // recovery session masquerade as verified signup. The negative case is
    // therefore asserted first: if it ever succeeds, the recovery code was
    // consumed and the positive case below would be vacuous.
    it("refuses a recovery code at the strict signup purpose before accepting a real signup code", async () => {
      const email = uniqueEmail("strict");
      await register(email);
      const signupCode = await awaitCode(email, "verification code");

      const verifiedForRecovery = await client().auth.verifyOtp({
        email,
        token: signupCode,
        type: "signup",
      });
      expect(verifiedForRecovery.error).toBeNull();
      createdUserIds.push(String(readClaims(verifiedForRecovery.data.session!.access_token).sub));

      await client().auth.resetPasswordForEmail(email);
      const recoveryCode = await awaitCode(email, "recovery code");

      // Negative first: a recovery code must never verify as signup.
      const recoveryAsSignup = await client().auth.verifyOtp({
        email,
        token: recoveryCode,
        type: "signup",
      });
      expect(
        recoveryAsSignup.error,
        "a recovery code must not satisfy the strict signup purpose"
      ).toBeTruthy();

      // Positive: the same code still works for its real purpose, proving the
      // rejection above was purpose enforcement and not an expired or spent
      // code.
      const recoveryAsRecovery = await client().auth.verifyOtp({
        email,
        token: recoveryCode,
        type: "recovery",
      });
      expect(recoveryAsRecovery.error).toBeNull();
    });

    // Consumer purpose and cross-session leak (issue #649). The app cannot
    // distinguish a recovery session from a signup session by claims alone, so
    // it mints a signed, session-bound proof only after GoTrue accepted the
    // strict `signup` purpose. These assertions run the REAL provider claims
    // (read through `getClaims`, which validates the JWT against the Auth
    // server) through the REAL proof verifier and the REAL profile gate:
    //
    // - a verified signup session plus its own proof is admitted;
    // - the same session WITHOUT the proof is refused;
    // - the proof does NOT survive into a recovery session opened by the same
    //   client, even though that client still carries the signup cookie.
    it("admits a proved signup session, refuses the bare one, and rejects the proof in a recovery session", async () => {
      // One client throughout, exactly like the app's createClient: it holds
      // the signup session when recovery is requested.
      const signupClient = client();
      const email = uniqueEmail("proof");
      await signupClient.auth.signUp({
        email,
        password: PASSWORD,
        options: { data: { display_name: "Integration Alumni" } },
      });

      const signupCode = await awaitCode(email, "verification code");
      const verified = await signupClient.auth.verifyOtp({
        email,
        token: signupCode,
        type: "signup",
      });
      expect(verified.error).toBeNull();

      // Verified claims, not a locally decoded payload.
      const signupClaims = await signupClient.auth.getClaims();
      expect(signupClaims.error).toBeFalsy();
      const signupClaimsData = signupClaims.data!.claims as Record<string, unknown>;
      createdUserIds.push(String(signupClaimsData.sub));
      expect(resolveAuthMethodFromClaims(signupClaimsData), "raw signup claims").toBe("otp");

      // Without the proof the raw otp session must not reach a workspace.
      expect(verifySignupSessionProof(undefined, signupClaimsData)).toBe(false);

      cookieStore.set.mockClear();
      await rememberVerifiedSignupSession(signupClaimsData);
      expect(cookieStore.set.mock.calls.at(-1)?.[0]).toBe(PROOF_COOKIE_NAME);
      const proofCookie = cookieStore.set.mock.calls.at(-1)?.[1] as string | undefined;
      expect(proofCookie, "a proved signup session must mint a cookie").toBeTruthy();
      expect(verifySignupSessionProof(proofCookie, signupClaimsData)).toBe(true);

      // The app upgrades a proved otp session to verified-signup, which is
      // what admits an external participant and refuses an internal role.
      const provedMethod =
        resolveAuthMethodFromClaims(signupClaimsData) === "otp" &&
        verifySignupSessionProof(proofCookie, signupClaimsData)
          ? "verified-signup"
          : null;
      expect(provedMethod).toBe("verified-signup");

      const externalGate = resolveProfileGate({
        roles: [SystemRole.ALUMNI],
        activeRole: SystemRole.ALUMNI,
        studentProfileId: null,
        alumniProfileId: "alumni-profile-id",
        industryPartnerProfileId: null,
        authMethod: provedMethod,
      });
      expect(
        externalGate.status,
        "a proved signup session must open the external workspace"
      ).not.toBe("AUTH_METHOD_MISMATCH");

      // Cross-session leak: recovery on the SAME client, which still carries
      // the signup proof cookie, must not be able to reuse it.
      await signupClient.auth.resetPasswordForEmail(email);
      const recoveryCode = await awaitCode(email, "recovery code");
      const recovery = await signupClient.auth.verifyOtp({
        email,
        token: recoveryCode,
        type: "recovery",
      });
      expect(recovery.error).toBeNull();

      const recoveryClaims = (await signupClient.auth.getClaims()).data!.claims as Record<
        string,
        unknown
      >;
      expect(
        verifySignupSessionProof(proofCookie, recoveryClaims),
        "a signup proof must never authorize a recovery session"
      ).toBe(false);
    });

    it("resolves a real signup session to an otp method the profile gate would refuse for an internal role", async () => {
      // The consumer boundary: the app feeds these very claims into
      // resolveProfileGate, and an unproved credential method must fail closed
      // for every Google-only role. This asserts the real provider output
      // drives the real gate, rather than a hand-built claim object.
      const email = uniqueEmail("gate");
      await register(email);
      const code = await awaitCode(email, "verification code");
      const verified = await client().auth.verifyOtp({ email, token: code, type: "signup" });
      expect(verified.error).toBeNull();

      const claims = readClaims(verified.data.session!.access_token);
      createdUserIds.push(String(claims.sub));
      const authMethod = resolveAuthMethodFromClaims(claims);
      expect(authMethod, "a signup code yields a credential method, never google").not.toBe(
        "google"
      );

      for (const role of [SystemRole.FACULTY, SystemRole.SECRETARY, SystemRole.STUDENT]) {
        const gate = resolveProfileGate({
          roles: [role],
          activeRole: role,
          studentProfileId: null,
          alumniProfileId: null,
          industryPartnerProfileId: null,
          hasFacultyAffiliation: true,
          authMethod,
        });
        expect(gate.status, `an ${authMethod} session must not open the ${role} workspace`).toBe(
          "AUTH_METHOD_MISMATCH"
        );
      }
    });

    it("recovers a password with a code and revokes the previous credential", async () => {
      const { email } = await registerVerified("recovery");

      const recovered = await client().auth.resetPasswordForEmail(email);
      expect(recovered.error).toBeNull();

      const recoveryCode = await awaitCode(email, "recovery code");
      expect(recoveryCode).toMatch(/^\d{6}$/);

      const recoverySession = await client().auth.verifyOtp({
        email,
        token: recoveryCode,
        type: "recovery",
      });
      expect(recoverySession.error).toBeNull();

      // The app carries this session in the request cookie; the suite mirrors
      // it with an in-memory session, because a per-call Authorization header
      // is overwritten by the client's own (absent) session.
      const recoveryClient = client();
      const adopted = await recoveryClient.auth.setSession({
        access_token: recoverySession.data.session!.access_token,
        refresh_token: recoverySession.data.session!.refresh_token,
      });
      expect(adopted.error).toBeNull();

      const updated = await recoveryClient.auth.updateUser({ password: REPLACED_PASSWORD });
      expect(updated.error).toBeNull();

      const oldPassword = await client().auth.signInWithPassword({ email, password: PASSWORD });
      expect(oldPassword.error, "the replaced credential must stop working").toBeTruthy();

      const newPassword = await client().auth.signInWithPassword({
        email,
        password: REPLACED_PASSWORD,
      });
      expect(newPassword.error, "the new credential must work").toBeNull();
    });
  });

  it("refuses a requested gate that is not a disposable local stack", () => {
    if (!requested) return;
    const problems: string[] = [];
    if (!AUTH_URL) problems.push("CLOIE_AUTH_INTEGRATION_URL is not set");
    else if (!authUrl) problems.push(`CLOIE_AUTH_INTEGRATION_URL is not loopback: ${AUTH_URL}`);
    if (!MAIL_URL) problems.push("CLOIE_AUTH_INTEGRATION_MAIL_URL is not set");
    else if (!mailUrl)
      problems.push(`CLOIE_AUTH_INTEGRATION_MAIL_URL is not loopback: ${MAIL_URL}`);
    if (!ANON_KEY) problems.push("CLOIE_AUTH_INTEGRATION_ANON_KEY is not set");
    if (!SERVICE_KEY) problems.push("CLOIE_AUTH_INTEGRATION_SERVICE_KEY is not set");
    expect(
      problems,
      `RUN_AUTH_INTEGRATION_TESTS=1 requires a disposable local stack: ${problems.join("; ")}`
    ).toEqual([]);
  });
});

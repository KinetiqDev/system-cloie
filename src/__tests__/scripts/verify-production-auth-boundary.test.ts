import { describe, expect, it } from "vitest";
import {
  assertDemoLoginUnavailable,
  assertUnauthenticatedRedirect,
  assertNoProtectedContent,
  getEvidenceBaseUrl,
} from "../../../scripts/verify-production-auth-boundary";

describe("production browser evidence auth boundary", () => {
  it("requires an explicit HTTP(S) evidence origin", () => {
    expect(() => getEvidenceBaseUrl({})).toThrow("Set PRODUCTION_EVIDENCE_BASE_URL");
    expect(() => getEvidenceBaseUrl({ PRODUCTION_EVIDENCE_BASE_URL: "file:///tmp/app" })).toThrow(
      "must use HTTP or HTTPS"
    );
  });

  it("accepts only a redirect to the public portal for protected content", async () => {
    const baseUrl = new URL("http://127.0.0.1:3000");

    for (const status of [301, 302, 303, 307, 308]) {
      await expect(
        assertUnauthenticatedRedirect(
          new Response(null, {
            status,
            headers: { location: "/portal/respondents" },
          }),
          "/faculty/dashboard",
          baseUrl
        )
      ).resolves.toBeUndefined();
    }

    await expect(
      assertUnauthenticatedRedirect(
        new Response(
          `NEXT_REDIRECT /portal/respondents\n<meta http-equiv="refresh" content="0;url=/portal/respondents">`,
          { status: 200 }
        ),
        "/faculty/dashboard",
        baseUrl
      )
    ).resolves.toBeUndefined();

    for (const status of [300, 304, 305, 306, 399]) {
      await expect(
        assertUnauthenticatedRedirect(
          new Response(null, {
            status,
            headers: { location: "/portal/respondents" },
          }),
          "/faculty/dashboard",
          baseUrl
        )
      ).rejects.toThrow("does not contain an RSC redirect to /portal/respondents");
    }

    await expect(
      assertUnauthenticatedRedirect(
        new Response("protected content", {
          status: 200,
        }),
        "/faculty/dashboard",
        baseUrl
      )
    ).rejects.toThrow("does not contain an RSC redirect to /portal/respondents");

    await expect(
      assertUnauthenticatedRedirect(
        new Response(
          `NEXT_REDIRECT /dashboard\n<meta http-equiv="refresh" content="0;url=/dashboard">`,
          { status: 200 }
        ),
        "/faculty/dashboard",
        baseUrl
      )
    ).rejects.toThrow("does not contain an RSC redirect to /portal/respondents");

    await expect(
      assertUnauthenticatedRedirect(
        new Response(null, {
          status: 307,
          headers: { location: "/dashboard" },
        }),
        "/faculty/dashboard",
        baseUrl
      )
    ).rejects.toThrow("expected /portal/respondents");

    await expect(
      assertUnauthenticatedRedirect(
        new Response(null, {
          status: 307,
          headers: { location: "/portal/respondents/unexpected" },
        }),
        "/faculty/dashboard",
        baseUrl
      )
    ).rejects.toThrow("expected /portal/respondents");

    await expect(
      assertUnauthenticatedRedirect(
        new Response("NEXT_REDIRECT /portal/respondents", { status: 200 }),
        "/faculty/dashboard",
        baseUrl
      )
    ).rejects.toThrow("missing the meta-refresh fallback");
  });

  it("rejects protected content in an unauthenticated redirect response", async () => {
    const protectedFixtures = [
      // Seeded demo email (matches the "demo-" prefix marker).
      "<p>Contact demo-faculty@cloie.test for access.</p>",
      // Seeded user UUID (matches the well-known UUID pattern marker).
      "<span data-user-id=\"77777777-7777-4777-8777-777777777777\">user</span>",
      // Seeded course code (matches the course identifier marker).
      "<td>IT-OD-401</td>",
    ];

    for (const body of protectedFixtures) {
      await expect(
        assertNoProtectedContent(new Response(body, { status: 307 }), "/secretary/course-assignments")
      ).rejects.toThrow("contained protected content marker");
    }

    await expect(
      assertNoProtectedContent(new Response("<main>Respondent Portal</main>", { status: 307 }), "/faculty/dashboard")
    ).resolves.toBeUndefined();
  });
});

describe("demo-login production boundary", () => {
  it("rejects a non-404 demo-login response on primary production", () => {
    for (const status of [200, 201, 400, 500]) {
      expect(() => assertDemoLoginUnavailable(new Response(null, { status }))).toThrow(
        "expected 404"
      );
    }
  });

  it("accepts a 404 demo-login response (route is disabled on this deployment)", () => {
    expect(() => assertDemoLoginUnavailable(new Response(null, { status: 404 }))).not.toThrow();
  });
});

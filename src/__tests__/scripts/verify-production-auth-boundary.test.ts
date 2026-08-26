import { describe, expect, it, vi } from "vitest";
import {
  assertDemoCatalogUnavailable,
  assertDemoLoginAvailable,
  assertDemoLoginUnavailable,
  assertUnauthenticatedRedirect,
  assertNoProtectedContent,
  requestDemoLogin,
  verifyDedicatedDemoAuthBoundary,
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
      '<span data-user-id="77777777-7777-4777-8777-777777777777">user</span>',
      // Seeded course code (matches the course identifier marker).
      "<td>ITRES1</td>",
    ];

    for (const body of protectedFixtures) {
      await expect(
        assertNoProtectedContent(
          new Response(body, { status: 307 }),
          "/secretary/course-assignments"
        )
      ).rejects.toThrow("contained protected content marker");
    }

    await expect(
      assertNoProtectedContent(
        new Response("<main>Respondent Portal</main>", { status: 307 }),
        "/faculty/dashboard"
      )
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

  it("requires every seeded demo catalog account to be unavailable on primary production", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(null, { status: 404 }));

    await expect(
      assertDemoCatalogUnavailable(new URL("https://primary.example.test"))
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(27);
    fetchMock.mockRestore();
  });

  it("posts the requested catalog identifier without retaining a cookie", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(null, { status: 404 }));

    await requestDemoLogin(new URL("https://demo.example.test"), "demo-faculty@cloie.test");

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/api/auth/demo-login", "https://demo.example.test"),
      expect.objectContaining({
        method: "POST",
        redirect: "manual",
        headers: { "cache-control": "no-cache", "content-type": "application/json" },
        body: JSON.stringify({ identifier: "demo-faculty@cloie.test" }),
      })
    );
    fetchMock.mockRestore();
  });

  it("accepts only a signed demo-session response on the dedicated deployment", () => {
    expect(() =>
      assertDemoLoginAvailable(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: {
            "set-cookie": "cloie_demo_auth=opaque-session; Path=/; HttpOnly; Secure; SameSite=Lax",
          },
        })
      )
    ).not.toThrow();

    expect(() => assertDemoLoginAvailable(new Response(null, { status: 200 }))).toThrow(
      "did not set the dedicated demo session cookie"
    );
    expect(() =>
      assertDemoLoginAvailable(
        new Response(null, { status: 200, headers: { "set-cookie": "cloie_dev_auth=value" } })
      )
    ).toThrow("did not set the dedicated demo session cookie");
  });

  it("requires the dedicated deployment to reject every seeded catalog account outside its allowlist", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockImplementation(async (_input, init) => {
      if (init?.method === "POST" && String(_input).endsWith("/api/auth/dev-login")) {
        return new Response(null, { status: 404 });
      }

      if (init?.headers && "cookie" in init.headers) {
        return new Response("<main>Faculty Dashboard</main>", { status: 200 });
      }

      const identifier = JSON.parse(String(init?.body)).identifier;
      return new Response(
        identifier === "demo-faculty@cloie.test"
          ? JSON.stringify({ destination: "/faculty/dashboard" })
          : null,
        {
          status: identifier === "demo-faculty@cloie.test" ? 200 : 404,
          headers:
            identifier === "demo-faculty@cloie.test"
              ? { "set-cookie": "cloie_demo_auth=opaque-session; Path=/; HttpOnly" }
              : undefined,
        }
      );
    });

    await expect(
      verifyDedicatedDemoAuthBoundary(new URL("https://demo.example.test"), {
        CLOIE_DEMO_ALLOWED_USERS: "demo-faculty@cloie.test",
      })
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(29);
    fetchMock.mockRestore();
  });

  it("rejects a dedicated-demo allowlist identifier outside the seeded catalog", async () => {
    await expect(
      verifyDedicatedDemoAuthBoundary(new URL("https://demo.example.test"), {
        CLOIE_DEMO_ALLOWED_USERS: "person@example.test",
      })
    ).rejects.toThrow("outside the seeded demo catalog");
  });
});

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

  it("accepts only a redirect to the public portal for protected content", () => {
    const baseUrl = new URL("http://127.0.0.1:3000");

    for (const status of [301, 302, 303, 307, 308]) {
      expect(() =>
        assertUnauthenticatedRedirect(
          new Response(null, {
            status,
            headers: { location: "/portal/respondents" },
          }),
          "/faculty/dashboard",
          baseUrl
        )
      ).not.toThrow();
    }

    for (const status of [300, 304, 305, 306, 399]) {
      expect(() =>
        assertUnauthenticatedRedirect(
          new Response(null, {
            status,
            headers: { location: "/portal/respondents" },
          }),
          "/faculty/dashboard",
          baseUrl
        )
      ).toThrow("expected an unauthenticated redirect");
    }

    expect(() =>
      assertUnauthenticatedRedirect(
        new Response("protected content", {
          status: 200,
        }),
        "/faculty/dashboard",
        baseUrl
      )
    ).toThrow("expected an unauthenticated redirect");

    expect(() =>
      assertUnauthenticatedRedirect(
        new Response(null, {
          status: 307,
          headers: { location: "/dashboard" },
        }),
        "/faculty/dashboard",
        baseUrl
      )
    ).toThrow("expected /portal/respondents");

    expect(() =>
      assertUnauthenticatedRedirect(
        new Response(null, {
          status: 307,
          headers: { location: "/portal/respondents/unexpected" },
        }),
        "/faculty/dashboard",
        baseUrl
      )
    ).toThrow("expected /portal/respondents");
  });

  it("rejects protected content in an unauthenticated redirect response", async () => {
    await expect(
      assertNoProtectedContent(
        new Response("<p>Manage faculty assignments for all programs</p>", { status: 307 }),
        "/secretary/course-assignments"
      )
    ).rejects.toThrow("contained protected content marker");

    await expect(
      assertNoProtectedContent(new Response("<main>Respondent Portal</main>", { status: 307 }), "/faculty/dashboard")
    ).resolves.toBeUndefined();
  });
});

describe("demo-login production boundary", () => {
  it("rejects a non-404 demo-login response on primary production", () => {
    expect(() => assertDemoLoginUnavailable(new Response(null, { status: 200 }))).toThrow(
      "expected 404"
    );
    expect(() => assertDemoLoginUnavailable(new Response(null, { status: 201 }))).toThrow(
      "expected 404"
    );
    expect(() => assertDemoLoginUnavailable(new Response(null, { status: 400 }))).toThrow(
      "expected 404"
    );
    expect(() => assertDemoLoginUnavailable(new Response(null, { status: 500 }))).toThrow(
      "expected 404"
    );
  });

  it("accepts a 404 demo-login response (route is disabled on this deployment)", () => {
    expect(() => assertDemoLoginUnavailable(new Response(null, { status: 404 }))).not.toThrow();
  });
});

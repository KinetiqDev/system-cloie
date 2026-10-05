import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/legal-acknowledgement/route";
import { LEGAL_VERSIONS } from "@/features/legal/legal-versions";

const JSON_HEADERS = { "Content-Type": "application/json" };

function acknowledgementRequest(url: string, init: RequestInit = {}): Request {
  return new Request(url, {
    method: "POST",
    headers: { ...JSON_HEADERS, ...init.headers },
    body: init.body,
  });
}

function acknowledgementBody(
  intent: string,
  versions: { privacyVersion?: string; termsVersion?: string } = {}
): Record<string, string> {
  return {
    intent,
    privacyVersion: versions.privacyVersion ?? LEGAL_VERSIONS.privacy,
    termsVersion: versions.termsVersion ?? LEGAL_VERSIONS.terms,
  };
}

describe("legal acknowledgement route", () => {
  beforeEach(() => {
    vi.stubEnv("CLOIE_LEGAL_TICKET_SECRET", "legal-ticket-test-secret-012345678901");
  });

  it("issues a secure acknowledgement cookie for current versions", async () => {
    const response = await POST(
      acknowledgementRequest("https://cloie.test/api/auth/legal-acknowledgement", {
        body: JSON.stringify(acknowledgementBody("student")),
      })
    );

    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("cloie_legal_ack=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
  });

  it("issues tickets for role-less staff and external entry intents", async () => {
    for (const intent of ["staff", "external"]) {
      const response = await POST(
        acknowledgementRequest("https://cloie.test/api/auth/legal-acknowledgement", {
          body: JSON.stringify(acknowledgementBody(intent)),
        })
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("set-cookie") ?? "").toContain("cloie_legal_ack=");
    }
  });
  it.each([
    acknowledgementBody("unknown"),
    acknowledgementBody("student", { privacyVersion: "1.1" }),
    acknowledgementBody("student", { termsVersion: "0.9" }),
  ])("rejects stale or unknown acknowledgement input", async (body) => {
    const response = await POST(
      acknowledgementRequest("https://cloie.test/api/auth/legal-acknowledgement", {
        body: JSON.stringify(body),
      })
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects non-JSON request bodies", async () => {
    const response = await POST(
      new Request("https://cloie.test/api/auth/legal-acknowledgement", {
        method: "POST",
        body: JSON.stringify(acknowledgementBody("student")),
      })
    );

    expect(response.status).toBe(415);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects cross-origin requests", async () => {
    const response = await POST(
      acknowledgementRequest("https://cloie.test/api/auth/legal-acknowledgement", {
        headers: { origin: "https://evil.example" },
        body: JSON.stringify(acknowledgementBody("student")),
      })
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it.each(["null", "not a URL"])("rejects opaque or malformed origin %s", async (origin) => {
    const response = await POST(
      acknowledgementRequest("https://cloie.test/api/auth/legal-acknowledgement", {
        headers: { origin },
        body: JSON.stringify(acknowledgementBody("student")),
      })
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("accepts a matching same-site origin", async () => {
    const response = await POST(
      acknowledgementRequest("https://cloie.test/api/auth/legal-acknowledgement", {
        headers: { origin: "https://cloie.test" },
        body: JSON.stringify(acknowledgementBody("student")),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("cloie_legal_ack=");
  });

  it("accepts a same-site acknowledgement behind a reverse proxy (Host header matches Origin)", async () => {
    const response = await POST(
      new Request("https://localhost:3000/api/auth/legal-acknowledgement", {
        method: "POST",
        headers: {
          ...JSON_HEADERS,
          host: "dom-pubmed-herbal-transparent.trycloudflare.com",
          origin: "https://dom-pubmed-herbal-transparent.trycloudflare.com",
        },
        body: JSON.stringify(acknowledgementBody("student")),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("cloie_legal_ack=");
  });

  it("rejects an origin that matches the request URL but not the Host header", async () => {
    const response = await POST(
      new Request("https://localhost:3000/api/auth/legal-acknowledgement", {
        method: "POST",
        headers: {
          ...JSON_HEADERS,
          host: "dom-pubmed-herbal-transparent.trycloudflare.com",
          origin: "https://localhost:3000",
        },
        body: JSON.stringify(acknowledgementBody("student")),
      })
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("accepts a same-site origin when the Host header has different casing", async () => {
    const response = await POST(
      new Request("https://cloie.test/api/auth/legal-acknowledgement", {
        method: "POST",
        headers: {
          ...JSON_HEADERS,
          host: "CLOIE.TEST",
          origin: "https://cloie.test",
        },
        body: JSON.stringify(acknowledgementBody("student")),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("cloie_legal_ack=");
  });

  it("accepts requests without an origin header (non-browser clients)", async () => {
    const response = await POST(
      acknowledgementRequest("https://cloie.test/api/auth/legal-acknowledgement", {
        body: JSON.stringify(acknowledgementBody("student")),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("cloie_legal_ack=");
  });
});

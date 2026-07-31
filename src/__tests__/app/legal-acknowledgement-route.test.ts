import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/legal-acknowledgement/route";

describe("legal acknowledgement route", () => {
  beforeEach(() => {
    vi.stubEnv("CLOIE_LEGAL_TICKET_SECRET", "legal-ticket-test-secret-012345678901");
  });

  it("issues a secure acknowledgement cookie for current versions", async () => {
    const response = await POST(
      new Request("https://cloie.test/api/auth/legal-acknowledgement", {
        method: "POST",
        body: JSON.stringify({ intent: "student", privacyVersion: "1.0", termsVersion: "1.0" }),
      })
    );

    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("cloie_legal_ack=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
  });

  it.each([
    { intent: "unknown", privacyVersion: "1.0", termsVersion: "1.0" },
    { intent: "student", privacyVersion: "0.9", termsVersion: "1.0" },
    { intent: "student", privacyVersion: "1.0", termsVersion: "0.9" },
  ])("rejects stale or unknown acknowledgement input", async (body) => {
    const response = await POST(
      new Request("https://cloie.test/api/auth/legal-acknowledgement", {
        method: "POST",
        body: JSON.stringify(body),
      })
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

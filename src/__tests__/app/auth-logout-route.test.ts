/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signOutMock = vi.fn();
const deleteCookieMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signOut: signOutMock,
    },
  })),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    delete: deleteCookieMock,
    set: vi.fn(),
    get: vi.fn(),
  })),
}));

import { POST } from "@/app/api/auth/logout/route";

describe("auth logout route", () => {
  let originalSiteUrl: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }
  });

  it("redirects to the public NEXT_PUBLIC_SITE_URL when set", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://cloie.example.com";

    const response = await POST(
      new Request("http://localhost:3000/api/auth/logout", { method: "POST" })
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://cloie.example.com/portal/respondents");
    expect(signOutMock).toHaveBeenCalled();
    expect(deleteCookieMock).toHaveBeenCalledWith("cloie_dev_auth");
    expect(deleteCookieMock).toHaveBeenCalledWith("cloie_demo_auth");
  });

  it("falls back to the request origin when NEXT_PUBLIC_SITE_URL is not set", async () => {
    const response = await POST(
      new Request("https://request.example.com/api/auth/logout", { method: "POST" })
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://request.example.com/portal/respondents");
  });
});

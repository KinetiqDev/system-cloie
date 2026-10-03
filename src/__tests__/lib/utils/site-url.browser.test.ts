import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getSiteUrl } from "@/lib/utils/site-url";

describe("getSiteUrl (browser)", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined));
  afterEach(() => vi.unstubAllEnvs());

  it("prefers NEXT_PUBLIC_SITE_URL over window.location.origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://public.example.com";

    expect(getSiteUrl()).not.toBe(window.location.origin);
    expect(getSiteUrl()).toBe("https://public.example.com");
  });

  it("falls back to window.location.origin when NEXT_PUBLIC_SITE_URL is not set", () => {
    expect(getSiteUrl()).toBe(window.location.origin);
  });
});

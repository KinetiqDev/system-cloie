/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getSiteUrl, getSiteUrlFromRequest } from "@/lib/utils/site-url";

describe("getSiteUrl (server / no window)", () => {
  let originalSiteUrl: string | undefined;

  beforeEach(() => {
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

  it("returns NEXT_PUBLIC_SITE_URL when set, stripping any trailing slash", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://cloie.example.com/";
    expect(getSiteUrl("https://fallback.example.com")).toBe("https://cloie.example.com");
  });

  it("falls back to the provided origin when NEXT_PUBLIC_SITE_URL is not set", () => {
    expect(getSiteUrl("https://request.example.com/")).toBe("https://request.example.com");
  });

  it("returns http://localhost:3000 as the final fallback", () => {
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});

describe("getSiteUrlFromRequest (server)", () => {
  let originalSiteUrl: string | undefined;

  beforeEach(() => {
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

  it("prefers NEXT_PUBLIC_SITE_URL when set", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://cloie.example.com/";
    const request = new Request("https://localhost:3000/api/auth/callback", {
      headers: { host: "tunnel.example.com", "x-forwarded-proto": "https" },
    });
    expect(getSiteUrlFromRequest(request)).toBe("https://cloie.example.com");
  });

  it("derives the origin from the Host header and x-forwarded-proto behind a proxy", () => {
    const request = new Request("https://localhost:3000/api/auth/callback", {
      headers: { host: "dom-pubmed-herbal-transparent.trycloudflare.com", "x-forwarded-proto": "https" },
    });
    expect(getSiteUrlFromRequest(request)).toBe(
      "https://dom-pubmed-herbal-transparent.trycloudflare.com"
    );
  });

  it("falls back to the request URL origin when proxy headers are absent", () => {
    const request = new Request("http://localhost:3000/api/auth/callback");
    expect(getSiteUrlFromRequest(request)).toBe("http://localhost:3000");
  });

  it("uses http when x-forwarded-proto does not include https", () => {
    const request = new Request("https://localhost:3000/api/auth/callback", {
      headers: { host: "tunnel.example.com", "x-forwarded-proto": "http" },
    });
    expect(getSiteUrlFromRequest(request)).toBe("http://tunnel.example.com");
  });
});

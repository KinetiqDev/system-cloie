/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { unstable_doesMiddlewareMatch as doesProxyMatch } from "next/experimental/testing/server";
import nextConfig from "../../../next.config";
import { GET } from "@/app/api/health/route";
import { config as proxyConfig } from "@/proxy";

describe("health route", () => {
  it("reports process liveness without external dependencies", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "System CLOIE",
    });
  });

  it("bypasses Supabase session refresh while normal routes remain proxied", () => {
    expect(
      doesProxyMatch({
        config: proxyConfig,
        nextConfig,
        url: "/api/health",
      })
    ).toBe(false);
    expect(
      doesProxyMatch({
        config: proxyConfig,
        nextConfig,
        url: "/portal",
      })
    ).toBe(true);
    expect(
      doesProxyMatch({
        config: proxyConfig,
        nextConfig,
        url: "/api/auth/logout",
      })
    ).toBe(true);
  });
});

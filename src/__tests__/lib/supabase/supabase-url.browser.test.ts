import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getSupabaseUrl } from "@/lib/supabase/client";

describe("getSupabaseUrl (browser)", () => {
  let originalUrl: string | undefined;

  beforeEach(() => {
    originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    }
  });

  it("prefers a public NEXT_PUBLIC_SUPABASE_URL over the browser origin", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.com";

    expect(getSupabaseUrl()).toBe("https://supabase.example.com");
  });

  it("falls back to the browser origin for a loopback local Supabase URL", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";

    expect(getSupabaseUrl()).toBe(window.location.origin);
  });

  it("falls back to the browser origin when the env value is unset", () => {
    expect(getSupabaseUrl()).toBe(window.location.origin);
  });
});

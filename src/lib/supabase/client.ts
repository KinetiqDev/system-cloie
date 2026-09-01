import type { Database } from "@/types/supabase-database";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Resolves the Supabase origin the browser client should talk to.
 *
 * Local development points NEXT_PUBLIC_SUPABASE_URL at the loopback Supabase
 * stack (http://127.0.0.1:54321), which is unreachable from remote devices.
 * When the app is accessed through a public tunnel, the browser instead uses
 * its own origin so OAuth requests flow through the tunnel, where the app's
 * rewrites proxy /auth/v1/* back to the local stack. This mirrors how
 * getSiteUrl() falls back to window.location.origin for NEXT_PUBLIC_SITE_URL.
 */
export function getSupabaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let loopback = false;

  if (configured) {
    try {
      const { hostname } = new URL(configured);
      loopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    } catch {
      loopback = false;
    }
  }

  if (!configured || loopback) {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
  }

  return configured;
}

export function createClient() {
  return createBrowserClient<Database>(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

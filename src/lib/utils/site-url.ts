const DEFAULT_DEV_URL = "http://localhost:3000";

function trimTrailingSlash(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/**
 * Returns the canonical site URL for a server-side request.
 *
 * The site origin is derived from the request headers a reverse proxy
 * preserves — `Host` and `x-forwarded-proto` — rather than from
 * `request.url`, which Next.js reconstructs from `x-forwarded-proto` and its
 * own bind address when deployed behind a TLS-terminating proxy (e.g.
 * `cloudflared tunnel`), producing `https://localhost:3000/...` even though
 * the browser is on a different origin. Falls back to the request URL when
 * those headers are absent (e.g. unit tests constructing bare `Request`s).
 */
export function getSiteUrlFromRequest(request: Request): string {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  let proto: string;
  if (forwardedProto) {
    proto = forwardedProto.split(",")[0]!.trim() === "https" ? "https" : "http";
  } else {
    proto = url.protocol.replace(":", "");
  }
  const host = request.headers.get("host") ?? url.host;
  return getSiteUrl(`${proto}://${host}`);
}

/**
 * Returns the canonical public site URL.
 *
 * Order of precedence:
 * 1. `NEXT_PUBLIC_SITE_URL` (if set)
 * 2. In the browser: `window.location.origin`
 * 3. An explicit fallback origin (typically from `request.url`)
 * 4. `http://localhost:3000` as a last resort
 */
export function getSiteUrl(fallbackOrigin?: string): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (envUrl) {
    return trimTrailingSlash(envUrl);
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  if (fallbackOrigin) {
    return trimTrailingSlash(fallbackOrigin);
  }

  return DEFAULT_DEV_URL;
}

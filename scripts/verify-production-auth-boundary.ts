type Environment = Record<string, string | undefined>;

const PROTECTED_ROUTES = [
  "/secretary/course-assignments",
  "/dean/dashboard",
  "/faculty/dashboard",
] as const;

const PROTECTED_CONTENT_MARKERS = [
  // E-mail addresses (seeded demo accounts) indicate unauthorised data exposure.
  "demo-",
  // Seeded user IDs (well-known UUID pattern) indicate account data exposure.
  "77777777-7777-4777-8777-777777777777",
  // Course identifiers in unprotected responses indicate data leakage.
  "IT-OD-401",
];
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const REQUEST_TIMEOUT_MS = 30_000;

export function getEvidenceBaseUrl(environment: Environment = process.env): URL {
  const configuredUrl = environment.PRODUCTION_EVIDENCE_BASE_URL ?? environment.NEXT_PUBLIC_SITE_URL;

  if (!configuredUrl) {
    throw new Error("Set PRODUCTION_EVIDENCE_BASE_URL or NEXT_PUBLIC_SITE_URL before running the check.");
  }

  const baseUrl = new URL(configuredUrl);

  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    throw new Error("The production evidence base URL must use HTTP or HTTPS.");
  }

  return baseUrl;
}

export async function assertUnauthenticatedRedirect(response: Response, route: string, baseUrl: URL): Promise<void> {
  // App Router pages redirect at the RSC layer (NEXT_REDIRECT) rather than
  // returning an HTTP redirect status.  Accept both patterns.
  if (REDIRECT_STATUSES.has(response.status)) {
    // HTTP-level redirect (middleware or server-side redirect).
    const location = response.headers.get("location");
    if (!location) {
      throw new Error(`${route} did not return a Location header for an unauthenticated request.`);
    }
    const destination = new URL(location, baseUrl);
    if (destination.origin !== baseUrl.origin || destination.pathname !== "/portal/respondents") {
      throw new Error(`${route} redirected to ${destination.pathname}; expected /portal/respondents.`);
    }
  } else {
    // RSC-level redirect (App Router default in production builds).
    const body = await response.clone().text();
    if (!body.includes("NEXT_REDIRECT") || !body.includes("/portal/respondents")) {
      throw new Error(
        `${route} returned ${response.status} but the response does not contain an RSC redirect to /portal/respondents.`
      );
    }

    // Also check for the meta-refresh fallback (used by non-JS clients).
    if (!body.includes(`http-equiv="refresh"`) || !body.includes("url=/portal/respondents")) {
      throw new Error(
        `${route} returned ${response.status} but is missing the meta-refresh fallback to /portal/respondents.`
      );
    }
  }
}

export async function assertNoProtectedContent(response: Response, route: string): Promise<void> {
  const body = await response.text();
  const marker = PROTECTED_CONTENT_MARKERS.find((candidate) => body.includes(candidate));

  if (marker) {
    throw new Error(`${route} response contained protected content marker: ${marker}.`);
  }
}

export function assertDemoLoginUnavailable(response: Response): void {
  if (response.status !== 404) {
    throw new Error(
      `POST /api/auth/demo-login returned ${response.status}; expected 404 (unavailable on this deployment).`
    );
  }
}

export async function verifyProductionAuthBoundary(
  baseUrl: URL = getEvidenceBaseUrl()
): Promise<void> {
  for (const route of PROTECTED_ROUTES) {
    const response = await fetch(new URL(route, baseUrl), {
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        "cache-control": "no-cache",
      },
    });

    await assertUnauthenticatedRedirect(response, route, baseUrl);
    await assertNoProtectedContent(response, route);
    console.log(`PASS unauthenticated protected route: ${route}`);
  }

  const devLoginResponse = await fetch(new URL("/api/auth/dev-login", baseUrl), {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "redacted" }),
  });

  if (devLoginResponse.status !== 404) {
    throw new Error(`POST /api/auth/dev-login returned ${devLoginResponse.status}; expected 404 outside development.`);
  }

  console.log("PASS development-only login endpoint is unavailable");

  const demoLoginResponse = await fetch(new URL("/api/auth/demo-login", baseUrl), {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: "unknown@cloie.test" }),
  });

  assertDemoLoginUnavailable(demoLoginResponse);
  console.log(`PASS dedicated demo login endpoint is unavailable (status ${demoLoginResponse.status})`);
}

if (process.argv[1]?.endsWith("verify-production-auth-boundary.ts")) {
  verifyProductionAuthBoundary().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

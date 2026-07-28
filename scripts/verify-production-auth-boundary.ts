type Environment = Record<string, string | undefined>;

const PROTECTED_ROUTES = [
  "/secretary/course-assignments",
  "/dean/dashboard",
  "/faculty/dashboard",
] as const;

const PROTECTED_CONTENT_MARKERS = [
  "Manage faculty assignments for all programs",
  "Unique Course and Academic Program contexts in active period",
  "Evaluation insights and response analytics",
];

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

export function assertUnauthenticatedRedirect(response: Response, route: string, baseUrl: URL): void {
  if (response.status < 300 || response.status >= 400) {
    throw new Error(`${route} returned ${response.status}; expected an unauthenticated redirect.`);
  }

  const location = response.headers.get("location");

  if (!location) {
    throw new Error(`${route} did not return a Location header for an unauthenticated request.`);
  }

  const destination = new URL(location, baseUrl);

  if (destination.origin !== baseUrl.origin || destination.pathname !== "/portal/respondents") {
    throw new Error(`${route} redirected to ${destination.pathname}; expected /portal/respondents.`);
  }
}

export async function assertNoProtectedContent(response: Response, route: string): Promise<void> {
  const body = await response.text();
  const marker = PROTECTED_CONTENT_MARKERS.find((candidate) => body.includes(candidate));

  if (marker) {
    throw new Error(`${route} response contained protected content marker: ${marker}.`);
  }
}

export async function verifyProductionAuthBoundary(
  baseUrl: URL = getEvidenceBaseUrl()
): Promise<void> {
  for (const route of PROTECTED_ROUTES) {
    const response = await fetch(new URL(route, baseUrl), {
      redirect: "manual",
      headers: {
        "cache-control": "no-cache",
      },
    });

    assertUnauthenticatedRedirect(response, route, baseUrl);
    await assertNoProtectedContent(response, route);
    console.log(`PASS unauthenticated protected route: ${route}`);
  }

  const devLoginResponse = await fetch(new URL("/api/auth/dev-login", baseUrl), {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "redacted" }),
  });

  if (devLoginResponse.status !== 404) {
    throw new Error(`POST /api/auth/dev-login returned ${devLoginResponse.status}; expected 404 outside development.`);
  }

  console.log("PASS development-only login endpoint is unavailable");
}

if (process.argv[1]?.endsWith("verify-production-auth-boundary.ts")) {
  verifyProductionAuthBoundary().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

import { DEMO_USER_EMAILS } from "../src/lib/constants/demo-users";

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
  const configuredUrl =
    environment.PRODUCTION_EVIDENCE_BASE_URL ?? environment.NEXT_PUBLIC_SITE_URL;

  if (!configuredUrl) {
    throw new Error(
      "Set PRODUCTION_EVIDENCE_BASE_URL or NEXT_PUBLIC_SITE_URL before running the check."
    );
  }

  const baseUrl = new URL(configuredUrl);

  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    throw new Error("The production evidence base URL must use HTTP or HTTPS.");
  }

  return baseUrl;
}

export async function assertUnauthenticatedRedirect(
  response: Response,
  route: string,
  baseUrl: URL
): Promise<void> {
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
      throw new Error(
        `${route} redirected to ${destination.pathname}; expected /portal/respondents.`
      );
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

export function assertDemoLoginAvailable(response: Response): string {
  if (response.status !== 200) {
    throw new Error(
      `POST /api/auth/demo-login returned ${response.status}; expected 200 on the dedicated demo deployment.`
    );
  }

  const sessionCookie = response.headers.get("set-cookie")?.split(";")[0];
  const [cookieName, sessionValue] = sessionCookie?.split("=") ?? [];
  if (cookieName !== "cloie_demo_auth" || !sessionValue) {
    throw new Error("POST /api/auth/demo-login did not set the dedicated demo session cookie.");
  }

  return `${cookieName}=${sessionValue}`;
}

export async function requestDemoLogin(baseUrl: URL, identifier: string): Promise<Response> {
  return fetch(new URL("/api/auth/demo-login", baseUrl), {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { "cache-control": "no-cache", "content-type": "application/json" },
    body: JSON.stringify({ identifier }),
  });
}

export async function assertDemoCatalogUnavailable(baseUrl: URL): Promise<void> {
  for (const identifier of DEMO_USER_EMAILS) {
    assertDemoLoginUnavailable(await requestDemoLogin(baseUrl, identifier));
  }
}

async function assertDedicatedDemoSessionAccepted(response: Response, baseUrl: URL): Promise<void> {
  const sessionCookie = assertDemoLoginAvailable(response);
  const body = (await response.clone().json()) as { destination?: unknown };
  if (typeof body.destination !== "string" || !body.destination.startsWith("/")) {
    throw new Error("POST /api/auth/demo-login did not return a valid authenticated destination.");
  }

  const destinationResponse = await fetch(new URL(body.destination, baseUrl), {
    redirect: "manual",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { cookie: sessionCookie, "cache-control": "no-cache" },
  });
  if (destinationResponse.status < 200 || destinationResponse.status >= 300) {
    throw new Error(
      `Dedicated demo session could not open ${body.destination}; received ${destinationResponse.status}.`
    );
  }
}

export async function verifyDedicatedDemoAuthBoundary(
  baseUrl: URL = getEvidenceBaseUrl(),
  environment: Environment = process.env
): Promise<void> {
  const allowedUsers = new Set(
    environment.CLOIE_DEMO_ALLOWED_USERS?.split(/[\n,]/)
      .map((identifier) => identifier.trim().toLowerCase())
      .filter(Boolean)
  );
  if (!allowedUsers.size) {
    throw new Error("Set CLOIE_DEMO_ALLOWED_USERS before verifying the dedicated demo deployment.");
  }
  const demoCatalog = new Set<string>(DEMO_USER_EMAILS);
  if ([...allowedUsers].some((identifier) => !demoCatalog.has(identifier))) {
    throw new Error(
      "CLOIE_DEMO_ALLOWED_USERS contains an identifier outside the seeded demo catalog."
    );
  }

  const devLoginResponse = await fetch(new URL("/api/auth/dev-login", baseUrl), {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "redacted" }),
  });
  if (devLoginResponse.status !== 404) {
    throw new Error(
      `POST /api/auth/dev-login returned ${devLoginResponse.status}; expected 404 outside development.`
    );
  }

  for (const identifier of DEMO_USER_EMAILS) {
    const response = await requestDemoLogin(baseUrl, identifier);
    if (allowedUsers.has(identifier)) {
      await assertDedicatedDemoSessionAccepted(response, baseUrl);
    } else {
      assertDemoLoginUnavailable(response);
    }
  }

  console.log("PASS dedicated demo login accepts only configured catalog fixtures and sessions");
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
    throw new Error(
      `POST /api/auth/dev-login returned ${devLoginResponse.status}; expected 404 outside development.`
    );
  }

  console.log("PASS development-only login endpoint is unavailable");

  await assertDemoCatalogUnavailable(baseUrl);
  console.log("PASS dedicated demo login endpoint is unavailable for every seeded catalog account");
}

if (process.argv[1]?.endsWith("verify-production-auth-boundary.ts")) {
  verifyProductionAuthBoundary().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

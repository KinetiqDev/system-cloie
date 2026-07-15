import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  DeanReadModelBadRequestError,
  DeanReadModelNotFoundError,
} from "@/features/dean/services/read-dean-oversight";

export const DEAN_CACHE_CONTROL = "private, no-store";

export class DeanRouteBadRequestError extends Error {}

export function deanJson(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": DEAN_CACHE_CONTROL },
  });
}

export async function requireDean(): Promise<Response | null> {
  try {
    const session = await resolveAuthSession();
    if (!session) return deanJson({ error: "Authentication required." }, 401);
    if (session.activeRole !== ROLES.DEAN) {
      return deanJson({ error: "College Dean access required." }, 403);
    }
    return null;
  } catch {
    console.error("Dean session resolution failed");
    return deanJson({ error: "Internal server error." }, 500);
  }
}

export function handleDeanReadError(error: unknown, endpoint: string): Response {
  if (error instanceof DeanRouteBadRequestError || error instanceof DeanReadModelBadRequestError) {
    return deanJson({ error: error.message }, 400);
  }
  if (error instanceof DeanReadModelNotFoundError) {
    return deanJson({ error: "Academic oversight resource not found." }, 404);
  }
  console.error(`Dean ${endpoint} read failed`, {
    errorType: error instanceof Error ? error.name : typeof error,
    errorCode: typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
      ? error.code
      : undefined,
  });
  return deanJson({ error: "Internal server error." }, 500);
}

export function assertAllowedQueryParameters(
  searchParams: URLSearchParams,
  allowed: readonly string[]
): void {
  const allowedSet = new Set(allowed);
  for (const key of searchParams.keys()) {
    if (!allowedSet.has(key) || searchParams.getAll(key).length !== 1) {
      throw new DeanRouteBadRequestError("Invalid query parameters.");
    }
  }
}

export function parseUuid(value: string | null, name: string): string {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new DeanRouteBadRequestError(`Invalid ${name}.`);
  }
  return value;
}

export function parseRequiredUuid(value: string | null, name: string): string {
  return parseUuid(value, name);
}

export function parseOptionalTrimmedQuery(value: string | null): string | undefined {
  if (value === null) return undefined;
  const query = value.trim();
  if (query.length < 1 || query.length > 100) {
    throw new DeanRouteBadRequestError("Query must be 1-100 characters after trimming.");
  }
  return query;
}

export function parsePage(value: string | null): number {
  if (value === null) return 1;
  if (!/^[1-9]\d*$/.test(value)) {
    throw new DeanRouteBadRequestError("Page must be a positive integer.");
  }
  const page = Number(value);
  if (!Number.isSafeInteger(page)) {
    throw new DeanRouteBadRequestError("Page must be a positive integer.");
  }
  return page;
}

import { SystemRole } from "@prisma/client";
import { z } from "zod";

export const SECRETARY_USERS_PAGE_SIZE = 15;
export const SECRETARY_USERS_MAX_PAGE = 10_000;

/** Canonical Secretary Users sort fields. Complete-name is the default. */
export const SECRETARY_USERS_SORT_FIELDS = ["name", "email", "isActive"] as const;

/** Legacy first/last sort values that canonicalize to complete-name sorting. */
const LEGACY_NAME_SORT_FIELDS = new Set(["firstName", "lastName"]);

export type SecretaryUsersSortField = (typeof SECRETARY_USERS_SORT_FIELDS)[number];
export type SecretaryUsersSortDirection = "asc" | "desc";

const roleValues = Object.values(SystemRole) as [SystemRole, ...SystemRole[]];

const secretaryUsersQueryValuesSchema = z.object({
  page: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .refine((value) => value <= SECRETARY_USERS_MAX_PAGE)
    .optional()
    .catch(undefined),
  role: z.enum(roleValues).optional().catch(undefined),
  program: z.string().trim().min(1).max(100).optional().catch(undefined),
  major: z.string().trim().min(1).max(100).optional().catch(undefined),
  q: z.string().trim().min(1).max(100).optional().catch(undefined),
  state: z.enum(["awaiting-term-placement"]).optional().catch(undefined),
  verification: z.enum(["pending"]).optional().catch(undefined),
  // Accept current fields plus legacy firstName/lastName so bookmarks can be
  // canonicalized to complete-name sorting without surname semantics.
  sort: z
    .enum(["name", "email", "isActive", "firstName", "lastName"])
    .optional()
    .catch(undefined),
  dir: z.enum(["asc", "desc"]).optional().catch(undefined),
});

export type SecretaryUsersListQuery = {
  page: number;
  role?: SystemRole;
  program?: string;
  major?: string;
  q?: string;
  state?: "awaiting-term-placement";
  verification?: "pending";
  sort: SecretaryUsersSortField;
  direction: SecretaryUsersSortDirection;
};

type RawSecretaryUsersSearchParams = Record<string, string | string[] | undefined>;

function firstNonEmpty(value: string | string[] | undefined): string | undefined {
  const values = Array.isArray(value) ? value : [value];
  return values.find((entry): entry is string => !!entry && entry.trim().length > 0)?.trim();
}

function canonicalizeSort(
  raw: string | undefined
): SecretaryUsersSortField {
  if (!raw) {
    return "name";
  }
  if (LEGACY_NAME_SORT_FIELDS.has(raw) || raw === "name") {
    return "name";
  }
  if (raw === "email" || raw === "isActive") {
    return raw;
  }
  return "name";
}

export function parseSecretaryUsersListQuery(
  raw: RawSecretaryUsersSearchParams = {}
): SecretaryUsersListQuery {
  const candidate = {
    page: firstNonEmpty(raw.page),
    role: firstNonEmpty(raw.role),
    program: firstNonEmpty(raw.program),
    major: firstNonEmpty(raw.major),
    q: firstNonEmpty(raw.q),
    state: firstNonEmpty(raw.state),
    verification: firstNonEmpty(raw.verification),
    sort: firstNonEmpty(raw.sort),
    dir: firstNonEmpty(raw.dir),
  };
  const values = secretaryUsersQueryValuesSchema.parse(candidate);
  const sort = canonicalizeSort(values.sort);
  const direction = values.dir ?? "asc";

  return {
    page: values.page ?? 1,
    role: values.role,
    program: values.program,
    major: values.major,
    q: values.q,
    state: values.state,
    verification: values.verification,
    sort,
    direction,
  };
}

export function serializeSecretaryUsersListQuery(query: SecretaryUsersListQuery): string {
  const params = new URLSearchParams();
  if (query.page > 1) params.set("page", String(query.page));
  if (query.role) params.set("role", query.role);
  if (query.program) params.set("program", query.program);
  if (query.major) params.set("major", query.major);
  if (query.q) params.set("q", query.q);
  if (query.state) params.set("state", query.state);
  if (query.verification) params.set("verification", query.verification);
  if (query.sort !== "name" || query.direction !== "asc") {
    params.set("sort", query.sort);
  }
  if (query.direction !== "asc") params.set("dir", query.direction);
  return params.toString();
}

export function rawSecretaryUsersSearchParamsToQueryString(
  raw: RawSecretaryUsersSearchParams
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (entry !== undefined) params.append(key, entry);
    }
  }
  return params.toString();
}

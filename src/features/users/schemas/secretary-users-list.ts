import { SystemRole } from "@prisma/client";
import { z } from "zod";

export const SECRETARY_USERS_PAGE_SIZE = 15;
export const SECRETARY_USERS_MAX_PAGE = 10_000;

export const SECRETARY_USERS_SORT_FIELDS = ["firstName", "lastName", "email", "isActive"] as const;

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
  sort: z.enum(SECRETARY_USERS_SORT_FIELDS).optional().catch(undefined),
  dir: z.enum(["asc", "desc"]).optional().catch(undefined),
});

export type SecretaryUsersListQuery = {
  page: number;
  role?: SystemRole;
  program?: string;
  major?: string;
  q?: string;
  sort: SecretaryUsersSortField;
  direction: SecretaryUsersSortDirection;
};

type RawSecretaryUsersSearchParams = Record<string, string | string[] | undefined>;

function firstNonEmpty(value: string | string[] | undefined): string | undefined {
  const values = Array.isArray(value) ? value : [value];
  return values.find((entry): entry is string => !!entry && entry.trim().length > 0)?.trim();
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
    sort: firstNonEmpty(raw.sort),
    dir: firstNonEmpty(raw.dir),
  };
  const values = secretaryUsersQueryValuesSchema.parse(candidate);
  const sort = values.sort ?? "lastName";
  const direction = values.dir ?? "asc";

  return {
    page: values.page ?? 1,
    role: values.role,
    program: values.program,
    major: values.major,
    q: values.q,
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
  if (query.sort !== "lastName" || query.direction !== "asc") {
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

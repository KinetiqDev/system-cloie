import { listSecretaryUsersSummary } from "@/features/users/services/list-secretary-users-summary";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { SecretaryUsersList } from "@/features/users/components/secretary-users-list/index";
import { redirect } from "next/navigation";
import { ROLES } from "@/lib/constants/roles";
import {
  parseSecretaryUsersListQuery,
  rawSecretaryUsersSearchParamsToQueryString,
  serializeSecretaryUsersListQuery,
} from "@/features/users/schemas/secretary-users-list";

/**
 * Transient client-consumed query params (toast feedback) that are not list
 * filters: keep them out of the canonical-form comparison and carry them
 * across canonicalization redirects so the client ToastProvider can consume
 * them on arrival.
 */
const TRANSIENT_QUERY_KEYS = ["toast", "toastType"] as const;

function pickTransientParams(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of TRANSIENT_QUERY_KEYS) {
    const value = raw[key];
    if (typeof value === "string" && value.length > 0) {
      params.set(key, value);
    }
  }
  return params;
}

function usersListHref(canonicalQuery: string, transientParams: URLSearchParams): string {
  const base = canonicalQuery ? `/secretary/users?${canonicalQuery}` : "/secretary/users";
  if (transientParams.size === 0) {
    return base;
  }
  return `${base}${canonicalQuery ? "&" : "?"}${transientParams.toString()}`;
}

export default async function SecretaryUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await resolveAuthSession();
  if (!session || session.activeRole !== ROLES.SECRETARY) {
    redirect("/unauthorized");
  }

  const rawParams = await searchParams;
  const transientParams = pickTransientParams(rawParams);
  const listRawParams: Record<string, string | string[] | undefined> = { ...rawParams };
  for (const key of TRANSIENT_QUERY_KEYS) {
    delete listRawParams[key];
  }

  const query = parseSecretaryUsersListQuery(rawParams);
  const canonicalQuery = serializeSecretaryUsersListQuery(query);
  if (rawSecretaryUsersSearchParamsToQueryString(listRawParams) !== canonicalQuery) {
    redirect(usersListHref(canonicalQuery, transientParams));
  }

  const result = await listSecretaryUsersSummary(query);
  if (!result.success) {
    if ("canonicalQuery" in result) {
      redirect(usersListHref(result.canonicalQuery ?? "", transientParams));
    }
    redirect("/unauthorized");
  }
  const { users, total, page, pageSize, kpi, programs, yearLevels } = result.data;

  if (page !== query.page) {
    const canonicalPageQuery = serializeSecretaryUsersListQuery({ ...query, page });
    redirect(usersListHref(canonicalPageQuery, transientParams));
  }

  return (
    <SecretaryUsersList
      users={users}
      total={total}
      page={page}
      pageSize={pageSize}
      query={query}
      kpi={kpi}
      programs={programs}
      yearLevels={yearLevels}
      currentUserId={session?.userId ?? ""}
    />
  );
}

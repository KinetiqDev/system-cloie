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
  const query = parseSecretaryUsersListQuery(rawParams);
  const canonicalQuery = serializeSecretaryUsersListQuery(query);
  if (rawSecretaryUsersSearchParamsToQueryString(rawParams) !== canonicalQuery) {
    redirect(canonicalQuery ? `/secretary/users?${canonicalQuery}` : "/secretary/users");
  }

  const result = await listSecretaryUsersSummary(query);
  if (!result.success) {
    if ("canonicalQuery" in result) {
      redirect(
        result.canonicalQuery ? `/secretary/users?${result.canonicalQuery}` : "/secretary/users"
      );
    }
    redirect("/unauthorized");
  }
  const { users, total, page, pageSize, kpi, programs, yearLevels } = result.data;

  if (page !== query.page) {
    const canonicalPageQuery = serializeSecretaryUsersListQuery({ ...query, page });
    redirect(canonicalPageQuery ? `/secretary/users?${canonicalPageQuery}` : "/secretary/users");
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

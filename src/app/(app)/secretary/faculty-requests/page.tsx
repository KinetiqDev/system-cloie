import { redirect } from "next/navigation";
import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Faculty Requests", "Secretary") };

/**
 * Deprecated: Secretary approval of self-submitted Faculty requests is removed.
 * Faculty register automatically upon completing onboarding. This route redirects
 * authorized Secretary sessions to the users directory.
 */
export default async function SecretaryFacultyRequestsPage() {
  const session = await resolveAuthSession();
  if (!session || session.activeRole !== ROLES.SECRETARY) {
    redirect("/unauthorized");
  }

  redirect("/secretary/users");
}

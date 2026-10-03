import { redirect } from "next/navigation";
import { listFacultyAccessRequests } from "@/features/users/services/list-faculty-access-requests";
import { FacultyRequestReviewList } from "@/features/users/components/faculty-request-review-list";
import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Faculty Requests", "Secretary") };

/**
 * Secretary review of self-submitted Faculty requests. Faculty is internal, so
 * a decision requires a current Google sign-in as Secretary; the session guard
 * below rejects anything else before the read is issued.
 */
export default async function SecretaryFacultyRequestsPage() {
  const session = await resolveAuthSession();
  if (!session || session.activeRole !== ROLES.SECRETARY) {
    redirect("/unauthorized");
  }

  const result = await listFacultyAccessRequests();
  if (!result.success) {
    redirect("/unauthorized");
  }

  return (
    <FacultyRequestReviewList
      requests={result.data.requests}
      pendingCount={result.data.pendingCount}
      currentUserId={session.userId}
    />
  );
}

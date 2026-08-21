import Link from "next/link";
import { redirect } from "next/navigation";
import { buildGenEdOutcomeMappingPath } from "@/lib/constants/gen-ed-routes";
import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";

export const metadata = {
  title: "Institutional Learning Outcomes — Gen Ed Coordinator | System CLOIE",
};

export default async function GenEdCoordinatorOutcomesPage() {
  const session = await resolveAuthSession();

  if (!session) {
    redirect("/portal/respondents");
  }

  if (session.activeRole !== ROLES.GEN_ED_COORDINATOR) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-lg">Institutional Learning Outcomes</h1>
        <p className="text-body-sm text-text-secondary max-w-2xl">
          College-wide · General Education CILOs (e.g., GEMATH, GEGS) map here
        </p>
      </div>
      <div className="border-border bg-card rounded-xl border p-6">
        <p className="text-text-secondary text-sm">No Institutional Learning Outcomes yet.</p>
        <p className="text-text-secondary mt-2 text-sm">
          Outcomes will appear here once catalog management is available.
        </p>
        <Link
          href={buildGenEdOutcomeMappingPath()}
          className="text-link mt-4 inline-flex text-sm font-medium underline-offset-4 hover:underline"
        >
          View mapping review
        </Link>
      </div>
    </div>
  );
}

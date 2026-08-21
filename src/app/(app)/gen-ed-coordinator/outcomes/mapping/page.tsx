import Link from "next/link";
import { redirect } from "next/navigation";
import { buildGenEdOutcomesPath } from "@/lib/constants/gen-ed-routes";
import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";

export const metadata = {
  title: "CILO Mapping Review — Gen Ed Coordinator | System CLOIE",
};

export default async function GenEdOutcomesMappingPage() {
  const session = await resolveAuthSession();

  if (!session) {
    redirect("/portal/respondents");
  }

  if (session.activeRole !== ROLES.GEN_ED_COORDINATOR) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={buildGenEdOutcomesPath()}
        className="text-link w-fit text-sm font-medium underline-offset-4 hover:underline"
      >
        ← Back to Institutional Learning Outcomes
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-lg">CILO Mapping Review</h1>
        <p className="text-body-sm text-text-secondary max-w-2xl">
          College-wide read-only review of General Education CILO-to-ILO mappings.
        </p>
      </div>
      <div className="border-border bg-card rounded-xl border p-6">
        <p className="text-text-secondary text-sm">No CILO mappings found.</p>
      </div>
    </div>
  );
}

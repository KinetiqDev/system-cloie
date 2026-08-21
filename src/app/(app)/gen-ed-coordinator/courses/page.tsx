import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";

export const metadata = {
  title: "Courses — General Education Catalog — Gen Ed Coordinator | System CLOIE",
};

export default async function GenEdCoordinatorCoursesPage() {
  const session = await resolveAuthSession();

  if (!session) {
    redirect("/portal/respondents");
  }

  if (session.activeRole !== ROLES.GEN_ED_COORDINATOR) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-heading-lg">Courses — General Education catalog</h1>
          <p className="text-body-sm text-text-secondary max-w-2xl">
            College-wide · Only General Education scope
          </p>
        </div>
        <Badge variant="secondary" className="bg-primary-soft text-selected-fg font-semibold">
          College-Wide
        </Badge>
      </div>
      <div className="border-border bg-card rounded-xl border p-6">
        <p className="text-text-secondary text-sm">No General Education courses in catalog.</p>
      </div>
    </div>
  );
}

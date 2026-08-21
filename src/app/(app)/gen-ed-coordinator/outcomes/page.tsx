import { redirect } from "next/navigation";
import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { listInstitutionalOutcomes } from "@/features/outcomes/services/manage-gen-ed-outcomes";
import { GenEdOutcomesPage } from "@/features/outcomes/components/gen-ed-outcomes-page";

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

  const result = await listInstitutionalOutcomes();

  if (!result.success) {
    throw new Error(result.error);
  }

  return <GenEdOutcomesPage ilos={result.data.ilos} />;
}

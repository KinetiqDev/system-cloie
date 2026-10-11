import { redirect } from "next/navigation";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { readCentralOutcomeAdministration } from "@/features/outcomes/services/manage-central-outcomes";
import { CentralOutcomesPage } from "@/features/outcomes/components/central-outcomes-page";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = {
  title: buildPageTitle("Common and Institution-specific outcomes", "Secretary"),
};

export default async function Page() {
  const session = await resolveAuthSession();
  if (!session) redirect("/portal/respondents");
  if (session.activeRole !== "SECRETARY") redirect("/unauthorized");
  const result = await readCentralOutcomeAdministration();
  if (!result.success) redirect("/unauthorized");
  return <CentralOutcomesPage data={result.data} />;
}

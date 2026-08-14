import { redirect } from "next/navigation";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { listInstitutionalOutcomes } from "@/features/outcomes/services/manage-institutional-outcomes";
import { InstitutionalOutcomesPage } from "@/features/outcomes/components/institutional-outcomes-page";
import { ROLES } from "@/lib/constants/roles";

export const metadata = { title: "Learning Outcomes — Secretary | CLOIE" };

export default async function SecretaryLearningOutcomesPage() {
  const session = await resolveAuthSession();
  if (!session || session.activeRole !== ROLES.SECRETARY) redirect("/unauthorized");

  const result = await listInstitutionalOutcomes();
  if (!result.success) throw new Error("Institutional Outcome catalog could not be loaded.");
  return (
    <InstitutionalOutcomesPage
      key={result.data.outcomes
        .map(
          (outcome) =>
            `${outcome.id}:${outcome.order}:${outcome.is_active}:${outcome.updated_at.toISOString()}`
        )
        .join("|")}
      outcomes={result.data.outcomes}
    />
  );
}

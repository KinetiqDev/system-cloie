import { redirect } from "next/navigation";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { listInstitutionalOutcomes } from "@/features/outcomes/services/manage-institutional-outcomes";
import { listCourseAlignmentSummaries } from "@/features/outcomes/services/manage-course-alignment";
import { InstitutionalOutcomesPage } from "@/features/outcomes/components/institutional-outcomes-page";
import { CourseAlignmentAdministrationList } from "@/features/outcomes/components/course-alignment-administration-list";
import { ROLES } from "@/lib/constants/roles";

export const metadata = { title: "Learning Outcomes — Secretary | CLOIE" };

export default async function SecretaryLearningOutcomesPage() {
  const session = await resolveAuthSession();
  if (!session || session.activeRole !== ROLES.SECRETARY) redirect("/unauthorized");

  const [catalogResult, summariesResult] = await Promise.all([
    listInstitutionalOutcomes(),
    listCourseAlignmentSummaries(),
  ]);
  if (!catalogResult.success) throw new Error("Institutional Outcome catalog could not be loaded.");
  if (!summariesResult.success)
    throw new Error("Course mapping administration could not be loaded.");

  return (
    <div className="space-y-12">
      <InstitutionalOutcomesPage
        key={catalogResult.data.outcomes
          .map(
            (outcome) =>
              `${outcome.id}:${outcome.order}:${outcome.is_active}:${outcome.updated_at.toISOString()}`
          )
          .join("|")}
        outcomes={catalogResult.data.outcomes}
      />
      <CourseAlignmentAdministrationList courses={summariesResult.data} />
    </div>
  );
}

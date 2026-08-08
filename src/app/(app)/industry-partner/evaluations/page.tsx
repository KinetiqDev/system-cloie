import { TargetStakeholder } from "@prisma/client";
import { EvaluationListBrowser } from "@/features/users/components/evaluation-list-browser";
import { listStakeholderEvaluations } from "@/features/responses/services/list-stakeholder-evaluations";

export default async function IndustryPartnerEvaluationsPage() {
  const { active, submitted } = await listStakeholderEvaluations(
    TargetStakeholder.INDUSTRY_PARTNER,
    "/industry-partner"
  );
  const pending = active.filter((item) => item.status !== "IN_PROGRESS");
  const inProgress = active.filter((item) => item.status === "IN_PROGRESS");

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in space-y-8 motion-safe:duration-500">
      <section className="bg-surface rounded-xl p-8">
        <h1 className="font-heading text-heading-xl text-foreground tracking-tight">
          Industry Partner Evaluations
        </h1>
        <p className="text-body-md text-muted-foreground mt-2 max-w-2xl">
          View and complete evaluations assigned to you as an industry partner. Complete all forms
          before their deadlines.
        </p>
      </section>

      <EvaluationListBrowser pending={pending} inProgress={inProgress} submitted={submitted} />
    </div>
  );
}

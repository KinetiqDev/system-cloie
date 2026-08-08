import Link from "next/link";
import { TargetStakeholder } from "@prisma/client";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { listStakeholderEvaluations } from "@/features/responses/services/list-stakeholder-evaluations";
import { EvaluationListCard } from "@/features/users/components/evaluation-list-card";
import { HeroCard } from "@/features/portals/components/hero-card";
import { StatCards } from "@/features/users/components/stat-cards";
import { prisma } from "@/lib/db/prisma";

export default async function IndustryPartnerDashboardPage() {
  const session = await resolveAuthSession();
  const { active, submitted } = await listStakeholderEvaluations(
    TargetStakeholder.INDUSTRY_PARTNER,
    "/industry-partner"
  );
  const inProgressCount = active.filter((item) => item.status === "IN_PROGRESS").length;
  const resumeItem = active.find((item) => item.status === "IN_PROGRESS") ?? null;

  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;

  const displayName = user?.first_name ?? "Partner";

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <HeroCard
        name={displayName}
        contextLabel="Industry Partner Portal"
        evaluationsHref="/industry-partner/evaluations"
      />
      <StatCards
        pending={active.length}
        inProgress={inProgressCount}
        completed={submitted.length}
      />

      {resumeItem && (
        <section className="mt-8 space-y-4">
          <div>
            <h3 className="font-heading text-title-lg font-extrabold">Continue</h3>
            <p className="text-text-muted text-body-sm font-medium">Pick up where you left off.</p>
          </div>

          <Card className="border-border overflow-hidden shadow-sm">
            <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <p className="text-link text-label-sm font-semibold tracking-wider uppercase">
                  {resumeItem.status === "IN_PROGRESS" ? "In Progress" : "Pending"}
                </p>
                <div>
                  <h4 className="text-title-lg font-bold">{resumeItem.evaluationTitle}</h4>
                  <p className="text-text-secondary text-body-sm">{resumeItem.programLabel}</p>
                </div>
                {resumeItem.status === "IN_PROGRESS" && (
                  <p className="text-text-secondary text-body-sm font-medium">
                    {resumeItem.progress}% complete
                  </p>
                )}
              </div>

              {resumeItem.href && (
                <Button render={<Link href={resumeItem.href} />} className="min-h-11 font-semibold">
                  {resumeItem.status === "IN_PROGRESS" ? "Resume" : "Start Evaluation"}
                </Button>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="font-heading text-title-lg font-extrabold">Pending Evaluations</h3>
            <p className="text-text-muted text-body-sm font-medium">
              Prioritize forms that are active and closing soon.
            </p>
          </div>
          <Link
            href="/industry-partner/evaluations"
            className="text-link text-label-sm font-bold hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="grid gap-4">
          {active
            .filter((item) => item.status === "NOT_STARTED" || item.status === "DUE_SOON")
            .slice(0, 3)
            .map((evalItem) => (
              <EvaluationListCard key={evalItem.assignmentId} {...evalItem} />
            ))}
          {active.filter((item) => item.status === "NOT_STARTED" || item.status === "DUE_SOON")
            .length === 0 && (
            <div className="border-border bg-surface rounded-xl border-2 border-dashed p-12 text-center">
              <div className="bg-primary-soft mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                <ClipboardList className="text-selected-fg size-6" />
              </div>
              <h4 className="text-title-sm text-text-primary mb-2 font-semibold">
                No pending evaluations
              </h4>
              <p className="text-body-sm text-text-secondary mx-auto max-w-sm">
                You don&apos;t have any active evaluations at the moment. Check back later or view
                your history.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

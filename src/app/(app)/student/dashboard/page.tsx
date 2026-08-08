import Link from "next/link";
import { CalendarDays, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { listStudentAssignedEvaluations } from "@/features/responses/services/list-student-assigned-evaluations";
import { EvaluationListCard } from "@/features/users/components/evaluation-list-card";
import { HeroCard } from "@/features/portals/components/hero-card";
import { StatCards } from "@/features/users/components/stat-cards";
import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import { prisma } from "@/lib/db/prisma";

export default async function StudentDashboardPage() {
  const session = await resolveAuthSession();
  const isDeferredEnrollment = session?.profileGate.status === "DEFERRED_ENROLLMENT";

  // When enrollment is deferred, evaluations cannot be assigned yet — return empty lists.
  const { active, submitted } = isDeferredEnrollment
    ? { active: [], submitted: [] }
    : await listStudentAssignedEvaluations();
  const inProgressCount = active.filter((item) => item.status === "IN_PROGRESS").length;
  const resumeItem = active.find((item) => item.status === "IN_PROGRESS") ?? null;

  const [profile, enrollment] = await Promise.all([
    session
      ? prisma.studentAcademicProfile.findUnique({
          where: { user_id: session.userId },
          include: {
            major: true,
            program: true,
            user: { select: { first_name: true } },
          },
        })
      : Promise.resolve(null),
    session
      ? prisma.studentEnrollment.findFirst({
          where: { student_user_id: session.userId, is_active: true },
          orderBy: { created_at: "desc" },
          include: {
            term: { include: { school_year: true } },
          },
        })
      : Promise.resolve(null),
  ]);

  const termLabel = enrollment
    ? formatTermInstanceLabel(
        enrollment.term.school_year.code,
        enrollment.term.semester,
        enrollment.term.term
      )
    : null;

  const contextParts = [
    profile?.program.code ?? null,
    profile?.major?.name ?? null,
    enrollment ? getYearLevelDisplay(enrollment.year_level) : null,
    termLabel,
  ].filter(Boolean);
  const contextLabel = contextParts.length > 0 ? contextParts.join(" • ") : "Student portal";

  const displayName = profile?.user.first_name ?? "Student";

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      {/* Deferred Enrollment Banner */}
      {isDeferredEnrollment && (
        <div className="border-warning/30 bg-warning-soft/20 mb-6 flex items-start gap-4 rounded-xl border p-5">
          <div className="bg-warning/10 flex size-10 shrink-0 items-center justify-center rounded-full">
            <CalendarDays className="text-warning size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-label-md text-warning font-semibold">Enrollment Pending</p>
            <p className="text-body-sm text-text-secondary">
              No active academic term is currently configured. Your student profile is set up, but
              your formal enrollment and evaluation assignments are on hold until a new academic
              term is activated by administration.
            </p>
          </div>
        </div>
      )}

      <HeroCard name={displayName} contextLabel={contextLabel} />
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
                  <h4 className="text-title-lg font-bold">
                    {resumeItem.courseTitle ?? resumeItem.evaluationTitle}
                  </h4>
                  <p className="text-text-secondary text-body-sm">
                    {resumeItem.courseTitle
                      ? `${resumeItem.evaluationTitle} • ${resumeItem.programLabel}`
                      : resumeItem.programLabel}
                  </p>
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
          {!isDeferredEnrollment && (
            <Link
              href="/student/evaluations"
              className="text-link text-label-sm font-bold hover:underline"
            >
              View All
            </Link>
          )}
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
                {isDeferredEnrollment ? "Evaluations unavailable" : "No pending evaluations"}
              </h4>
              <p className="text-body-sm text-text-secondary mx-auto max-w-sm">
                {isDeferredEnrollment
                  ? "Evaluation assignments will appear here once your enrollment is activated for an academic term."
                  : "You don't have any active evaluations at the moment. Check back later or view your history."}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

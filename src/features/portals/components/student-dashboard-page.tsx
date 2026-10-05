import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { listStudentAssignedEvaluations } from "@/features/responses/services/list-student-assigned-evaluations";
import type { StudentEvaluationListItem } from "@/features/responses/types";
import { EvaluationListCard } from "@/features/users/components/evaluation-list-card";
import { StatCards } from "@/features/users/components/stat-cards";
import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import { prisma } from "@/lib/db/prisma";

const EVALUATIONS_ROUTE = "/student/evaluations";

type StudentEvaluations = { active: StudentEvaluation[]; submitted: StudentEvaluation[] };
type StudentEvaluation = StudentEvaluationListItem;

type StudentAcademicContext = {
  contextLabel: string;
};

async function readStudentAcademicContext(userId: string): Promise<StudentAcademicContext> {
  const [profile, enrollment] = await Promise.all([
    prisma.studentAcademicProfile.findUnique({
      where: { user_id: userId },
      include: {
        major: true,
        program: true,
      },
    }),
    prisma.studentEnrollment.findFirst({
      where: { student_user_id: userId, is_active: true },
      orderBy: { created_at: "desc" },
      include: {
        term: { include: { school_year: true } },
      },
    }),
  ]);

  const contextParts = [
    profile?.program.code,
    profile?.major?.name,
    enrollment ? getYearLevelDisplay(enrollment.year_level) : null,
    enrollment
      ? formatTermInstanceLabel(
          enrollment.term.school_year.code,
          enrollment.term.semester,
          enrollment.term.term
        )
      : null,
  ].filter(Boolean);

  return { contextLabel: contextParts.join(" • ") || "Student portal" };
}

export default async function StudentDashboardPage() {
  const session = await resolveAuthSession();
  const isDeferredEnrollment = session?.profileGate.status === "DEFERRED_ENROLLMENT";

  // Start both reads before awaiting either so the heading and the task list
  // stream in parallel instead of serially.
  const contextPromise: Promise<StudentAcademicContext> = session
    ? readStudentAcademicContext(session.userId)
    : Promise.resolve({ contextLabel: "Student portal" });
  void contextPromise.catch(() => undefined);

  // When enrollment is deferred, evaluations cannot be assigned yet — return empty lists.
  const evaluationsPromise: Promise<StudentEvaluations> = isDeferredEnrollment
    ? Promise.resolve({ active: [], submitted: [] })
    : listStudentAssignedEvaluations();
  void evaluationsPromise.catch(() => undefined);

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in flex flex-col gap-6 motion-safe:duration-500">
      <Suspense fallback={<DashboardHeadingFallback />}>
        <StudentDashboardHeading contextPromise={contextPromise} />
      </Suspense>

      {isDeferredEnrollment && <DeferredEnrollmentBanner />}

      <Suspense fallback={<StudentEvaluationsFallback />}>
        <StudentEvaluationsSections
          evaluationsPromise={evaluationsPromise}
          isDeferredEnrollment={isDeferredEnrollment}
        />
      </Suspense>
    </div>
  );
}

async function StudentDashboardHeading({
  contextPromise,
}: {
  contextPromise: Promise<StudentAcademicContext>;
}) {
  const { contextLabel } = await contextPromise;

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-heading-xl text-foreground text-pretty">Dashboard</h1>
      <p className="text-body-sm text-muted-foreground">{contextLabel}</p>
    </div>
  );
}

async function StudentEvaluationsSections({
  evaluationsPromise,
  isDeferredEnrollment,
}: {
  evaluationsPromise: Promise<StudentEvaluations>;
  isDeferredEnrollment: boolean;
}) {
  const { active, submitted } = await evaluationsPromise;
  const drafts = active.filter((item) => item.status === "IN_PROGRESS");
  const resumeItem = drafts[0] ?? null;
  // Pending counts only work nobody has started, so it never double-counts a draft.
  const pending = active
    .filter((item) => item.status === "NOT_STARTED" || item.status === "DUE_SOON")
    .sort((a, b) => {
      if (!a.deadlineAt && !b.deadlineAt) return 0;
      if (!a.deadlineAt) return 1;
      if (!b.deadlineAt) return -1;
      return a.deadlineAt.getTime() - b.deadlineAt.getTime();
    });
  const startableItems = pending.slice(0, 3);
  const pendingCount = pending.length;

  return (
    <StudentEvaluationsContent
      resumeItem={resumeItem}
      draftCount={drafts.length}
      pending={startableItems}
      pendingCount={pendingCount}
      completedCount={submitted.length}
      isDeferredEnrollment={isDeferredEnrollment}
    />
  );
}

export interface StudentEvaluationsContentProps {
  resumeItem: StudentEvaluation | null;
  draftCount: number;
  pending: StudentEvaluation[];
  pendingCount: number;
  completedCount: number;
  isDeferredEnrollment: boolean;
}

export function StudentEvaluationsContent({
  resumeItem,
  draftCount,
  pending,
  pendingCount,
  completedCount,
  isDeferredEnrollment,
}: StudentEvaluationsContentProps) {
  // Whatever the respondent can act on right now leads: the saved draft when one
  // exists, otherwise the evaluations waiting to be started. The status summary
  // follows, and the remaining not-started list trails behind it.
  const startableSection = (
    <StartableEvaluations
      pending={pending}
      pendingCount={pendingCount}
      draftCount={draftCount}
      isDeferredEnrollment={isDeferredEnrollment}
    />
  );
  const statusSummary = (
    <StatCards
      pending={pendingCount}
      inProgress={draftCount}
      completed={completedCount}
      evaluationsHref={isDeferredEnrollment ? "" : EVALUATIONS_ROUTE}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      {resumeItem ? (
        <>
          <ResumeEvaluationCard evaluation={resumeItem} />
          {statusSummary}
          {startableSection}
        </>
      ) : (
        <>
          {startableSection}
          {statusSummary}
        </>
      )}
    </div>
  );
}

function ResumeEvaluationCard({ evaluation }: { evaluation: StudentEvaluation }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-title-lg font-extrabold">Continue</h2>
        <p className="text-text-muted text-body-sm font-medium">Pick up where you left off.</p>
      </div>

      <Card className="border-border overflow-hidden shadow-sm">
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-link text-label-sm font-semibold tracking-wider uppercase">
              In Progress
            </p>
            <div>
              <h3 className="text-title-lg font-bold break-words">
                {evaluation.courseTitle ?? evaluation.evaluationTitle}
              </h3>
              <p className="text-text-secondary text-body-sm break-words">
                {evaluation.courseTitle
                  ? `${evaluation.evaluationTitle} • ${evaluation.programLabel}`
                  : evaluation.programLabel}
              </p>
            </div>
            {/* Answers given, never completion: a full draft is still unsubmitted. */}
            <p className="text-text-secondary text-body-sm font-medium">
              {evaluation.progress}% answered · not submitted
            </p>
          </div>

          {evaluation.href && (
            <Button
              render={<Link href={evaluation.href} />}
              className="min-h-11 w-full font-semibold md:w-auto"
            >
              Resume
            </Button>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

/**
 * The evaluations nobody has started yet, ordered by the nearest deadline. This
 * is the dashboard's primary task whenever no draft exists, so it leads; once a
 * draft is open it trails the status summary as the remaining backlog.
 */
function StartableEvaluations({
  pending,
  pendingCount,
  draftCount,
  isDeferredEnrollment,
}: {
  pending: StudentEvaluation[];
  pendingCount: number;
  draftCount: number;
  isDeferredEnrollment: boolean;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="font-heading text-title-lg font-extrabold">
            {draftCount > 0 ? "Waiting to Start" : "Pending Evaluations"}
          </h2>
          <p className="text-text-muted text-body-sm font-medium">Earliest deadlines first.</p>
        </div>
        {!isDeferredEnrollment && (
          <Link
            href={`${EVALUATIONS_ROUTE}?tab=pending`}
            className="text-link focus-visible:ring-ring text-label-sm inline-flex min-h-11 items-center rounded-md font-bold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            View All
          </Link>
        )}
      </div>

      <div className="grid gap-4">
        {pending.map((evalItem) => (
          <EvaluationListCard key={evalItem.assignmentId} {...evalItem} />
        ))}
        {pendingCount === 0 && (
          <StartableEvaluationsEmpty
            isDeferredEnrollment={isDeferredEnrollment}
            draftCount={draftCount}
          />
        )}
      </div>
    </section>
  );
}

function StartableEvaluationsEmpty({
  isDeferredEnrollment,
  draftCount,
}: {
  isDeferredEnrollment: boolean;
  draftCount: number;
}) {
  return (
    <div className="border-border bg-surface rounded-xl border-2 border-dashed p-8 text-center">
      <div className="bg-primary-soft mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
        <ClipboardList aria-hidden="true" className="text-selected-fg size-6" />
      </div>
      <h3 className="text-title-sm text-text-primary mb-2 font-semibold">
        {isDeferredEnrollment ? "Evaluations unavailable" : "Nothing waiting to be started"}
      </h3>
      <p className="text-body-sm text-text-secondary mx-auto max-w-sm">
        {getPendingEmptyCopy(isDeferredEnrollment, draftCount)}
      </p>
    </div>
  );
}

function getPendingEmptyCopy(isDeferredEnrollment: boolean, draftCount: number) {
  if (isDeferredEnrollment) {
    return "Evaluation assignments will appear here once your enrollment is activated for an academic term.";
  }
  if (draftCount > 0) {
    return "No evaluations are waiting to be started. Resume the draft above to submit it.";
  }
  return "You have no evaluations waiting to be started. Check back later or review your submitted history.";
}

function DeferredEnrollmentBanner() {
  return (
    <div className="border-warning/30 bg-warning-soft/20 flex items-start gap-4 rounded-xl border p-5">
      <div className="bg-warning/10 flex size-10 shrink-0 items-center justify-center rounded-full">
        <CalendarDays aria-hidden="true" className="text-warning size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-label-md text-warning font-semibold">Enrollment Pending</p>
        <p className="text-body-sm text-text-secondary">
          No active academic term is currently configured. Your student profile is set up, but your
          formal enrollment and evaluation assignments are on hold until a new academic term is
          activated by administration.
        </p>
      </div>
    </div>
  );
}

function DashboardHeadingFallback() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-64 max-w-full" />
    </div>
  );
}

function StudentEvaluationsFallback() {
  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Card className="border-border">
          <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-56 max-w-full" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-11 w-32" />
          </CardContent>
        </Card>
      </section>

      <section aria-hidden="true" className="grid grid-cols-3 gap-2 sm:gap-3">
        {[1, 2, 3].map((card) => (
          <div
            key={card}
            className="border-border bg-surface min-h-14 rounded-xl border px-3 py-2.5 sm:min-h-16"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-6 w-8" />
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="space-y-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((card) => (
            <Card key={card} className="border-border">
              <CardContent className="flex items-center gap-4 p-4">
                <Skeleton className="size-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

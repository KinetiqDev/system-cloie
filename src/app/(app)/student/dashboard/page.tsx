import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { listStudentAssignedEvaluations } from "@/features/responses/services/list-student-assigned-evaluations";
import { EvaluationListCard } from "@/features/users/components/evaluation-list-card";
import { HeroCard } from "@/features/portals/components/hero-card";
import { StatCards } from "@/features/users/components/stat-cards";
import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import { prisma } from "@/lib/db/prisma";

type StudentEvaluations = Awaited<ReturnType<typeof listStudentAssignedEvaluations>>;
type StudentEvaluation = StudentEvaluations["active"][number];

type StudentIdentity = {
  displayName: string;
  contextLabel: string;
};
type StudentProfileIdentityRecord = {
  program: { code: string };
  major: { name: string } | null;
  user: { name: string };
};

type StudentEnrollmentIdentityRecord = {
  year_level: Parameters<typeof getYearLevelDisplay>[0];
  term: {
    school_year: { code: string };
    semester: Parameters<typeof formatTermInstanceLabel>[1];
    term: Parameters<typeof formatTermInstanceLabel>[2];
  };
};

async function readStudentIdentity(userId: string): Promise<StudentIdentity> {
  const [profile, enrollment] = await Promise.all([
    prisma.studentAcademicProfile.findUnique({
      where: { user_id: userId },
      include: {
        major: true,
        program: true,
        user: { select: { name: true } },
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

  return formatStudentIdentity(profile, enrollment);
}

function formatStudentIdentity(
  profile: StudentProfileIdentityRecord | null,
  enrollment: StudentEnrollmentIdentityRecord | null
): StudentIdentity {
  return {
    displayName: profile?.user.name ?? "Student",
    contextLabel: formatStudentContextLabel(profile, enrollment),
  };
}

function formatStudentContextLabel(
  profile: StudentProfileIdentityRecord | null,
  enrollment: StudentEnrollmentIdentityRecord | null
): string {
  const contextParts = [
    profile?.program.code,
    profile?.major?.name,
    formatStudentYearLevel(enrollment),
    formatStudentTermLabel(enrollment),
  ].filter(Boolean);

  return contextParts.join(" • ") || "Student portal";
}

function formatStudentYearLevel(enrollment: StudentEnrollmentIdentityRecord | null): string | null {
  return enrollment ? getYearLevelDisplay(enrollment.year_level) : null;
}

function formatStudentTermLabel(enrollment: StudentEnrollmentIdentityRecord | null): string | null {
  return enrollment
    ? formatTermInstanceLabel(
        enrollment.term.school_year.code,
        enrollment.term.semester,
        enrollment.term.term
      )
    : null;
}

export default async function StudentDashboardPage() {
  const session = await resolveAuthSession();
  const isDeferredEnrollment = session?.profileGate.status === "DEFERRED_ENROLLMENT";

  // Start both reads before awaiting either so the two independent sections of
  // the dashboard stream in parallel instead of serially.
  const identityPromise: Promise<StudentIdentity> = session
    ? readStudentIdentity(session.userId)
    : Promise.resolve({ displayName: "Student", contextLabel: "Student portal" });
  void identityPromise.catch(() => undefined);

  // When enrollment is deferred, evaluations cannot be assigned yet — return empty lists.
  const evaluationsPromise: Promise<StudentEvaluations> = isDeferredEnrollment
    ? Promise.resolve({ active: [], submitted: [] })
    : listStudentAssignedEvaluations();
  void evaluationsPromise.catch(() => undefined);

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      {isDeferredEnrollment && <DeferredEnrollmentBanner />}

      <Suspense fallback={<HeroCardFallback />}>
        <StudentHero identityPromise={identityPromise} />
      </Suspense>

      <Suspense fallback={<StudentEvaluationsFallback />}>
        <StudentEvaluationsSections
          evaluationsPromise={evaluationsPromise}
          isDeferredEnrollment={isDeferredEnrollment}
        />
      </Suspense>
    </div>
  );
}

async function StudentHero({ identityPromise }: { identityPromise: Promise<StudentIdentity> }) {
  const { displayName, contextLabel } = await identityPromise;

  return <HeroCard name={displayName} contextLabel={contextLabel} />;
}

async function StudentEvaluationsSections({
  evaluationsPromise,
  isDeferredEnrollment,
}: {
  evaluationsPromise: Promise<StudentEvaluations>;
  isDeferredEnrollment: boolean;
}) {
  const { active, submitted } = await evaluationsPromise;
  const inProgressCount = active.filter((item) => item.status === "IN_PROGRESS").length;
  const resumeItem = active.find((item) => item.status === "IN_PROGRESS") ?? null;
  const pending = active
    .filter((item) => ["NOT_STARTED", "DUE_SOON"].includes(item.status))
    .slice(0, 3);

  return (
    <StudentEvaluationsContent
      pending={pending}
      pendingCount={active.length}
      inProgressCount={inProgressCount}
      completedCount={submitted.length}
      resumeItem={resumeItem}
      isDeferredEnrollment={isDeferredEnrollment}
    />
  );
}

function StudentEvaluationsContent({
  pending,
  pendingCount,
  inProgressCount,
  completedCount,
  resumeItem,
  isDeferredEnrollment,
}: {
  pending: StudentEvaluation[];
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
  resumeItem: StudentEvaluation | null;
  isDeferredEnrollment: boolean;
}) {
  return (
    <>
      <StatCards pending={pendingCount} inProgress={inProgressCount} completed={completedCount} />
      {resumeItem && <ResumeEvaluationCard evaluation={resumeItem} />}
      <PendingEvaluations pending={pending} isDeferredEnrollment={isDeferredEnrollment} />
    </>
  );
}

function ResumeEvaluationCard({ evaluation }: { evaluation: StudentEvaluation }) {
  const isInProgress = evaluation.status === "IN_PROGRESS";

  return (
    <section className="mt-8 space-y-4">
      <div>
        <h3 className="font-heading text-title-lg font-extrabold">Continue</h3>
        <p className="text-text-muted text-body-sm font-medium">Pick up where you left off.</p>
      </div>

      <Card className="border-border overflow-hidden shadow-sm">
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-link text-label-sm font-semibold tracking-wider uppercase">
              {getResumeStatusLabel(isInProgress)}
            </p>
            <div>
              <h4 className="text-title-lg font-bold">
                {evaluation.courseTitle ?? evaluation.evaluationTitle}
              </h4>
              <p className="text-text-secondary text-body-sm">{getResumeSubtitle(evaluation)}</p>
            </div>
            {isInProgress && <ResumeProgress progress={evaluation.progress} />}
          </div>

          {evaluation.href && (
            <Button render={<Link href={evaluation.href} />} className="min-h-11 font-semibold">
              {getResumeActionLabel(isInProgress)}
            </Button>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function getResumeStatusLabel(isInProgress: boolean) {
  return isInProgress ? "In Progress" : "Pending";
}

function getResumeSubtitle(evaluation: StudentEvaluation) {
  return evaluation.courseTitle
    ? `${evaluation.evaluationTitle} • ${evaluation.programLabel}`
    : evaluation.programLabel;
}

function getResumeActionLabel(isInProgress: boolean) {
  return isInProgress ? "Resume" : "Start Evaluation";
}

function ResumeProgress({ progress }: { progress: number }) {
  return <p className="text-text-secondary text-body-sm font-medium">{progress}% complete</p>;
}

function PendingEvaluations({
  pending,
  isDeferredEnrollment,
}: {
  pending: StudentEvaluation[];
  isDeferredEnrollment: boolean;
}) {
  return (
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
        {pending.map((evalItem) => (
          <EvaluationListCard key={evalItem.assignmentId} {...evalItem} />
        ))}
        {pending.length === 0 && (
          <PendingEvaluationsEmpty isDeferredEnrollment={isDeferredEnrollment} />
        )}
      </div>
    </section>
  );
}

function PendingEvaluationsEmpty({ isDeferredEnrollment }: { isDeferredEnrollment: boolean }) {
  return (
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
  );
}

function DeferredEnrollmentBanner() {
  return (
    <div className="border-warning/30 bg-warning-soft/20 mb-6 flex items-start gap-4 rounded-xl border p-5">
      <div className="bg-warning/10 flex size-10 shrink-0 items-center justify-center rounded-full">
        <CalendarDays className="text-warning size-5" />
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

function HeroCardFallback() {
  return (
    <section className="bg-surface border-border mb-8 rounded-2xl border p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
          <Skeleton className="h-6 w-56 max-w-full rounded-full" />
        </div>
      </div>
    </section>
  );
}

function StudentEvaluationsFallback() {
  return (
    <>
      <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((card) => (
          <Card key={card} className="border-border p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-9 rounded-lg" />
            </div>
            <Skeleton className="h-9 w-12" />
            <Skeleton className="mt-2 h-4 w-32" />
          </Card>
        ))}
      </section>

      <section className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
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
    </>
  );
}

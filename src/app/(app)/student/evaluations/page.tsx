import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EvaluationListBrowser } from "@/features/users/components/evaluation-list-browser";
import { listStudentAssignedEvaluations } from "@/features/responses/services/list-student-assigned-evaluations";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { EvaluationBrowserSkeleton } from "@/components/layout/respondent-route-loading";

type StudentEvaluations = Awaited<ReturnType<typeof listStudentAssignedEvaluations>>;

export default async function StudentEvaluationsPage() {
  const session = await resolveAuthSession();
  if (session?.profileGate.status === "DEFERRED_ENROLLMENT") {
    redirect("/student/dashboard");
  }

  // Start the read before rendering so the static intro paints while the list resolves.
  const evaluationsPromise = listStudentAssignedEvaluations();
  void evaluationsPromise.catch(() => undefined);

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in space-y-8 motion-safe:duration-500">
      <section className="bg-surface rounded-xl p-8">
        <h1 className="font-heading text-heading-xl text-foreground tracking-tight">
          My Evaluations
        </h1>
        <p className="text-body-md text-muted-foreground mt-2 max-w-2xl">
          View and complete forms assigned to your academic context. Required course evaluations and
          graduating-student surveys appear in one shared workflow.
        </p>
      </section>

      <Suspense fallback={<EvaluationBrowserSkeleton />}>
        <StudentEvaluationsBrowser evaluationsPromise={evaluationsPromise} />
      </Suspense>
    </div>
  );
}

async function StudentEvaluationsBrowser({
  evaluationsPromise,
}: {
  evaluationsPromise: Promise<StudentEvaluations>;
}) {
  const { active, submitted } = await evaluationsPromise;
  const pending = active.filter((item) => item.status !== "IN_PROGRESS");
  const inProgress = active.filter((item) => item.status === "IN_PROGRESS");

  return <EvaluationListBrowser pending={pending} inProgress={inProgress} submitted={submitted} />;
}

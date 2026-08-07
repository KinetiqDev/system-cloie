import { redirect } from "next/navigation";
import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listStudentAssignedEvaluations } from "@/features/responses/services/list-student-assigned-evaluations";
import { EvaluationListCard } from "@/features/users/components/evaluation-list-card";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";

export default async function StudentEvaluationsPage() {
  const session = await resolveAuthSession();
  if (session?.profileGate.status === "DEFERRED_ENROLLMENT") {
    redirect("/student/dashboard");
  }

  const { active, submitted } = await listStudentAssignedEvaluations();
  const pending = active.filter((item) => item.status !== "IN_PROGRESS");
  const inProgress = active.filter((item) => item.status === "IN_PROGRESS");

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in space-y-8 motion-safe:duration-500">
      <section className="bg-surface rounded-xl p-8">
        <h1 className="font-heading text-text-primary text-4xl font-bold tracking-tight">
          My Evaluations
        </h1>
        <p className="text-text-secondary mt-2 max-w-2xl text-base">
          View and complete forms assigned to your academic context. Required course evaluations and
          graduating-student surveys appear in one shared workflow.
        </p>
      </section>

      <Tabs defaultValue="pending" className="w-full">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <TabsList className="h-auto flex-wrap gap-2 bg-transparent p-0">
            <TabsTrigger
              value="pending"
              className="bg-surface text-text-secondary data-active:bg-primary data-active:text-on-primary min-h-11 rounded-full px-5 text-sm font-medium"
            >
              Pending
            </TabsTrigger>
            <TabsTrigger
              value="in-progress"
              className="bg-surface text-text-secondary data-active:bg-primary data-active:text-on-primary min-h-11 rounded-full px-5 text-sm font-medium"
            >
              In Progress
            </TabsTrigger>
            <TabsTrigger
              value="submitted"
              className="bg-surface text-text-secondary data-active:bg-primary data-active:text-on-primary min-h-11 rounded-full px-5 text-sm font-medium"
            >
              Submitted
            </TabsTrigger>
          </TabsList>

          <div className="flex w-full gap-4 md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="text-text-muted absolute top-2.5 left-3 size-4" />
              <Input placeholder="Search evaluations..." className="min-h-11 pl-9" />
            </div>
            <Button variant="outline" className="min-h-11 gap-2">
              <Filter className="size-4" />
              Filter
            </Button>
          </div>
        </div>

        <TabsContent value="pending" className="pt-6">
          <div className="grid gap-4">
            {pending.map((evalItem) => (
              <EvaluationListCard key={evalItem.assignmentId} {...evalItem} />
            ))}
            {pending.length === 0 && (
              <div className="border-border rounded-xl border-2 border-dashed py-12 text-center">
                <p className="text-text-muted font-medium">No pending evaluations found.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="in-progress" className="pt-6">
          <div className="grid gap-4">
            {inProgress.map((evalItem) => (
              <EvaluationListCard key={evalItem.assignmentId} {...evalItem} />
            ))}
            {inProgress.length === 0 && (
              <div className="border-border rounded-xl border-2 border-dashed py-12 text-center">
                <p className="text-text-muted font-medium">
                  Your in-progress evaluations will appear here.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="submitted" className="pt-6">
          <div className="grid gap-4">
            {submitted.map((evalItem) => (
              <EvaluationListCard key={evalItem.assignmentId} {...evalItem} />
            ))}
            {submitted.length === 0 && (
              <div className="border-border rounded-xl border-2 border-dashed py-12 text-center">
                <p className="text-text-muted font-medium">
                  Your submitted evaluations will appear here.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

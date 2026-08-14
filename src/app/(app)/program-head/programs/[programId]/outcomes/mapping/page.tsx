import Link from "next/link";
import { ArrowLeft, ListChecks } from "lucide-react";
import { notFound } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { listCILOMappingsForProgram } from "@/features/outcomes/services/manage-program-head-outcomes";
import { buildProgramHeadOutcomesPath } from "@/lib/constants/program-head-routes";

export const metadata = {
  title: "CILO Mapping Review | Program Head | CLOIE",
};

export default async function SelectedProgramOutcomeMappingPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const result = await listCILOMappingsForProgram(programId);

  if (!result.success) notFound();

  return (
    <div>
      <div className="mb-10">
        <Button
          render={<Link href={buildProgramHeadOutcomesPath(programId)} />}
          variant="ghost"
          className="mb-4 inline-flex items-center gap-2 px-0"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Graduate Outcomes
        </Button>
        <h1 className="font-heading text-text-primary mb-2 text-4xl font-bold tracking-tight lg:text-5xl">
          CILO Mapping Review
        </h1>
        <p className="text-body-md text-text-muted">
          Review how Course Intended Learning Outcomes map to outcomes across this
          program&apos;s courses. Faculty manage alignment through Course alignment and the
          Secretary corrects mappings college-wide.
        </p>
      </div>

      {result.data.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListChecks className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No CILO mappings found</EmptyTitle>
            <EmptyDescription>
              Faculty align CILOs through Course alignment in Manage CILOs. Mapped CILOs appear
              here for readiness review.
            </EmptyDescription>
          </EmptyHeader>
          <Button
            render={<Link href={buildProgramHeadOutcomesPath(programId)} />}
            variant="outline"
          >
            Review Graduate Outcomes
          </Button>
        </Empty>
      ) : (
        <div className="space-y-6">
          {result.data.map((course) => (
            <Card key={course.courseId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Badge variant="default" className="text-label-sm">
                    {course.courseCode}
                  </Badge>
                  <span>{course.courseTitle}</span>
                  {course.courseScope === "GENERAL_EDUCATION" && (
                    <Badge variant="secondary" className="text-label-sm">
                      Shared General Education
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {course.cilos.length} {course.cilos.length === 1 ? "CILO" : "CILOs"} defined
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {course.cilos.map((cilo, index) => (
                    <div key={cilo.id} className="border-border rounded-lg border p-4">
                      <div className="mb-2 flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <span className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                            CILO {index + 1}
                          </span>
                          <p className="text-body-md text-text-primary mt-1">{cilo.description}</p>
                        </div>
                        <Badge
                          variant={cilo.readiness === "ready" ? "default" : "outline"}
                          className="text-label-sm"
                        >
                          {cilo.readiness === "ready" ? "Aligned" : "Needs mapping"}
                        </Badge>
                      </div>
                      {cilo.mappedTargets.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {cilo.mappedTargets.map((target) => (
                            <Badge
                              key={target.mappingId}
                              variant="secondary"
                              className="text-label-sm max-w-40 truncate"
                              title={target.description}
                            >
                              {target.code}
                              {!target.is_active && " (archived)"}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Alert>
                          <AlertDescription>
                            No mapped outcome.{" "}
                            {course.courseScope === "GENERAL_EDUCATION"
                              ? "Faculty or the Secretary can align this CILO to Institutional Outcomes."
                              : "Faculty or the Secretary can align this CILO to Graduate Outcomes."}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

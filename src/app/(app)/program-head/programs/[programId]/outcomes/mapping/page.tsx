import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listCILOMappingsForProgram,
  listProgramGOs,
} from "@/features/outcomes/services/manage-program-head-outcomes";
import { ProgramHeadMappingControls } from "@/features/outcomes/components/program-head-mapping-controls";
import { buildProgramHeadOutcomesPath } from "@/lib/constants/program-head-routes";

export const metadata = {
  title: "CILO-GO Mappings | Program Head | CLOIE",
};

export default async function SelectedProgramOutcomeMappingPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const [result, outcomesResult] = await Promise.all([
    listCILOMappingsForProgram(programId),
    listProgramGOs(programId),
  ]);

  if (!result.success || !outcomesResult.success) notFound();
  const activeGOs = outcomesResult.data.gos.filter((go) => go.is_active);

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
          CILO-GO Mapping Review
        </h1>
        <p className="text-body-md text-text-muted">
          Review and manage how Course Intended Learning Outcomes map to Graduate Outcomes across
          this program&apos;s courses.
        </p>
      </div>

      {result.data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-body-md text-text-secondary">
              No CILO mappings found. CILOs and their GO mappings are created by faculty when
              publishing evaluations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {result.data.map((course) => (
            <Card key={course.courseId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Badge variant="default" className="text-sm font-semibold">
                    {course.courseCode}
                  </Badge>
                  <span>{course.courseTitle}</span>
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
                      </div>
                      <ProgramHeadMappingControls
                        programId={programId}
                        ciloId={cilo.id}
                        ciloIndex={index}
                        mappedGOs={cilo.mappedGOs}
                        activeGOs={activeGOs}
                      />
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

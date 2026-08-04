import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";

const PLANNED_REPORTS = [
  {
    title: "Course-bound CILO summary",
    description: "Prepared for later PDF and spreadsheet export integration.",
  },
  {
    title: "Stakeholder deployment completion",
    description: "Prepared for later PDF and spreadsheet export integration.",
  },
  {
    title: "Program outcome attainment digest",
    description: "Prepared for later PDF and spreadsheet export integration.",
  },
] as const;

export default async function SelectedProgramReportsPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const contextResult = await resolveProgramHeadContext(programId);

  if (!contextResult.success) {
    notFound();
  }

  const { code, name } = contextResult.data.selectedProgram;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-lg">Reports</h1>
        <p className="text-body-md text-text-secondary">
          <span className="text-primary font-semibold">
            {code} — {name}
          </span>{" "}
          · Program-scoped report exports
        </p>
      </div>

      <div className="grid gap-4">
        {PLANNED_REPORTS.map((report) => (
          <Card key={report.title}>
            <CardHeader>
              <CardTitle>{report.title}</CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button variant="outline" disabled>
                  Export PDF Stub
                </Button>
                <Button variant="outline" disabled>
                  Export Sheet Stub
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-body-sm text-text-secondary">
        Reports are scoped to the selected {code} Program only. A future cross-Program summary is a
        separate read-only aggregation surface and is not available from Program management routes.
      </p>
    </div>
  );
}

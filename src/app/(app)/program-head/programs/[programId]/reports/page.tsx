import { notFound } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { getProgramHeadAnalyticsFrame } from "@/features/analytics/services/get-program-head-analytics";
import { ProgramHeadReportExports } from "@/features/reports/components/program-head-report-exports";
import { listProgramHeadReportYearLevels } from "@/features/reports/services/report-evidence";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Reports", "Program Head") };

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
  const [frame, yearLevels] = await Promise.all([
    getProgramHeadAnalyticsFrame(programId, { tab: "outcomes" }, "program-head"),
    listProgramHeadReportYearLevels(programId),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-xl text-foreground text-pretty">Reports</h1>
        <p className="text-body-sm text-muted-foreground text-pretty">
          Program-scoped report exports for {code} — {name}.
        </p>
      </div>

      <Alert variant="destructive" role="note">
        <AlertTitle>Confidential: these reports name respondents</AlertTitle>
        <AlertDescription>
          Every export lists each respondent by name beside their submitted answers. Download only
          when you are authorized to handle identified Program evidence, store the file securely,
          and never forward it outside the authorized Program Head team. Every download is recorded
          in an audit trail with your account, the Program, and the filters applied.
        </AlertDescription>
      </Alert>

      {frame ? (
        <ProgramHeadReportExports
          programId={programId}
          programLabel={`${code} — ${name}`}
          periodOptions={frame.periodOptions}
          yearLevels={yearLevels}
        />
      ) : (
        <Alert role="note">
          <AlertTitle>Report options unavailable</AlertTitle>
          <AlertDescription>
            The academic period options for this Program could not be loaded. Reload the page to try
            again.
          </AlertDescription>
        </Alert>
      )}

      <div className="text-muted-foreground text-body-sm flex flex-col gap-2 text-pretty">
        <p>
          Every mean, count, and classification in an export is produced by the same analytics
          calculations the live Analytics views use, so a printed figure always reconciles with the
          report you saw on screen. Attainment interpretation follows the proposed institutional
          policy and is labelled as proposed.
        </p>
        <p>
          Reports are scoped to the selected {code} Program only. A future cross-Program summary is
          a separate read-only aggregation surface and is not available from Program management
          routes.
        </p>
      </div>
    </div>
  );
}

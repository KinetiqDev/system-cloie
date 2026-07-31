import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
  DeanReadModelNotFoundError,
  getDeanLearningOutcomes,
  listDeanEligiblePeriods,
  type DeanPeriodSummary,
  type DeanReadState,
  type DeanLearningOutcomesData,
} from "@/features/dean/services/read-dean-oversight";
import { DeanLearningOutcomesLoading } from "@/features/dean/components/dean-oversight-loading";

type SearchParams = { period?: string; risk?: string; program?: string };
const validRisks = new Set<NonNullable<DeanLearningOutcomesData["risk"]>>([
  "missing-cilos",
  "incomplete-mappings",
  "not-ready",
]);

export default async function DeanLearningOutcomesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  if (params.risk && !validRisks.has(params.risk as NonNullable<DeanLearningOutcomesData["risk"]>))
    notFound();

  const periods: DeanPeriodSummary[] = await listDeanEligiblePeriods();
  const activePeriodId = periods.find((period) => period.status === "ACTIVE")?.id;
  const selectedPeriodId = params.period ?? activePeriodId;
  const risk =
    params.risk && validRisks.has(params.risk as NonNullable<DeanLearningOutcomesData["risk"]>)
      ? (params.risk as DeanLearningOutcomesData["risk"])
      : null;

  if (!selectedPeriodId)
    return (
      <EmptyPage
        title="Learning Outcomes"
        heading="No active Academic Period"
        message={
          periods.length > 0
            ? "A completed period is available for historical review. Select it through its period URL."
            : "No active or completed Academic Period is available for oversight."
        }
      />
    );
  if (!params.period && activePeriodId) {
    const query = new URLSearchParams({ period: activePeriodId });
    if (risk) query.set("risk", risk);
    if (params.program) query.set("program", params.program);
    redirect(`/dean/college-oversight/learning-outcomes?${query}`);
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      selectedPeriodId
    )
  )
    notFound();

  const selectedPeriod = periods.find((period) => period.id === selectedPeriodId);
  const detailPromise = getDeanLearningOutcomes(selectedPeriodId, risk);
  void detailPromise.catch(() => undefined);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-lg">Learning Outcomes</h1>
        <p className="text-body-md text-text-secondary max-w-2xl">
          Read-only college oversight of Graduate Outcomes and Course Intended Learning Outcome
          mapping gaps.
        </p>
      </div>
      <PeriodControls periods={periods} selectedPeriodId={selectedPeriodId} risk={risk} />
      <div className="text-text-secondary flex flex-wrap items-center gap-2 text-sm">
        <span>Selected period</span>
        <Badge variant="outline">{selectedPeriod?.label ?? "Selected period"}</Badge>
        {selectedPeriod?.status === "COMPLETED" && (
          <Badge variant="secondary">Completed snapshot</Badge>
        )}
        {risk && <Badge variant="secondary">Risk: {riskLabel(risk)}</Badge>}
      </div>
      <section aria-labelledby="program-overview" className="flex flex-col gap-3">
        <div>
          <h2 id="program-overview" className="text-heading-md">
            Academic Program overview
          </h2>
          <p className="text-body-sm text-text-secondary">
            Programs sorted by not-ready context count, then name.
          </p>
        </div>
        <Suspense fallback={<DeanLearningOutcomesLoading />}>
          <LearningOutcomesDetails
            detailPromise={detailPromise}
            selectedProgram={params.program}
          />
        </Suspense>
      </section>
    </div>
  );
}

export async function LearningOutcomesDetails({
  detailPromise,
  selectedProgram,
}: {
  detailPromise: ReturnType<typeof getDeanLearningOutcomes>;
  selectedProgram?: string;
}) {
  let result: DeanReadState<DeanLearningOutcomesData>;
  try {
    result = await detailPromise;
  } catch (error) {
    if (error instanceof DeanReadModelNotFoundError) notFound();
    throw error;
  }
  return <LearningOutcomesContent result={result} selectedProgram={selectedProgram} />;
}

export function LearningOutcomesContent({
  result,
  selectedProgram,
}: {
  result: DeanReadState<DeanLearningOutcomesData>;
  selectedProgram?: string;
}) {
  if (result.state === "no-eligible-period")
    return (
      <Card>
        <CardContent className="text-text-secondary py-6 text-sm">
          No eligible Academic Period is available for oversight.
        </CardContent>
      </Card>
    );

  const programs = selectedProgram
    ? result.data.programs.filter((program) => program.id === selectedProgram)
    : result.data.programs;
  return programs.length === 0 ? (
    <Card>
      <CardContent className="text-text-secondary py-6 text-sm">
        No Academic Programs match this period and risk filter.
      </CardContent>
    </Card>
  ) : (
    <div className="flex flex-col gap-3">
      {programs.map((program) => (
        <ProgramDetail key={program.id} program={program} open={selectedProgram === program.id} />
      ))}
    </div>
  );
}

function PeriodControls({
  periods,
  selectedPeriodId,
  risk,
}: {
  periods: { id: string; label: string; status: string }[];
  selectedPeriodId: string;
  risk: DeanLearningOutcomesData["risk"];
}) {
  return (
    <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="period" className="text-sm font-medium">
          Academic Period
        </label>
        <select
          id="period"
          name="period"
          defaultValue={selectedPeriodId}
          className="border-input bg-background focus-visible:ring-ring h-11 min-w-64 rounded-lg border px-3 text-sm outline-none focus-visible:ring-3"
        >
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.label}
              {period.status === "COMPLETED" ? " (Completed)" : " (Active)"}
            </option>
          ))}
        </select>
      </div>
      {risk && <input type="hidden" name="risk" value={risk} />}
      <button
        type="submit"
        className="bg-primary text-primary-foreground focus-visible:ring-ring h-11 rounded-lg px-4 text-sm font-medium transition-transform outline-none focus-visible:ring-3 active:translate-y-px"
      >
        View period
      </button>
    </form>
  );
}

function ProgramDetail({
  program,
  open,
}: {
  program: DeanLearningOutcomesData["programs"][number];
  open: boolean;
}) {
  const notReady = program.missingCiloContexts + program.incompleteMappingContexts;
  const coverage =
    program.activeContexts === 0
      ? 0
      : Math.round((program.readyContexts / program.activeContexts) * 100);
  return (
    <details open={open} className="group ring-foreground/10 rounded-xl ring-1">
      <summary className="focus-visible:ring-ring flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 p-4 outline-none marker:hidden focus-visible:ring-3">
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-medium">{program.name}</span>
          <span className="text-text-secondary text-xs">
            {program.graduateOutcomeCount} Graduate Outcomes · {program.mappingGaps.length} mapping
            gaps
          </span>
          <span className="text-text-secondary text-xs">
            {program.activeContexts} active · {program.readyContexts} ready ·{" "}
            {program.missingCiloContexts} missing CILOs · {program.incompleteMappingContexts}{" "}
            incomplete mappings
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <Badge variant={notReady === 0 ? "secondary" : "destructive"}>
            {notReady === 0 ? "Ready" : `${notReady} not ready`}
          </Badge>
          <ChevronDown
            aria-hidden="true"
            className="text-text-secondary size-4 transition-transform group-open:rotate-180"
          />
        </span>
      </summary>
      <div className="border-t px-4 pt-4 pb-4">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Metric label="Active contexts" value={program.activeContexts} />
          <Metric label="Ready contexts" value={program.readyContexts} />
          <Metric label="Missing CILOs" value={program.missingCiloContexts} />
          <Metric label="Incomplete mappings" value={program.incompleteMappingContexts} />
        </div>
        <p className="text-text-secondary mt-4 text-sm">
          {coverage}% coverage from {program.readyContexts} of {program.activeContexts} contexts.
        </p>
        <ProgramContent program={program} />
      </div>
    </details>
  );
}

function ProgramContent({ program }: { program: DeanLearningOutcomesData["programs"][number] }) {
  return (
    <div className="mt-6 flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold">Graduate Outcomes</h3>
        {program.graduateOutcomes.length === 0 ? (
          <p className="text-text-secondary mt-2 text-sm">
            No Graduate Outcomes recorded for this Program.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col divide-y rounded-lg border">
            {program.graduateOutcomes.map((outcome) => (
              <li
                key={outcome.id}
                className="flex flex-col gap-1 px-3 py-3 text-sm sm:flex-row sm:items-baseline sm:gap-3"
              >
                <span className="font-medium">{outcome.code}</span>
                <span className="text-text-secondary">{outcome.statement}</span>
                {outcome.isArchived && <Badge variant="outline">Archived</Badge>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold">Affected Course and CILO mapping gaps</h3>
        {program.mappingGaps.length === 0 ? (
          <p className="text-text-secondary mt-2 text-sm">No affected mapping gaps.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {program.mappingGaps.map((gap, index) => (
              <li
                key={`${gap.courseId}-${gap.ciloId ?? "missing"}-${index}`}
                className="rounded-lg border p-3 text-sm"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-medium">{gap.courseCode}</span>
                  <span className="text-text-secondary">{gap.courseName}</span>
                  <span className="text-text-secondary text-xs">
                    {gap.yearLevel} · {gap.section}
                  </span>
                </div>
                {gap.reason === "missing-cilos" ? (
                  <p className="text-text-secondary mt-2">
                    Missing CILOs. No Course Intended Learning Outcomes recorded.
                  </p>
                ) : (
                  <p className="text-text-secondary mt-2">
                    Incomplete mapping: {gap.ciloStatement}
                    {gap.ciloIsArchived && (
                      <Badge className="ml-2" variant="outline">
                        Archived
                      </Badge>
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-text-secondary text-xs">{label}</p>
      <p className="mt-1 font-semibold tabular-nums">{value}</p>
    </div>
  );
}
function riskLabel(risk: NonNullable<DeanLearningOutcomesData["risk"]>) {
  return risk === "missing-cilos"
    ? "Missing CILOs"
    : risk === "incomplete-mappings"
      ? "Incomplete mappings"
      : "Not ready";
}
function EmptyPage({
  title,
  heading,
  message,
}: {
  title: string;
  heading: string;
  message: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-lg">{title}</h1>
        <p className="text-body-md text-text-secondary">Read-only college oversight.</p>
      </div>
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base leading-snug font-medium">{heading}</h2>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/dean/dashboard"
            className="text-primary focus-visible:ring-ring font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
          >
            Return to Dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

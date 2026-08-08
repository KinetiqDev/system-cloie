import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  DeanEnrollmentsData,
  DeanPeriodSummary,
  DeanReadState,
} from "@/features/dean/services/read-dean-oversight";
import {
  DeanReadModelNotFoundError,
  getDeanEnrollments,
  listDeanEligiblePeriods,
} from "@/features/dean/services/read-dean-oversight";
import { z } from "zod";
import { DeanEnrollmentsLoading } from "@/features/dean/components/dean-oversight-loading";

type SearchParams = { period?: string };
const searchParamsSchema = z.object({ period: z.string().uuid().optional() });

export default async function DeanEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const parsedParams = searchParamsSchema.safeParse(params);
  if (!parsedParams.success) notFound();
  const periods: DeanPeriodSummary[] = await listDeanEligiblePeriods();
  const selectedPeriodId =
    parsedParams.data.period ??
    periods.find((period) => period.status === "ACTIVE")?.id ??
    periods[0]?.id;

  if (!selectedPeriodId) {
    return (
      <EmptyPage
        heading="No eligible Academic Period"
        message="No active or completed Academic Period is available for enrollment oversight."
      />
    );
  }
  if (!parsedParams.data.period) {
    redirect(`/dean/college-oversight/enrollments?period=${encodeURIComponent(selectedPeriodId)}`);
  }
  const selectedPeriod = periods.find((period) => period.id === selectedPeriodId);
  if (!selectedPeriod) notFound();
  const detailPromise = getDeanEnrollments(selectedPeriodId);
  void detailPromise.catch(() => undefined);
  return (
    <div className="flex flex-col gap-6">
      <PageIntro />
      <PeriodControls periods={periods} selectedPeriodId={selectedPeriodId} />
      <div className="text-text-secondary flex flex-wrap items-center gap-2 text-sm">
        <span className="text-text-primary font-medium">Selected period</span>
        <Badge variant="outline">{selectedPeriod?.label ?? "Selected period"}</Badge>
        {selectedPeriod?.status === "COMPLETED" && <Badge variant="secondary">Archived view</Badge>}
      </div>
      <section aria-labelledby="enrollment-programs" className="flex flex-col gap-3">
        <div>
          <h2 id="enrollment-programs" className="text-heading-md">
            Academic Program totals
          </h2>
          <p className="text-body-sm text-text-secondary">
            Expand a Program to locate Course and class contexts. Names stay hidden until roster is
            opened.
          </p>
        </div>
        <Suspense fallback={<DeanEnrollmentsLoading />}>
          <EnrollmentDetails detailPromise={detailPromise} />
        </Suspense>
      </section>
    </div>
  );
}

export async function EnrollmentDetails({
  detailPromise,
}: {
  detailPromise: ReturnType<typeof getDeanEnrollments>;
}) {
  let result: DeanReadState<DeanEnrollmentsData>;
  try {
    result = await detailPromise;
  } catch (error) {
    if (error instanceof DeanReadModelNotFoundError) notFound();
    throw error;
  }
  return <EnrollmentContent result={result} />;
}

export function EnrollmentContent({ result }: { result: DeanReadState<DeanEnrollmentsData> }) {
  if (result.state === "no-eligible-period") {
    return (
      <Card>
        <CardContent className="text-text-secondary py-6 text-sm">
          No active or completed Academic Period is available for enrollment oversight.
        </CardContent>
      </Card>
    );
  }
  return result.data.programs.length === 0 ? (
    <Card>
      <CardContent className="text-text-secondary py-6 text-sm">
        No Course and class enrollment records in this period.
      </CardContent>
    </Card>
  ) : (
    <div className="flex flex-col gap-3">
      {result.data.programs.map((program) => (
        <ProgramDetail key={program.id} program={program} periodId={result.data.period.id} />
      ))}
    </div>
  );
}

function PageIntro() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-heading-lg">Enrollments</h1>
      <p className="text-body-md text-text-secondary max-w-2xl">
        Read-only college oversight of placement totals by Academic Program and class.
      </p>
    </div>
  );
}

function PeriodControls({
  periods,
  selectedPeriodId,
}: {
  periods: DeanPeriodSummary[];
  selectedPeriodId: string;
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
              {period.label} ({period.status === "COMPLETED" ? "Completed" : "Active"})
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" className="h-11">
        View period
      </Button>
    </form>
  );
}

function ProgramDetail({
  program,
  periodId,
}: {
  program: DeanEnrollmentsData["programs"][number];
  periodId: string;
}) {
  return (
    <details className="group ring-foreground/10 rounded-xl ring-1">
      <summary className="focus-visible:ring-ring flex min-h-20 cursor-pointer list-none items-center justify-between gap-4 p-4 outline-none marker:hidden focus-visible:ring-3">
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-medium">{program.name}</span>
          <span className="text-text-secondary text-xs">
            {program.classes.length} {program.classes.length === 1 ? "class" : "classes"}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <span className="text-right">
            <span className="font-heading text-heading-xl text-foreground block tabular-nums">
              {program.enrolledStudentCount}
            </span>
            <span className="text-text-secondary block text-xs">placements</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="text-text-secondary size-4 transition-transform group-open:rotate-180"
          />
        </span>
      </summary>
      <div className="border-t px-3 pt-3 pb-3 sm:px-4 sm:pb-4">
        <div className="hidden md:block">
          <ClassTable classes={program.classes} periodId={periodId} />
        </div>
        <div className="flex flex-col gap-2 md:hidden">
          {program.classes.map((courseClass) => (
            <ClassCard
              key={courseClass.assignmentId}
              courseClass={courseClass}
              periodId={periodId}
            />
          ))}
        </div>
      </div>
    </details>
  );
}

function ClassTable({
  classes,
  periodId,
}: {
  classes: DeanEnrollmentsData["programs"][number]["classes"];
  periodId: string;
}) {
  return (
    <Table className="min-w-[42rem]">
      <TableHeader>
        <TableRow className="bg-muted/40 text-text-secondary text-xs">
          <TableHead scope="col" className="px-3 py-3 font-medium">
            Course
          </TableHead>
          <TableHead scope="col" className="px-3 py-3 font-medium">
            Year level
          </TableHead>
          <TableHead scope="col" className="px-3 py-3 font-medium">
            Section
          </TableHead>
          <TableHead scope="col" className="px-3 py-3 text-right font-medium">
            Placements
          </TableHead>
          <TableHead scope="col" className="px-3 py-3 text-right font-medium">
            Action
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {classes.map((courseClass) => (
          <ClassRow key={courseClass.assignmentId} courseClass={courseClass} periodId={periodId} />
        ))}
      </TableBody>
    </Table>
  );
}

function ClassRow({
  courseClass,
  periodId,
}: {
  courseClass: DeanEnrollmentsData["programs"][number]["classes"][number];
  periodId: string;
}) {
  return (
    <TableRow>
      <TableHead scope="row" className="px-3 py-4 font-medium">
        <span className="block">{courseClass.courseCode}</span>
        <span className="text-text-secondary block text-xs font-normal">
          {courseClass.courseName}
        </span>
      </TableHead>
      <TableCell className="px-3 py-4">{courseClass.yearLevel}</TableCell>
      <TableCell className="px-3 py-4">{courseClass.section}</TableCell>
      <TableCell className="px-3 py-4 text-right font-semibold tabular-nums">
        {courseClass.enrolledStudentCount}
      </TableCell>
      <TableCell className="px-3 py-4 text-right">
        <RosterLink periodId={periodId} assignmentId={courseClass.assignmentId} />
      </TableCell>
    </TableRow>
  );
}

function ClassCard({
  courseClass,
  periodId,
}: {
  courseClass: DeanEnrollmentsData["programs"][number]["classes"][number];
  periodId: string;
}) {
  return (
    <article className="bg-muted/20 flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{courseClass.courseCode}</h3>
          <p className="text-text-secondary text-sm">{courseClass.courseName}</p>
        </div>
        <div className="text-right">
          <p className="font-heading text-heading-xl text-foreground tabular-nums">
            {courseClass.enrolledStudentCount}
          </p>
          <p className="text-text-secondary text-xs">placements</p>
        </div>
      </div>
      <dl className="text-text-secondary grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt>Year level</dt>
          <dd className="text-text-primary mt-1 font-medium">{courseClass.yearLevel}</dd>
        </div>
        <div>
          <dt>Section</dt>
          <dd className="text-text-primary mt-1 font-medium">{courseClass.section}</dd>
        </div>
      </dl>
      <RosterLink periodId={periodId} assignmentId={courseClass.assignmentId} />
    </article>
  );
}

function RosterLink({ periodId, assignmentId }: { periodId: string; assignmentId: string }) {
  return (
    <Link
      href={`/dean/college-oversight/enrollments/roster?period=${encodeURIComponent(periodId)}&assignment=${encodeURIComponent(assignmentId)}`}
      className="text-link focus-visible:ring-ring inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
    >
      Open roster
      <ArrowUpRight aria-hidden="true" />
    </Link>
  );
}

function EmptyPage({ heading, message }: { heading: string; message: string }) {
  return (
    <div className="flex flex-col gap-6">
      <PageIntro />
      <Card>
        <CardHeader>
          <CardTitle>{heading}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/dean/dashboard"
            className="text-link focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
          >
            Return to Dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

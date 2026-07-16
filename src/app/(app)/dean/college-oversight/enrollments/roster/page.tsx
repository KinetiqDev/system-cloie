import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GET as getEligiblePeriods } from "@/app/api/dean/eligible-periods/route";
import { GET as getRoster } from "@/app/api/dean/enrollments/roster/route";
import type {
  DeanPeriodSummary,
  DeanReadState,
  DeanRosterData,
} from "@/features/dean/services/read-dean-oversight";
import { DeanPageReadNotFoundError, fetchDeanRead } from "@/features/dean/services/fetch-dean-read";
import { z } from "zod";

type SearchParams = { period?: string; assignment?: string; query?: string; page?: string };
const searchParamsSchema = z.object({
  period: z.string().uuid(),
  assignment: z.string().uuid(),
  query: z.string().trim().min(1).max(100).optional(),
  page: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .refine(Number.isSafeInteger),
});

export default async function DeanEnrollmentRosterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { periods } = await fetchDeanRead<{ periods: DeanPeriodSummary[] }>(
    getEligiblePeriods,
    "/api/dean/eligible-periods"
  );
  if (periods.length === 0)
    return (
      <EmptyRoster
        heading="No eligible Academic Period"
        message="No active or completed Academic Period is available for roster oversight."
      />
    );
  if (!params.period || !params.assignment) {
    return (
      <EmptyRoster
        heading="Select a class roster"
        message="Open roster from Enrollments after selecting a Course and class context."
      />
    );
  }
  const parsedParams = searchParamsSchema.safeParse({ ...params, page: params.page ?? "1" });
  if (!parsedParams.success) notFound();
  const { period, assignment, query, page } = parsedParams.data;

  const requestQuery = new URLSearchParams({ period, assignment, page: String(page) });
  if (query) requestQuery.set("query", query);
  let result: DeanReadState<DeanRosterData>;
  try {
    result = await fetchDeanRead<DeanReadState<DeanRosterData>>(
      getRoster,
      `/api/dean/enrollments/roster?${requestQuery}`
    );
  } catch (error) {
    if (error instanceof DeanPageReadNotFoundError) notFound();
    throw error;
  }
  if (result.state === "no-eligible-period") {
    return (
      <EmptyRoster
        heading="No eligible Academic Period"
        message="No active or completed Academic Period is available for roster oversight."
      />
    );
  }

  const { data } = result;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={`/dean/college-oversight/enrollments?period=${encodeURIComponent(period)}`}
          className="text-primary focus-visible:ring-ring inline-flex min-h-11 w-fit items-center gap-2 rounded-md text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" />
          Back to Enrollments
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-heading-lg">Class Roster</h1>
          <p className="text-body-md text-text-secondary max-w-2xl">
            Explicit read-only display-name view for one Course and class context.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline">{data.assignment.courseCode}</Badge>
        <span className="text-text-primary font-medium">{data.assignment.courseName}</span>
        <span className="text-text-secondary">
          {data.assignment.programName} · {data.assignment.yearLevel} · {data.assignment.section}
        </span>
      </div>
      <PeriodSummary periods={periods} selectedPeriodId={period} />
      <Card>
        <CardHeader>
          <CardTitle>Names</CardTitle>
          <CardDescription>
            {data.totalCount} {data.totalCount === 1 ? "name" : "names"} in selected class. Showing
            up to {data.pageSize} per page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <input type="hidden" name="period" value={period} />
            <input type="hidden" name="assignment" value={assignment} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <label htmlFor="roster-query" className="text-sm font-medium">
                Search names
              </label>
              <input
                id="roster-query"
                name="query"
                type="search"
                defaultValue={query}
                maxLength={100}
                placeholder="Search by first or last name"
                className="border-input bg-background focus-visible:ring-ring h-11 rounded-lg border px-3 text-base outline-none focus-visible:ring-3"
              />
            </div>
            <button
              type="submit"
              className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium outline-none focus-visible:ring-3"
            >
              <Search aria-hidden="true" />
              Search
            </button>
          </form>
          {data.students.length === 0 ? (
            <p className="text-text-secondary rounded-lg border border-dashed px-4 py-8 text-center text-sm">
              No names match this search.
            </p>
          ) : (
            <ol className="divide-y rounded-lg border" aria-label="Class display names">
              {data.students.map((student, index) => (
                <li key={`${student.displayName}-${index}`} className="px-4 py-3 text-sm">
                  {student.displayName}
                </li>
              ))}
            </ol>
          )}
          <Pagination data={data} periodId={period} assignmentId={assignment} query={query} />
        </CardContent>
      </Card>
    </div>
  );
}

function PeriodSummary({
  periods,
  selectedPeriodId,
}: {
  periods: DeanPeriodSummary[];
  selectedPeriodId: string;
}) {
  const period = periods.find((item) => item.id === selectedPeriodId);
  return (
    <div className="text-text-secondary flex flex-wrap items-center gap-2 text-sm">
      <span className="text-text-primary font-medium">Academic Period</span>
      <Badge variant="outline">{period?.label ?? "Selected period"}</Badge>
      {period?.status === "COMPLETED" && <Badge variant="secondary">Archived view</Badge>}
    </div>
  );
}

function Pagination({
  data,
  periodId,
  assignmentId,
  query,
}: {
  data: DeanRosterData;
  periodId: string;
  assignmentId: string;
  query?: string;
}) {
  if (data.totalPages <= 1) return null;
  const href = (page: number) => {
    const params = new URLSearchParams({
      period: periodId,
      assignment: assignmentId,
      page: String(page),
    });
    if (query) params.set("query", query);
    return `/dean/college-oversight/enrollments/roster?${params}`;
  };
  return (
    <nav aria-label="Roster pages" className="flex flex-wrap items-center justify-between gap-3">
      {data.page > 1 ? (
        <Link
          href={href(data.page - 1)}
          className="text-primary focus-visible:ring-ring inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
        >
          <ChevronLeft aria-hidden="true" /> Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-text-secondary text-sm">
        Page {data.page} of {data.totalPages}
      </span>
      {data.page < data.totalPages ? (
        <Link
          href={href(data.page + 1)}
          className="text-primary focus-visible:ring-ring inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
        >
          Next <ChevronRight aria-hidden="true" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

function EmptyRoster({ heading, message }: { heading: string; message: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-lg">Class Roster</h1>
        <p className="text-body-md text-text-secondary">Explicit, read-only roster drill-down.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{heading}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/dean/college-oversight/enrollments"
            className="text-primary focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
          >
            Return to Enrollments
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

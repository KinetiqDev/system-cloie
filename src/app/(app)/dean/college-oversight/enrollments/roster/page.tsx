import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  DeanPeriodSummary,
  DeanReadState,
  DeanRosterData,
} from "@/features/dean/services/read-dean-oversight";
import { DeanRosterLoading } from "@/features/dean/components/dean-oversight-loading";
import {
  DeanReadModelNotFoundError,
  getDeanRosterPage,
  getDeanRoster,
  listDeanEligiblePeriods,
} from "@/features/dean/services/read-dean-oversight";
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
  const periods: DeanPeriodSummary[] = await listDeanEligiblePeriods();
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

  let pageResult: DeanReadState<{ page: number }>;
  try {
    pageResult = await getDeanRosterPage({ periodId: period, assignmentId: assignment, query, page });
  } catch (error) {
    if (error instanceof DeanReadModelNotFoundError) notFound();
    throw error;
  }
  if (pageResult.state === "no-eligible-period") {
    return (
      <EmptyRoster
        heading="No eligible Academic Period"
        message="No active or completed Academic Period is available for roster oversight."
      />
    );
  }
  if (pageResult.data.page !== page) {
    const canonicalQuery = new URLSearchParams({
      period,
      assignment,
      page: String(pageResult.data.page),
    });
    if (query) canonicalQuery.set("query", query);
    redirect(`/dean/college-oversight/enrollments/roster?${canonicalQuery}`);
  }
  const rosterPromise = getDeanRoster({ periodId: period, assignmentId: assignment, query, page });
  void rosterPromise.catch(() => undefined);
  const selectedPeriod = periods.find((item) => item.id === period);
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
      <PeriodSummary periods={periods} selectedPeriodId={period} />
      {selectedPeriod?.status === "COMPLETED" && (
        <span className="sr-only">Archived roster view</span>
      )}
      <RosterSearchForm period={period} assignment={assignment} query={query} />
      <Suspense fallback={<DeanRosterLoading />}>
        <RosterDetails
          rosterPromise={rosterPromise}
          period={period}
          assignment={assignment}
          query={query}
          page={page}
        />
      </Suspense>
    </div>
  );
}

export async function RosterDetails({
  rosterPromise,
  period,
  assignment,
  query,
  page,
}: {
  rosterPromise: ReturnType<typeof getDeanRoster>;
  period: string;
  assignment: string;
  query?: string;
  page: number;
}) {
  let result: DeanReadState<DeanRosterData>;
  try {
    result = await rosterPromise;
  } catch (error) {
    if (error instanceof DeanReadModelNotFoundError) notFound();
    throw error;
  }
  if (result.state === "no-eligible-period") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No eligible Academic Period</CardTitle>
          <CardDescription>
            No active or completed Academic Period is available for roster oversight.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { data } = result;
  if (data.page !== page) {
    const canonicalQuery = new URLSearchParams({
      period,
      assignment,
      page: String(data.page),
    });
    if (query) canonicalQuery.set("query", query);
    redirect(`/dean/college-oversight/enrollments/roster?${canonicalQuery}`);
  }
  return <RosterContent data={data} period={period} assignment={assignment} query={query} />;
}

export function RosterContent({
  data,
  period,
  assignment,
  query,
}: {
  data: DeanRosterData;
  period: string;
  assignment: string;
  query?: string;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline">{data.assignment.courseCode}</Badge>
        <span className="text-text-primary font-medium">{data.assignment.courseName}</span>
        <span className="text-text-secondary">
          {data.assignment.programName} · {data.assignment.yearLevel} · {data.assignment.section}
        </span>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Names</CardTitle>
          <CardDescription>
            {data.totalCount} {data.totalCount === 1 ? "name" : "names"} in selected class. Showing
            up to {data.pageSize} per page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
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
    </>
  );
}

function RosterSearchForm({
  period,
  assignment,
  query,
}: {
  period: string;
  assignment: string;
  query?: string;
}) {
  return (
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

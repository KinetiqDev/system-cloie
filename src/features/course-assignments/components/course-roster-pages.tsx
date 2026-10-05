// fallow-ignore-file code-duplication
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  LockKeyhole,
  SearchX,
  TriangleAlert,
  UsersRound,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BackLink } from "@/components/ui/back-link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ViewSelector } from "@/components/layout/view-selector";
import type { TermInstanceItem } from "@/features/academic-calendar/types";
import { getPlacementLabel, getSectionLabel, getYearLevelDisplay } from "@/lib/constants/academic";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime, formatTermInstanceLabel } from "@/lib/utils/date-format";

import {
  COURSE_ROSTER_PATH,
  courseRosterListPath,
  DEFAULT_COURSE_ROSTER_FILTERS,
  type CourseRosterDiscoveryData,
  type CourseRosterFilterState,
  type CourseRosterViewMode,
} from "../course-roster-list-state";
import { COURSE_ROSTER_MAX_ROWS } from "../services/course-roster-csv";
import type {
  CourseRosterAssignmentSummary,
  CourseRosterDetail,
  CourseRosterMember,
  FacultyRosterCourseOption,
  FacultyRosterProgramOption,
  RosterEligibilityReason,
  RosterState,
} from "../types";
import {
  RemoveRosterMember,
  RosterManagementDialog,
  RestoreRosterMember,
} from "./course-roster-management";
import { CourseRosterRetry } from "./course-roster-retry";
import { CourseRosterDiscoveryFilters, CourseRosterMemberFilters } from "./course-roster-filters";
import { ResultSummaryStrip } from "./shared/result-summary-strip";

const eligibilityLabels: Record<RosterEligibilityReason, string> = {
  UNKNOWN_ACCOUNT: "Unknown account",
  NON_STUDENT_ACCOUNT: "Not a Student account",
  ACCOUNT_INACTIVE: "Account inactive",
  PROFILE_INCOMPLETE: "Profile incomplete",
  NO_ACTIVE_TERM_PLACEMENT: "No active term placement",
  PROGRAM_MISMATCH: "Program mismatch",
};

const rosterStateLabels: Record<Exclude<RosterState, "ACTIVE">, string> = {
  INACTIVE_ASSIGNMENT: "Inactive assignment",
  INACTIVE_ACADEMIC_PERIOD: "Inactive academic period",
};

/**
 * An active roster is the expected case, so it never earns a filled chip; only
 * the two read-only states are worth interrupting the scan for.
 */
function RosterStateBadge({ state }: { state: RosterState }) {
  if (state === "ACTIVE") return null;
  return <Badge variant="outline">{rosterStateLabels[state]}</Badge>;
}

function RosterStateBanner({ state }: { state: RosterState }) {
  if (state === "ACTIVE") return null;

  const copy = {
    INACTIVE_ASSIGNMENT:
      "This Course assignment is inactive. The roster is available for review only.",
    INACTIVE_ACADEMIC_PERIOD:
      "This Academic Period is no longer active. The roster is available for review only.",
  }[state];

  return (
    <Alert aria-live="polite">
      <LockKeyhole aria-hidden="true" />
      <AlertTitle>{rosterStateLabels[state]}</AlertTitle>
      <AlertDescription>{copy}</AlertDescription>
    </Alert>
  );
}

function RosterEvidenceStrip({
  activeRosterCount,
  evaluationEligibleCount,
  attentionCount,
}: {
  activeRosterCount: number;
  evaluationEligibleCount: number;
  attentionCount: number;
}) {
  const counts = [
    { label: "On roster", value: activeRosterCount, detail: "active members" },
    {
      label: "Ready for evaluation",
      value: evaluationEligibleCount,
      detail: "eligible this period",
    },
    {
      label: "Need attention",
      value: attentionCount,
      detail: attentionCount > 0 ? "active but not eligible" : "every active member is eligible",
    },
  ];

  return (
    <section
      aria-label="Roster evaluation-readiness summary"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {counts.map(({ label, value, detail }) => (
        <Card key={label} className="min-w-0">
          <CardHeader>
            <CardTitle className="text-title-sm">{label}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <p className="font-heading text-heading-xl text-foreground tabular-nums">{value}</p>
            <CardDescription>{detail}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

/** The scope label the summary strip and empty states name in prose. */
function periodScopeLabel(
  filters: CourseRosterFilterState,
  termInstances: TermInstanceItem[]
): string {
  const { period } = filters;
  if (period.mode === "all") return "All Academic Periods";
  if (period.mode === "current") return "Active assignments";
  const selected = termInstances.find((instance) => instance.id === period.termInstanceId);
  return selected
    ? formatTermInstanceLabel(selected.schoolYearCode, selected.semester, selected.term)
    : "Selected Academic Period";
}

export function CourseRosterDiscoveryPage({
  data,
  error,
  view,
  filters,
  termInstances,
  courses,
  programs,
}: {
  data: CourseRosterDiscoveryData | null;
  error?: string;
  view: CourseRosterViewMode;
  filters: CourseRosterFilterState;
  termInstances: TermInstanceItem[];
  courses: FacultyRosterCourseOption[];
  programs: FacultyRosterProgramOption[];
}) {
  // View is purely presentational: toggling never changes the server query,
  // so it stays local state and syncs the URL without a server round trip.
  const [activeView, setActiveView] = useState<CourseRosterViewMode>(view);
  const [lastServerView, setLastServerView] = useState<CourseRosterViewMode>(view);

  // Server-driven view changes (deep links, back/forward) stay authoritative.
  if (lastServerView !== view) {
    setLastServerView(view);
    setActiveView(view);
  }

  return (
    <CourseRosterDiscoveryBody
      data={data}
      error={error}
      view={activeView}
      onViewChange={setActiveView}
      filters={filters}
      termInstances={termInstances}
      courses={courses}
      programs={programs}
    />
  );
}

function CourseRosterDiscoveryBody({
  data,
  error,
  view,
  onViewChange,
  filters,
  termInstances,
  courses,
  programs,
}: {
  data: CourseRosterDiscoveryData | null;
  error?: string;
  view: CourseRosterViewMode;
  onViewChange: (view: CourseRosterViewMode) => void;
  filters: CourseRosterFilterState;
  termInstances: TermInstanceItem[];
  courses: FacultyRosterCourseOption[];
  programs: FacultyRosterProgramOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (nextFilters: CourseRosterFilterState, nextView = view, nextPage = 1) => {
      startTransition(() => {
        router.replace(
          courseRosterListPath(COURSE_ROSTER_PATH, {
            page: nextPage,
            view: nextView,
            filters: nextFilters,
          })
        );
      });
    },
    [router, view]
  );

  if (!data) {
    return (
      <CourseRosterDiscoveryError message={error ?? "The roster request could not be completed."} />
    );
  }

  // The switch stays local; only the URL records it, so no server read is
  // spent re-rendering an unchanged list.
  const selectView = (nextView: CourseRosterViewMode) => {
    if (nextView === view) return;
    onViewChange(nextView);
    window.history.replaceState(
      null,
      "",
      courseRosterListPath(COURSE_ROSTER_PATH, { page: data.page + 1, view: nextView, filters })
    );
  };

  const activeCount = data.items.filter((assignment) => assignment.rosterState === "ACTIVE").length;
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-xl text-balance">My Course Rosters</h1>
        <p className="text-body-md text-muted-foreground max-w-2xl text-pretty">
          Review and manage the active Course assignments you own. Inactive assignments and
          completed Academic Periods remain review-only.
        </p>
      </div>

      <CourseRosterDiscoveryFilters
        filters={filters}
        termInstances={termInstances}
        courses={courses}
        programs={programs}
        pending={isPending}
        onNavigate={navigate}
      />

      <ResultSummaryStrip
        noun="roster"
        total={data.total}
        activeCount={activeCount}
        page={data.page}
        pageSize={data.pageSize}
        scopeLabel={periodScopeLabel(filters, termInstances)}
      />

      <section aria-labelledby="course-roster-results" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="course-roster-results" className="text-heading-lg">
            Course assignments
          </h2>
          <ViewSelector label="Rosters" value={view} onValueChange={selectView} />
        </div>
        {isPending ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm" aria-live="polite">
            <Spinner size="sm" label="Updating results" />
            Updating results
          </p>
        ) : null}
        {data.items.length === 0 ? (
          <CourseRosterDiscoveryEmptyState
            total={data.total}
            search={data.search}
            filters={filters}
            view={view}
            activePeriodId={data.activePeriodId}
          />
        ) : view === "card" ? (
          <CourseRosterCardGrid assignments={data.items} />
        ) : (
          <CourseRosterList assignments={data.items} />
        )}
      </section>

      {totalPages > 1 && (
        <Pagination
          currentPage={data.page + 1}
          totalPages={totalPages}
          onPageChange={(nextPage) => navigate(filters, view, nextPage)}
        />
      )}
    </div>
  );
}

function CourseRosterList({ assignments }: { assignments: CourseRosterAssignmentSummary[] }) {
  return (
    <Table
      aria-label="Course assignments"
      data-view="list"
      className="min-w-[60rem]"
      containerClassName="bg-card rounded-lg border"
    >
      <caption className="sr-only">
        Course assignments you own, with roster size and evaluation readiness
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead>Course</TableHead>
          <TableHead>Program</TableHead>
          <TableHead>Class</TableHead>
          <TableHead>Academic Period</TableHead>
          <TableHead>Roster</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((assignment) => (
          <TableRow key={assignment.assignmentId}>
            <DiscoveryTableCell>
              <span className="block font-medium">{assignment.courseCode}</span>
              <span className="text-muted-foreground block">{assignment.courseTitle}</span>
            </DiscoveryTableCell>
            <DiscoveryTableCell>
              <span className="block">{assignment.programCode}</span>
              <span className="text-muted-foreground block">{assignment.programName}</span>
            </DiscoveryTableCell>
            <DiscoveryTableCell>
              {getPlacementLabel({
                yearLevel: assignment.yearLevel,
                section: assignment.section,
              })}
            </DiscoveryTableCell>
            <DiscoveryTableCell>
              <span className="block">{assignment.termLabel}</span>
              <RosterStateBadge state={assignment.rosterState} />
            </DiscoveryTableCell>
            <DiscoveryTableCell>
              <RosterCounts assignment={assignment} />
            </DiscoveryTableCell>
            <DiscoveryTableCell>
              <Link
                href={`/course-rosters/${assignment.assignmentId}`}
                className={cn(buttonVariants({ variant: "default", size: "sm" }))}
              >
                Open roster
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </DiscoveryTableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Roster size and evaluation readiness in one cell. A shortfall is the only
 * thing worth a chip, so the common fully-eligible row stays quiet.
 */
function RosterCounts({ assignment }: { assignment: CourseRosterAssignmentSummary }) {
  const attention = assignment.activeRosterCount - assignment.evaluationEligibleCount;
  return (
    <span className="flex flex-col gap-1 whitespace-nowrap">
      <span className="tabular-nums">
        <span className="font-medium">{assignment.activeRosterCount}</span> on roster
        {attention > 0 ? (
          <Badge variant="warning" className="ml-2 align-middle">
            <TriangleAlert aria-hidden="true" />
            {attention} need{attention === 1 ? "s" : ""} attention
          </Badge>
        ) : null}
      </span>
      <span className="text-muted-foreground block text-sm tabular-nums">
        {assignment.evaluationEligibleCount} eligible for evaluation
      </span>
    </span>
  );
}

function DiscoveryTableCell({
  numeric = false,
  children,
}: {
  numeric?: boolean;
  children: React.ReactNode;
}) {
  return (
    <TableCell className={cn("px-3 py-4 whitespace-normal", numeric && "text-right tabular-nums")}>
      {children}
    </TableCell>
  );
}

function CourseRosterCardGrid({ assignments }: { assignments: CourseRosterAssignmentSummary[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-view="card">
      {assignments.map((assignment) => (
        <Card key={assignment.assignmentId} className="h-full">
          <CardHeader>
            <CardTitle>{assignment.courseCode}</CardTitle>
            <CardDescription>{assignment.courseTitle}</CardDescription>
            <CardAction>
              <RosterStateBadge state={assignment.rosterState} />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              <DiscoveryFact label="Program">
                {assignment.programCode} — {assignment.programName}
              </DiscoveryFact>
              <DiscoveryFact label="Class">
                {getPlacementLabel({
                  yearLevel: assignment.yearLevel,
                  section: assignment.section,
                })}
              </DiscoveryFact>
              <DiscoveryFact label="Academic Period">{assignment.termLabel}</DiscoveryFact>
            </dl>
            <div className="bg-muted/40 rounded-lg p-3">
              <RosterCounts assignment={assignment} />
            </div>
          </CardContent>
          <CardFooter>
            <Link
              href={`/course-rosters/${assignment.assignmentId}`}
              className={cn(buttonVariants({ variant: "default" }), "w-full")}
            >
              Open roster
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function DiscoveryFact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-muted-foreground font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

function CourseRosterDiscoveryEmptyState({
  total,
  search,
  filters,
  view,
  activePeriodId,
}: {
  total: number;
  search: string;
  filters: CourseRosterFilterState;
  view: CourseRosterViewMode;
  activePeriodId: string | null;
}) {
  const clearHref = courseRosterListPath(COURSE_ROSTER_PATH, {
    page: 1,
    view,
    filters: { ...filters, search: "" },
  });

  if (search) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No Course rosters match your search</EmptyTitle>
          <EmptyDescription>
            No Course assignments match &quot;{search}&quot; in the selected scope.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href={clearHref} className={buttonVariants({ variant: "outline" })}>
            Clear search
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  if (total === 0 && filters.period.mode === "current" && !activePeriodId) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersRound aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No active Academic Period</EmptyTitle>
          <EmptyDescription>
            There is no active Academic Period, so no active Course assignments can be listed.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (filters.period.mode === "current") {
    const allHref = courseRosterListPath(COURSE_ROSTER_PATH, {
      page: 1,
      view,
      filters: { ...filters, period: { mode: "all" } },
    });
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersRound aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No active course rosters</EmptyTitle>
          <EmptyDescription>
            You have no active Course assignments in the current Academic Period. Widen the Academic
            Period filter to review inactive or completed assignments.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href={allHref} className={buttonVariants({ variant: "outline" })}>
            Show all Academic Periods
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UsersRound aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No course rosters in this scope</EmptyTitle>
        <EmptyDescription>
          No Course assignments match the current Academic Period and filters.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link
          href={courseRosterListPath(COURSE_ROSTER_PATH, {
            page: 1,
            view,
            filters: DEFAULT_COURSE_ROSTER_FILTERS,
          })}
          className={buttonVariants({ variant: "outline" })}
        >
          Reset filters
        </Link>
      </EmptyContent>
    </Empty>
  );
}

function CourseRosterDiscoveryError({ message }: { message: string }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>Unable to load Course rosters</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <span>{message}</span>
        <CourseRosterRetry />
      </AlertDescription>
    </Alert>
  );
}

export function CourseRosterDetailPage({
  data,
  error,
  backHref = COURSE_ROSTER_PATH,
  backLabel = "Back to My Course Rosters",
  rosterBasePath,
  programId,
}: {
  data: CourseRosterDetail | null;
  error?: string;
  backHref?: string;
  backLabel?: string;
  rosterBasePath?: string;
  programId?: string;
}) {
  if (!data)
    return <SafeRosterError message={error ?? "The roster request could not be completed."} />;
  const { assignment } = data;
  const canWrite = data.canManage && data.canMutate && assignment.rosterState === "ACTIVE";
  const attentionCount = Math.max(0, data.activeRosterCount - data.evaluationEligibleCount);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackLink href={backHref}>{backLabel}</BackLink>
        <p className="text-label-md text-muted-foreground font-medium tracking-wide uppercase">
          Course roster
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-heading-xl tracking-tight text-balance">
            {assignment.courseCode} · {assignment.courseTitle}
          </h1>
          <RosterStateBadge state={assignment.rosterState} />
        </div>
        <p className="text-body-md text-muted-foreground max-w-3xl text-pretty">
          {[
            assignment.programName,
            getYearLevelDisplay(assignment.yearLevel),
            getSectionLabel(assignment.section),
            assignment.termLabel,
          ].join(" · ")}
        </p>
      </div>

      <RosterStateBanner state={assignment.rosterState} />
      <RosterEvidenceStrip
        activeRosterCount={data.activeRosterCount}
        evaluationEligibleCount={data.evaluationEligibleCount}
        attentionCount={attentionCount}
      />

      {canWrite && (
        <Card>
          <CardHeader className="has-data-[slot=card-action]:grid-cols-1 sm:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
            <CardTitle>Manage roster</CardTitle>
            <CardDescription>
              Add one Student, or upload up to {COURSE_ROSTER_MAX_ROWS} official names from a CSV.
              {assignment.hasPublishedEvaluation
                ? " Eligible students added while the evaluation is open receive it automatically."
                : " Review parsed rows before anyone is added."}
            </CardDescription>
            <CardAction className="col-start-1 row-start-auto mt-2 w-full justify-self-stretch sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:w-auto sm:justify-self-end">
              <RosterManagementDialog
                assignment={assignment}
                assignmentId={assignment.assignmentId}
                programId={programId}
              />
            </CardAction>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Roster members</CardTitle>
          <CardDescription>
            {data.totalMembers} {data.totalMembers === 1 ? "member" : "members"} in this view.
            Active roster and evaluation-eligible counts exclude removed history.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <CourseRosterMemberFilters
            initialSearch={data.search}
            initialRemoved={data.includeRemoved}
            sortDirection={data.sortDirection}
            assignmentId={assignment.assignmentId}
            rosterBasePath={rosterBasePath}
          />
          <RosterTable
            members={data.members}
            includeRemoved={data.includeRemoved}
            assignment={assignment}
            search={data.search}
            rosterBasePath={rosterBasePath}
            sortDirection={data.sortDirection}
            canWrite={canWrite}
            hasPublishedEvaluation={assignment.hasPublishedEvaluation}
            programId={programId}
          />
          <DetailPagination
            data={data}
            assignmentId={assignment.assignmentId}
            rosterBasePath={rosterBasePath}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function memberStatus(member: CourseRosterMember) {
  if (!member.isActive) {
    return <Badge variant="outline">Removed</Badge>;
  }
  if (member.eligibility.eligible) {
    return (
      <Badge variant="success">
        <CheckCircle2 aria-hidden="true" /> Ready
      </Badge>
    );
  }
  return (
    <Badge variant="warning">
      <TriangleAlert aria-hidden="true" />{" "}
      {member.eligibility.reason ? eligibilityLabels[member.eligibility.reason] : "Not eligible"}
    </Badge>
  );
}

function RosterTable({
  members,
  includeRemoved,
  assignment,
  sortDirection,
  search,
  rosterBasePath,
  canWrite,
  hasPublishedEvaluation,
  programId,
}: {
  members: CourseRosterMember[];
  includeRemoved: boolean;
  assignment: CourseRosterAssignmentSummary;
  sortDirection: "asc" | "desc";
  search: string;
  rosterBasePath?: string;
  canWrite: boolean;
  hasPublishedEvaluation: boolean;
  programId?: string;
}) {
  const router = useRouter();
  const [isSortPending, startSortTransition] = useTransition();

  // Sort is owned by the URL, so the header always shows the applied direction.
  const nextSort = sortDirection === "asc" ? "desc" : "asc";
  const basePath = `${rosterBasePath ?? "/course-rosters"}/${assignment.assignmentId}`;

  const memberHref = (sort: string) => {
    const next = new URLSearchParams();
    if (search) next.set("search", search);
    if (includeRemoved) next.set("removed", "1");
    next.set("sort", sort);
    return `${basePath}?${next.toString()}`;
  };

  const handleSortToggle = () => {
    startSortTransition(() => router.replace(memberHref(nextSort)));
  };

  if (members.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
        <p>
          No students match{search ? ` “${search}”` : " this view"}.{" "}
          {includeRemoved ? "Removed students are included." : "Removed students are hidden."}
        </p>
        {(search || includeRemoved) && (
          <Link
            href={`${basePath}?${new URLSearchParams({ sort: sortDirection })}`}
            className={cn(buttonVariants({ variant: "outline" }), "mt-4")}
          >
            Clear filters
          </Link>
        )}
      </div>
    );
  }

  const showRemovedHistory = includeRemoved && members.some((member) => !member.isActive);

  return (
    <Table
      aria-label="Course roster members"
      containerClassName="relative min-w-0 rounded-lg border"
      className="min-w-[48rem]"
    >
      <caption className="sr-only">Course roster members and current eligibility</caption>
      <TableHeader className="bg-muted/40">
        <TableRow>
          <TableHead aria-sort={sortDirection === "asc" ? "ascending" : "descending"}>
            <button
              type="button"
              onClick={handleSortToggle}
              aria-label={`Sort by student name, currently ${sortDirection === "asc" ? "ascending" : "descending"}`}
              aria-busy={isSortPending || undefined}
              className="focus-visible:ring-ring inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 font-semibold focus-visible:ring-3 focus-visible:outline-none"
            >
              Student
              {sortDirection === "asc" ? (
                <ArrowUp aria-hidden="true" className="size-4" />
              ) : (
                <ArrowDown aria-hidden="true" className="size-4" />
              )}
            </button>
          </TableHead>
          {assignment.courseScope === "GENERAL_EDUCATION" && <TableHead>Program</TableHead>}
          <TableHead>Status</TableHead>
          <TableHead>Added</TableHead>
          {showRemovedHistory && <TableHead>Removal history</TableHead>}
          {canWrite && (
            <TableHead className="text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <RosterMemberRow
            key={member.membershipId}
            member={member}
            assignment={assignment}
            showRemovedHistory={showRemovedHistory}
            canWrite={canWrite}
            hasPublishedEvaluation={hasPublishedEvaluation}
            programId={programId}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function RosterMemberRow({
  member,
  assignment,
  showRemovedHistory,
  canWrite,
  hasPublishedEvaluation,
  programId,
}: {
  member: CourseRosterMember;
  assignment: CourseRosterAssignmentSummary;
  showRemovedHistory: boolean;
  canWrite: boolean;
  hasPublishedEvaluation: boolean;
  programId?: string;
}) {
  return (
    <TableRow>
      <TableHead scope="row" className="px-4 py-4 font-medium whitespace-normal">
        <span className="block">{member.studentName}</span>
        <span className="text-muted-foreground block font-normal">{member.email}</span>
      </TableHead>
      {assignment.courseScope === "GENERAL_EDUCATION" && (
        <TableCell className="px-4 py-4 whitespace-normal">{member.programCode ?? "—"}</TableCell>
      )}
      <TableCell className="px-4 py-4 whitespace-normal">{memberStatus(member)}</TableCell>
      <TableCell className="text-muted-foreground px-4 py-4 whitespace-nowrap">
        {member.membershipAddedAt ? formatDate(member.membershipAddedAt) : "Not recorded"}
      </TableCell>
      {showRemovedHistory && (
        <TableCell className="text-muted-foreground px-4 py-4 text-xs whitespace-nowrap">
          <RosterRemovalHistory member={member} />
        </TableCell>
      )}
      {canWrite && (
        <TableCell className="px-4 py-4 text-right">
          {member.isActive ? (
            <RemoveRosterMember
              assignment={assignment}
              member={member}
              hasPublishedEvaluation={hasPublishedEvaluation}
              programId={programId}
            />
          ) : (
            <RestoreRosterMember
              assignmentId={assignment.assignmentId}
              member={member}
              programId={programId}
            />
          )}
        </TableCell>
      )}
    </TableRow>
  );
}

function RosterRemovalHistory({ member }: { member: CourseRosterMember }) {
  if (member.isActive) return "—";
  return (
    <span className="flex flex-col gap-1">
      <span>{member.removedAt ? formatDateTime(member.removedAt) : "Not recorded"}</span>
      <span>By {member.removedByName ?? "Recorded actor"}</span>
    </span>
  );
}

function DetailPagination({
  data,
  assignmentId,
  rosterBasePath,
}: {
  data: CourseRosterDetail;
  assignmentId: string;
  rosterBasePath?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  if (data.totalPages <= 1) return null;

  const href = (page: number) => {
    const params = new URLSearchParams({ page: String(page), sort: data.sortDirection });
    if (data.search) params.set("search", data.search);
    if (data.includeRemoved) params.set("removed", "1");
    return `${rosterBasePath ?? "/course-rosters"}/${assignmentId}?${params.toString()}`;
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {isPending ? <Spinner size="sm" label="Loading roster members" /> : null}
      <Pagination
        currentPage={data.page}
        totalPages={data.totalPages}
        onPageChange={(page) => startTransition(() => router.push(href(page)))}
      />
    </div>
  );
}

function SafeRosterError({ message }: { message: string }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>Unable to load roster</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useState, useTransition } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  History,
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

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";

import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSectionLabel, getYearLevelDisplay } from "@/lib/constants/academic";
import { cn } from "@/lib/utils";
import { COURSE_ROSTER_MAX_ROWS } from "../services/course-roster-csv";
import type {
  CourseRosterAssignmentSummary,
  CourseRosterDetail,
  CourseRosterDiscoveryResult,
  CourseRosterMember,
  RosterEligibilityReason,
  RosterState,
} from "../types";
import {
  RemoveRosterMember,
  RosterManagementDialog,
  RestoreRosterMember,
} from "./course-roster-management";
import { CourseRosterRetry } from "./course-roster-retry";
import { CourseRosterViewSelector, type CourseRosterViewMode } from "./course-roster-view-selector";
import { CourseRosterDiscoveryFilters, CourseRosterMemberFilters } from "./course-roster-filters";

const eligibilityLabels: Record<RosterEligibilityReason, string> = {
  UNKNOWN_ACCOUNT: "Unknown account",
  NON_STUDENT_ACCOUNT: "Not a Student account",
  ACCOUNT_INACTIVE: "Account inactive",
  PROFILE_INCOMPLETE: "Profile incomplete",
  NO_ACTIVE_TERM_PLACEMENT: "No active term placement",
  PROGRAM_MISMATCH: "Program mismatch",
};

const rosterStateLabels: Record<RosterState, string> = {
  ACTIVE: "Open roster",
  INACTIVE_ASSIGNMENT: "Inactive assignment",
  INACTIVE_ACADEMIC_PERIOD: "Inactive academic period",
};

function stateVariant(state: RosterState): "default" | "outline" {
  return state === "ACTIVE" ? "default" : "outline";
}

function dateLabel(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(value)
    : "Not recorded";
}

function removedLabel(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(value)
    : "Not recorded";
}

function RosterStateBadge({ state }: { state: RosterState }) {
  return <Badge variant={stateVariant(state)}>{rosterStateLabels[state]}</Badge>;
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
  const cells = [
    {
      key: "roster",
      icon: <UsersRound aria-hidden="true" className="size-4" />,
      iconClass: "bg-selected-bg text-selected-fg",
      label: "On roster",
      value: activeRosterCount,
      detail: "active members",
    },
    {
      key: "ready",
      icon: <CheckCircle2 aria-hidden="true" className="size-4" />,
      iconClass: "bg-success-soft text-success",
      label: "Ready for evaluation",
      value: evaluationEligibleCount,
      detail: "eligible this period",
    },
    {
      key: "attention",
      icon:
        attentionCount > 0 ? (
          <TriangleAlert aria-hidden="true" className="size-4" />
        ) : (
          <CheckCircle2 aria-hidden="true" className="size-4" />
        ),
      iconClass:
        attentionCount > 0 ? "bg-warning-soft text-warning" : "bg-success-soft text-success",
      label: "Need attention",
      value: attentionCount,
      detail: attentionCount > 0 ? "active but not eligible" : "every active member is eligible",
    },
  ];

  return (
    <section
      aria-label="Roster evaluation-readiness summary"
      className="bg-card flex flex-wrap items-stretch gap-4 rounded-xl border p-4"
    >
      {cells.map((cell, index) => (
        <Fragment key={cell.key}>
          {index > 0 && (
            <div aria-hidden="true" className="bg-border hidden w-px self-stretch sm:block" />
          )}
          <div className="flex min-w-[10rem] flex-1 flex-col gap-2">
            <p className="text-label-md text-muted-foreground flex items-center gap-2 font-medium">
              <span
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-full",
                  cell.iconClass
                )}
              >
                {cell.icon}
              </span>
              {cell.label}
            </p>
            <p>
              <span className="text-heading-lg tabular-nums">{cell.value}</span>{" "}
              <span className="text-body-sm text-muted-foreground">{cell.detail}</span>
            </p>
          </div>
        </Fragment>
      ))}
    </section>
  );
}

export function CourseRosterDiscoveryPage({
  data,
  error,
  view,
}: {
  data: CourseRosterDiscoveryResult | null;
  error?: string;
  view: CourseRosterViewMode;
}) {
  const router = useRouter();
  // View is purely presentational: toggling never changes the server query,
  // so it stays local state and syncs the URL without a server round trip.
  const [activeView, setActiveView] = useState<CourseRosterViewMode>(view);
  const [lastServerView, setLastServerView] = useState<CourseRosterViewMode>(view);

  // Server-driven view changes (deep links, back/forward) stay authoritative.
  if (lastServerView !== view) {
    setLastServerView(view);
    setActiveView(view);
  }
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (search: string, includeHistory: boolean) => {
      const url = discoveryUrl({ search, includeHistory, view: activeView });
      startTransition(() => router.replace(url));
    },
    [activeView, router]
  );

  if (!data) {
    return (
      <CourseRosterDiscoveryError message={error ?? "The roster request could not be completed."} />
    );
  }

  const selectView = (nextView: CourseRosterViewMode) => {
    if (nextView === activeView) return;
    setActiveView(nextView);
    window.history.replaceState(
      null,
      "",
      discoveryUrl({
        search: data.search,
        includeHistory: data.includeHistory,
        view: nextView,
      })
    );
  };

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-lg">My Course Rosters</h1>
        <p className="text-body-md text-muted-foreground max-w-2xl">
          Review and manage active Course assignments you own. Inactive assignments and completed
          Academic Periods remain review-only.
        </p>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Find a Course roster</CardTitle>
          <CardDescription>
            Search current assignments or include history to review inactive and completed Course
            assignments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CourseRosterDiscoveryFilters
            initialSearch={data.search}
            initialHistory={data.includeHistory}
            onNavigate={navigate}
            pending={isPending}
          />
        </CardContent>
      </Card>

      <section aria-labelledby="course-roster-results" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="course-roster-results" className="text-heading-md">
              Course assignments
            </h2>
            <p className="text-muted-foreground flex items-center gap-2 text-sm" aria-live="polite">
              {isPending ? <Spinner size="sm" label="Updating results" /> : null}
              {data.total} {data.total === 1 ? "assignment" : "assignments"} found
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data.includeHistory && <Badge variant="secondary">History included</Badge>}
            <CourseRosterViewSelector value={activeView} onValueChange={selectView} />
          </div>
        </div>
        {data.items.length === 0 ? (
          <CourseRosterDiscoveryEmptyState data={data} view={activeView} />
        ) : activeView === "card" ? (
          <CourseRosterCardGrid assignments={data.items} />
        ) : (
          <CourseRosterList assignments={data.items} />
        )}
      </section>

      <DiscoveryPagination
        page={data.page + 1}
        totalPages={totalPages}
        search={data.search}
        includeHistory={data.includeHistory}
        view={activeView}
      />
    </div>
  );
}

function CourseRosterList({ assignments }: { assignments: CourseRosterAssignmentSummary[] }) {
  return (
    <div className="bg-card overflow-x-auto rounded-lg border" data-view="list">
      <table aria-label="Course assignments" className="w-full min-w-[72rem] text-left text-sm">
        <TableHeader>
          <TableRow>
            <TableHead>Course</TableHead>
            <TableHead>Program</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Academic Period</TableHead>
            <TableHead className="text-right">Active roster</TableHead>
            <TableHead className="text-right">Evaluation-eligible</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((assignment) => (
            <TableRow key={assignment.assignmentId} className="hover:bg-muted/30">
              <DiscoveryTableCell>
                <span className="block font-medium">{assignment.courseCode}</span>
                <span className="text-muted-foreground block">{assignment.courseTitle}</span>
              </DiscoveryTableCell>
              <DiscoveryTableCell>
                <span className="block">{assignment.programName}</span>
                <span className="text-muted-foreground block">{assignment.programCode}</span>
              </DiscoveryTableCell>
              <DiscoveryTableCell>
                {getYearLevelDisplay(assignment.yearLevel)} | {getSectionLabel(assignment.section)}
              </DiscoveryTableCell>
              <DiscoveryTableCell>
                <span className="block">{assignment.termLabel}</span>
                <span className="text-muted-foreground block">{assignment.periodStatus}</span>
              </DiscoveryTableCell>
              <DiscoveryTableCell numeric>{assignment.activeRosterCount}</DiscoveryTableCell>
              <DiscoveryTableCell numeric>{assignment.evaluationEligibleCount}</DiscoveryTableCell>
              <DiscoveryTableCell>
                <RosterStateBadge state={assignment.rosterState} />
              </DiscoveryTableCell>
              <DiscoveryTableCell>
                <Link
                  href={`/course-rosters/${assignment.assignmentId}`}
                  className={cn(buttonVariants(), "w-full md:w-auto")}
                >
                  Open roster
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </DiscoveryTableCell>
            </TableRow>
          ))}
        </TableBody>
      </table>
    </div>
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
                {assignment.programName} ({assignment.programCode})
              </DiscoveryFact>
              <DiscoveryFact label="Year level">
                {getYearLevelDisplay(assignment.yearLevel)}
              </DiscoveryFact>
              <DiscoveryFact label="Class section">
                {getSectionLabel(assignment.section)}
              </DiscoveryFact>
              <DiscoveryFact label="Academic Period">
                {assignment.termLabel}
                <span className="text-muted-foreground block">{assignment.periodStatus}</span>
              </DiscoveryFact>
            </dl>
            <dl className="bg-muted/40 grid grid-cols-2 gap-4 rounded-lg p-3">
              <DiscoveryCount label="Active roster" value={assignment.activeRosterCount} />
              <DiscoveryCount
                label="Evaluation-eligible"
                value={assignment.evaluationEligibleCount}
              />
            </dl>
          </CardContent>
          <CardFooter>
            <Link
              href={`/course-rosters/${assignment.assignmentId}`}
              className={cn(buttonVariants(), "w-full")}
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

function DiscoveryCount({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-title-md mt-1 font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function CourseRosterDiscoveryEmptyState({
  data,
  view,
}: {
  data: CourseRosterDiscoveryResult;
  view: CourseRosterViewMode;
}) {
  if (data.search) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No Course rosters match your search</EmptyTitle>
          <EmptyDescription>
            No Course assignments match &quot;{data.search}&quot; in the selected assignment scope.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link
            href={discoveryUrl({ view, includeHistory: data.includeHistory })}
            className={buttonVariants({ variant: "outline" })}
          >
            Clear filters
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  if (!data.includeHistory) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersRound aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No current Course rosters</EmptyTitle>
          <EmptyDescription>
            No current Course assignments are assigned to you. Include history to review inactive or
            completed assignments.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link
            href={discoveryUrl({ view, includeHistory: true })}
            className={buttonVariants({ variant: "outline" })}
          >
            <History data-icon="inline-start" aria-hidden="true" />
            Include assignment history
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
        <EmptyTitle>No Course rosters available</EmptyTitle>
        <EmptyDescription>
          No current or historical Course assignments are assigned to you.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function discoveryUrl({
  page,
  search = "",
  includeHistory = false,
  view,
}: {
  page?: number;
  search?: string;
  includeHistory?: boolean;
  view: CourseRosterViewMode;
}) {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (search) params.set("search", search);
  if (includeHistory) params.set("history", "1");
  if (view === "card") params.set("view", "card");
  const query = params.toString();
  return `/faculty/course-rosters${query ? `?${query}` : ""}`;
}

function DiscoveryPagination({
  page,
  totalPages,
  search,
  includeHistory,
  view,
}: {
  page: number;
  totalPages: number;
  search: string;
  includeHistory: boolean;
  view: CourseRosterViewMode;
}) {
  if (totalPages <= 1) return null;
  const href = (nextPage: number) => discoveryUrl({ page: nextPage, search, includeHistory, view });
  return (
    <nav
      aria-label="Course roster pages"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          className="focus-visible:ring-ring text-link inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
        >
          <ChevronLeft aria-hidden="true" /> Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground text-sm">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          className="focus-visible:ring-ring text-link inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
        >
          Next <ChevronRight aria-hidden="true" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
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
  backHref = "/faculty/course-rosters",
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
          <h1 className="text-heading-xl tracking-tight">
            {assignment.courseCode} · {assignment.courseTitle}
          </h1>
          <RosterStateBadge state={assignment.rosterState} />
        </div>
        <p className="text-body-md text-muted-foreground max-w-3xl">
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
  if (members.length === 0) {
    const basePath = `${rosterBasePath ?? "/course-rosters"}/${assignment.assignmentId}`;
    const params = new URLSearchParams({ sort: sortDirection });
    if (includeRemoved) params.set("removed", "1");
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
        <p>
          No students match{search ? ` “${search}”` : " this view"}.{" "}
          {includeRemoved ? "Removed students are included." : "Removed students are hidden."}
        </p>
        {(search || includeRemoved) && (
          <Link
            href={`${basePath}?${params}`}
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
    <div
      className="relative min-w-0 overflow-x-auto rounded-lg border"
      role="region"
      aria-label="Course roster members"
      tabIndex={0}
    >
      <table className="w-full min-w-[48rem] text-left text-sm">
        <caption className="sr-only">Course roster members and current eligibility</caption>
        <thead className="bg-muted/40 text-text-secondary border-b">
          <tr>
            <th
              scope="col"
              aria-sort={sortDirection === "asc" ? "ascending" : "descending"}
              className="text-label-md px-4 py-3 font-semibold"
            >
              Student
            </th>
            {assignment.courseScope === "GENERAL_EDUCATION" && (
              <th scope="col" className="text-label-md px-4 py-3 font-semibold">
                Program
              </th>
            )}
            <th scope="col" className="text-label-md px-4 py-3 font-semibold">
              Status
            </th>
            <th scope="col" className="text-label-md px-4 py-3 font-semibold">
              Added
            </th>
            {showRemovedHistory && (
              <th scope="col" className="text-label-md px-4 py-3 font-semibold">
                Removal history
              </th>
            )}
            {canWrite && (
              <th scope="col" className="text-label-md px-4 py-3 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
          {members.map((member) => (
            <tr key={member.membershipId} className="hover:bg-muted/30">
              <th scope="row" className="px-4 py-4 font-medium">
                <span className="block">{member.studentName}</span>
                <span className="text-muted-foreground block font-normal">{member.email}</span>
              </th>
              {assignment.courseScope === "GENERAL_EDUCATION" && (
                <td className="px-4 py-4">{member.programCode ?? "—"}</td>
              )}
              <td className="px-4 py-4">{memberStatus(member)}</td>
              <td className="text-muted-foreground px-4 py-4 whitespace-nowrap">
                {dateLabel(member.membershipAddedAt)}
              </td>
              {showRemovedHistory && (
                <td className="text-muted-foreground px-4 py-4 text-xs whitespace-nowrap">
                  {member.isActive ? (
                    "—"
                  ) : (
                    <span className="flex flex-col gap-1">
                      <span>{removedLabel(member.removedAt)}</span>
                      <span>By {member.removedByName ?? "Recorded actor"}</span>
                    </span>
                  )}
                </td>
              )}
              {canWrite && (
                <td className="px-4 py-4 text-right">
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
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
  if (data.totalPages <= 1) return null;
  const href = (page: number) => {
    const params = new URLSearchParams({ page: String(page), sort: data.sortDirection });
    if (data.search) params.set("search", data.search);
    if (data.includeRemoved) params.set("removed", "1");
    return `${rosterBasePath ?? "/course-rosters"}/${assignmentId}?${params}`;
  };
  return (
    <nav
      aria-label="Roster member pages"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      {data.page > 1 ? (
        <Link
          href={href(data.page - 1)}
          className="focus-visible:ring-ring text-link inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
        >
          <ChevronLeft aria-hidden="true" /> Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground text-sm" aria-live="polite">
        Page {data.page} of {data.totalPages}
      </span>
      {data.page < data.totalPages ? (
        <Link
          href={href(data.page + 1)}
          className="focus-visible:ring-ring text-link inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
        >
          Next <ChevronRight aria-hidden="true" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
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

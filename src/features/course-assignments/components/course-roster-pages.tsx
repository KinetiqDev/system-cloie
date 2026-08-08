import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
  Search,
  UsersRound,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSectionLabel, getYearLevelDisplay } from "@/lib/constants/academic";
import type {
  CourseRosterAssignmentSummary,
  CourseRosterDetail,
  CourseRosterDiscoveryResult,
  CourseRosterMember,
  RosterEligibilityReason,
  RosterState,
} from "../types";
import {
  AddRosterMember,
  RemoveRosterMember,
  RestoreRosterMember,
} from "./course-roster-management";
import { ImportRosterCsv } from "./course-roster-management";

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
  PUBLISHED_EVALUATION_LOCK: "Published evaluation lock",
};

function dateLabel(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(value)
    : "Not recorded";
}

function stateVariant(state: RosterState): "default" | "secondary" | "outline" {
  if (state === "ACTIVE") return "default";
  if (state === "PUBLISHED_EVALUATION_LOCK") return "secondary";
  return "outline";
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
    PUBLISHED_EVALUATION_LOCK:
      "A Course-bound evaluation has been published for this assignment. The roster is locked for review.",
  }[state];

  return (
    <Alert aria-live="polite">
      <LockKeyhole aria-hidden="true" />
      <AlertTitle>{rosterStateLabels[state]}</AlertTitle>
      <AlertDescription>{copy}</AlertDescription>
    </Alert>
  );
}

function AssignmentContext({ assignment }: { assignment: CourseRosterAssignmentSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Badge variant="outline">{assignment.courseCode}</Badge>
      <span className="font-medium">{assignment.courseTitle}</span>
      <span className="text-muted-foreground">{assignment.programCode}</span>
      <span className="text-muted-foreground">{getYearLevelDisplay(assignment.yearLevel)}</span>
      <span className="text-muted-foreground">{getSectionLabel(assignment.section)}</span>
      <span className="text-muted-foreground">{assignment.termLabel}</span>
    </div>
  );
}

function CountCards({
  activeRosterCount,
  evaluationEligibleCount,
}: Pick<CourseRosterAssignmentSummary, "activeRosterCount" | "evaluationEligibleCount">) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Card size="sm">
        <CardHeader>
          <CardDescription>Active roster</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{activeRosterCount}</CardTitle>
        </CardHeader>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardDescription>Currently evaluation-eligible</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{evaluationEligibleCount}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

export function CourseRosterDiscoveryPage({
  data,
  error,
}: {
  data: CourseRosterDiscoveryResult | null;
  error?: string;
}) {
  if (!data) {
    return <SafeRosterError message={error ?? "The roster request could not be completed."} />;
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="text-link flex items-center gap-2">
          <UsersRound aria-hidden="true" />
          <span className="text-sm font-medium">Faculty workspace</span>
        </div>
        <h1 className="text-heading-lg">My Course Rosters</h1>
        <p className="text-body-md text-muted-foreground max-w-2xl">
          Review and manage active Course assignments you own. Historical, inactive,
          completed-period, and published-evaluation-locked rosters remain review-only.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Find a Course roster</CardTitle>
          <CardDescription>
            Active assignments in the current Academic Period are shown by default. Include history
            to review inactive and completed assignments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-col gap-4" role="search">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <label htmlFor="roster-search" className="text-sm font-medium">
                  Search assignments
                </label>
                <input
                  id="roster-search"
                  name="search"
                  type="search"
                  defaultValue={data.search}
                  maxLength={100}
                  placeholder="Course, program, or Faculty"
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
            </div>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                name="history"
                value="1"
                defaultChecked={data.includeHistory}
                className="accent-primary size-4"
              />
              Include inactive and completed assignment history
            </label>
          </form>
        </CardContent>
      </Card>

      <section aria-labelledby="course-roster-results" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="course-roster-results" className="text-heading-md">
              Course assignments
            </h2>
            <p className="text-muted-foreground text-sm" aria-live="polite">
              {data.total} {data.total === 1 ? "assignment" : "assignments"} found
            </p>
          </div>
          {data.includeHistory && <Badge variant="secondary">History included</Badge>}
        </div>
        {data.items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <p className="font-medium">No Course rosters found</p>
              <p className="text-muted-foreground text-sm">
                Try a different search or include assignment history.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {data.items.map((assignment) => (
              <AssignmentSummaryCard key={assignment.assignmentId} assignment={assignment} />
            ))}
          </div>
        )}
      </section>

      <DiscoveryPagination
        page={data.page + 1}
        totalPages={totalPages}
        search={data.search}
        includeHistory={data.includeHistory}
      />
    </div>
  );
}

function AssignmentSummaryCard({ assignment }: { assignment: CourseRosterAssignmentSummary }) {
  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <AssignmentContext assignment={assignment} />
          <p className="text-muted-foreground text-sm">
            Assigned Faculty: {assignment.facultyName} ({assignment.facultyEmail})
          </p>
        </div>
        <RosterStateBadge state={assignment.rosterState} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Active roster" value={assignment.activeRosterCount} />
          <Metric label="Evaluation-eligible" value={assignment.evaluationEligibleCount} />
          <Metric label="Academic Period" value={assignment.periodStatus} />
          <Metric label="Assignment" value={assignment.isActive ? "Active" : "Inactive"} />
        </div>
        <Link
          href={`/course-rosters/${assignment.assignmentId}`}
          className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex min-h-11 w-fit items-center gap-2 rounded-lg px-4 text-sm font-medium outline-none focus-visible:ring-3"
        >
          Open roster
          <ArrowRight aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-muted/30 rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function DiscoveryPagination({
  page,
  totalPages,
  search,
  includeHistory,
}: {
  page: number;
  totalPages: number;
  search: string;
  includeHistory: boolean;
}) {
  if (totalPages <= 1) return null;
  const href = (nextPage: number) => {
    const params = new URLSearchParams({ page: String(nextPage) });
    if (search) params.set("search", search);
    if (includeHistory) params.set("history", "1");
    return `/faculty/course-rosters?${params}`;
  };
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={backHref}
          className="focus-visible:ring-ring text-link inline-flex min-h-11 w-fit items-center gap-2 rounded-md text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" /> {backLabel}
        </Link>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-heading-lg">Course roster</h1>
            <RosterStateBadge state={assignment.rosterState} />
          </div>
          <p className="text-body-md text-muted-foreground max-w-3xl">
            Review membership and current evaluation eligibility for this Course assignment.
          </p>
        </div>
      </div>

      <AssignmentContext assignment={assignment} />
      <RosterStateBanner state={assignment.rosterState} />
      <CountCards
        activeRosterCount={data.activeRosterCount}
        evaluationEligibleCount={data.evaluationEligibleCount}
      />
      {canWrite && <AddRosterMember assignmentId={assignment.assignmentId} programId={programId} />}
      {canWrite && <ImportRosterCsv assignmentId={assignment.assignmentId} programId={programId} />}

      <Card>
        <CardHeader>
          <CardTitle>Roster members</CardTitle>
          <CardDescription>
            {data.totalMembers} {data.totalMembers === 1 ? "member" : "members"} in this view.
            Active roster and evaluation-eligible counts exclude removed history.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RosterFilters data={data} assignmentId={assignment.assignmentId} rosterBasePath={rosterBasePath} />
          <RosterTable
            members={data.members}
            includeRemoved={data.includeRemoved}
            assignment={assignment}
            canWrite={canWrite}
            programId={programId}
          />
          <DetailPagination data={data} assignmentId={assignment.assignmentId} rosterBasePath={rosterBasePath} />
        </CardContent>
      </Card>
    </div>
  );
}

function RosterFilters({
  data,
  assignmentId,
  rosterBasePath,
}: {
  data: CourseRosterDetail;
  assignmentId: string;
  rosterBasePath?: string;
}) {
  const sortParams = new URLSearchParams({
    search: data.search,
    sort: data.sortDirection === "asc" ? "desc" : "asc",
  });
  if (data.includeRemoved) sortParams.set("removed", "1");

  return (
    <form method="get" className="flex flex-col gap-4" role="search">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="member-search" className="text-sm font-medium">
            Search students
          </label>
          <input
            id="member-search"
            name="search"
            type="search"
            defaultValue={data.search}
            maxLength={100}
            placeholder="Search by name or email"
            className="border-input bg-background focus-visible:ring-ring h-11 rounded-lg border px-3 text-base outline-none focus-visible:ring-3"
          />
        </div>
        <input type="hidden" name="sort" value={data.sortDirection} />
        <button
          type="submit"
          className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium outline-none focus-visible:ring-3"
        >
          <Search aria-hidden="true" /> Search
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="removed"
            value="1"
            defaultChecked={data.includeRemoved}
            className="accent-primary size-4"
          />
          Include removed students
        </label>
        <Link
          href={`${rosterBasePath ?? "/course-rosters"}/${assignmentId}?${sortParams}`}
          aria-label={`Sort by name ${data.sortDirection === "asc" ? "descending" : "ascending"}`}
          className="focus-visible:ring-ring text-link inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
        >
          Sort by name {data.sortDirection === "asc" ? "descending" : "ascending"}
        </Link>
      </div>
    </form>
  );
}

function RosterTable({
  members,
  includeRemoved,
  assignment,
  canWrite,
  programId,
}: {
  members: CourseRosterMember[];
  includeRemoved: boolean;
  assignment: CourseRosterAssignmentSummary;
  canWrite: boolean;
  programId?: string;
}) {
  if (members.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
        No students match this view.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[72rem] text-left text-sm">
        <caption className="sr-only">Course roster members and current eligibility</caption>
        <thead className="bg-muted/40 text-muted-foreground border-b text-xs">
          <tr>
            <th scope="col" className="px-3 py-3 font-medium">
              Student
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              Program
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              Major
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              Class context
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              Added
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              Current status
            </th>
            {includeRemoved && (
              <th scope="col" className="px-3 py-3 font-medium">
                Removal history
              </th>
            )}
            {canWrite && (
              <th scope="col" className="px-3 py-3 font-medium">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
          {members.map((member) => (
            <tr key={member.membershipId} className="hover:bg-muted/30">
              <th scope="row" className="px-3 py-4 font-medium">
                <span className="block">{member.studentName}</span>
                <span className="text-muted-foreground block font-normal">{member.email}</span>
              </th>
              <td className="px-3 py-4">{member.programCode ?? "Not available"}</td>
              <td className="px-3 py-4">{member.majorName ?? "Not available"}</td>
              <td className="px-3 py-4">
                {getYearLevelDisplay(member.yearLevel)} | {getSectionLabel(member.section)}
              </td>
              <td className="px-3 py-4">{dateLabel(member.membershipAddedAt)}</td>
              <td className="px-3 py-4">
                <div className="flex flex-col items-start gap-1">
                  <Badge variant={member.isActive ? "outline" : "secondary"}>
                    {member.isActive ? "Active membership" : "Removed"}
                  </Badge>
                  {member.isActive && member.eligibility.eligible ? (
                    <span className="text-link inline-flex items-center gap-1 text-xs">
                      <CheckCircle2 aria-hidden="true" /> Evaluation-eligible
                    </span>
                  ) : !member.isActive ? (
                    <span className="text-muted-foreground text-xs">
                      Removed from active roster
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      {member.eligibility.reason
                        ? eligibilityLabels[member.eligibility.reason]
                        : "Not evaluation-eligible"}
                    </span>
                  )}
                </div>
              </td>
              {includeRemoved && (
                <td className="text-muted-foreground px-3 py-4 text-xs">
                  {member.isActive ? (
                    "Not removed"
                  ) : (
                    <span className="flex flex-col gap-1">
                      <span>{dateLabel(member.removedAt)}</span>
                      <span>By {member.removedByName ?? "Recorded actor"}</span>
                    </span>
                  )}
                </td>
              )}
              {canWrite && (
                <td className="px-3 py-4">
                  {member.isActive ? (
                    <RemoveRosterMember assignment={assignment} member={member} programId={programId} />
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

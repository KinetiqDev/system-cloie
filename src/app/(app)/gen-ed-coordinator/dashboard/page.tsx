import Link from "next/link";
import { Suspense, type ComponentType, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Gauge,
  Layers3,
  Library,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getGenEdDashboard,
  type GenEdDashboardData,
} from "@/features/course-assignments/services/read-gen-ed-dashboard";
import { loadAllProgramCourseAssignmentsPageData } from "@/features/course-assignments/services/load-all-program-course-assignments-page";
import { GenEdDashboardLoading } from "@/features/course-assignments/components/gen-ed-dashboard-loading";
import { GenEdDashboardAssignmentLauncher } from "@/features/course-assignments/components/gen-ed-dashboard-assignment-launcher";
import { CourseScope } from "@prisma/client";

export const metadata = {
  title: "Dashboard — Gen Ed Coordinator | System CLOIE",
};
export default function GenEdCoordinatorDashboardPage() {
  const dashboardPromise = getGenEdDashboard();
  void dashboardPromise.catch(() => undefined);

  return (
    <Suspense fallback={<GenEdDashboardLoading />}>
      <GenEdDashboardDetails dashboardPromise={dashboardPromise} />
    </Suspense>
  );
}

async function GenEdDashboardDetails({
  dashboardPromise,
}: {
  dashboardPromise: Promise<GenEdDashboardData>;
}) {
  // Dashboard authorization resolves before the assignment picker reads its
  // course, Program, term, and Faculty options.
  const data = await dashboardPromise;
  const assignmentOptions = await loadAllProgramCourseAssignmentsPageData(
    undefined,
    CourseScope.GENERAL_EDUCATION
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageIntro
        periodLabel={data.period?.label ?? null}
        action={<GenEdDashboardAssignmentLauncher assignmentOptions={assignmentOptions} />}
      />
      <GenEdDashboardContent data={data} />
    </div>
  );
}

export function GenEdDashboardContent({ data }: { data: GenEdDashboardData }) {
  const { coverage, evidence, emptyReason } = data;
  const coveragePercent =
    coverage.assignmentCoverageRate === null
      ? "Unavailable"
      : `${Math.round(coverage.assignmentCoverageRate * 100)}%`;
  const responseRate =
    evidence?.responseRate === null || evidence?.responseRate === undefined
      ? "Unavailable"
      : `${(evidence.responseRate * 100).toFixed(1)}%`;
  const meanRating =
    evidence?.meanRating === null || evidence?.meanRating === undefined
      ? "Unavailable"
      : evidence.meanRating.toFixed(2);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {emptyReason === "no-active-period" ? (
        <StatusNotice
          icon={CircleAlert}
          title="No active Academic Period"
          description="Coverage and evidence will update after the Secretary activates an Academic Period. Catalog and outcome work remain available."
        />
      ) : null}

      <section aria-labelledby="coverage-heading" className="flex flex-col gap-3">
        <SectionHeading
          id="coverage-heading"
          title="Coverage at a glance"
          description="Current-period General Education reach across the college."
        />
        <div className="border-border bg-card grid grid-cols-2 overflow-hidden rounded-xl border shadow-sm xl:grid-cols-4">
          <Metric
            label="Active GE courses"
            value={coverage.activeCourseCount.toLocaleString()}
            detail="College-wide catalog"
            icon={BookOpen}
          />
          <Metric
            label="Active assignments"
            value={coverage.activeAssignmentCount.toLocaleString()}
            detail="Current Academic Period"
            icon={ClipboardList}
          />
          <Metric
            label="Programs reached"
            value={`${coverage.reachedProgramCount.toLocaleString()} of ${coverage.activeProgramCount.toLocaleString()}`}
            detail="Active Academic Programs"
            icon={UsersRound}
          />
          <Metric
            label="Assignment coverage"
            value={coveragePercent}
            detail={
              emptyReason === "no-courses"
                ? "No active GE courses"
                : emptyReason === "no-active-period"
                  ? "Requires an active Academic Period"
                  : `${coverage.assignedCourseCount.toLocaleString()} of ${coverage.activeCourseCount.toLocaleString()} courses assigned`
            }
            icon={Gauge}
          />
        </div>
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.82fr)]">
        <AttentionSection data={data} />
        <EvidenceSection data={data} responseRate={responseRate} meanRating={meanRating} />
      </div>

      <QuickActions />
    </div>
  );
}

function PageIntro({ periodLabel, action }: { periodLabel: string | null; action: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-heading-lg tracking-tight text-balance">
            General Education overview
          </h1>
          <Badge variant="outline" className="max-w-full rounded-full px-2.5 py-1 font-medium">
            <Library aria-hidden="true" className="size-3.5" />
            <span className="truncate">College-wide</span>
          </Badge>
        </div>
        <p className="text-body-sm text-text-secondary max-w-2xl leading-relaxed text-pretty">
          Monitor course coverage, Institutional Outcome alignment, and Course-bound evidence.
        </p>
        <p className="text-label-sm text-text-secondary tabular-nums">
          {periodLabel ?? "No active Academic Period"}
        </p>
      </div>
      <div className="w-full shrink-0 sm:w-auto">{action}</div>
    </header>
  );
}

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2 id={id} className="text-heading-md">
        {title}
      </h2>
      <p className="text-body-sm text-text-secondary">{description}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}) {
  return (
    <div className="border-border flex min-w-0 flex-col gap-3 border-b p-3 odd:border-r nth-last-[-n+2]:border-b-0 sm:p-4 xl:border-r xl:border-b-0 xl:last:border-r-0">
      <div className="text-text-secondary flex items-center gap-2 text-sm font-medium">
        <Icon aria-hidden={true} className="size-4 shrink-0" />
        <span>{label}</span>
      </div>
      <p className="font-heading text-heading-xl text-foreground break-words tabular-nums">
        {value}
      </p>
      <p className="text-text-secondary text-xs leading-relaxed">{detail}</p>
    </div>
  );
}

// fallow-ignore-next-line complexity
function AttentionSection({ data }: { data: GenEdDashboardData }) {
  const { attention, coverage, emptyReason } = data;
  const items = [
    attention.unassignedCourseCount > 0
      ? {
          label: `${attention.unassignedCourseCount.toLocaleString()} active ${attention.unassignedCourseCount === 1 ? "course needs" : "courses need"} an assignment`,
          detail: "Create an assignment for current-period coverage.",
          href: "/gen-ed-coordinator/course-assignments",
        }
      : null,
    attention.unmappedCiloCount > 0
      ? {
          label: `${attention.unmappedCiloCount.toLocaleString()} ${attention.unmappedCiloCount === 1 ? "CILO needs" : "CILOs need"} Institutional Outcome mapping`,
          detail: "Review active CILO-to-ILO alignment gaps.",
          href: "/gen-ed-coordinator/outcomes/mapping",
        }
      : null,
    attention.unreachedProgramCount > 0
      ? {
          label: `${attention.unreachedProgramCount.toLocaleString()} active ${attention.unreachedProgramCount === 1 ? "Program has" : "Programs have"} no GE assignment`,
          detail: `${coverage.reachedProgramCount.toLocaleString()} of ${coverage.activeProgramCount.toLocaleString()} active Programs are reached.`,
          href: "/gen-ed-coordinator/course-assignments",
        }
      : null,
    attention.opportunitiesWithoutSubmissions
      ? {
          label: "Current-period evidence has no submitted responses",
          detail: "Evaluation opportunities exist, but none are submitted yet.",
          href: "/gen-ed-coordinator/analytics",
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <section aria-labelledby="attention-heading" className="flex min-w-0 flex-col gap-3">
      <SectionHeading
        id="attention-heading"
        title="Needs attention"
        description="Ordered checks for General Education stewardship."
      />
      <Card className="h-full py-0">
        <CardContent className="flex flex-col p-0">
          {emptyReason === "no-courses" ? (
            <StatusBlock
              title="No active General Education courses"
              description="Add a General Education course before creating assignments."
              href="/gen-ed-coordinator/courses"
              linkLabel="Manage courses"
            />
          ) : items.length === 0 ? (
            <div className="flex items-start gap-3 p-4 sm:p-5">
              <div className="bg-success-soft text-success flex size-10 shrink-0 items-center justify-center rounded-lg">
                <CheckCircle2 aria-hidden="true" className="size-5" />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="font-heading text-base font-semibold">
                  No current General Education gaps
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Current coverage, mapping, and evidence checks require no action.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {items.map((item) => (
                <li key={`${item.href}-${item.label}`}>
                  <Link
                    href={item.href}
                    className="hover:bg-surface-hover focus-visible:ring-ring group flex min-h-16 items-center gap-3 px-4 py-3 transition-colors focus-visible:ring-3 focus-visible:outline-none sm:px-5"
                  >
                    <CircleAlert aria-hidden="true" className="text-warning size-5 shrink-0" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-medium text-pretty">{item.label}</span>
                      <span className="text-text-secondary text-xs leading-relaxed text-pretty">
                        {item.detail}
                      </span>
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="text-text-secondary size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

// fallow-ignore-next-line complexity
function EvidenceSection({
  data,
  responseRate,
  meanRating,
}: {
  data: GenEdDashboardData;
  responseRate: string;
  meanRating: string;
}) {
  const { evidence, period } = data;
  const noOpportunities = evidence?.evaluationOpportunityCount === 0;

  return (
    <section aria-labelledby="evidence-heading" className="flex min-w-0 flex-col gap-3">
      <SectionHeading
        id="evidence-heading"
        title="Evidence pulse"
        description="Submitted Course-bound General Education evidence only."
      />
      <Card className="h-full">
        <CardHeader className="border-border border-b pb-4">
          <div className="flex min-w-0 items-center gap-2">
            <BarChart3 aria-hidden="true" className="text-brand-accent size-5 shrink-0" />
            <h3 className="font-heading min-w-0 truncate text-base font-semibold">
              {period?.label ?? "Current Academic Period unavailable"}
            </h3>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            <EvidenceMetric
              label="Submissions"
              value={
                evidence
                  ? `${evidence.submittedResponseCount.toLocaleString()} of ${evidence.evaluationOpportunityCount.toLocaleString()}`
                  : "Unavailable"
              }
            />
            <EvidenceMetric label="Response rate" value={responseRate} />
            <EvidenceMetric
              label="Valid ratings"
              value={evidence ? evidence.ratingCount.toLocaleString() : "Unavailable"}
            />
            <EvidenceMetric label="Mean rating" value={meanRating} />
          </div>
          <p className="text-text-secondary text-xs leading-relaxed">
            {data.evidenceState === "read-failed"
              ? "Evidence could not be loaded. Refresh this page or open analytics to try again."
              : !period
                ? "Evidence appears after an Academic Period becomes active."
                : noOpportunities
                  ? "No evaluation opportunities exist for this period yet."
                  : evidence === null
                    ? "Evidence is unavailable for this period."
                    : evidence.submittedResponseCount === 0
                      ? "Evaluation opportunities exist, but no responses are submitted yet."
                      : evidence.ratingCount === 0
                        ? "Submitted responses contain no valid quantitative ratings in this period."
                        : evidence.meanRating === null
                          ? "Mean rating is unavailable because the evidence spans incompatible scales."
                          : "Program-specific evidence and Central Deployments are excluded."}
          </p>
          <Link
            href="/gen-ed-coordinator/analytics"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full justify-between pointer-coarse:min-h-11"
            )}
          >
            Open General Education analytics
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}

function EvidenceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="text-text-secondary text-xs">{label}</p>
      <p className="font-heading text-title-lg break-words tabular-nums">{value}</p>
    </div>
  );
}

function QuickActions() {
  const actions = [
    {
      label: "Manage General Education courses",
      detail: "Create, edit, archive, or restore the college-wide catalog.",
      href: "/gen-ed-coordinator/courses",
      icon: BookOpen,
    },
    {
      label: "Manage Institutional Learning Outcomes",
      detail: "Maintain the college-wide ILO catalog and ordering.",
      href: "/gen-ed-coordinator/outcomes",
      icon: Layers3,
    },
    {
      label: "Review CILO-to-ILO mappings",
      detail: "Inspect shared General Education alignment readiness.",
      href: "/gen-ed-coordinator/outcomes/mapping",
      icon: Gauge,
    },
    {
      label: "View all Course Assignments",
      detail: "Search and manage current or historical assignments.",
      href: "/gen-ed-coordinator/course-assignments",
      icon: ClipboardList,
    },
  ];

  return (
    <section aria-labelledby="quick-actions-heading" className="flex flex-col gap-3">
      <SectionHeading
        id="quick-actions-heading"
        title="Quick actions"
        description="Open the General Education workflows you own."
      />
      <div className="grid grid-cols-2 gap-3">
        {actions.map(({ label, detail, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="border-border bg-card hover:bg-surface-hover focus-visible:ring-ring group relative flex min-h-24 min-w-0 flex-col items-start gap-3 rounded-xl border p-3 pr-8 shadow-sm transition-colors focus-visible:ring-3 focus-visible:outline-none sm:min-h-24 sm:flex-row sm:p-4 sm:pr-10 xl:min-h-28 pointer-coarse:min-h-28"
            aria-label={label}
          >
            <span className="bg-primary-soft text-selected-fg flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="leading-snug font-medium text-pretty">{label}</span>
              <span className="text-text-secondary hidden text-xs leading-relaxed text-pretty sm:inline">
                {detail}
              </span>
            </span>
            <ArrowRight
              aria-hidden="true"
              className="text-text-secondary absolute top-4 right-3 size-4 transition-transform group-hover:translate-x-0.5 sm:right-4"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}

function StatusNotice({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
}) {
  return (
    <div
      className="border-warning/40 bg-warning-soft text-warning flex items-start gap-3 rounded-xl border p-4"
      role="status"
    >
      <Icon aria-hidden={true} className="mt-0.5 size-5 shrink-0" />
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        <p className="text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function StatusBlock({
  title,
  description,
  href,
  linkLabel,
}: {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex flex-col items-start gap-3 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <CircleAlert aria-hidden="true" className="text-warning mt-0.5 size-5 shrink-0" />
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="font-heading text-base font-semibold">{title}</h3>
          <p className="text-text-secondary text-sm leading-relaxed">{description}</p>
        </div>
      </div>
      <Link
        href={href}
        className={cn(buttonVariants({ variant: "outline" }), "pointer-coarse:min-h-11")}
      >
        {linkLabel}
      </Link>
    </div>
  );
}

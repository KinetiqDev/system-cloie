import Link from "next/link";
import { TargetStakeholder } from "@prisma/client";
import { Calendar, ClipboardList, Eye, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listStakeholderEvaluations } from "@/features/responses/services/list-stakeholder-evaluations";
import type { StudentEvaluationListItem } from "@/features/responses/types";
import { EvaluationListBrowser } from "@/features/users/components/evaluation-list-browser";
import { EvaluationListCard } from "@/features/users/components/evaluation-list-card";
import { StatCards } from "@/features/users/components/stat-cards";
import { formatDate } from "@/lib/utils/date-format";

type ExternalStakeholder =
  | (typeof TargetStakeholder)["ALUMNI"]
  | (typeof TargetStakeholder)["INDUSTRY_PARTNER"];

type StakeholderPortal = {
  stakeholder: ExternalStakeholder;
  basePath: string;
  dashboardTitle: string;
  evaluationsTitle: string;
  evaluationsIntro: string;
};

export const ALUMNI_PORTAL: StakeholderPortal = {
  stakeholder: TargetStakeholder.ALUMNI,
  basePath: "/alumni",
  dashboardTitle: "Alumni Dashboard",
  evaluationsTitle: "Alumni Evaluations",
  evaluationsIntro:
    "View and complete evaluations assigned to you as an alumnus. Complete all forms before their deadlines.",
};

export const INDUSTRY_PARTNER_PORTAL: StakeholderPortal = {
  stakeholder: TargetStakeholder.INDUSTRY_PARTNER,
  basePath: "/industry-partner",
  dashboardTitle: "Industry Partner Dashboard",
  evaluationsTitle: "Industry Partner Evaluations",
  evaluationsIntro:
    "View and complete evaluations assigned to you as an industry partner. Complete all forms before their deadlines.",
};

function ResumeSection({ resumeItem }: { resumeItem: StudentEvaluationListItem }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-title-lg font-extrabold">Continue</h2>
        <p className="text-text-muted text-body-sm font-medium">Pick up where you left off.</p>
      </div>

      <Card className="border-border overflow-hidden shadow-sm">
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-link text-label-sm font-semibold tracking-wider uppercase">
              In Progress
            </p>
            <div>
              <h3 className="text-title-lg font-bold break-words">{resumeItem.evaluationTitle}</h3>
              <p className="text-text-secondary text-body-sm break-words">
                {resumeItem.programLabel}
              </p>
            </div>
            {/* Answers given, never completion: a full draft is still unsubmitted. */}
            <p className="text-text-secondary text-body-sm font-medium">
              {resumeItem.progress}% answered · not submitted
            </p>
          </div>

          {resumeItem.href && (
            <Button
              render={<Link href={resumeItem.href} />}
              className="min-h-11 w-full font-semibold md:w-auto"
            >
              Resume
            </Button>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

/**
 * The evaluations nobody has started yet, nearest deadline first. This is the
 * dashboard's primary task whenever no draft exists, so it leads; once a draft
 * is open it trails the status summary as the remaining backlog.
 */
function StartableSection({
  portal,
  pendingItems,
  draftCount,
}: {
  portal: StakeholderPortal;
  pendingItems: StudentEvaluationListItem[];
  draftCount: number;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="font-heading text-title-lg font-extrabold">
            {draftCount > 0 ? "Waiting to Start" : "Pending Evaluations"}
          </h2>
          <p className="text-text-muted text-body-sm font-medium">Earliest deadlines first.</p>
        </div>
        <Link
          href={`${portal.basePath}/evaluations?tab=pending`}
          className="text-link focus-visible:ring-ring text-label-sm inline-flex min-h-11 items-center rounded-md font-bold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          View All
        </Link>
      </div>

      <div className="grid gap-4">
        {pendingItems.slice(0, 3).map((evalItem) => (
          <EvaluationListCard key={evalItem.assignmentId} {...evalItem} />
        ))}
        {pendingItems.length === 0 && (
          <div className="border-border bg-surface rounded-xl border-2 border-dashed p-8 text-center">
            <div className="bg-primary-soft mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
              <ClipboardList aria-hidden="true" className="text-selected-fg size-6" />
            </div>
            <h3 className="text-title-sm text-text-primary mb-2 font-semibold">
              {draftCount > 0 ? "Nothing waiting to be started" : "No pending evaluations"}
            </h3>
            <p className="text-body-sm text-text-secondary mx-auto max-w-sm">
              {draftCount > 0
                ? "No evaluations are waiting to be started. Resume the draft above to submit it."
                : "You don't have any active evaluations at the moment. Check back later or view your history."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export async function StakeholderDashboardPage({ portal }: { portal: StakeholderPortal }) {
  const { active, submitted } = await listStakeholderEvaluations(
    portal.stakeholder,
    portal.basePath
  );
  const drafts = active.filter((item) => item.status === "IN_PROGRESS");
  const resumeItem = drafts[0] ?? null;
  // Pending counts only work nobody has started, so it never double-counts a draft.
  const pendingItems = active.filter(
    (item) => item.status === "NOT_STARTED" || item.status === "DUE_SOON"
  );
  const startableSection = (
    <StartableSection portal={portal} pendingItems={pendingItems} draftCount={drafts.length} />
  );
  const statusSummary = (
    <StatCards
      pending={pendingItems.length}
      inProgress={drafts.length}
      completed={submitted.length}
      evaluationsHref={`${portal.basePath}/evaluations`}
    />
  );

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in flex flex-col gap-6 motion-safe:duration-500">
      <h1 className="text-heading-xl text-foreground text-pretty">{portal.dashboardTitle}</h1>

      {resumeItem ? (
        <>
          <ResumeSection resumeItem={resumeItem} />
          {statusSummary}
          {startableSection}
        </>
      ) : (
        <>
          {startableSection}
          {statusSummary}
        </>
      )}
    </div>
  );
}

export async function StakeholderEvaluationsPage({ portal }: { portal: StakeholderPortal }) {
  const { active, submitted } = await listStakeholderEvaluations(
    portal.stakeholder,
    portal.basePath
  );
  const pending = active.filter((item) => item.status !== "IN_PROGRESS");
  const inProgress = active.filter((item) => item.status === "IN_PROGRESS");

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in space-y-8 motion-safe:duration-500">
      <section className="bg-surface rounded-xl p-8">
        <h1 className="font-heading text-heading-xl text-foreground tracking-tight">
          {portal.evaluationsTitle}
        </h1>
        <p className="text-body-md text-muted-foreground mt-2 max-w-2xl">
          {portal.evaluationsIntro}
        </p>
      </section>

      <EvaluationListBrowser pending={pending} inProgress={inProgress} submitted={submitted} />
    </div>
  );
}

export async function StakeholderHistoryPage({ portal }: { portal: StakeholderPortal }) {
  const { submitted } = await listStakeholderEvaluations(portal.stakeholder, portal.basePath);

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in flex flex-col gap-6 motion-safe:duration-300">
      <div className="flex flex-col gap-1">
        <h1 className="text-heading-xl text-foreground text-pretty">Submission History</h1>
        <p className="text-body-sm text-muted-foreground">
          A permanent record of all your completed evaluation forms.
        </p>
      </div>

      <div className="border-border bg-surface hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader className="bg-surface-muted/50">
            <TableRow>
              <TableHead className="text-label-sm font-bold tracking-wider uppercase">
                Evaluation Form
              </TableHead>
              <TableHead className="text-label-sm font-bold tracking-wider uppercase">
                Submission Date
              </TableHead>
              <TableHead className="text-label-sm font-bold tracking-wider uppercase">
                Status
              </TableHead>
              <TableHead className="text-label-sm text-right font-bold tracking-wider uppercase">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submitted.map((sub) => (
              <TableRow
                key={sub.assignmentId}
                className="hover:bg-surface-muted/30 transition-colors"
              >
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-text-primary font-bold">{sub.evaluationTitle}</span>
                    <span className="text-text-muted text-xs">{sub.programLabel}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm font-medium">
                  {sub.session.submittedAt ? formatDate(sub.session.submittedAt) : "N/A"}
                </TableCell>
                <TableCell>
                  <Badge variant="success" className="uppercase">
                    Completed
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="View Answers"
                      disabled={!sub.href}
                      render={sub.href ? <Link href={sub.href} /> : undefined}
                    >
                      <Eye className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 md:hidden">
        {submitted.map((sub) => (
          <Card
            key={sub.assignmentId}
            className="border-border shadow-sm transition-transform active:scale-[0.98]"
          >
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-text-primary mb-1 leading-tight font-bold break-words">
                    {sub.evaluationTitle}
                  </h3>
                  <p className="text-text-muted text-xs font-medium break-words">
                    {sub.programLabel}
                  </p>
                </div>
                <Badge variant="success" className="shrink-0 uppercase">
                  Completed
                </Badge>
              </div>

              <div className="border-border/50 border-y py-3">
                <div className="flex items-center gap-2">
                  <Calendar aria-hidden="true" className="text-text-muted size-3.5" />
                  <div className="flex flex-col">
                    <span className="text-text-muted text-label-sm font-black tracking-tighter uppercase">
                      Date
                    </span>
                    <span className="text-xs font-bold">
                      {sub.session.submittedAt ? formatDate(sub.session.submittedAt) : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 flex-1 gap-2 text-xs font-bold"
                  disabled={!sub.href}
                  render={sub.href ? <Link href={sub.href} /> : undefined}
                >
                  <Eye aria-hidden="true" className="size-3.5" /> View Answers
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {submitted.length === 0 && (
        <div className="border-border bg-surface rounded-xl border border-dashed py-12 text-center">
          <FileText aria-hidden="true" className="text-text-muted/20 mx-auto mb-4 size-12" />
          <p className="text-text-muted font-medium">No submissions recorded yet.</p>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatResponseProgress,
  formatResponseSection,
  formatResponseStakeholder,
  formatResponseStatus,
  formatResponseYearLevel,
  responseStatusVariant,
} from "@/features/analytics/program-head-responses-labels";
import type { ResponseDeploymentList } from "@/features/analytics/services/list-program-head-response-deployments";
import type { ProgramHeadResponsesFilterState } from "@/features/analytics/services/program-head-responses-state";
import {
  buildProgramHeadResponsesTabUrl,
  buildProgramHeadResponsesUrl,
} from "@/features/analytics/services/program-head-responses-state";
import {
  buildProgramHeadResponsesCourseEvaluationPath,
  buildProgramHeadResponsesProgramWideDeploymentPath,
} from "@/lib/constants/program-head-routes";
import { cn } from "@/lib/utils";
import { ProgramHeadResponsesFilters } from "./program-head-responses-filters";
import { ProgramHeadResponsesPagination } from "./program-head-responses-pagination";

type Deployment = ResponseDeploymentList["items"][number];

export function ProgramHeadResponsesLanding({
  programId,
  program,
  state,
  data,
}: {
  programId: string;
  program: { code: string; name: string };
  state: ProgramHeadResponsesFilterState;
  data: ResponseDeploymentList;
}) {
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const isCourse = state.tab === "course";
  const rootHref = buildProgramHeadResponsesUrl(programId, {
    tab: state.tab,
    page: 1,
    termInstanceId: state.termInstanceId,
    stakeholder: state.stakeholder,
  });

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Responses", href: rootHref },
          { label: isCourse ? "Course evaluations" : "Program-wide evaluations" },
        ]}
      />

      <header className="border-border flex flex-col gap-2 border-b pb-5">
        <h1 className="text-heading-lg text-balance">Responses</h1>
        <p className="text-body-md text-text-secondary max-w-3xl text-pretty">
          <span className="text-foreground font-semibold">
            {program.code} — {program.name}
          </span>
          {" · "}Review participation and open identified submitted responses.
        </p>
      </header>

      <nav aria-label="Response views" className="border-border grid grid-cols-2 border-b sm:flex">
        <Tab href={buildProgramHeadResponsesTabUrl(programId, "course", state)} active={isCourse}>
          Course evaluations
        </Tab>
        <Tab
          href={buildProgramHeadResponsesTabUrl(programId, "program-wide", state)}
          active={!isCourse}
        >
          Program-wide
        </Tab>
      </nav>

      <ProgramHeadResponsesFilters programId={programId} state={state} options={data.options} />

      <Card>
        <CardHeader>
          <CardTitle>Evaluation evidence</CardTitle>
          <CardDescription aria-live="polite">
            {data.total.toLocaleString()} {data.total === 1 ? "evaluation" : "evaluations"} in this
            view
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.items.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <ClipboardList aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No matching evaluations</EmptyTitle>
              <EmptyDescription>
                No evaluations match the filters in this view. Clear the filters to see every
                available evaluation.
              </EmptyDescription>
              <EmptyContent>
                <Link
                  href={buildProgramHeadResponsesUrl(programId, { tab: state.tab, page: 1 })}
                  className="text-link focus-visible:ring-ring rounded-lg px-3 py-2.5 font-semibold underline underline-offset-4 focus-visible:ring-3 focus-visible:outline-none"
                >
                  Clear filters
                </Link>
              </EmptyContent>
            </Empty>
          ) : (
            <>
              <div className="flex flex-col gap-3 lg:hidden">
                {data.items.map((item) => (
                  <ResponseCard
                    key={item.id}
                    item={item}
                    programId={programId}
                    isCourse={isCourse}
                  />
                ))}
              </div>
              <div className="hidden lg:block">
                <ResponseTable items={data.items} programId={programId} isCourse={isCourse} />
              </div>
            </>
          )}
          {data.total > data.pageSize ? (
            <div className="border-border mt-4 border-t pt-4">
              <ProgramHeadResponsesPagination
                programId={programId}
                state={state}
                totalPages={totalPages}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function itemHref(programId: string, item: Deployment, isCourse: boolean): string {
  return isCourse
    ? buildProgramHeadResponsesCourseEvaluationPath(programId, item.id)
    : buildProgramHeadResponsesProgramWideDeploymentPath(programId, item.id);
}

// Card branches keep course and program-wide evidence readable in the mobile layout.
// fallow-ignore-next-line complexity
function ResponseCard({
  item,
  programId,
  isCourse,
}: {
  item: Deployment;
  programId: string;
  isCourse: boolean;
}) {
  return (
    <article className="border-border bg-background rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={itemHref(programId, item, isCourse)}
            className="text-title-sm text-link focus-visible:ring-ring -m-2 inline-flex min-h-11 items-center rounded-lg p-2 font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            {item.title}
          </Link>
          <p className="text-body-sm text-muted-foreground mt-1">
            {isCourse && item.course
              ? `${item.course.code} — ${item.course.title}`
              : formatResponseStakeholder(item.stakeholder)}
          </p>
        </div>
        <Badge variant={responseStatusVariant(item.status)}>
          {formatResponseStatus(item.status)}
        </Badge>
      </div>
      <dl className="text-body-sm mt-4 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <Data label={isCourse ? "Class" : "Target"}>
          {isCourse
            ? `${formatResponseYearLevel(item.yearLevel)} · ${formatResponseSection(item.section)}`
            : item.target}
        </Data>
        <Data label={isCourse ? "Faculty" : "Period"}>{isCourse ? item.faculty : item.period}</Data>
        {isCourse ? <Data label="Period">{item.period}</Data> : null}
        <Data label="Response progress">
          <strong className="tabular-nums">
            {formatResponseProgress(item.submitted, item.assigned)}
          </strong>
        </Data>
        <Data label="Quantitative mean">
          <MeanValue item={item} />
        </Data>
      </dl>
    </article>
  );
}

function Data({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-label-sm text-muted-foreground font-semibold">{label}</dt>
      <dd className="text-foreground mt-0.5 break-words">{children || "—"}</dd>
    </div>
  );
}

function MeanValue({ item }: { item: Deployment }) {
  if (item.mean === null) return <>—</>;
  return (
    <span className="font-semibold tabular-nums">
      {item.mean.toFixed(2)}
      <span className="text-muted-foreground font-normal">
        {" · "}
        {item.scaleLabel ?? "Scale unavailable"}
      </span>
    </span>
  );
}

function ResponseTable({
  items,
  programId,
  isCourse,
}: {
  items: Deployment[];
  programId: string;
  isCourse: boolean;
}) {
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[24%]">Evaluation</TableHead>
          <TableHead className="w-[15%]">{isCourse ? "Class" : "Stakeholder"}</TableHead>
          <TableHead className="w-[16%]">{isCourse ? "Faculty" : "Target"}</TableHead>
          <TableHead className="w-[17%]">Period</TableHead>
          <TableHead className="w-[9%]">Status</TableHead>
          <TableHead className="w-[9%] text-right">Submitted</TableHead>
          <TableHead className="w-[10%] text-right">Mean / scale</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="whitespace-normal">
              <Link
                className="text-link focus-visible:ring-ring -m-2 inline-flex min-h-11 items-center rounded-lg p-2 font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
                href={itemHref(programId, item, isCourse)}
              >
                {item.title}
              </Link>
              {isCourse && item.course ? (
                <span className="text-label-sm text-muted-foreground mt-1 block">
                  {item.course.code} · {item.course.title}
                </span>
              ) : null}
            </TableCell>
            <TableCell className="whitespace-normal">
              {isCourse
                ? `${formatResponseYearLevel(item.yearLevel)} · ${formatResponseSection(item.section)}`
                : formatResponseStakeholder(item.stakeholder)}
            </TableCell>
            <TableCell className="whitespace-normal">
              {isCourse ? item.faculty : item.target}
            </TableCell>
            <TableCell className="whitespace-normal">{item.period}</TableCell>
            <TableCell>
              <Badge variant={responseStatusVariant(item.status)}>
                {formatResponseStatus(item.status)}
              </Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {item.submitted === 0 ? "None" : `${item.submitted} of ${item.assigned}`}
            </TableCell>
            <TableCell className="text-right">
              <MeanValue item={item} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "text-label-md relative inline-flex min-h-11 min-w-0 items-center justify-center px-2 text-center font-semibold transition-colors motion-reduce:transition-none sm:justify-start sm:px-3",
        "focus-visible:ring-ring focus-visible:rounded-t-lg focus-visible:ring-2 focus-visible:outline-none",
        "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full",
        active
          ? "text-primary after:bg-primary"
          : "text-muted-foreground hover:text-foreground hover:after:bg-border-strong after:bg-transparent"
      )}
    >
      {children}
    </Link>
  );
}

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProgramHeadResponsesFilters } from "./program-head-responses-filters";
import { ProgramHeadResponsesPagination } from "./program-head-responses-pagination";
import type { ResponseDeploymentList } from "@/features/analytics/services/list-program-head-response-deployments";
import {
  buildProgramHeadResponsesCourseEvaluationPath,
  buildProgramHeadResponsesProgramWideDeploymentPath,
} from "@/lib/constants/program-head-routes";
import {
  buildProgramHeadResponsesTabUrl,
  buildProgramHeadResponsesUrl,
} from "@/features/analytics/services/program-head-responses-state";
import type { ProgramHeadResponsesFilterState } from "@/features/analytics/services/program-head-responses-state";
import { cn } from "@/lib/utils";

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
    schoolYearId: state.schoolYearId,
    semester: state.semester,
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
        <p className="text-label-sm text-primary font-semibold tracking-wider uppercase">
          Submitted evidence
        </p>
        <h1 className="text-heading-lg text-balance">Responses</h1>
        <p className="text-body-md text-text-secondary max-w-3xl text-pretty">
          <span className="text-foreground font-semibold">
            {program.code} — {program.name}
          </span>
          {" · "}Review evaluation participation and open identified submitted responses.
        </p>
      </header>

      <nav
        aria-label="Response views"
        className="border-border -mx-1 flex gap-1 overflow-x-auto border-b px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <Tab href={buildProgramHeadResponsesTabUrl(programId, "course", state)} active={isCourse}>
          Course evaluations
        </Tab>
        <Tab
          href={buildProgramHeadResponsesTabUrl(programId, "program-wide", state)}
          active={!isCourse}
        >
          Program-wide evaluations
        </Tab>
      </nav>

      <ProgramHeadResponsesFilters programId={programId} state={state} options={data.options} />

      <Card>
        <CardHeader>
          <CardTitle>{isCourse ? "Course evaluations" : "Program-wide evaluations"}</CardTitle>
          <CardDescription>
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
                Change or clear the filters to widen this evidence view.
              </EmptyDescription>
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
            className="text-title-sm text-link focus-visible:ring-ring font-semibold hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:outline-none"
          >
            {item.title}
          </Link>
          <p className="text-body-sm text-muted-foreground mt-1">
            {isCourse && item.course
              ? `${item.course.code} — ${item.course.title}`
              : item.stakeholder?.replace("_", " ")}
          </p>
        </div>
        <Badge variant="outline">{item.status}</Badge>
      </div>
      <dl className="text-body-sm mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <Data label={isCourse ? "Class" : "Target"}>
          {isCourse ? `${item.yearLevel?.replace("_", " ")} · ${item.section}` : item.target}
        </Data>
        <Data label={isCourse ? "Faculty" : "Period"}>{isCourse ? item.faculty : item.period}</Data>
        {isCourse ? <Data label="Period">{item.period}</Data> : null}
        <Data label="Submitted">
          <span className="font-semibold tabular-nums">
            {item.submitted} / {item.assigned}
          </span>
        </Data>
        <Data label="Quantitative mean">
          <span className="font-semibold tabular-nums">
            {item.mean === null ? "—" : item.mean.toFixed(2)}
          </span>
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
          <TableHead className="w-[25%]">Evaluation</TableHead>
          <TableHead className="w-[16%]">{isCourse ? "Class" : "Stakeholder"}</TableHead>
          <TableHead className="w-[17%]">{isCourse ? "Faculty" : "Target"}</TableHead>
          <TableHead className="w-[17%]">Period</TableHead>
          <TableHead className="w-[10%]">Status</TableHead>
          <TableHead className="w-[8%] text-right">Responses</TableHead>
          <TableHead className="w-[7%] text-right">Mean</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="whitespace-normal">
              <Link
                className="text-link font-semibold hover:underline"
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
                ? `${item.yearLevel?.replace("_", " ")} · ${item.section}`
                : item.stakeholder?.replace("_", " ")}
            </TableCell>
            <TableCell className="whitespace-normal">
              {isCourse ? item.faculty : item.target}
            </TableCell>
            <TableCell className="whitespace-normal">{item.period}</TableCell>
            <TableCell>
              <Badge variant="outline">{item.status}</Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {item.submitted} / {item.assigned}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {item.mean === null ? "—" : item.mean.toFixed(2)}
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
        "text-label-md relative inline-flex min-h-11 shrink-0 items-center px-3 font-semibold whitespace-nowrap transition-colors motion-reduce:transition-none",
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

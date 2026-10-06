import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
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
import { GeneralEducationResponsesFilters } from "@/features/response-review/components/general-education-responses-filters";
import { ResponsesWorkspace } from "@/features/response-review/components/responses-workspace";
import { ResponsesPagination } from "@/features/response-review/components/responses-pagination";
import {
  formatResponseProgress,
  formatResponseSection,
  formatResponseStatus,
  formatResponseYearLevel,
  responseStatusVariant,
} from "@/features/response-review/components/response-review-labels";
import type { GeneralEducationEvaluationList } from "@/features/response-review/services/list-general-education-evaluations";
import {
  buildGeneralEducationResponsesUrl,
  type GeneralEducationResponsesFilterState,
} from "@/features/response-review/services/general-education-responses-state";
import { buildGenEdResponsesCourseEvaluationPath } from "@/lib/constants/gen-ed-routes";

type Evaluation = GeneralEducationEvaluationList["items"][number];

type Props = {
  state: GeneralEducationResponsesFilterState;
  data: GeneralEducationEvaluationList;
  /** Canonical period-only query used by detail pages linking back here. */
  upwardState: string;
};

export function GeneralEducationResponsesLanding({ state, data, upwardState }: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="border-border flex flex-col gap-2 border-b pb-5">
        <h1 className="text-heading-xl text-balance">Responses</h1>
        <Breadcrumbs
          className="text-body-sm"
          items={[{ label: "Responses" }, { label: "Course evaluations" }]}
        />
        <p className="text-body-sm text-text-secondary max-w-3xl text-pretty">
          Review General Education participation and open identified submitted responses across
          every Program.
        </p>
      </header>

      <ResponsesWorkspace
        sectionLabel="Course evaluations evidence"
        filters={<GeneralEducationResponsesFilters state={state} options={data.options} />}
      >
        <EvaluationEvidence state={state} data={data} upwardState={upwardState} />
      </ResponsesWorkspace>
    </div>
  );
}

function itemHref(item: Evaluation, upwardState: string): string {
  const path = buildGenEdResponsesCourseEvaluationPath(item.id);
  return upwardState ? `${path}?${upwardState}` : path;
}

function EvaluationEvidence({
  state,
  data,
  upwardState,
}: {
  state: GeneralEducationResponsesFilterState;
  data: GeneralEducationEvaluationList;
  upwardState: string;
}) {
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <Card>
      <CardHeader>
        <h2 className="text-heading-lg">Evaluation evidence</h2>
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
              No General Education evaluations match the filters. Clear them to see every available
              evaluation.
            </EmptyDescription>
            <EmptyContent>
              <Link
                href={buildGeneralEducationResponsesUrl({ page: 1 })}
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
                <article
                  key={item.id}
                  className="border-border bg-background rounded-xl border p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={itemHref(item, upwardState)}
                        className="text-title-sm text-link focus-visible:ring-ring -m-2 inline-flex min-h-11 items-center rounded-lg p-2 font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
                      >
                        {item.title}
                      </Link>
                      <p className="text-body-sm text-muted-foreground mt-1">
                        {item.course.code} — {item.course.title}
                      </p>
                    </div>
                    <Badge variant={responseStatusVariant(item.status)}>
                      {formatResponseStatus(item.status)}
                    </Badge>
                  </div>
                  <dl className="text-body-sm mt-4 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                    <Fact label="Class">
                      {formatResponseYearLevel(item.yearLevel)} ·{" "}
                      {formatResponseSection(item.section)}
                      {item.program ? ` · ${item.program}` : ""}
                    </Fact>
                    <Fact label="Faculty">{item.faculty}</Fact>
                    <Fact label="Period">{item.period}</Fact>
                    <Fact label="Response progress">
                      <strong className="tabular-nums">
                        {formatResponseProgress(item.submitted, item.assigned)}
                      </strong>
                    </Fact>
                    <Fact label="Quantitative mean">
                      <MeanValue item={item} />
                    </Fact>
                  </dl>
                </article>
              ))}
            </div>
            <div className="hidden lg:block">
              <EvaluationTable items={data.items} upwardState={upwardState} />
            </div>
          </>
        )}
        {data.total > data.pageSize ? (
          <div className="border-border mt-4 border-t pt-4">
            <ResponsesPagination
              page={state.page}
              totalPages={totalPages}
              buildPageUrl={(page) => buildGeneralEducationResponsesUrl({ ...state, page })}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EvaluationTable({ items, upwardState }: { items: Evaluation[]; upwardState: string }) {
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[24%]">Evaluation</TableHead>
          <TableHead className="w-[15%]">Class</TableHead>
          <TableHead className="w-[16%]">Faculty</TableHead>
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
                href={itemHref(item, upwardState)}
              >
                {item.title}
              </Link>
              <span className="text-label-sm text-muted-foreground mt-1 block">
                {item.course.code} · {item.course.title}
              </span>
            </TableCell>
            <TableCell className="whitespace-normal">
              <span>
                {formatResponseYearLevel(item.yearLevel)} · {formatResponseSection(item.section)}
              </span>
              {item.program ? (
                <span className="text-label-sm text-muted-foreground mt-1 block">
                  {item.program}
                </span>
              ) : null}
            </TableCell>
            <TableCell className="whitespace-normal">{item.faculty}</TableCell>
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

function MeanValue({ item }: { item: Evaluation }) {
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

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-label-sm text-muted-foreground font-semibold">{label}</dt>
      <dd className="text-foreground mt-0.5 break-words">{children}</dd>
    </div>
  );
}

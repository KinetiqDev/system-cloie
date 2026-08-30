"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSectionLabel, getYearLevelDisplay } from "@/lib/constants/academic";
import { cn } from "@/lib/utils";
import { formatMean } from "./format";
import type { ProgramHeadAssignmentRespondentRow, ProgramHeadRespondentRow } from "../types";

type StatusFilter = "ALL" | ProgramHeadAssignmentRespondentRow["status"];

const STATUS_FILTERS: StatusFilter[] = ["ALL", "SUBMITTED", "IN_PROGRESS", "NOT_STARTED"];
const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function statusLabel(status: ProgramHeadAssignmentRespondentRow["status"]): string {
  if (status === "IN_PROGRESS") return "In Progress";
  if (status === "NOT_STARTED") return "Not Started";
  return "Submitted";
}

function statusVariant(
  status: ProgramHeadAssignmentRespondentRow["status"]
): "success" | "warning" | "secondary" {
  if (status === "SUBMITTED") return "success";
  if (status === "IN_PROGRESS") return "warning";
  return "secondary";
}

function respondentContext(row: ProgramHeadAssignmentRespondentRow): string {
  return (
    [row.majorLabel, getYearLevelDisplay(row.yearLevel), getSectionLabel(row.section)]
      .filter((part) => part && part !== "—")
      .join(" · ") || "No additional academic context"
  );
}

type IdentifiedRespondentsTableProps = {
  respondents: ProgramHeadAssignmentRespondentRow[] | ProgramHeadRespondentRow[];
  responseHrefs: Record<string, string>;
};

export function IdentifiedRespondentsTable({
  respondents,
  responseHrefs,
}: IdentifiedRespondentsTableProps) {
  const roster = useMemo<ProgramHeadAssignmentRespondentRow[]>(
    () =>
      respondents.map((row) =>
        "assignmentId" in row
          ? row
          : {
              ...row,
              assignmentId: row.responseId,
              status: "SUBMITTED" as const,
              assignedAt: row.submittedAt,
            }
      ),
    [respondents]
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return roster.filter((row) => {
      if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
      return !normalizedQuery || row.name.toLocaleLowerCase().includes(normalizedQuery);
    });
  }, [query, roster, statusFilter]);
  const filtersActive = query.length > 0 || statusFilter !== "ALL";

  function clearFilters() {
    setQuery("");
    setStatusFilter("ALL");
  }

  if (roster.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Respondents</CardTitle>
          <CardDescription>Assignment status for this evaluation.</CardDescription>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersRound aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No respondents assigned</EmptyTitle>
              <EmptyDescription>This evaluation has no assigned respondents.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Respondents</CardTitle>
            <CardDescription>
              Review assignment status. Exact answer access is available after submission only.
            </CardDescription>
          </div>
          <span className="text-caption text-muted-foreground tabular-nums">
            {filtered.length} of {roster.length}
          </span>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
            />
            <Input
              aria-label="Search respondents"
              type="search"
              name="respondent-search"
              autoComplete="off"
              placeholder="Search respondents…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
            />
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter respondents by status"
          >
            {STATUS_FILTERS.map((filter) => (
              <Button
                key={filter}
                type="button"
                variant={statusFilter === filter ? "default" : "outline"}
                size="sm"
                aria-pressed={statusFilter === filter}
                onClick={() => setStatusFilter(filter)}
              >
                {filter === "ALL" ? "All" : statusLabel(filter)}
              </Button>
            ))}
            {filtersActive ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-24 md:pb-6">
        {filtered.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No respondents found</EmptyTitle>
              <EmptyDescription>Clear the search or choose another status.</EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </Empty>
        ) : (
          <>
            <div className="hidden md:block">
              <Table aria-label="Evaluation respondents">
                <TableHeader>
                  <TableRow>
                    <TableHead>Respondent</TableHead>
                    <TableHead>Context</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Mean</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.assignmentId} data-testid="respondent-row">
                      <TableCell className="font-semibold">{row.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-64 whitespace-normal">
                        {respondentContext(row)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {dateFormatter.format(row.assignedAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {row.submittedAt ? dateTimeFormatter.format(row.submittedAt) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMean(row.quantitativeMean)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.responseId ? (
                          <Link
                            href={responseHrefs[row.responseId]}
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                          >
                            View Response
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-xs">Awaiting submission</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="grid gap-3 md:hidden">
              {filtered.map((row) => (
                <article
                  key={row.assignmentId}
                  data-testid="respondent-card"
                  className="border-border flex flex-col gap-3 rounded-xl border p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-title-sm truncate">{row.name}</h3>
                      <p className="text-body-sm text-muted-foreground text-pretty">
                        {respondentContext(row)}
                      </p>
                    </div>
                    <Badge className="shrink-0" variant={statusVariant(row.status)}>
                      {statusLabel(row.status)}
                    </Badge>
                  </div>
                  <dl className="text-body-sm grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-muted-foreground">Assigned</dt>
                      <dd className="tabular-nums">{dateFormatter.format(row.assignedAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Submitted</dt>
                      <dd className="tabular-nums">
                        {row.submittedAt ? dateTimeFormatter.format(row.submittedAt) : "—"}
                      </dd>
                    </div>
                  </dl>
                  {row.responseId ? (
                    <Link
                      href={responseHrefs[row.responseId]}
                      className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                    >
                      View Response
                    </Link>
                  ) : (
                    <p className="text-caption text-muted-foreground">No submitted answers yet.</p>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

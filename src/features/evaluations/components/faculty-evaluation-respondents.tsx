"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { FacultyEvaluationRespondent, FacultyEvaluationRespondentStatus } from "../types";

type Props = {
  respondents: FacultyEvaluationRespondent[];
};

type StatusFilter = "ALL" | FacultyEvaluationRespondentStatus;

const STATUS_FILTERS: StatusFilter[] = ["ALL", "SUBMITTED", "IN_PROGRESS", "NOT_STARTED"];

function statusLabel(status: FacultyEvaluationRespondentStatus): string {
  switch (status) {
    case "SUBMITTED":
      return "Submitted";
    case "IN_PROGRESS":
      return "In progress";
    case "NOT_STARTED":
      return "Not started";
    default:
      return status;
  }
}

function statusVariant(
  status: FacultyEvaluationRespondentStatus
): "success" | "warning" | "secondary" {
  switch (status) {
    case "SUBMITTED":
      return "success";
    case "IN_PROGRESS":
      return "warning";
    case "NOT_STARTED":
      return "secondary";
    default:
      return "secondary";
  }
}

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: Date | string | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function FacultyEvaluationRespondents({ respondents }: Props) {
  const safeRespondents = respondents;
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return safeRespondents.filter((row) => {
      const matchesStatus = statusFilter === "ALL" || row.status === statusFilter;
      if (!matchesStatus) return false;
      if (!lowered) return true;
      return row.name.toLowerCase().includes(lowered) || row.email.toLowerCase().includes(lowered);
    });
  }, [safeRespondents, query, statusFilter]);

  if (safeRespondents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Respondents</CardTitle>
          <CardDescription>Named respondent status without answer disclosure.</CardDescription>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search aria-hidden="true" className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No respondents assigned</EmptyTitle>
              <EmptyDescription>This evaluation has no assigned respondents yet.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Respondents</CardTitle>
            <CardDescription>
              Named respondent status. Answer bodies are not displayed or linked here.
            </CardDescription>
          </div>
          <span className="text-muted-foreground text-xs tabular-nums">
            Showing {filtered.length} of {safeRespondents.length}
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              aria-label="Search respondents"
              name="respondent-search"
              autoComplete="off"
              placeholder="Search by name or email…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            {STATUS_FILTERS.map((filter) => {
              const label =
                filter === "ALL"
                  ? "All"
                  : filter === "SUBMITTED"
                    ? "Submitted"
                    : filter === "IN_PROGRESS"
                      ? "In progress"
                      : "Not started";
              return (
                <Button
                  key={filter}
                  variant={statusFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(filter)}
                  aria-pressed={statusFilter === filter}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed py-10 text-center">
            <p className="text-muted-foreground text-sm">No respondents match your filters.</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => {
                setQuery("");
                setStatusFilter("ALL");
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            <div
              className="hidden overflow-x-auto md:block"
              role="region"
              aria-label="Evaluation respondents"
              tabIndex={0}
            >
              <Table>
                <caption className="sr-only">Respondent assignment and response status</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.assignmentId} data-testid="respondent-row">
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[220px] truncate">
                        {row.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs tabular-nums">
                        {formatDate(row.assignedAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs tabular-nums">
                        {formatDateTime(row.submittedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 md:hidden">
              {filtered.map((row) => (
                <div
                  key={row.assignmentId}
                  data-testid="respondent-card"
                  className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{row.name}</p>
                      <p className="text-muted-foreground truncate text-xs">{row.email}</p>
                    </div>
                    <Badge variant={statusVariant(row.status)} className="shrink-0">
                      {statusLabel(row.status)}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium">Assigned: </span>
                      <span className="tabular-nums">{formatDate(row.assignedAt)}</span>
                    </div>
                    <div>
                      <span className="font-medium">Submitted: </span>
                      <span className="tabular-nums">{formatDateTime(row.submittedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="text-muted-foreground text-center text-xs" aria-live="polite">
          Privacy: respondent names and statuses are shown, but no link to answer bodies is
          provided.
        </p>
      </CardContent>
    </Card>
  );
}

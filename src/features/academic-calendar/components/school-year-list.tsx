"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  ChevronDown,
  ChevronRight,
  Archive,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { formatDateRange } from "@/lib/utils/date-format";
import { getSemesterLabel, getTermLabel } from "@/lib/constants/academic";
import type { SchoolYearWithTerms, TermInstanceItem } from "../types";
import { SetActiveTermDialog } from "./set-active-term-dialog";

interface SchoolYearListProps {
  schoolYears: SchoolYearWithTerms[];
  onRefresh: () => void;
}

export function SchoolYearList({ schoolYears, onRefresh }: SchoolYearListProps) {
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [settingActiveTerm, setSettingActiveTerm] = useState<TermInstanceItem | null>(null);

  function toggleExpand(yearId: string) {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(yearId)) {
        next.delete(yearId);
      } else {
        next.add(yearId);
      }
      return next;
    });
  }

  if (schoolYears.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Calendar />
          </EmptyMedia>
          <EmptyTitle>No school years found</EmptyTitle>
          <EmptyDescription>Create a school year to get started</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      {schoolYears.map((year) => (
        <div
          key={year.id}
          className="overflow-hidden rounded-lg border bg-card"
        >
          <div className="flex items-center justify-between p-4">
            <button
              type="button"
              className="flex items-center gap-3 transition-opacity hover:opacity-70"
              onClick={() => toggleExpand(year.id)}
              aria-expanded={expandedYears.has(year.id)}
              aria-controls={`school-year-${year.id}-terms`}
            >
              {expandedYears.has(year.id) ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
              <span className="font-semibold text-lg">{year.code}</span>
              {year.isArchived && (
                <Badge variant="secondary">
                  <Archive className="mr-1 h-3 w-3" />
                  Archived
                </Badge>
              )}
            </button>

            <div className="flex items-center gap-4">
              <div className="text-muted-foreground text-sm">
                {year.termInstances.length} term
                {year.termInstances.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {expandedYears.has(year.id) && (
            <div id={`school-year-${year.id}-terms`} className="border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Semester</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead className="w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {year.termInstances.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-muted-foreground text-center py-8"
                      >
                        No term instances yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    year.termInstances.map((term) => (
                      <TermInstanceRow
                        key={term.id}
                        term={term}
                        isArchived={year.isArchived}
                        onSetActive={() => setSettingActiveTerm(term)}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ))}

      {settingActiveTerm && (
        <SetActiveTermDialog
          open={!!settingActiveTerm}
          onOpenChange={(open: boolean) => !open && setSettingActiveTerm(null)}
          termInstance={settingActiveTerm}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}

interface TermInstanceRowProps {
  term: TermInstanceItem;
  isArchived: boolean;
  onSetActive: () => void;
}

function TermInstanceRow({ term, isArchived, onSetActive }: TermInstanceRowProps) {
  return (
    <TableRow>
      <TableCell>{getSemesterLabel(term.semester)}</TableCell>
      <TableCell>{term.term ? getTermLabel(term.term) : "—"}</TableCell>
      <TableCell>
        {term.status === "ACTIVE" ? (
          <Badge variant="success">
            <CheckCircle className="mr-1 h-3 w-3" />
            Active
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {formatDateRange(term.startDate, term.endDate)}
      </TableCell>
      <TableCell>
        {term.status !== "ACTIVE" && !isArchived && (
          <Button variant="ghost" size="sm" onClick={onSetActive}>
            Set Active
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

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
  ChevronDown,
  ChevronRight,
  Plus,
  Archive,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { formatDateRange } from "@/lib/utils/date-format";
import { getSemesterLabel, getTermLabel } from "@/lib/constants/academic";
import type { SchoolYearWithTerms, TermInstanceItem } from "../types";
import { TermInstanceForm } from "./term-instance-form";
import { SetActiveTermDialog } from "./set-active-term-dialog";

interface SchoolYearListProps {
  schoolYears: SchoolYearWithTerms[];
  onRefresh: () => void;
}

export function SchoolYearList({ schoolYears, onRefresh }: SchoolYearListProps) {
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [addingTermTo, setAddingTermTo] = useState<SchoolYearWithTerms | null>(null);
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
      <div className="text-muted-foreground py-12 text-center">
        <Calendar className="mx-auto mb-4 h-12 w-12 opacity-50" />
        <p className="text-lg font-medium">No school years found</p>
        <p className="text-sm">Create a school year to get started</p>
      </div>
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
              className="flex items-center gap-3 transition-opacity hover:opacity-70"
              onClick={() => toggleExpand(year.id)}
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingTermTo(year)}
                disabled={year.isArchived}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Term
              </Button>
            </div>
          </div>

          {expandedYears.has(year.id) && (
            <div className="border-t">
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
                        No term instances yet. Click &quot;Add Term&quot; to create one.
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

      {addingTermTo && (
        <TermInstanceForm
          open={!!addingTermTo}
          onOpenChange={(open: boolean) => !open && setAddingTermTo(null)}
          schoolYearId={addingTermTo.id}
          schoolYearCode={addingTermTo.code}
          onSuccess={onRefresh}
        />
      )}

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
          <Badge variant="default">
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
        {!term.status === "ACTIVE" && !isArchived && (
          <Button variant="ghost" size="sm" onClick={onSetActive}>
            Set Active
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

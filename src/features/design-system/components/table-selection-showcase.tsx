"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  SHOWCASE_PROGRAMS,
  type ShowcaseStatus,
} from "@/features/design-system/data/showcase-fixtures";

const STATUS_ICON: Record<ShowcaseStatus, LucideIcon> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  information: Info,
};

const STATUS_BADGE_VARIANT: Record<ShowcaseStatus, "success" | "warning" | "destructive" | "information"> = {
  success: "success",
  warning: "warning",
  danger: "destructive",
  information: "information",
};

export function TableSelectionShowcase() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected =
    SHOWCASE_PROGRAMS.length > 0 && selectedIds.size === SHOWCASE_PROGRAMS.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(SHOWCASE_PROGRAMS.map((program) => program.id)) : new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-card">
        <Table className="[&_tr]:last:border-0">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <span className="sr-only">Select all</span>
                <Checkbox
                  aria-label="Select all programs"
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={(checked) => toggleAll(Boolean(checked))}
                />
              </TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Courses</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SHOWCASE_PROGRAMS.map((program) => {
              const StatusIcon = STATUS_ICON[program.status];
              return (
                <TableRow
                  key={program.id}
                  data-state={selectedIds.has(program.id) ? "selected" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      aria-label={`Select ${program.name}`}
                      checked={selectedIds.has(program.id)}
                      onCheckedChange={(checked) => toggleOne(program.id, Boolean(checked))}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{program.name}</TableCell>
                  <TableCell className="font-mono text-xs">{program.code}</TableCell>
                  <TableCell>{program.courseCount}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[program.status]} className="gap-1">
                      <StatusIcon aria-hidden className="size-3.5" />
                      {program.statusLabel}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <p className="text-body-sm text-muted-foreground" aria-live="polite">
          {selectedIds.size} of {SHOWCASE_PROGRAMS.length} programs selected
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </Button>
        </div>
      </div>
    </div>
  );
}

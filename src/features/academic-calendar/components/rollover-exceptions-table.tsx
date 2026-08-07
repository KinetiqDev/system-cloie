"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { CheckCircle2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RolloverException, RolloverExceptionType } from "../services/run-term-rollover";

interface RolloverExceptionsTableProps {
  exceptions: RolloverException[];
  onEditStudent?: (studentUserId: string) => void;
}

const EXCEPTION_TYPE_CONFIG: Record<
  RolloverExceptionType,
  { label: string; variant: "default" | "secondary" | "destructive" | "warning" | "outline" }
> = {
  GRADUATING: { label: "Graduating", variant: "secondary" },
  MISSING_DATA: { label: "Missing Data", variant: "destructive" },
  DUPLICATE: { label: "Duplicate", variant: "warning" },
};

export function RolloverExceptionsTable({
  exceptions,
  onEditStudent,
}: RolloverExceptionsTableProps) {
  if (exceptions.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CheckCircle2 />
          </EmptyMedia>
          <EmptyTitle>No exceptions</EmptyTitle>
          <EmptyDescription>
            No exceptions — all students processed successfully.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Current Year</TableHead>
            <TableHead>Reason</TableHead>
            {onEditStudent && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {exceptions.map((exception) => {
            const typeConfig = EXCEPTION_TYPE_CONFIG[exception.exceptionType];

            return (
              <TableRow key={exception.studentUserId}>
                <TableCell>
                  <div>
                    <p className="font-medium">{exception.studentName}</p>
                    <p className="text-muted-foreground text-xs">
                      {exception.studentEmail}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={typeConfig.variant}>{typeConfig.label}</Badge>
                </TableCell>
                <TableCell>
                  {exception.currentYearLevel.replace("_", " ")}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {exception.message}
                </TableCell>
                {onEditStudent && (
                  <TableCell>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onEditStudent(exception.studentUserId)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listEnrollmentsForUserAction } from "@/lib/actions/enrollment-actions";
import type { EnrollmentItem } from "@/features/enrollments/types";
import { EnrollmentSource } from "@prisma/client";

interface StudentEnrollmentHistoryProps {
  userId: string;
  onEdit?: (enrollment: EnrollmentItem) => void;
}

const sourceLabels: Record<EnrollmentSource, string> = {
  [EnrollmentSource.ONBOARDING]: "Onboarding",
  [EnrollmentSource.ROLLOVER]: "Rollover",
  [EnrollmentSource.SECRETARY]: "Secretary",
};

export function StudentEnrollmentHistory({ userId, onEdit }: StudentEnrollmentHistoryProps) {
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await listEnrollmentsForUserAction(userId);
      if (result.success) {
        setEnrollments(result.data.items);
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (enrollments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enrollment History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No enrollments found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enrollment History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Term</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Year Level</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              {onEdit && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((enrollment) => (
              <TableRow key={enrollment.id}>
                <TableCell>{enrollment.termLabel || enrollment.termInstanceId}</TableCell>
                <TableCell>{enrollment.programCode || enrollment.programId}</TableCell>
                <TableCell>{enrollment.yearLevel}</TableCell>
                <TableCell>{enrollment.section || "—"}</TableCell>
                <TableCell>{sourceLabels[enrollment.source]}</TableCell>
                <TableCell>
                  <Badge variant={enrollment.isActive ? "success" : "secondary"}>
                    {enrollment.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                {onEdit && (
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(enrollment)}>
                      Edit
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

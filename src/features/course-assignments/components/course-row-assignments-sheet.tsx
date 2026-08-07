"use client";

import { useState, useEffect, useCallback } from "react";
import { CourseScope } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { CalendarX2, Plus, UsersRound } from "lucide-react";
import { loadCourseAssignmentsForSheetAction } from "@/lib/actions/course-assignment-actions";
import { CourseAssignmentFormDialog } from "./course-assignment-form-dialog";
import type { CourseAssignmentItem, AssignableCourse } from "@/features/course-assignments/types";
import type { TermInstanceItem } from "@/features/academic-calendar/types";
import { getYearLevelDisplay, getSectionLabel } from "@/lib/constants/academic";

interface CourseRowAssignmentsSheetProps {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  termInstanceId: string | null;
  termInstances: TermInstanceItem[];
  availablePrograms: Array<{ id: string; code: string; name: string }>;
  availableCourses: AssignableCourse[];
  triggerRender: React.ReactElement;
}

export function CourseRowAssignmentsSheet({
  courseId,
  courseCode,
  courseTitle,
  termInstanceId,
  termInstances,
  availablePrograms,
  availableCourses,
  triggerRender,
}: CourseRowAssignmentsSheetProps) {
  const [open, setOpen] = useState(false);
  const [assignments, setAssignments] = useState<CourseAssignmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadAssignments = useCallback(async () => {
    if (!termInstanceId) return;

    setLoading(true);
    const result = await loadCourseAssignmentsForSheetAction({
      termInstanceId,
      courseId,
    });

    if (result.success) {
      setAssignments(result.data.items);
    }
    setLoading(false);
  }, [termInstanceId, courseId]);

  useEffect(() => {
    if (open && termInstanceId) {
      queueMicrotask(() => loadAssignments());
    }
  }, [open, termInstanceId, loadAssignments]);

  const course = availableCourses.find((c) => c.id === courseId);
  const isGeneralEducation = course?.course_scope === CourseScope.GENERAL_EDUCATION;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={triggerRender} />
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {courseCode} — {courseTitle}
            </DialogTitle>
            <DialogDescription>
              Faculty assignments for this course in the selected term.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-4">
            {!termInstanceId ? (
              <Empty className="py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarX2 />
                  </EmptyMedia>
                  <EmptyTitle>Select a term</EmptyTitle>
                  <EmptyDescription>Please select a term to view assignments.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : loading ? (
              <div className="space-y-2" aria-busy="true">
                <div className="flex items-center gap-2 py-1">
                  <Spinner size="sm" label="Loading course assignments" />
                  <span className="text-muted-foreground text-sm">Loading assignments...</span>
                </div>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : assignments.length === 0 ? (
              <Empty className="py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <UsersRound />
                  </EmptyMedia>
                  <EmptyTitle>No faculty assigned yet</EmptyTitle>
                  <EmptyDescription>
                    No faculty assigned yet for this course in the selected term.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="font-medium">{assignment.facultyName}</p>
                      <p className="text-muted-foreground text-sm">{assignment.facultyEmail}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {assignment.programCode}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {getYearLevelDisplay(assignment.yearLevel)}
                          {assignment.section ? ` • ${getSectionLabel(assignment.section)}` : ""}
                        </span>
                      </div>
                    </div>
                    <Badge variant={assignment.isActive ? "success" : "secondary"}>
                      {assignment.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {termInstanceId &&
              (isGeneralEducation ? (
                <p className="text-muted-foreground text-center text-xs">
                  General Education assignments are managed by Secretary/Dean.
                </p>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => setDialogOpen(true)}
                  disabled={!termInstanceId}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Assign Faculty
                </Button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      <CourseAssignmentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        availableCourses={availableCourses}
        availablePrograms={availablePrograms}
        termInstances={termInstances}
        defaultTermInstanceId={termInstanceId}
        defaultCourseId={courseId}
        onSuccess={() => {
          loadAssignments();
        }}
      />
    </>
  );
}

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
import { Plus } from "lucide-react";
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
              <div className="text-muted-foreground py-8 text-center">
                Please select a term to view assignments.
              </div>
            ) : loading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                No faculty assigned yet for this course in the selected term.
              </div>
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
                    <Badge variant={assignment.isActive ? "default" : "secondary"}>
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

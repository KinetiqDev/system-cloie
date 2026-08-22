"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { showToast } from "@/components/ui/toast";
import { CourseForm } from "@/features/academic-structure/components/course-form";
import { getCourseEditDataAction, updateCourseAction } from "@/lib/actions/management-foundation-actions";
import type { CourseEditData } from "@/features/academic-structure/services/manage-courses";
import type { ManagementCourseSummaryItem } from "@/features/academic-structure/services/list-management-courses-summary";

type CourseEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: ManagementCourseSummaryItem | null;
};

type LoadState = "loading" | "ready" | "error" | "missing";

export function CourseEditDialog({ open, onOpenChange, course }: CourseEditDialogProps) {
  const router = useRouter();
  const [activeCourse, setActiveCourse] = useState<ManagementCourseSummaryItem | null>(course);
  const [data, setData] = useState<CourseEditData | null>(null);
  const [status, setStatus] = useState<LoadState>("loading");
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Keep the last opened course so the closing animation still has content.
  useEffect(() => {
    if (course) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveCourse(course);
    }
  }, [course]);

  useEffect(() => {
    if (!open || !course) {
      return;
    }

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("loading");
    setData(null);

    getCourseEditDataAction(course.id)
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (!result) {
          setStatus("missing");
          return;
        }
        setData(result);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, course, attempt]);

  const displayCourse = course ?? activeCourse;

  const handleSuccess = () => {
    onOpenChange(false);
    router.refresh();
    showToast("Course updated successfully!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-h-[min(85vh,720px)] sm:max-w-xl">
        <DialogHeader className="px-5 pt-5 pr-12 pb-1">
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>
            Update details for {displayCourse?.code} – {displayCourse?.title}.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-5 py-4">
          {status === "loading" && (
            <div className="flex items-center justify-center py-10">
              <Spinner size="lg" label="Loading course details" />
            </div>
          )}

          {status === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription className="flex items-center justify-between gap-3">
                Unable to load course details. Please try again.
                <Button variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {status === "missing" && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>This course is no longer available.</AlertDescription>
            </Alert>
          )}

          {status === "ready" && displayCourse && data && (
            <CourseForm
              action={updateCourseAction}
              programs={data.programs}
              majors={data.majors}
              defaultValues={{
                id: displayCourse.id,
                code: displayCourse.code,
                title: displayCourse.title,
                description: displayCourse.description,
                course_scope: displayCourse.courseScope,
                program_id: displayCourse.programId,
                major_id: displayCourse.majorId,
                default_year_level: data.defaults.default_year_level,
                default_semester: data.defaults.default_semester,
                default_term: data.defaults.default_term,
              }}
              submitLabel="Update Course"
              formId="course-edit-form"
              onPendingChange={setPending}
              onSuccess={handleSuccess}
            />
          )}
        </div>

        <div className="bg-muted/50 flex flex-col-reverse gap-2 rounded-b-xl border-t px-5 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {status === "ready" && (
            <Button form="course-edit-form" type="submit" disabled={pending}>
              {pending ? "Updating..." : "Update Course"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Spinner } from "@/components/ui/spinner";
import { CourseForm } from "@/features/academic-structure/components/course-form";
import {
  getCourseEditDataAction,
  updateCourseAction,
} from "@/lib/actions/management-foundation-actions";
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
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) onOpenChange(nextOpen);
      }}
    >
      <ResponsiveDialogContent desktopClassName="sm:max-w-xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Edit Course</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Update details for {data?.course.code ?? displayCourse?.code} –{" "}
            {data?.course.title ?? displayCourse?.title}.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="px-4 py-4 md:p-0">
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

          {status === "ready" && data && (
            <CourseForm
              action={updateCourseAction}
              programs={data.programs}
              majors={data.majors}
              defaultValues={{
                id: data.course.id,
                code: data.course.code,
                title: data.course.title,
                course_scope: data.course.course_scope,
                program_id: data.course.program_id,
                major_id: data.course.major_id,
                default_year_level: data.course.default_year_level,
                default_semester: data.course.default_semester,
                default_term: data.course.default_term,
                updated_at: data.course.updated_at.toISOString(),
              }}
              submitLabel="Update Course"
              formId="course-edit-form"
              onPendingChange={setPending}
              onSuccess={handleSuccess}
            />
          )}
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button
            variant="outline"
            className="w-full md:w-auto"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {status === "ready" && (
            <Button
              form="course-edit-form"
              type="submit"
              className="w-full md:w-auto"
              loading={pending}
            >
              Update Course
            </Button>
          )}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

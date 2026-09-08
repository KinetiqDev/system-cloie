"use client";

import { CourseScope } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
import { CourseForm } from "@/features/academic-structure/components/course-form";
import type { GenEdCourseItem } from "@/features/academic-structure/services/resolve-gen-ed-courses";
import {
  createGenEdCourseAction,
  updateGenEdCourseAction,
} from "@/lib/actions/gen-ed-course-actions";

export function GenEdCourseDialog({
  open,
  onOpenChange,
  course,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: GenEdCourseItem;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const formId = course ? `edit-gen-ed-course-${course.id}` : "create-gen-ed-course";

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) onOpenChange(nextOpen);
      }}
    >
      <ResponsiveDialogContent desktopClassName="sm:max-w-xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {course ? "Edit General Education Course" : "Add General Education Course"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {course
              ? `Update ${course.code}. Its scope remains college-wide General Education.`
              : "Create a college-wide General Education course."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="px-4 py-4 md:p-0">
          <CourseForm
            action={course ? updateGenEdCourseAction : createGenEdCourseAction}
            programs={[]}
            majors={[]}
            fixedScope={CourseScope.GENERAL_EDUCATION}
            formId={formId}
            submitLabel={course ? "Save Changes" : "Create Course"}
            defaultValues={
              course
                ? {
                    id: course.id,
                    code: course.code,
                    title: course.title,
                    course_scope: CourseScope.GENERAL_EDUCATION,
                    updated_at: course.updated_at.toISOString(),
                  }
                : { course_scope: CourseScope.GENERAL_EDUCATION }
            }
            onPendingChange={setPending}
            onSuccess={() => {
              onOpenChange(false);
              router.refresh();
            }}
          />
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <Button
            type="button"
            variant="outline"
            className="w-full md:w-auto"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} className="w-full md:w-auto" loading={pending}>
            {course ? "Save Changes" : "Create Course"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

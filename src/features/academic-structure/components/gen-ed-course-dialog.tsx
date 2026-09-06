"use client";

import { CourseScope } from "@prisma/client";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const formId = course ? `edit-gen-ed-course-${course.id}` : "create-gen-ed-course";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {course ? "Edit General Education Course" : "Add General Education Course"}
          </DialogTitle>
          <DialogDescription>
            {course
              ? `Update ${course.code}. Its scope remains college-wide General Education.`
              : "Create a college-wide General Education course."}
          </DialogDescription>
        </DialogHeader>
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
          onSuccess={() => {
            onOpenChange(false);
            router.refresh();
          }}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            {course ? "Save Changes" : "Create Course"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

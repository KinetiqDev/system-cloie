"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { createCourseAction } from "@/lib/actions/management-foundation-actions";
import type { ProgramFilterOption } from "@/features/academic-structure/services/list-management-courses-summary";

const FORM_ID = "course-create-form";

export function CourseCreateDialog({
  open,
  onOpenChange,
  programs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programs: ProgramFilterOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  // Set synchronously on the submit event; `pending` state only flips after
  // CourseForm's microtask and effect, leaving a dismissal window without it.
  const submittingRef = useRef(false);

  const handleOpenChange = (next: boolean) => {
    // A mutation in flight still creates the course server-side; dismissing
    // mid-submit would signal a cancellation that did not actually happen.
    if (!next && (submittingRef.current || pending)) {
      return;
    }
    onOpenChange(next);
  };

  const majors = programs.flatMap((program) =>
    program.majors.map((major) => ({
      id: major.id,
      name: major.name,
      program_id: program.id,
      program_code: program.code,
    }))
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent desktopClassName="sm:max-w-xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Add New Course</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Register a general education, program-wide, or major-specific course.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody
          className="px-4 py-4 md:p-0"
          onSubmitCapture={() => {
            submittingRef.current = true;
          }}
        >
          <CourseForm
            action={createCourseAction}
            programs={programs.map(({ id, code, name }) => ({ id, code, name }))}
            majors={majors}
            submitLabel="Create Course"
            formId={FORM_ID}
            onPendingChange={(nextPending) => {
              setPending(nextPending);
              if (!nextPending) {
                submittingRef.current = false;
              }
            }}
            onSuccess={() => {
              submittingRef.current = false;
              onOpenChange(false);
              router.refresh();
            }}
          />
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button
            variant="outline"
            className="w-full md:w-auto"
            disabled={pending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button form={FORM_ID} type="submit" className="w-full md:w-auto" loading={pending}>
            Create Course
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

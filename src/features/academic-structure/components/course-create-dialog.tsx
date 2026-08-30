"use client";

import { useState } from "react";
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

  const majors = programs.flatMap((program) =>
    program.majors.map((major) => ({
      id: major.id,
      name: major.name,
      program_id: program.id,
      program_code: program.code,
    }))
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // A mutation in flight still creates the course server-side; dismissing
        // mid-submit would signal a cancellation that did not actually happen.
        if (!next && pending) {
          return;
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-h-[min(85vh,720px)] sm:max-w-xl">
        <DialogHeader className="px-5 pt-5 pr-12 pb-1">
          <DialogTitle>Add New Course</DialogTitle>
          <DialogDescription>
            Register a new general education, program-wide, or major-specific course for downstream
            publishing flows.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-5 py-4">
          <CourseForm
            action={createCourseAction}
            programs={programs.map(({ id, code, name }) => ({ id, code, name }))}
            majors={majors}
            submitLabel="Create Course"
            formId={FORM_ID}
            onPendingChange={setPending}
            onSuccess={() => {
              onOpenChange(false);
              router.refresh();
            }}
          />
        </div>

        <div className="bg-muted/50 flex flex-col-reverse gap-2 rounded-b-xl border-t px-5 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button form={FORM_ID} type="submit" disabled={pending}>
            {pending ? "Creating..." : "Create Course"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

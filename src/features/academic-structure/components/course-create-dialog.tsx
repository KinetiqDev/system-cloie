"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
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

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const form = (
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
  );

  const footer = (
    <div
      className={
        isDesktop
          ? "bg-muted/50 flex flex-col-reverse gap-2 rounded-b-xl border-t px-5 py-4 sm:flex-row sm:justify-end"
          : "flex justify-end gap-2 pt-3"
      }
    >
      <Button variant="outline" disabled={pending} onClick={() => handleOpenChange(false)}>
        Cancel
      </Button>
      <Button form={FORM_ID} type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create Course"}
      </Button>
    </div>
  );

  if (!isDesktop) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange} showSwipeHandle>
        <DrawerContent className="flex max-h-[85dvh] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <DrawerHeader className="shrink-0 px-0 pt-4 pb-2 text-left">
            <DrawerTitle>Add New Course</DrawerTitle>
            <DrawerDescription className="line-clamp-2">
              Register a new general education, program-wide, or major-specific course for
              downstream publishing flows.
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">{form}</div>
          {footer}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-h-[min(85vh,720px)] sm:max-w-xl">
        <DialogHeader className="px-5 pt-5 pr-12 pb-1">
          <DialogTitle>Add New Course</DialogTitle>
          <DialogDescription>
            Register a new general education, program-wide, or major-specific course for downstream
            publishing flows.
          </DialogDescription>
        </DialogHeader>

        <div
          className="min-h-0 overflow-y-auto px-5 py-4"
          onSubmitCapture={() => {
            submittingRef.current = true;
          }}
        >
          {form}
        </div>

        {footer}
      </DialogContent>
    </Dialog>
  );
}

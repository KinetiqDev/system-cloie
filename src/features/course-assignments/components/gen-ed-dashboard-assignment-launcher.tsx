"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseAssignmentFormDialog } from "./course-assignment-form-dialog";
import type { AllProgramCourseAssignmentsPageData } from "../services/load-all-program-course-assignments-page";

export function GenEdDashboardAssignmentLauncher({
  assignmentOptions,
}: {
  assignmentOptions: AllProgramCourseAssignmentsPageData;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="default"
        className="w-full shadow-sm sm:w-auto pointer-coarse:min-h-11"
        onClick={() => setOpen(true)}
      >
        <Plus aria-hidden="true" data-icon="inline-start" />
        Create assignment
      </Button>
      <CourseAssignmentFormDialog
        open={open}
        onOpenChange={setOpen}
        availableCourses={assignmentOptions.availableCourses}
        availablePrograms={assignmentOptions.availablePrograms}
        termInstances={assignmentOptions.termInstances}
        defaultTermInstanceId={assignmentOptions.activeTermInstanceId}
        mode="general-education"
        onSuccess={() => router.refresh()}
      />
    </>
  );
}

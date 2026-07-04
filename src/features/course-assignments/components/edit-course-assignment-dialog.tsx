"use client";

import { useState, useEffect } from "react";
import { YearLevel, StudentSection, CourseScope } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";
import { ClassIdentityFields } from "./shared/class-identity-fields";
import { updateCourseAssignmentAction } from "@/lib/actions/course-assignment-actions";
import type { CourseAssignmentItem, AssignableCourse } from "@/features/course-assignments/types";

interface Program {
  id: string;
  code: string;
  name: string;
}

interface EditCourseAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: CourseAssignmentItem | null;
  availableCourses: AssignableCourse[];
  availablePrograms: Program[];
  onSuccess?: () => void;
}

export function EditCourseAssignmentDialog({
  open,
  onOpenChange,
  assignment,
  availableCourses,
  availablePrograms,
  onSuccess,
}: EditCourseAssignmentDialogProps) {
  const [programId, setProgramId] = useState<string>("");
  const [yearLevel, setYearLevel] = useState<YearLevel>(YearLevel.FIRST_YEAR);
  const [section, setSection] = useState<StudentSection>(StudentSection.MORNING);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const course = assignment
    ? availableCourses.find((c) => c.id === assignment.courseId)
    : undefined;
  const isGeneralEducation = course?.course_scope === CourseScope.GENERAL_EDUCATION;
  const programDisabled = !isGeneralEducation;

  useEffect(() => {
    if (open && assignment) {
      // Prefill form when the dialog opens or changes assignment.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProgramId(assignment.programId);
      setYearLevel(assignment.yearLevel);
      setSection(assignment.section);
    }
  }, [open, assignment]);

  const handleSubmit = async () => {
    if (!assignment) return;

    setIsSubmitting(true);

    const result = await updateCourseAssignmentAction({
      assignmentId: assignment.id,
      programId,
      yearLevel,
      section,
    });

    setIsSubmitting(false);

    if (result.success) {
      showToast("Assignment updated successfully.", "success");
      onOpenChange(false);
      onSuccess?.();
    } else {
      showToast(result.error || "Failed to update assignment.", "error");
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) return;
    onOpenChange(nextOpen);
  };

  const hasChanges =
    assignment &&
    (programId !== assignment.programId ||
      yearLevel !== assignment.yearLevel ||
      section !== assignment.section);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Class Identity</DialogTitle>
        </DialogHeader>

        {assignment && (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              <p>
                <strong>Course:</strong> {assignment.courseCode} — {assignment.courseTitle}
              </p>
              <p>
                <strong>Faculty:</strong> {assignment.facultyName}
              </p>
              <p>
                <strong>Term:</strong> {assignment.termLabel}
              </p>
              <p className="pt-1 text-xs text-muted-foreground">
                Course, faculty, and term cannot be edited here. If one is wrong, deactivate
                this assignment and create the correct replacement.
              </p>
            </div>

            <ClassIdentityFields
              programId={programId}
              yearLevel={yearLevel}
              section={section}
              availablePrograms={availablePrograms}
              onProgramChange={setProgramId}
              onYearLevelChange={setYearLevel}
              onSectionChange={(value) => value && setSection(value)}
              programDisabled={programDisabled}
              suggestedYearLevel={course?.default_year_level ?? null}
            />

            {isGeneralEducation ? (
              <p className="text-xs text-muted-foreground">
                General Education assignments can be assigned to any active program.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Program-specific assignments are locked to the course&apos;s owning program.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !hasChanges}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

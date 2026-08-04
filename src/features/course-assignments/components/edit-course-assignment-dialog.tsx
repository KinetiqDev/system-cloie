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
import { FacultySearchPopover } from "./shared/faculty-search-popover";
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
  selectedProgramId?: string;
}

export function EditCourseAssignmentDialog({
  open,
  onOpenChange,
  assignment,
  availableCourses,
  availablePrograms,
  onSuccess,
  selectedProgramId,
}: EditCourseAssignmentDialogProps) {
  const [programId, setProgramId] = useState<string>("");
  const [yearLevel, setYearLevel] = useState<YearLevel>(YearLevel.FIRST_YEAR);
  const [section, setSection] = useState<StudentSection>(StudentSection.MORNING);
  const [facultyId, setFacultyId] = useState<string>("");
  const [facultyName, setFacultyName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const course = assignment
    ? availableCourses.find((c) => c.id === assignment.courseId)
    : undefined;
  const isGeneralEducation = course?.course_scope === CourseScope.GENERAL_EDUCATION;
  const programDisabled = !isGeneralEducation;
  const identityLocked = (assignment?.rosterMembershipCount ?? 0) > 0;

  useEffect(() => {
    if (open && assignment) {
      // Prefill form when the dialog opens or changes assignment.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProgramId(assignment.programId);
      setYearLevel(assignment.yearLevel);
      setSection(assignment.section);
      setFacultyId(assignment.facultyId);
      setFacultyName(assignment.facultyName ?? null);
    }
  }, [open, assignment]);

  const handleSubmit = async () => {
    if (!assignment) return;

    setIsSubmitting(true);

    const identityChanged =
      programId !== assignment.programId ||
      yearLevel !== assignment.yearLevel ||
      section !== assignment.section;
    const facultyChanged = facultyId !== assignment.facultyId;

    if (identityChanged || facultyChanged) {
      const result = await updateCourseAssignmentAction({
        assignmentId: assignment.id,
        ...(identityChanged && { programId, yearLevel, section }),
        ...(facultyChanged && { facultyId }),
        ...(selectedProgramId && { selectedProgramId }),
      });
      if (!result.success) {
        setIsSubmitting(false);
        const supportSuffix =
          "referenceId" in result && result.referenceId
            ? ` Support reference: ${result.referenceId}.`
            : "";
        showToast(`${result.error || "Failed to update assignment."}${supportSuffix}`, "error");
        return;
      }
    }

    setIsSubmitting(false);
    showToast("Assignment updated successfully.", "success");
    onOpenChange(false);
    onSuccess?.();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) return;
    onOpenChange(nextOpen);
  };

  const hasChanges =
    assignment &&
    (programId !== assignment.programId ||
      yearLevel !== assignment.yearLevel ||
      section !== assignment.section ||
      facultyId !== assignment.facultyId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Course Assignment</DialogTitle>
        </DialogHeader>

        {assignment && (
          <div className="space-y-4">
            <div className="bg-muted/40 space-y-1 rounded-md border p-3 text-sm">
              <p>
                <strong>Course:</strong> {assignment.courseCode} — {assignment.courseTitle}
              </p>
              <p>
                <strong>Faculty:</strong> {assignment.facultyName}
              </p>
              <p>
                <strong>Term:</strong> {assignment.termLabel}
              </p>
              <p className="text-muted-foreground pt-1 text-xs">
                {identityLocked
                  ? "Course, academic period, program, year level, and section are locked because this assignment has roster membership history. Faculty reassignment remains available."
                  : "Course and academic period cannot be edited here. Class identity locks after the first roster membership; Faculty reassignment remains available."}
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
              disabled={identityLocked}
              programDisabled={programDisabled}
              suggestedYearLevel={course?.default_year_level ?? null}
            />

            {isGeneralEducation ? (
              <p className="text-muted-foreground text-xs">
                General Education assignments can be assigned to any active program.
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Program-specific assignments are locked to the course&apos;s owning program.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="assignment-faculty">
                Faculty
              </label>
              <FacultySearchPopover
                id="assignment-faculty"
                selectedFacultyId={facultyId || null}
                selectedFacultyName={facultyName}
                targetProgramId={assignment.programId}
                targetProgramName={assignment.programName}
                onSelect={(faculty) => {
                  setFacultyId(faculty.id);
                  setFacultyName(`${faculty.firstName} ${faculty.lastName}`);
                }}
              />
            </div>
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

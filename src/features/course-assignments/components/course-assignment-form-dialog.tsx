"use client";

import { useState, useEffect, useRef } from "react";
import { YearLevel, StudentSection, CourseScope } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showToast } from "@/components/ui/toast";
import { UserIcon } from "lucide-react";
import { TermInstancePicker } from "@/features/academic-calendar/components/term-instance-picker";
import { ClassIdentityFields } from "./shared/class-identity-fields";
import { FacultySearchPopover } from "./shared/faculty-search-popover";
import { WizardStepper } from "./shared/wizard-stepper";
import { AssignmentSummaryBlock } from "./shared/assignment-summary-block";
import { createCourseAssignmentAction } from "@/lib/actions/course-assignment-actions";
import type { AssignableCourse, FacultySearchResult } from "@/features/course-assignments/types";
import type { TermInstanceItem } from "@/features/academic-calendar/types";
import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import { STUDENT_SECTION_OPTIONS } from "@/lib/constants/academic";

interface Program {
  id: string;
  code: string;
  name: string;
}

type CourseAssignmentFormMode = "program-head" | "all-program";

function getInitialProgramId(
  defaultCourseId: string | null | undefined,
  availableCourses: AssignableCourse[]
): string | null {
  if (!defaultCourseId) return null;
  const course = availableCourses.find((c) => c.id === defaultCourseId);
  if (course?.course_scope === CourseScope.PROGRAM_SPECIFIC) {
    return course.program_id;
  }
  return null;
}

interface CourseAssignmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableCourses: AssignableCourse[];
  availablePrograms: Program[];
  termInstances: TermInstanceItem[];
  defaultTermInstanceId?: string | null;
  defaultCourseId?: string | null;
  mode?: CourseAssignmentFormMode;
  onSuccess?: () => void;
  selectedProgramId?: string;
}

type Step = "term" | "course" | "class" | "faculty" | "confirm";

export function CourseAssignmentFormDialog({
  open,
  onOpenChange,
  availableCourses,
  availablePrograms,
  termInstances,
  defaultTermInstanceId,
  defaultCourseId,
  mode = "program-head",
  onSuccess,
  selectedProgramId,
}: CourseAssignmentFormDialogProps) {
  const [step, setStep] = useState<Step>(defaultTermInstanceId ? "course" : "term");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [termInstanceId, setTermInstanceId] = useState<string | null>(defaultTermInstanceId ?? null);
  const [courseId, setCourseId] = useState<string | null>(defaultCourseId ?? null);
  const [programId, setProgramId] = useState<string | null>(
    getInitialProgramId(defaultCourseId, availableCourses)
  );
  const [yearLevel, setYearLevel] = useState<YearLevel>(YearLevel.FIRST_YEAR);
  const [section, setSection] = useState<StudentSection>(StudentSection.MORNING);
  const [selectedFaculty, setSelectedFaculty] = useState<FacultySearchResult | null>(null);
  const [showCrossProgramWarning, setShowCrossProgramWarning] = useState(false);
  const [hasTouchedYearLevel, setHasTouchedYearLevel] = useState(false);

  const previousCourseId = useRef<string | null>(null);

  const assignableCourses =
    mode === "all-program"
      ? availableCourses
      : availableCourses.filter(
          (c) =>
            c.course_scope === CourseScope.PROGRAM_SPECIFIC &&
            (selectedProgramId ? c.program_id === selectedProgramId : availablePrograms.some((p) => p.id === c.program_id))
        );

  const selectedCourse = assignableCourses.find((c) => c.id === courseId);
  const isGeneralEducation = selectedCourse?.course_scope === CourseScope.GENERAL_EDUCATION;
  const programLocked = !isGeneralEducation;
  const selectedProgram = availablePrograms.find((p) => p.id === programId);

  // Pre-fill year level from course default when course changes (only if user hasn't touched it)
  useEffect(() => {
    if (courseId && courseId !== previousCourseId.current && !hasTouchedYearLevel) {
      if (selectedCourse?.default_year_level) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- controlled prefill of default year level when course changes and user has not manually edited it
        setYearLevel(selectedCourse.default_year_level);
      }
    }
    previousCourseId.current = courseId;
  }, [courseId, hasTouchedYearLevel, selectedCourse?.default_year_level]);
  // Note: setYearLevel in effect is safe - guarded by hasTouchedYearLevel and course existence checks

  const handleYearLevelChange = (value: YearLevel) => {
    setHasTouchedYearLevel(true);
    setYearLevel(value);
  };

  const handleNext = () => {
    if (isSubmitting) return;

    if (step === "term") setStep("course");
    else if (step === "course") setStep("class");
    else if (step === "class") setStep("faculty");
    else if (step === "faculty") {
      // Check for cross-program assignment
      if (
        selectedFaculty &&
        selectedProgram &&
        !selectedFaculty.affiliations.includes(selectedProgram.name)
      ) {
        setShowCrossProgramWarning(true);
        setStep("confirm");
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (isSubmitting) return;

    if (step === "course") setStep("term");
    else if (step === "class") setStep("course");
    else if (step === "faculty") setStep("class");
    else if (step === "confirm") {
      setShowCrossProgramWarning(false);
      setStep("faculty");
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!termInstanceId || !courseId || !programId || !selectedFaculty) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    setIsSubmitting(true);

    const result = await createCourseAssignmentAction({
      termInstanceId,
      facultyId: selectedFaculty.id,
      courseId,
      programId,
      yearLevel,
      section,
      ...(selectedProgramId ? { selectedProgramId } : {}),
    });

    setIsSubmitting(false);

    if (result.success) {
      showToast("Course assignment created successfully.", "success");
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } else {
      const supportSuffix =
        "referenceId" in result && result.referenceId
          ? ` Support reference: ${result.referenceId}.`
          : "";
      showToast(`${result.error || "Failed to create assignment."}${supportSuffix}`, "error");
    }
  };

  const resetForm = () => {
    setStep(defaultTermInstanceId ? "course" : "term");
    setTermInstanceId(defaultTermInstanceId ?? null);
    setCourseId(defaultCourseId ?? null);
    setProgramId(getInitialProgramId(defaultCourseId, availableCourses));
    setYearLevel(YearLevel.FIRST_YEAR);
    setSection(StudentSection.MORNING);
    setSelectedFaculty(null);
    setShowCrossProgramWarning(false);
    setHasTouchedYearLevel(false);
    previousCourseId.current = null;
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && isSubmitting) {
      return;
    }

    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const canProceed = () => {
    switch (step) {
      case "term":
        return !!termInstanceId;
      case "course":
        return !!selectedCourse;
      case "class":
        return !!programId && !!section;
      case "faculty":
        return !!selectedFaculty;
      case "confirm":
        return true;
    }
  };

  const STEPS: { key: Step; label: string }[] = [
    { key: "term", label: "Term" },
    { key: "course", label: "Course" },
    { key: "class", label: "Class" },
    { key: "faculty", label: "Faculty" },
    { key: "confirm", label: "Confirm" },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Assign Faculty to Course</DialogTitle>
        </DialogHeader>

        <WizardStepper steps={STEPS} currentStep={step} />

        {step === "term" && (
           <div className="space-y-4">
             <TermInstancePicker
                 id="course-assignment-term-instance"
                 termInstances={termInstances}
                 value={termInstanceId ?? ""}
                 onChange={(val) => setTermInstanceId(val || null)}
                 label="Academic Term"
             />
           </div>
        )}

        {step === "course" && (
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="assignment-course">Course</FieldLabel>
              <FieldContent>
                <Select
                value={courseId ?? ""}
                onValueChange={(value) => {
                  if (!value) return;
                  setCourseId(value);
                  const nextCourse = assignableCourses.find((c) => c.id === value);
                  setProgramId(nextCourse?.program_id ?? null);
                  setHasTouchedYearLevel(false);
                }}
              >
                <SelectTrigger id="assignment-course">
                  <SelectValue placeholder="Select a course...">
                    {courseId
                      ? (() => {
                          const c = assignableCourses.find((c) => c.id === courseId);
                          return c ? `${c.code} — ${c.title}` : null;
                        })()
                      : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {assignableCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.code} — {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </FieldContent>
            </Field>
          </div>
        )}

        {step === "class" && (
          <div className="space-y-4">
            <ClassIdentityFields
              programId={programId ?? ""}
              yearLevel={yearLevel}
              section={section}
              availablePrograms={availablePrograms}
              onProgramChange={setProgramId}
              onYearLevelChange={handleYearLevelChange}
              onSectionChange={(value) => value && setSection(value)}
              programDisabled={programLocked}
              suggestedYearLevel={selectedCourse?.default_year_level ?? null}
            />
          </div>
        )}

        {step === "faculty" && (
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="assignment-faculty">Select Faculty</FieldLabel>
              <FieldContent>
                <FacultySearchPopover
                  id="assignment-faculty"
                  selectedFacultyId={selectedFaculty?.id ?? null}
                  selectedFacultyName={
                    selectedFaculty
                      ? `${selectedFaculty.firstName} ${selectedFaculty.lastName}`
                      : null
                  }
                  targetProgramId={programId ?? undefined}
                  targetProgramName={selectedProgram?.name}
                  onSelect={setSelectedFaculty}
                />
              </FieldContent>
            </Field>

            {selectedFaculty && (
              <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <UserIcon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium leading-snug">
                    {selectedFaculty.firstName} {selectedFaculty.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{selectedFaculty.email}</p>
                  {selectedFaculty.primaryAffiliation && (
                    <p className="text-xs text-muted-foreground">
                      {selectedFaculty.primaryAffiliation}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === "confirm" && showCrossProgramWarning && (
          <div className="space-y-4">
            <Alert variant="warning">
              <AlertTitle>Cross-Program Assignment</AlertTitle>
              <AlertDescription>
                {selectedFaculty?.firstName} {selectedFaculty?.lastName} is not affiliated with{" "}
                {selectedProgram?.name}. Are you sure you want to proceed?
              </AlertDescription>
            </Alert>

            <AssignmentSummaryBlock title="Assignment Summary">
              <div className="space-y-1.5 text-sm">
                <div className="flex gap-2">
                  <span className="w-16 shrink-0 text-muted-foreground">Course</span>
                  <span className="font-medium">{selectedCourse?.code} — {selectedCourse?.title}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-16 shrink-0 text-muted-foreground">Program</span>
                  <span>{selectedProgram?.code}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-16 shrink-0 text-muted-foreground">Year</span>
                  <span>{getYearLevelDisplay(yearLevel)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-16 shrink-0 text-muted-foreground">Section</span>
                  <span>
                    {STUDENT_SECTION_OPTIONS.find((o) => o.value === section)?.label ?? section}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-16 shrink-0 text-muted-foreground">Faculty</span>
                  <span>{selectedFaculty?.firstName} {selectedFaculty?.lastName}</span>
                </div>
              </div>
            </AssignmentSummaryBlock>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div>
            {step !== "term" && step !== "confirm" && (
              <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
                Back
              </Button>
            )}
            {step === "confirm" && (
              <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            {step === "confirm" ? (
              <Button loading={isSubmitting} onClick={handleSubmit}>
                Confirm Assignment
              </Button>
            ) : (
              <Button loading={isSubmitting} onClick={handleNext} disabled={!canProceed()}>
                Next
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

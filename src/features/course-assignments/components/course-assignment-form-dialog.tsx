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
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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

type CourseAssignmentFormMode = "program-head" | "all-program" | "general-education";

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

function assignmentSubmitError(result: Awaited<ReturnType<typeof createCourseAssignmentAction>>) {
  if (result.success) return null;
  const supportSuffix =
    "referenceId" in result && result.referenceId
      ? ` Support reference: ${result.referenceId}.`
      : "";
  return `${result.error || "Failed to create assignment."}${supportSuffix}`;
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

interface AssignmentStepContentProps {
  step: Step;
  termInstances: TermInstanceItem[];
  termInstanceId: string | null;
  onTermChange: (value: string | null) => void;
  courseId: string | null;
  assignableCourses: AssignableCourse[];
  onCourseChange: (value: string) => void;
  programId: string | null;
  yearLevel: YearLevel;
  section: StudentSection;
  availablePrograms: Program[];
  onProgramChange: (value: string) => void;
  onYearLevelChange: (value: YearLevel) => void;
  onSectionChange: (value: StudentSection | null) => void;
  programLocked: boolean;
  suggestedYearLevel: YearLevel | null | undefined;
  selectedFaculty: FacultySearchResult | null;
  selectedProgramName: string | undefined;
  selectedProgramCode: string | undefined;
  onFacultySelect: (faculty: FacultySearchResult | null) => void;
  showCrossProgramWarning: boolean;
  selectedCourse: AssignableCourse | undefined;
}

function AssignmentStepContent({
  step,
  termInstances,
  termInstanceId,
  onTermChange,
  courseId,
  assignableCourses,
  onCourseChange,
  programId,
  yearLevel,
  section,
  availablePrograms,
  onProgramChange,
  onYearLevelChange,
  onSectionChange,
  programLocked,
  suggestedYearLevel,
  selectedFaculty,
  selectedProgramName,
  selectedProgramCode,
  onFacultySelect,
  showCrossProgramWarning,
  selectedCourse,
}: AssignmentStepContentProps) {
  switch (step) {
    case "term":
      return (
        <TermInstancePicker
          id="course-assignment-term-instance"
          termInstances={termInstances}
          value={termInstanceId ?? ""}
          onChange={(value) => onTermChange(value || null)}
          label="Academic Term"
        />
      );
    case "course":
      return (
        <CourseStep courseId={courseId} courses={assignableCourses} onChange={onCourseChange} />
      );
    case "class":
      return (
        <ClassIdentityFields
          programId={programId ?? ""}
          yearLevel={yearLevel}
          section={section}
          availablePrograms={availablePrograms}
          onProgramChange={onProgramChange}
          onYearLevelChange={onYearLevelChange}
          onSectionChange={onSectionChange}
          programDisabled={programLocked}
          suggestedYearLevel={suggestedYearLevel}
        />
      );
    case "faculty":
      return (
        <FacultyStep
          programId={programId}
          selectedProgramName={selectedProgramName}
          selectedFaculty={selectedFaculty}
          onFacultySelect={onFacultySelect}
        />
      );
    case "confirm":
      return showCrossProgramWarning ? (
        <ConfirmStep
          selectedCourse={selectedCourse}
          selectedProgramCode={selectedProgramCode}
          selectedProgramName={selectedProgramName}
          selectedFaculty={selectedFaculty}
          yearLevel={yearLevel}
          section={section}
        />
      ) : null;
  }
}

function CourseStep({
  courseId,
  courses,
  onChange,
}: {
  courseId: string | null;
  courses: AssignableCourse[];
  onChange: (value: string) => void;
}) {
  const selectedCourse = courses.find((item) => item.id === courseId) ?? null;

  return (
    <Field>
      <FieldLabel htmlFor="assignment-course">Course</FieldLabel>
      <FieldContent>
        <Combobox
          value={selectedCourse}
          onValueChange={(value) => value && onChange(value.id)}
          items={courses}
          filter={(course, query) =>
            !query ||
            [course.code, course.title].some((v) =>
              v.toLowerCase().includes(query.toLowerCase())
            )
          }
          itemToStringLabel={(c) => `${c.code} — ${c.title}`}
          itemToStringValue={(c) => c.id}
          autoHighlight
        >
          <ComboboxInput
            id="assignment-course"
            className="w-full"
            placeholder="Search by code or title…"
          />
          <ComboboxContent>
            <ComboboxEmpty>No courses match your search.</ComboboxEmpty>
            <ComboboxList>
              {(course) => (
                <ComboboxItem key={course.id} value={course}>
                  {course.code} — {course.title}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </FieldContent>
    </Field>
  );
}

function FacultyStep({
  programId,
  selectedProgramName,
  selectedFaculty,
  onFacultySelect,
}: Pick<
  AssignmentStepContentProps,
  "programId" | "selectedProgramName" | "selectedFaculty" | "onFacultySelect"
>) {
  return (
    <>
      <Field>
        <FieldLabel htmlFor="assignment-faculty">Select Faculty</FieldLabel>
        <FieldContent>
          <FacultySearchPopover
            id="assignment-faculty"
            selectedFacultyId={selectedFaculty?.id ?? null}
            selectedFacultyName={selectedFaculty?.name ?? null}
            targetProgramId={programId ?? undefined}
            targetProgramName={selectedProgramName}
            onSelect={onFacultySelect}
          />
        </FieldContent>
      </Field>
      {selectedFaculty && (
        <div className="bg-muted/40 flex items-start gap-3 rounded-xl border p-4">
          <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
            <UserIcon className="text-primary h-4 w-4" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm leading-snug font-medium">{selectedFaculty.name}</p>
            <p className="text-muted-foreground text-xs">{selectedFaculty.email}</p>
            {selectedFaculty.primaryAffiliation && (
              <p className="text-muted-foreground text-xs">{selectedFaculty.primaryAffiliation}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ConfirmStep({
  selectedCourse,
  selectedProgramCode,
  selectedProgramName,
  selectedFaculty,
  yearLevel,
  section,
}: Pick<
  AssignmentStepContentProps,
  | "selectedCourse"
  | "selectedProgramCode"
  | "selectedProgramName"
  | "selectedFaculty"
  | "yearLevel"
  | "section"
>) {
  return (
    <>
      <Alert variant="warning">
        <AlertTitle>Cross-Program Assignment</AlertTitle>
        <AlertDescription>
          {selectedFaculty?.name} is not affiliated with{" "}
          {selectedProgramName}. Are you sure you want to proceed?
        </AlertDescription>
      </Alert>
      <AssignmentSummaryBlock title="Assignment Summary">
        <div className="space-y-1.5 text-sm">
          <div className="flex gap-2">
            <span className="text-muted-foreground w-16 shrink-0">Course</span>
            <span className="font-medium">
              {selectedCourse?.code} — {selectedCourse?.title}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-16 shrink-0">Program</span>
            <span>{selectedProgramCode}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-16 shrink-0">Year</span>
            <span>{getYearLevelDisplay(yearLevel)}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-16 shrink-0">Section</span>
            <span>
              {STUDENT_SECTION_OPTIONS.find((o) => o.value === section)?.label ?? section}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-16 shrink-0">Faculty</span>
            <span>{selectedFaculty?.name}</span>
          </div>
        </div>
      </AssignmentSummaryBlock>
    </>
  );
}

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
  const [termInstanceId, setTermInstanceId] = useState<string | null>(
    defaultTermInstanceId ?? null
  );
  const [courseId, setCourseId] = useState<string | null>(defaultCourseId ?? null);
  const [programId, setProgramId] = useState<string | null>(
    selectedProgramId ?? getInitialProgramId(defaultCourseId, availableCourses)
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
      : mode === "general-education"
        ? availableCourses.filter((c) => c.course_scope === CourseScope.GENERAL_EDUCATION)
        : availableCourses.filter(
            (c) =>
              c.course_scope === CourseScope.PROGRAM_SPECIFIC &&
              (selectedProgramId
                ? c.program_id === selectedProgramId
                : availablePrograms.some((p) => p.id === c.program_id))
          );

  const selectedCourse = assignableCourses.find((c) => c.id === courseId);
  const isGeneralEducation = selectedCourse?.course_scope === CourseScope.GENERAL_EDUCATION;
  const programLocked = !isGeneralEducation;
  const selectedProgram = availablePrograms.find((p) => p.id === programId);

  const nextStepAfter = (current: Step): Step => {
    if (current === "term") return "course";
    if (current === "course") return "class";
    if (current === "class") return "faculty";
    if (current === "faculty") return "confirm";
    return "confirm";
  };

  const previousStepBefore = (current: Step): Step => {
    if (current === "course") return "term";
    if (current === "class") return "course";
    if (current === "faculty") return "class";
    return "faculty";
  };

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

  const handleProgramChange = (value: string) => {
    if (value === programId) return;
    setProgramId(value);
  };

  const handleCourseChange = (value: string) => {
    setCourseId(value);
    const nextCourse = assignableCourses.find((c) => c.id === value);
    setProgramId(nextCourse?.program_id ?? null);
    setHasTouchedYearLevel(false);
  };

  const handleNext = () => {
    if (isSubmitting) return;

    if (["term", "course", "class"].includes(step)) {
      setStep(nextStepAfter(step));
      return;
    }
    if (step !== "faculty") return;
    if (
      selectedFaculty &&
      selectedProgram &&
      !selectedFaculty.affiliations.includes(selectedProgram.name)
    ) {
      setShowCrossProgramWarning(true);
      setStep("confirm");
      return;
    }
    handleSubmit();
  };

  const handleBack = () => {
    if (isSubmitting) return;

    if (step === "term") return;
    if (step === "course" || step === "class" || step === "faculty") {
      setStep(previousStepBefore(step));
    }
    if (step === "confirm") {
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

    const error = assignmentSubmitError(result);
    if (!error) {
      showToast("Course assignment created successfully.", "success");
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } else {
      showToast(error, "error");
    }
  };

  const resetForm = () => {
    setStep(defaultTermInstanceId ? "course" : "term");
    setTermInstanceId(defaultTermInstanceId ?? null);
    setCourseId(defaultCourseId ?? null);
    setProgramId(selectedProgramId ?? getInitialProgramId(defaultCourseId, availableCourses));
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

        <AssignmentStepContent
          step={step}
          termInstances={termInstances}
          termInstanceId={termInstanceId}
          onTermChange={setTermInstanceId}
          courseId={courseId}
          assignableCourses={assignableCourses}
          onCourseChange={handleCourseChange}
          programId={programId}
          yearLevel={yearLevel}
          section={section}
          availablePrograms={availablePrograms}
          onProgramChange={handleProgramChange}
          onYearLevelChange={handleYearLevelChange}
          onSectionChange={(value) => value && setSection(value)}
          programLocked={programLocked}
          suggestedYearLevel={selectedCourse?.default_year_level}
          selectedFaculty={selectedFaculty}
          selectedProgramName={selectedProgram?.name}
          selectedProgramCode={selectedProgram?.code}
          onFacultySelect={setSelectedFaculty}
          showCrossProgramWarning={showCrossProgramWarning}
          selectedCourse={selectedCourse}
        />

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
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
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

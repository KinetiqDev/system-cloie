"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AcademicSemester, AcademicTerm, CourseScope, YearLevel } from "@prisma/client";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showToast } from "@/components/ui/toast";
import { YEAR_LEVEL_OPTIONS } from "@/lib/constants/year-levels";
import { SEMESTER_OPTIONS, TERM_OPTIONS } from "@/lib/constants/academic";

type ProgramOption = {
  id: string;
  code: string;
  name: string;
};

type MajorOption = {
  id: string;
  name: string;
  program_id: string;
  program_code: string;
};

type CourseFormProps = {
  action: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  programs: ProgramOption[];
  majors: MajorOption[];
  defaultValues?: {
    id?: string;
    code?: string;
    title?: string;
    course_scope?: CourseScope;
    program_id?: string | null;
    major_id?: string | null;
    default_year_level?: YearLevel | null;
    default_semester?: AcademicSemester | null;
    default_term?: AcademicTerm | null;
    /** Optimistic concurrency token carried to the update action. */
    updated_at?: string;
  };
  submitLabel?: string;
  onSuccess?: () => void;
  /** Optional form id so an external submit button can target it. */
  formId?: string;
  /** Reports the form's pending state to a parent (e.g. a dialog footer button). */
  onPendingChange?: (pending: boolean) => void;
  /** Locks the form to a role-owned scope and hides irrelevant relationship controls. */
  fixedScope?: CourseScope;
};

export function CourseForm({
  action,
  programs,
  majors,
  defaultValues,
  submitLabel = "Save Course",
  onSuccess,
  formId,
  onPendingChange,
  fixedScope,
}: CourseFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<CourseScope>(
    fixedScope ?? defaultValues?.course_scope ?? CourseScope.PROGRAM_SPECIFIC
  );
  const [programId, setProgramId] = useState(defaultValues?.program_id ?? "");
  const [majorId, setMajorId] = useState(defaultValues?.major_id ?? "");
  const [yearLevel, setYearLevel] = useState<YearLevel | "">(
    defaultValues?.default_year_level ?? ""
  );
  const [semester, setSemester] = useState<AcademicSemester | "">(
    defaultValues?.default_semester ?? ""
  );
  const [term, setTerm] = useState<AcademicTerm | "">(
    defaultValues?.default_semester === AcademicSemester.SUMMER
      ? ""
      : (defaultValues?.default_term ?? "")
  );

  const isSummer = semester === AcademicSemester.SUMMER;

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  const filteredMajors = useMemo(() => {
    if (!programId) {
      return majors;
    }

    return majors.filter((major) => major.program_id === programId);
  }, [majors, programId]);

  async function handleSubmit(formData: FormData) {
    setError(null);

    // Wait one tick to ensure state is flushed (React batching issue with form submissions)
    await Promise.resolve();

    formData.set("default_year_level", yearLevel);
    formData.set("default_semester", semester);
    formData.set("default_term", isSummer ? "" : term);

    const code = String(formData.get("code") ?? "").trim();
    const isEdit = Boolean(defaultValues?.id);

    startTransition(async () => {
      let result: { success: boolean; error?: string };
      try {
        result = await action(formData);
      } catch {
        const message = "Something went wrong while saving the course. Please try again.";
        setError(message);
        showToast(message, "error");
        return;
      }

      if (!result.success) {
        const message = result.error ?? "Unable to save course.";
        setError(message);
        showToast(message, "error");
        return;
      }

      if (!isEdit) {
        setYearLevel("");
        setSemester("");
        setTerm("");
        setMajorId("");
      }
      const subject = code ? `Course ${code}` : "Course";
      showToast(`${subject} ${isEdit ? "updated" : "created"}.`, "success");

      onSuccess?.();
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4" id={formId}>
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}
      {defaultValues?.updated_at && (
        <input type="hidden" name="updated_at" value={defaultValues.updated_at} />
      )}
      <input type="hidden" name="course_scope" value={scope} />
      <input type="hidden" name="program_id" value={programId} />
      <input type="hidden" name="major_id" value={majorId} />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`course-code-${defaultValues?.id ?? "new"}`}>Course Code</Label>
          <Input
            id={`course-code-${defaultValues?.id ?? "new"}`}
            name="code"
            placeholder="IT101"
            defaultValue={defaultValues?.code}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`course-title-${defaultValues?.id ?? "new"}`}>Course Title</Label>
          <Input
            id={`course-title-${defaultValues?.id ?? "new"}`}
            name="title"
            placeholder="Introduction to Computing"
            defaultValue={defaultValues?.title}
            required
          />
        </div>
      </div>

      {!fixedScope && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={`course-scope-${defaultValues?.id ?? "new"}`}>Course Scope</Label>
            <Select
              value={scope}
              onValueChange={(value) => {
                const nextScope = value as CourseScope;
                setScope(nextScope);
                if (nextScope === CourseScope.GENERAL_EDUCATION) {
                  setProgramId("");
                  setMajorId("");
                }
              }}
            >
              <SelectTrigger id={`course-scope-${defaultValues?.id ?? "new"}`} className="w-full">
                <SelectValue>
                  {scope === CourseScope.GENERAL_EDUCATION
                    ? "General Education"
                    : "Program-Specific"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CourseScope.GENERAL_EDUCATION}>General Education</SelectItem>
                <SelectItem value={CourseScope.PROGRAM_SPECIFIC}>Program-Specific</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`course-program-${defaultValues?.id ?? "new"}`}>Program</Label>
            <Select
              value={programId}
              onValueChange={(value) => {
                setProgramId(value ?? "");
                setMajorId("");
              }}
              disabled={scope === CourseScope.GENERAL_EDUCATION}
            >
              <SelectTrigger id={`course-program-${defaultValues?.id ?? "new"}`} className="w-full">
                <SelectValue>
                  {programId
                    ? (programs.find((p) => p.id === programId)?.code ?? "No program")
                    : "No program"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No program</SelectItem>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.code} - {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`course-major-${defaultValues?.id ?? "new"}`}>Major</Label>
            <Select
              value={majorId}
              onValueChange={(value) => setMajorId(value ?? "")}
              disabled={scope === CourseScope.GENERAL_EDUCATION || !programId}
            >
              <SelectTrigger id={`course-major-${defaultValues?.id ?? "new"}`} className="w-full">
                <SelectValue>
                  {majorId
                    ? (filteredMajors.find((m) => m.id === majorId)?.name ?? "Program-wide / none")
                    : "Program-wide / none"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Program-wide / none</SelectItem>
                {filteredMajors.map((major) => (
                  <SelectItem key={major.id} value={major.id}>
                    {major.program_code} - {major.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="border-border bg-surface-alt grid gap-4 rounded-lg border p-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`year-level-${defaultValues?.id ?? "new"}`}>
            Year Level <span className="text-text-muted text-xs font-normal">(default)</span>
          </Label>
          <Select value={yearLevel} onValueChange={(value) => setYearLevel(value as YearLevel)}>
            <SelectTrigger id={`year-level-${defaultValues?.id ?? "new"}`} className="w-full">
              <SelectValue>
                {yearLevel
                  ? (YEAR_LEVEL_OPTIONS.find((o) => o.value === yearLevel)?.label ?? "None")
                  : "None"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {YEAR_LEVEL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`semester-${defaultValues?.id ?? "new"}`}>
            Semester <span className="text-text-muted text-xs font-normal">(default)</span>
          </Label>
          <Select
            value={semester}
            onValueChange={(value) => {
              const nextSemester = value as AcademicSemester;
              setSemester(nextSemester);
              if (nextSemester === AcademicSemester.SUMMER) {
                setTerm("");
              }
            }}
          >
            <SelectTrigger id={`semester-${defaultValues?.id ?? "new"}`} className="w-full">
              <SelectValue>
                {semester
                  ? (SEMESTER_OPTIONS.find((o) => o.value === semester)?.label ?? "None")
                  : "None"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {SEMESTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`term-${defaultValues?.id ?? "new"}`}>
            Term <span className="text-text-muted text-xs font-normal">(default)</span>
          </Label>
          <Select
            value={isSummer ? "" : term}
            onValueChange={(value) => setTerm(value as AcademicTerm)}
            disabled={isSummer}
          >
            <SelectTrigger id={`term-${defaultValues?.id ?? "new"}`} className="w-full">
              <SelectValue>
                {isSummer
                  ? "N/A"
                  : term
                    ? (TERM_OPTIONS.find((o) => o.value === term)?.label ?? "Select term")
                    : "Select term"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {isSummer ? (
                <SelectItem value="">N/A</SelectItem>
              ) : (
                <>
                  <SelectItem value="">Select term</SelectItem>
                  <SelectItem value={AcademicTerm.FIRST_TERM}>1st Term</SelectItem>
                  <SelectItem value={AcademicTerm.SECOND_TERM}>2nd Term</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          {isSummer && (
            <p className="text-muted-foreground text-xs">Summer semester has no terms</p>
          )}
        </div>
      </div>

      {formId ? null : (
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : submitLabel}
        </Button>
      )}
    </form>
  );
}

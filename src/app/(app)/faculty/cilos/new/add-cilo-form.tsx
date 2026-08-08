"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Plus, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { FacultyCourseWithCiloCount } from "@/features/evaluations/services/list-faculty-courses-with-cilos";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type AddCiloFormProps = {
  courses: FacultyCourseWithCiloCount[];
  programs: Array<{ id: string; code: string; name: string }>;
  addAction: (
    courseId: string,
    descriptions: string[]
  ) => Promise<{ success: boolean; error?: string }>;
};

// ---------------------------------------------------------------------------
// Course selection fields
// ---------------------------------------------------------------------------

type CourseSelectionFieldsProps = {
  courses: FacultyCourseWithCiloCount[];
  programs: Array<{ id: string; code: string; name: string }>;
  courseType: string;
  programId: string;
  courseId: string;
  courseError?: string;
  onCourseTypeChange: (value: string) => void;
  onProgramChange: (value: string) => void;
  onCourseChange: (value: string) => void;
};

function CourseSelectionFields({
  courses,
  programs,
  courseType,
  programId,
  courseId,
  courseError,
  onCourseTypeChange,
  onProgramChange,
  onCourseChange,
}: CourseSelectionFieldsProps) {
  const filteredCourses = useMemo(() => {
    let result = courses;

    if (courseType === "program_specific") {
      result = result.filter((c) => c.courseScope === "PROGRAM_SPECIFIC");
    } else if (courseType === "general_education") {
      result = result.filter((c) => c.courseScope === "GENERAL_EDUCATION");
    }

    if (programId !== "__none__") {
      result = result.filter(
        (c) => c.programId === programId || c.courseScope === "GENERAL_EDUCATION"
      );
    }

    return result;
  }, [courses, courseType, programId]);

  return (
    <>
      {/* Course Type */}
      <div className="space-y-2">
        <Label htmlFor="cilo-course-type">Course Type</Label>
        <Select value={courseType} onValueChange={(v) => onCourseTypeChange(v ?? "__none__")}>
          <SelectTrigger id="cilo-course-type">
            <SelectValue>
              {courseType === "__none__"
                ? "Select course type..."
                : courseType === "program_specific"
                  ? "Program-Specific"
                  : "General Education"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="program_specific">Program-Specific</SelectItem>
            <SelectItem value="general_education">General Education</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Program */}
      {courseType === "program_specific" && (
        <div className="space-y-2">
          <Label htmlFor="cilo-program">Program</Label>
          <Select value={programId} onValueChange={(v) => onProgramChange(v ?? "__none__")}>
            <SelectTrigger id="cilo-program">
              <SelectValue>
                {programId === "__none__"
                  ? "Select program..."
                  : (programs.find((p) => p.id === programId)?.code ?? "Select program...")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Course */}
      <Field data-invalid={courseError ? true : undefined}>
        <FieldLabel htmlFor="cilo-course">Course</FieldLabel>
        <FieldContent>
          <Select value={courseId} onValueChange={(v) => onCourseChange(v ?? "__none__")}>
            <SelectTrigger
              id="cilo-course"
              aria-invalid={courseError ? true : undefined}
              aria-describedby={courseError ? "cilo-course-error" : undefined}
            >
              <SelectValue>
                {courseId === "__none__"
                  ? "Select course..."
                  : (filteredCourses.find((c) => c.id === courseId)?.code ?? "Select course...")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {filteredCourses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError
            id="cilo-course-error"
            errors={[courseError ? { message: courseError } : undefined]}
          />
        </FieldContent>
      </Field>
    </>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddCiloForm({ courses, programs, addAction }: AddCiloFormProps) {
  const [isPending, startTransition] = useTransition();

  const [courseType, setCourseType] = useState<string>("__none__");
  const [programId, setProgramId] = useState<string>("__none__");
  const [courseId, setCourseId] = useState<string>("__none__");
  const [ciloText, setCiloText] = useState("");
  const [ciloList, setCiloList] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ course?: string; cilos?: string }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAddCilo = () => {
    if (!ciloText.trim()) return;
    setCiloList((prev) => [...prev, ciloText.trim()]);
    setCiloText("");
    setFieldErrors((current) => ({ ...current, cilos: undefined }));
  };

  const handleRemoveCilo = (index: number) => {
    setCiloList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const nextErrors: { course?: string; cilos?: string } = {};
    if (courseId === "__none__") {
      nextErrors.course = "Please select a course.";
    }
    if (ciloList.length === 0) {
      nextErrors.cilos = "Please add at least one CILO.";
    }
    if (nextErrors.course || nextErrors.cilos) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await addAction(courseId, ciloList);

      if (!result.success) {
        setFormError(result.error ?? "Failed to save CILOs.");
        return;
      }

      setSuccessMessage("CILOs added successfully!");
      setCiloList([]);
      setCiloText("");
      setCourseId("__none__");
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        href="/faculty/cilos"
        className="text-link inline-flex items-center gap-2 text-sm font-medium hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      {/* Breadcrumb */}
      <nav className="text-muted-foreground text-xs">Manage CILOs &gt; Add New CILO</nav>

      <Card>
        <CardHeader>
          <CardTitle>Add New CILOs</CardTitle>
          <CardDescription>
            Select a course and add one or more Course-Intended Learning Outcomes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          {successMessage && (
            <Alert variant="success">
              <CheckCircle2 aria-hidden="true" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <CourseSelectionFields
            courses={courses}
            programs={programs}
            courseType={courseType}
            programId={programId}
            courseId={courseId}
            courseError={fieldErrors.course}
            onCourseTypeChange={(value) => {
              setCourseType(value);
              setCourseId("__none__");
            }}
            onProgramChange={(value) => {
              setProgramId(value);
              setCourseId("__none__");
            }}
            onCourseChange={(value) => {
              setCourseId(value);
              setFieldErrors((current) => ({ ...current, course: undefined }));
            }}
          />

          {/* CILO Input */}
          <Field data-invalid={fieldErrors.cilos ? true : undefined}>
            <FieldLabel htmlFor="cilo-description">CILO Description</FieldLabel>
            <FieldContent>
              <div className="flex gap-2">
                <Input
                  id="cilo-description"
                  placeholder="Type a CILO description..."
                  value={ciloText}
                  aria-invalid={fieldErrors.cilos ? true : undefined}
                  aria-describedby={fieldErrors.cilos ? "cilo-cilos-error" : undefined}
                  onChange={(e) => setCiloText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCilo();
                    }
                  }}
                />
                <Button variant="outline" onClick={handleAddCilo} disabled={!ciloText.trim()}>
                  <Plus className="mr-1 size-4" />
                  Add
                </Button>
              </div>
              <FieldError
                id="cilo-cilos-error"
                errors={[fieldErrors.cilos ? { message: fieldErrors.cilos } : undefined]}
              />
            </FieldContent>
          </Field>

          {/* CILO List */}
          {ciloList.length > 0 && (
            <div className="space-y-2">
              <Label>CILOs to Add ({ciloList.length})</Label>
              <div className="space-y-2">
                {ciloList.map((cilo, index) => (
                  <div
                    key={index}
                    className="border-border bg-card flex items-center gap-3 rounded-lg border p-3"
                  >
                    <span className="bg-primary/10 text-link flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                      {index + 1}
                    </span>
                    <p className="flex-1 text-sm">{cilo}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 min-h-11 min-w-11 shrink-0"
                      aria-label={`Remove CILO ${index + 1}`}
                      onClick={() => handleRemoveCilo(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save */}
          <Button onClick={handleSave} loading={isPending} className="w-full">
            {isPending ? "Saving..." : "Save CILOs"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

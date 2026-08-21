"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { FacultyCourseWithCiloCount } from "@/features/evaluations/services/list-faculty-courses-with-cilos";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type AddCiloFormProps = {
  courses: FacultyCourseWithCiloCount[];
  addAction: (
    courseId: string,
    descriptions: string[]
  ) => Promise<{ success: boolean; error?: string }>;
};

const courseLabel = (course: FacultyCourseWithCiloCount) => `${course.code} — ${course.title}`;


function MapCilosButton({
  course,
  variant = "outline",
}: {
  course: FacultyCourseWithCiloCount;
  variant?: "outline" | "default";
}) {
  // Plain anchor keeps link semantics; Button's Base UI wrapper would force role="button".
  return (
    <Link
      href={`/faculty/cilos/${course.id}/alignment`}
      className={cn(buttonVariants({ variant, size: "sm", className: "max-sm:w-full" }))}
    >
      Map CILOs to {course.courseScope === "PROGRAM_SPECIFIC" ? "PLOs" : "ILOs"}
      <ArrowRight className="size-4" />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddCiloForm({ courses, addAction }: AddCiloFormProps) {
  const [isPending, startTransition] = useTransition();

  const [selectedCourse, setSelectedCourse] = useState<FacultyCourseWithCiloCount | null>(null);
  const [ciloText, setCiloText] = useState("");
  const [ciloList, setCiloList] = useState<string[]>([]);
  // Locally tracks CILOs saved during this session so counts stay truthful without a refetch.
  const [addedCounts, setAddedCounts] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ course?: string; cilos?: string }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const countOnFile = (course: FacultyCourseWithCiloCount) =>
    course.ciloCount + (addedCounts[course.id] ?? 0);

  const pageChrome = (
    <>
      <Link
        href="/faculty/cilos"
        className="text-link inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:underline focus-visible:ring-ring focus-visible:ring-3 focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" />
        Back to Manage CILOs
      </Link>
      <nav className="text-caption text-muted-foreground">Manage CILOs &gt; Add New CILO</nav>
    </>
  );

  if (courses.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        {pageChrome}
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No assigned courses yet</EmptyTitle>
            <EmptyDescription>
              CILOs belong to a course. Ask the department office to assign you a course for the
              current term.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              href="/faculty/cilos"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Back to Manage CILOs
            </Link>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const handleAddCilo = () => {
    const trimmed = ciloText.trim();
    if (!trimmed) return;
    setCiloList((prev) => [...prev, trimmed]);
    setCiloText("");
    setFieldErrors((current) => ({ ...current, cilos: undefined }));
  };

  const handleRemoveCilo = (index: number) => {
    setCiloList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const nextErrors: { course?: string; cilos?: string } = {};
    const course = selectedCourse;
    if (!course || ciloList.length === 0) {
      if (!course) {
        nextErrors.course = "Please select a course.";
      }
      if (ciloList.length === 0) {
        nextErrors.cilos = "Please add at least one CILO.";
      }
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await addAction(course.id, ciloList);

      if (!result.success) {
        setFormError(result.error ?? "Failed to save CILOs.");
        return;
      }

      const count = ciloList.length;
      setAddedCounts((prev) => ({ ...prev, [course.id]: (prev[course.id] ?? 0) + count }));
      setSuccessMessage(`${count} ${count === 1 ? "CILO" : "CILOs"} saved to ${course.code}.`);
      setCiloList([]);
      setCiloText("");
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {pageChrome}

      <Card>
        <CardHeader>
          <CardTitle>Add New CILOs</CardTitle>
          <CardDescription>
            Select a course and add one or more Course-Intended Learning Outcomes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          {successMessage && selectedCourse && (
            <Alert variant="success">
              <CheckCircle2 aria-hidden="true" />
              <AlertDescription>
                <span className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>{successMessage}</span>
                  <MapCilosButton course={selectedCourse} variant="default" />
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Course */}
          <FieldGroup className="gap-3">
            <Field data-invalid={fieldErrors.course ? true : undefined}>
              <FieldLabel htmlFor="cilo-course">Course</FieldLabel>
              <FieldContent>
                <Combobox
                  value={selectedCourse}
                  onValueChange={(value) => {
                    setSelectedCourse(value);
                    setFieldErrors((current) => ({ ...current, course: undefined }));
                  }}
                  items={courses}
                  filter={(course, query) =>
                    !query ||
                    [
                      course.code,
                      course.title,
                      course.courseScopeLabel,
                      course.programCode,
                      course.programName,
                      course.majorName,
                    ]
                      .filter((value): value is string => Boolean(value))
                      .some((value) => value.toLowerCase().includes(query.toLowerCase()))
                  }
                  itemToStringLabel={courseLabel}
                  itemToStringValue={(course) => course.id}
                  autoHighlight
                >
                  <ComboboxInput
                    id="cilo-course"
                    className="w-full"
                    placeholder="Search by code or title..."
                    aria-invalid={fieldErrors.course ? true : undefined}
                    aria-describedby={fieldErrors.course ? "cilo-course-error" : undefined}
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No courses match your search.</ComboboxEmpty>
                    <ComboboxList>
                      {(course) => (
                        <ComboboxItem key={course.id} value={course} className="items-start py-2">
                          <span className="flex min-w-0 flex-col gap-0.5 py-0.5 text-left">
                            <span className="text-sm leading-snug">{courseLabel(course)}</span>
                            <span className="text-caption text-muted-foreground">
                              {[
                                course.courseScopeLabel,
                                course.programCode,
                                `${countOnFile(course)} ${
                                  countOnFile(course) === 1 ? "CILO" : "CILOs"
                                } on file`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                <FieldError
                  id="cilo-course-error"
                  errors={[fieldErrors.course ? { message: fieldErrors.course } : undefined]}
                />
              </FieldContent>
            </Field>

            {selectedCourse && (
              <div className="bg-surface-muted flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{courseLabel(selectedCourse)}</p>
                  <p className="text-caption text-muted-foreground">
                    Aligns to{" "}
                    {selectedCourse.courseScope === "PROGRAM_SPECIFIC"
                      ? `PLOs of ${
                          selectedCourse.programName ??
                          selectedCourse.programCode ??
                          "the program"
                        }`
                      : "Institutional Learning Outcomes"}{" "}
                    · {countOnFile(selectedCourse)} CILO
                    {countOnFile(selectedCourse) === 1 ? "" : "s"} on file
                  </p>
                </div>
                <MapCilosButton course={selectedCourse} />
              </div>
            )}
          </FieldGroup>

          {/* CILO details */}
          <FieldGroup className="gap-4">
            <Field data-invalid={fieldErrors.cilos ? true : undefined}>
              <FieldLabel htmlFor="cilo-description">CILO Description</FieldLabel>
              <FieldContent>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <Textarea
                    id="cilo-description"
                    placeholder="Type a CILO description..."
                    value={ciloText}
                    className="max-h-56"
                    aria-invalid={fieldErrors.cilos ? true : undefined}
                    aria-describedby={fieldErrors.cilos ? "cilo-cilos-error" : undefined}
                    onChange={(e) => setCiloText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddCilo();
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={handleAddCilo}
                    disabled={!ciloText.trim()}
                    className="max-sm:w-full sm:shrink-0"
                  >
                    <Plus className="size-4" />
                    Add
                  </Button>
                </div>
                <FieldDescription>
                  Press Enter to add the CILO. Shift+Enter starts a new line.
                </FieldDescription>
                <FieldError
                  id="cilo-cilos-error"
                  errors={[fieldErrors.cilos ? { message: fieldErrors.cilos } : undefined]}
                />
              </FieldContent>
            </Field>

            {ciloList.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>CILOs to Add ({ciloList.length})</Label>
                <ul className="flex flex-col gap-2">
                  {ciloList.map((cilo, index) => (
                    <li
                      key={`${index}-${cilo}`}
                      className="border-border bg-card flex items-start gap-3 rounded-lg border p-3"
                    >
                      <span className="bg-primary/10 text-link flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums">
                        {index + 1}
                      </span>
                      <p className="min-w-0 flex-1 text-sm break-words">{cilo}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="-mt-1 -mr-1 min-h-11 min-w-11 shrink-0 text-destructive hover:bg-destructive/10"
                        aria-label={`Remove CILO ${index + 1}`}
                        onClick={() => handleRemoveCilo(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Commit bar stays reachable while long CILO lists scroll */}
      <div className="bg-card sticky bottom-0 flex justify-end pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button onClick={handleSave} loading={isPending} className="w-full sm:w-auto sm:min-w-48">
          Save CILOs
        </Button>
      </div>
    </div>
  );
}

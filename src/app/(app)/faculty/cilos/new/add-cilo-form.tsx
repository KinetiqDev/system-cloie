"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";

import { cn } from "@/lib/utils";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { showToast } from "@/components/ui/toast";

import type { FacultyCourseWithCiloCount } from "@/features/evaluations/services/list-faculty-courses-with-cilos";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type AddCiloFormProps = {
  courses: FacultyCourseWithCiloCount[];
  initialCourseId?: string;
  returnTo?: string;
  saveAction: (
    courseId: string,
    cilos: Array<{ id?: string; description: string }>
  ) => Promise<{ success: boolean; error?: string }>;
  loadCilosAction: (courseId: string) => Promise<{
    success: boolean;
    cilos?: Array<{ id: string; description: string }>;
    error?: string;
  }>;
};

const courseLabel = (course: FacultyCourseWithCiloCount) => `${course.code} — ${course.title}`;

function MapCilosButton({
  course,
  variant = "outline",
  returnTo,
  linkName,
}: {
  course: FacultyCourseWithCiloCount;
  variant?: "outline" | "default";
  returnTo?: string;
  linkName?: string;
}) {
  const href = returnTo
    ? `/faculty/cilos/${course.id}/alignment?returnTo=${encodeURIComponent(returnTo)}`
    : `/faculty/cilos/${course.id}/alignment`;
  // Plain anchor keeps link semantics; Button's Base UI wrapper would force role="button".
  return (
    <Link
      href={href}
      aria-label={
        linkName ?? `Map CILOs to ${course.courseScope === "PROGRAM_SPECIFIC" ? "GOs" : "ILOs"}`
      }
      className={cn(buttonVariants({ variant, size: "sm", className: "max-sm:w-full" }))}
    >
      {linkName ?? `Map CILOs to ${course.courseScope === "PROGRAM_SPECIFIC" ? "GOs" : "ILOs"}`}
      <ArrowRight className="size-4" />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// fallow-ignore-next-line complexity
export function AddCiloForm({
  courses,
  initialCourseId,
  returnTo,
  saveAction,
  loadCilosAction,
}: AddCiloFormProps) {
  const [isPending, startTransition] = useTransition();

  const initialCourse = initialCourseId
    ? (courses.find((c) => c.id === initialCourseId) ?? null)
    : null;
  const [selectedCourse, setSelectedCourse] = useState<FacultyCourseWithCiloCount | null>(
    initialCourse
  );
  const [ciloText, setCiloText] = useState("");
  const [ciloList, setCiloList] = useState<string[]>([]);
  // Locally tracks CILOs saved during this session so counts stay truthful without a refetch.
  const [addedCounts, setAddedCounts] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ course?: string; cilos?: string }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // CILOs already on file for the selected course, loaded on selection.
  const [existingCilos, setExistingCilos] = useState<Array<{ id: string; description: string }>>(
    []
  );
  const [existingCilosLoading, setExistingCilosLoading] = useState(false);
  const [existingCilosError, setExistingCilosError] = useState<string | null>(null);
  const loadSeqRef = useRef(0);
  // Latest selected course for async callbacks (post-save reload must only
  // refresh the course that is still selected).
  const selectedCourseRef = useRef<FacultyCourseWithCiloCount | null>(initialCourse);

  const loadExistingCilos = (courseId: string) => {
    const seq = ++loadSeqRef.current;
    setExistingCilosLoading(true);
    setExistingCilosError(null);
    void loadCilosAction(courseId)
      .then((result) => {
        if (seq !== loadSeqRef.current) return;
        if (result.success) {
          setExistingCilos(result.cilos ?? []);
        } else {
          const message = result.error ?? "Could not load existing CILOs.";
          setExistingCilosError(message);
          showToast(message, "error");
        }
      })
      .catch(() => {
        if (seq !== loadSeqRef.current) return;
        const message = "Could not load existing CILOs.";
        setExistingCilosError(message);
        showToast(message, "error");
      })
      .finally(() => {
        if (seq === loadSeqRef.current) setExistingCilosLoading(false);
      });
  };

  useEffect(() => {
    if (initialCourse) {
      queueMicrotask(() => {
        loadExistingCilos(initialCourse.id);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countOnFile = (course: FacultyCourseWithCiloCount) =>
    course.ciloCount + (addedCounts[course.id] ?? 0);

  const backHref = returnTo && returnTo.startsWith("/faculty/cilos") ? returnTo : "/faculty/cilos";

  const pageChrome = (
    <>
      <BackLink href={backHref}>Back to Manage CILOs</BackLink>
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
            <Link href="/faculty/cilos" className={cn(buttonVariants({ variant: "outline" }))}>
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

  const handleUpdateExisting = (id: string, description: string) => {
    setExistingCilos((prev) =>
      prev.map((cilo) => (cilo.id === id ? { ...cilo, description } : cilo))
    );
  };

  const handleRemoveExisting = (id: string) => {
    setExistingCilos((prev) => prev.filter((cilo) => cilo.id !== id));
  };

  const handleSave = () => {
    const nextErrors: { course?: string; cilos?: string } = {};
    const course = selectedCourse;
    if (!course || (ciloList.length === 0 && existingCilos.length === 0)) {
      if (!course) {
        nextErrors.course = "Please select a course.";
      }
      if (ciloList.length === 0 && existingCilos.length === 0) {
        nextErrors.cilos = "Please add at least one CILO.";
      }
      setFieldErrors(nextErrors);
      showToast(Object.values(nextErrors).join(" "), "error");
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSuccessMessage(null);

    // Full-set commit: edits and removals of existing CILOs plus new ones.
    // The save action archives rows missing from this payload.
    const payload: Array<{ id?: string; description: string }> = [
      ...existingCilos.map((cilo) => ({ id: cilo.id, description: cilo.description })),
      ...ciloList.map((description) => ({ description })),
    ];

    startTransition(async () => {
      let result: { success: boolean; error?: string };
      try {
        result = await saveAction(course.id, payload);
      } catch {
        const message = "Failed to save CILOs.";
        setFormError(message);
        showToast(message, "error");
        return;
      }

      if (!result.success) {
        const message = result.error ?? "Failed to save CILOs.";
        setFormError(message);
        showToast(message, "error");
        return;
      }

      const added = ciloList.length;
      const message =
        added > 0
          ? `${added} ${added === 1 ? "CILO" : "CILOs"} saved to ${course.code}.`
          : `CILO changes saved for ${course.code}.`;
      setAddedCounts((prev) => ({ ...prev, [course.id]: (prev[course.id] ?? 0) + added }));
      showToast(message, "success");
      if (selectedCourseRef.current?.id === course.id) {
        setSuccessMessage(message);
        setCiloList([]);
        setCiloText("");
        loadExistingCilos(course.id);
      }
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
            <div role="region" aria-label="Next step: map CILOs">
              <Alert variant="success">
                <CheckCircle2 aria-hidden="true" />
                <AlertTitle>Next step: map your CILOs</AlertTitle>
                <AlertDescription>
                  <span className="flex flex-col gap-1">
                    <span>{successMessage}</span>
                    <span>Publishing stays blocked until every CILO is mapped.</span>
                  </span>
                </AlertDescription>
                {/* A direct Alert child keeps the action out of the icon gutter:
                  the description column is inset by the glyph, which left the
                  button off-center on narrow screens. Full-bleed on mobile so
                  it centers in the panel; column 2 above `sm` so it stays
                  aligned with the copy it follows. */}
                <div className="col-span-full pt-1 sm:col-span-1 sm:col-start-2 [&_a]:no-underline [&_a:hover]:no-underline">
                  <MapCilosButton
                    course={selectedCourse}
                    variant="default"
                    returnTo={returnTo}
                    linkName="Continue to map CILOs"
                  />
                </div>
              </Alert>
            </div>
          )}

          {/* Course */}
          <FieldGroup className="gap-3">
            <Field data-invalid={fieldErrors.course ? true : undefined}>
              <FieldLabel htmlFor="cilo-course">Course</FieldLabel>
              <FieldContent>
                <Combobox
                  value={selectedCourse}
                  onValueChange={(value) => {
                    selectedCourseRef.current = value;
                    setSelectedCourse(value);
                    setFieldErrors((current) => ({ ...current, course: undefined }));
                    if (value) {
                      setExistingCilos([]);
                      loadExistingCilos(value.id);
                    } else {
                      // Invalidate any in-flight load and clear the panel.
                      loadSeqRef.current += 1;
                      setExistingCilos([]);
                      setExistingCilosError(null);
                      setExistingCilosLoading(false);
                    }
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
                      ? `GOs of ${
                          selectedCourse.programName ?? selectedCourse.programCode ?? "the program"
                        }`
                      : "Institutional Learning Outcomes"}{" "}
                    · {countOnFile(selectedCourse)} CILO
                    {countOnFile(selectedCourse) === 1 ? "" : "s"} on file
                  </p>
                </div>
                {/* The post-save panel owns the mapping action once it is on
                  screen, so the row keeps a single CTA per moment. */}
                {!successMessage && <MapCilosButton course={selectedCourse} returnTo={returnTo} />}
              </div>
            )}
          </FieldGroup>

          {/* Existing CILOs (read-only) */}
          {selectedCourse && (
            <div className="flex flex-col gap-2">
              <Label>
                Existing CILOs{!existingCilosLoading ? ` (${existingCilos.length})` : ""}
              </Label>
              {existingCilosLoading ? (
                <p role="status" className="text-muted-foreground text-sm">
                  Loading existing CILOs...
                </p>
              ) : existingCilosError ? (
                <div
                  role="alert"
                  className="border-danger/40 bg-danger-soft flex flex-col items-start gap-2 rounded-lg border p-3"
                >
                  <p className="text-sm">{existingCilosError}</p>
                  <p className="text-caption">
                    Editing stays locked until these CILOs load, so a save cannot drop them.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectedCourse && loadExistingCilos(selectedCourse.id)}
                  >
                    Retry loading CILOs
                  </Button>
                </div>
              ) : existingCilos.length === 0 ? (
                <p className="text-muted-foreground border-border rounded-lg border border-dashed py-4 text-center text-sm">
                  No CILOs on file for this course yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {existingCilos.map((cilo, index) => (
                    <li
                      key={cilo.id}
                      className="border-border bg-surface flex items-start gap-3 rounded-lg border p-3"
                    >
                      <span className="bg-primary/10 text-link flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums">
                        {index + 1}
                      </span>
                      <Textarea
                        value={cilo.description}
                        onChange={(e) => handleUpdateExisting(cilo.id, e.target.value)}
                        className="min-h-12 min-w-0 flex-1 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove CILO ${index + 1}`}
                        className="text-destructive hover:bg-destructive/10 min-h-11 min-w-11 shrink-0"
                        onClick={() => handleRemoveExisting(cilo.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

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
                        className="text-destructive hover:bg-destructive/10 -mt-1 -mr-1 min-h-11 min-w-11 shrink-0"
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
        <Button
          onClick={handleSave}
          loading={isPending}
          disabled={existingCilosLoading || !!existingCilosError}
          className="w-full sm:w-auto sm:min-w-48"
        >
          Save CILOs
        </Button>
      </div>
    </div>
  );
}

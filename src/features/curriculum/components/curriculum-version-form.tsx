"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCurriculumVersionAction,
  updateCurriculumVersionAction,
} from "@/lib/actions/curriculum-actions";
import { showToast } from "@/components/ui/toast";
import type { CurriculumPageProgram, SchoolYearOption } from "@/features/curriculum/types";

export type CurriculumVersionEditTarget = {
  id: string;
  code: string;
  name: string | null;
  effectiveFromSchoolYearId: string | null;
};

interface CurriculumVersionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programs: CurriculumPageProgram[];
  schoolYears: SchoolYearOption[];
  defaultProgramId?: string;
  version?: CurriculumVersionEditTarget | null;
  onSuccess?: () => void;
}

/**
 * Dialog form for creating a new DRAFT Curriculum Version, or editing a DRAFT
 * version's metadata when `version` is supplied. The program selector appears
 * only when multiple programs are offered (Secretary); a single program is
 * locked into place (Program Head). Editing never changes program or major
 * scope.
 */
export function CurriculumVersionForm({
  open,
  onOpenChange,
  programs,
  schoolYears,
  defaultProgramId,
  version,
  onSuccess,
}: CurriculumVersionFormProps) {
  const [programId, setProgramId] = useState<string>(defaultProgramId ?? "");
  const [code, setCode] = useState(version?.code ?? "");
  const [name, setName] = useState(version?.name ?? "");
  const [effectiveFromSchoolYearId, setEffectiveFromSchoolYearId] = useState<string>(
    version?.effectiveFromSchoolYearId ?? ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ program?: string; code?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const showProgramSelector = !version && programs.length > 1;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const nextErrors: { program?: string; code?: string } = {};
    if (!version && !programId) nextErrors.program = "Select a program";
    if (!code.trim()) nextErrors.code = "Code is required";
    setErrors(nextErrors);
    if (nextErrors.program || nextErrors.code) return;

    setErrors({});
    setIsSubmitting(true);

    const submit = version
      ? updateCurriculumVersionAction(version.id, {
          code: code.trim(),
          name: name.trim() || null,
          effectiveFromSchoolYearId: effectiveFromSchoolYearId || null,
        })
      : createCurriculumVersionAction({
          programId,
          code: code.trim(),
          name: name.trim() || null,
          effectiveFromSchoolYearId: effectiveFromSchoolYearId || null,
        });

    submit
      .then((result) => {
        if (result.success) {
          showToast(
            version
              ? `Curriculum version ${code.trim()} updated`
              : `Curriculum version ${code.trim()} created as a draft`,
            "success"
          );
          onOpenChange(false);
          onSuccess?.();
        } else {
          setSubmitError(result.error);
          showToast(result.error, "error");
        }
      })
      .finally(() => setIsSubmitting(false));
  }

  const selectedProgram = showProgramSelector ? programId : (defaultProgramId ?? "");

  const programHasError = !!errors.program;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>
              {version ? "Edit Curriculum Version" : "Create Curriculum Version"}
            </DialogTitle>
            <DialogDescription>
              {version
                ? "Update this draft's metadata. Published and retired curricula are immutable."
                : "Create a new curriculum version draft for a program. Published and retired curricula are immutable; new revisions start as drafts."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            {showProgramSelector ? (
              <Field data-invalid={programHasError}>
                <FieldLabel htmlFor="programId">Program</FieldLabel>
                <FieldContent>
                  <Select
                    value={selectedProgram}
                    onValueChange={(value) => setProgramId(value ?? "")}
                  >
                    <SelectTrigger
                      id="programId"
                      className="w-full"
                      aria-invalid={programHasError ? true : undefined}
                      aria-describedby={programHasError ? "programId-error" : undefined}
                    >
                      <SelectValue placeholder="Choose a program">
                        {programs.find((p) => p.id === selectedProgram)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.code} — {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError id="programId-error">{errors.program}</FieldError>
                </FieldContent>
              </Field>
            ) : programHasError ? (
              <Field data-invalid>
                <FieldLabel htmlFor="programId">Program</FieldLabel>
                <FieldContent>
                  <FieldError id="programId-error">{errors.program}</FieldError>
                </FieldContent>
              </Field>
            ) : null}

            <Field data-invalid={!!errors.code}>
              <FieldLabel htmlFor="code">Code</FieldLabel>
              <FieldContent>
                <Input
                  id="code"
                  placeholder="e.g. BSIT-2030"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (errors.code) setErrors((prev) => ({ ...prev, code: undefined }));
                  }}
                  aria-invalid={errors.code ? true : undefined}
                  aria-describedby={errors.code ? "code-error" : undefined}
                  required
                />
                <FieldDescription>
                  A short unique label for this revision, e.g. BSIT-2030
                </FieldDescription>
                <FieldError id="code-error">{errors.code}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="name">Name (optional)</FieldLabel>
              <FieldContent>
                <Input
                  id="name"
                  placeholder="e.g. 2030 Bachelor of Science in IT"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="effectiveFromSchoolYearId">
                Effective School Year (optional)
              </FieldLabel>
              <FieldContent>
                <Select
                  value={effectiveFromSchoolYearId || null}
                  onValueChange={(value) => setEffectiveFromSchoolYearId(value ?? "")}
                >
                  <SelectTrigger id="effectiveFromSchoolYearId" className="w-full">
                    <SelectValue placeholder="Not set">
                      {schoolYears.find((y) => y.id === effectiveFromSchoolYearId)?.code}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {schoolYears.map((year) => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isSubmitting ? "Saving…" : version ? "Save Changes" : "Create Draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

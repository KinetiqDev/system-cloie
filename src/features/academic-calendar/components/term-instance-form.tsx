"use client";

import { useState, useEffect } from "react";
import { AcademicSemester, AcademicTerm } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SemesterTermPicker,
  type SemesterTermValue,
} from "./term-instance-picker";
import { addTermInstanceAction } from "@/lib/actions/secretary-school-year-actions";
import { showToast } from "@/components/ui/toast";

interface TermInstanceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolYearId: string;
  schoolYearCode: string;
  onSuccess?: () => void;
}

/**
 * Dialog form for adding a new Term Instance to a School Year.
 */
export function TermInstanceForm({
  open,
  onOpenChange,
  schoolYearId,
  schoolYearCode,
  onSuccess,
}: TermInstanceFormProps) {
  const [value, setValue] = useState<SemesterTermValue>({
    semester: AcademicSemester.FIRST,
    term: AcademicTerm.FIRST_TERM,
  });
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!value.semester) {
      setError("Please select a semester");
      setIsSubmitting(false);
      return;
    }

    // Summer must have null term
    const effectiveTerm = value.semester === AcademicSemester.SUMMER ? null : value.term;

    if (value.semester !== AcademicSemester.SUMMER && !value.term) {
      setError("Please select a term for first or second semester");
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("schoolYearId", schoolYearId);
    formData.append("semester", value.semester);
    if (effectiveTerm) {
      formData.append("term", effectiveTerm);
    }
    if (startDate) {
      formData.append("startDate", startDate);
    }
    if (endDate) {
      formData.append("endDate", endDate);
    }

    const result = await addTermInstanceAction(formData);

    if (result.success) {
      showToast("Term instance added successfully", "success");
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } else {
      setError(result.error);
    }

    setIsSubmitting(false);
  }

  function resetForm() {
    setValue({ semester: AcademicSemester.FIRST, term: AcademicTerm.FIRST_TERM });
    setStartDate("");
    setEndDate("");
    setError(null);
  }

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Add Term Instance</DialogTitle>
            <DialogDescription>
              Add a semester/term to school year {schoolYearCode}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <SemesterTermPicker
              value={value}
              onChange={(next) => {
                setValue(next);
                if (error) setError(null);
              }}
              disabled={isSubmitting}
            />

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="startDate">Start Date</FieldLabel>
                <FieldContent>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={isSubmitting}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="endDate">End Date</FieldLabel>
                <FieldContent>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={isSubmitting}
                  />
                </FieldContent>
              </Field>
            </div>

            <FieldError>{error}</FieldError>
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
              {isSubmitting ? "Adding…" : "Add Term"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

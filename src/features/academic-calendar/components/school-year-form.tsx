"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatSchoolYearCode } from "@/lib/constants/academic-period";
import { createSchoolYearAction } from "@/lib/actions/secretary-school-year-actions";
import { showToast } from "@/components/ui/toast";

interface SchoolYearFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Dialog form for creating a new School Year.
 */
export function SchoolYearForm({ open, onOpenChange, onSuccess }: SchoolYearFormProps) {
  const [startYear, setStartYear] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const previewCode = startYear ? formatSchoolYearCode(parseInt(startYear, 10)) : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const year = parseInt(startYear, 10);
    if (isNaN(year) || year < 2000 || year > 2100) {
      setError("Please enter a valid start year (2000-2100)");
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("startYear", startYear);

    const result = await createSchoolYearAction(formData);

    if (result.success) {
      showToast(`School year ${result.data.code} created successfully`, "success");
      setStartYear("");
      onOpenChange(false);
      onSuccess?.();
    } else {
      setError(result.error);
    }

    setIsSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Create School Year</DialogTitle>
            <DialogDescription>
              Create a new school year (e.g., 2025-2026). This will serve as a
              container for academic term instances.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="startYear">Start Year</FieldLabel>
              <FieldContent>
                <Input
                  id="startYear"
                  type="number"
                  min={2000}
                  max={2100}
                  placeholder={currentYear.toString()}
                  value={startYear}
                  onChange={(e) => {
                    setStartYear(e.target.value);
                    if (error) setError(null);
                  }}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "start-year-error" : "start-year-help"}
                  required
                />
                <FieldDescription id="start-year-help">
                  Example: Enter &quot;2025&quot; to create school year &quot;2025-2026&quot;
                </FieldDescription>
                <FieldError id="start-year-error">{error}</FieldError>
              </FieldContent>
            </Field>

            {previewCode && (
              <div className="bg-muted rounded-md p-3 text-center">
                <span className="text-muted-foreground text-sm">Preview: </span>
                <span className="font-semibold">{previewCode}</span>
              </div>
            )}
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
            <Button type="submit" loading={isSubmitting} disabled={!startYear}>
              {isSubmitting ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

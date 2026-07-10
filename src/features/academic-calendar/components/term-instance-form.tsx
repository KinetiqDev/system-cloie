"use client";

import { useState, useEffect } from "react";
import { AcademicSemester, AcademicTerm } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SemesterTermPicker } from "./term-instance-picker";
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
  const [semester, setSemester] = useState<AcademicSemester | undefined>(
    AcademicSemester.FIRST
  );
  const [term, setTerm] = useState<AcademicTerm | undefined>(AcademicTerm.FIRST_TERM);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    if (!semester) {
      showToast("Please select a semester", "error");
      setIsSubmitting(false);
      return;
    }

    // Summer must have null term
    const effectiveTerm = semester === AcademicSemester.SUMMER ? null : term;

    if (semester !== AcademicSemester.SUMMER && !term) {
      showToast("Please select a term for first or second semester", "error");
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("schoolYearId", schoolYearId);
    formData.append("semester", semester);
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
      showToast(result.error, "error");
    }

    setIsSubmitting(false);
  }

  function resetForm() {
    setSemester(AcademicSemester.FIRST);
    setTerm(AcademicTerm.FIRST_TERM);
    setStartDate("");
    setEndDate("");
  }

  useEffect(() => {
    if (open) {
      resetForm();
    }
   
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Term Instance</DialogTitle>
            <DialogDescription>
              Add a semester/term to school year {schoolYearCode}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <SemesterTermPicker
              semester={semester}
              term={term}
              onSemesterChange={setSemester}
              onTermChange={setTerm}
              disabled={isSubmitting}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Term"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

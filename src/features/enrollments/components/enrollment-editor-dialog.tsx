"use client";

import { useState } from "react";
import { EnrollmentSource, YearLevel, StudentSection } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showToast } from "@/components/ui/toast";
import { TermInstancePicker } from "@/features/academic-calendar/components/term-instance-picker";
import { YEAR_LEVEL_OPTIONS, STUDENT_SECTION_OPTIONS } from "@/lib/constants/academic";
import { adminUpsertEnrollmentAction } from "@/lib/actions/enrollment-actions";
import type { EnrollmentItem } from "@/features/enrollments/types";
import type { TermInstanceItem } from "@/features/academic-calendar/types";

type EnrollmentFormData = {
  termInstanceId: string;
  programId: string;
  majorId?: string;
  yearLevel: YearLevel;
  section?: StudentSection;
};

interface EnrollmentEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  existingEnrollment?: EnrollmentItem;
  availablePrograms: { id: string; code: string; name: string }[];
  termInstances: TermInstanceItem[];
  onSuccess?: () => void;
}

type EnrollmentFieldErrors = Partial<Record<"termInstanceId" | "programId", string>>;

function ProgramSelect({
  availablePrograms,
  value,
  onChange,
}: {
  availablePrograms: { id: string; code: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger>
        <SelectValue placeholder="Select program" />
      </SelectTrigger>
      <SelectContent>
        {availablePrograms.map((program) => (
          <SelectItem key={program.id} value={program.id}>
            {program.code} — {program.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function YearLevelSelect({
  value,
  onChange,
}: {
  value: YearLevel;
  onChange: (value: YearLevel) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => next && onChange(next as YearLevel)}>
      <SelectTrigger>
        <SelectValue placeholder="Select year" />
      </SelectTrigger>
      <SelectContent>
        {YEAR_LEVEL_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SectionSelect({
  value,
  onChange,
}: {
  value?: StudentSection;
  onChange: (value: StudentSection) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => next && onChange(next as StudentSection)}>
      <SelectTrigger>
        <SelectValue placeholder="Select section" />
      </SelectTrigger>
      <SelectContent>
        {STUDENT_SECTION_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// fallow-ignore-next-line complexity
export function EnrollmentEditorDialog({
  open,
  onOpenChange,
  userId,
  existingEnrollment,
  availablePrograms,
  termInstances,
  onSuccess,
}: EnrollmentEditorDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [values, setValues] = useState<EnrollmentFormData>({
    termInstanceId: existingEnrollment?.termInstanceId ?? "",
    programId: existingEnrollment?.programId ?? "",
    majorId: existingEnrollment?.majorId ?? undefined,
    yearLevel: existingEnrollment?.yearLevel ?? YearLevel.FIRST_YEAR,
    section: existingEnrollment?.section ?? undefined,
  });
  const [errors, setErrors] = useState<EnrollmentFieldErrors>({});

  const setField = <K extends keyof EnrollmentFormData>(key: K, value: EnrollmentFormData[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const title = existingEnrollment ? "Edit Enrollment" : "Add Enrollment";
  const description = existingEnrollment
    ? "Update the student's enrollment details for the selected term."
    : "Enroll the student for a specific term and class configuration.";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: EnrollmentFieldErrors = {};
    if (!values.termInstanceId) nextErrors.termInstanceId = "Please select a term";
    if (!values.programId) nextErrors.programId = "Please select a program";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);

    const result = await adminUpsertEnrollmentAction({
      studentUserId: userId,
      termInstanceId: values.termInstanceId,
      programId: values.programId,
      majorId: values.majorId || null,
      yearLevel: values.yearLevel,
      section: values.section || null,
      source: existingEnrollment ? existingEnrollment.source : EnrollmentSource.SECRETARY,
    });

    setIsSubmitting(false);

    if (result.success) {
      showToast(
        existingEnrollment
          ? "The enrollment has been successfully updated."
          : "The enrollment has been successfully created.",
        "success"
      );
      onOpenChange(false);
      onSuccess?.();
    } else {
      showToast(result.error || "Failed to save enrollment.", "error");
    }
  };

  const form = (
    <form id="enrollment-editor-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label>Academic Term</Label>
        <TermInstancePicker
          termInstances={termInstances}
          value={values.termInstanceId}
          onChange={(value) => value && setField("termInstanceId", value)}
        />
        {errors.termInstanceId && (
          <p className="text-destructive text-sm">{errors.termInstanceId}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Program</Label>
        <ProgramSelect
          availablePrograms={availablePrograms}
          value={values.programId}
          onChange={(value) => setField("programId", value)}
        />
        {errors.programId && <p className="text-destructive text-sm">{errors.programId}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Year Level</Label>
          <YearLevelSelect
            value={values.yearLevel}
            onChange={(value) => setField("yearLevel", value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Section (Optional)</Label>
          <SectionSelect value={values.section} onChange={(value) => setField("section", value)} />
        </div>
      </div>
    </form>
  );

  const footer = (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button type="submit" form="enrollment-editor-form" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : existingEnrollment ? "Update" : "Enroll"}
      </Button>
    </div>
  );

  if (!isDesktop) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
        <DrawerContent className="flex max-h-[85dvh] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <DrawerHeader className="shrink-0 px-0 pt-4 pb-2 text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription className="line-clamp-2">{description}</DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">{form}</div>
          <div className="shrink-0 pt-3">{footer}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {form}
        {footer}
      </DialogContent>
    </Dialog>
  );
}

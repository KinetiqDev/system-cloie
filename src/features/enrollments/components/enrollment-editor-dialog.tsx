"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { EnrollmentSource, YearLevel, StudentSection } from "@prisma/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
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

const enrollmentFormSchema = z.object({
  termInstanceId: z.string().uuid(),
  programId: z.string().uuid(),
  majorId: z.string().uuid().optional(),
  yearLevel: z.nativeEnum(YearLevel),
  section: z.nativeEnum(StudentSection).optional(),
});

type EnrollmentFormData = z.infer<typeof enrollmentFormSchema>;

interface EnrollmentEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  existingEnrollment?: EnrollmentItem;
  availablePrograms: { id: string; code: string; name: string }[];
  termInstances: TermInstanceItem[];
  onSuccess?: () => void;
}

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
  const [selectedProgramId, setSelectedProgramId] = useState(existingEnrollment?.programId || "");

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EnrollmentFormData>({
    defaultValues: {
      termInstanceId: existingEnrollment?.termInstanceId || "",
      programId: existingEnrollment?.programId || "",
      majorId: existingEnrollment?.majorId || undefined,
      yearLevel: existingEnrollment?.yearLevel || YearLevel.FIRST_YEAR,
      section: existingEnrollment?.section || undefined,
    },
  });

  const onSubmit = async (data: EnrollmentFormData) => {
    setIsSubmitting(true);

    const result = await adminUpsertEnrollmentAction({
      studentUserId: userId,
      termInstanceId: data.termInstanceId,
      programId: data.programId,
      majorId: data.majorId || null,
      yearLevel: data.yearLevel,
      section: data.section || null,
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

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const title = existingEnrollment ? "Edit Enrollment" : "Add Enrollment";
  const description = existingEnrollment
    ? "Update the student's enrollment details for the selected term."
    : "Enroll the student for a specific term and class configuration.";

  const form = (
    <form id="enrollment-editor-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Academic Term</Label>
        <TermInstancePicker
          termInstances={termInstances}
          value={watch("termInstanceId")}
          onChange={(value) =>
            value && setValue("termInstanceId", value, { shouldValidate: true })
          }
        />
        {errors.termInstanceId && (
          <p className="text-destructive text-sm">Please select a term</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Program</Label>
        <Select
          value={watch("programId")}
          onValueChange={(value) => {
            if (value) {
              setValue("programId", value, { shouldValidate: true });
              setSelectedProgramId(value);
            }
          }}
        >
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Year Level</Label>
          <Select
            value={watch("yearLevel")}
            onValueChange={(value) =>
              setValue("yearLevel", value as YearLevel, { shouldValidate: true })
            }
          >
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
        </div>

        <div className="space-y-2">
          <Label>Section (Optional)</Label>
          <Select
            value={watch("section")}
            onValueChange={(value) =>
              setValue("section", value as StudentSection, { shouldValidate: true })
            }
          >
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

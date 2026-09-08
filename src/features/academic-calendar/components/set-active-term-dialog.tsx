"use client";

import { useState } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import { transitionPeriodStatusAction } from "@/lib/actions/secretary-school-year-actions";
import { showToast } from "@/components/ui/toast";
import type { TermInstanceItem } from "../types";

interface SetActiveTermDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  termInstance: TermInstanceItem;
  onSuccess?: () => void;
}

/**
 * Confirmation dialog for activating a term instance through the lifecycle
 * transition service.
 */
export function SetActiveTermDialog({
  open,
  onOpenChange,
  termInstance,
  onSuccess,
}: SetActiveTermDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("periodId", termInstance.id);
      formData.append("target", "ACTIVE");

      const result = await transitionPeriodStatusAction(formData);

      if (result.success) {
        const label = formatTermInstanceLabel(
          termInstance.schoolYearCode,
          termInstance.semester,
          termInstance.term
        );
        showToast(`${label} is now the active term`, "success");
        onOpenChange(false);
        onSuccess?.();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Action failed; please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  const termLabel = formatTermInstanceLabel(
    termInstance.schoolYearCode,
    termInstance.semester,
    termInstance.term
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent desktopClassName="sm:max-w-[425px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Set Active Term</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Make this the default term used throughout System CLOIE.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="flex flex-col gap-4 px-4 py-4 md:p-0">
          <Alert variant="information">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>{termLabel}</strong> will become the active term.
              {termInstance.status === "ACTIVE" && " This term is already active."}
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            loading={isSubmitting}
            disabled={termInstance.status === "ACTIVE"}
          >
            {isSubmitting ? "Setting…" : "Set as Active"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

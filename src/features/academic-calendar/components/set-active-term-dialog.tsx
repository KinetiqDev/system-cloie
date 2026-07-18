"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import { setActiveTermInstanceAction } from "@/lib/actions/secretary-school-year-actions";
import { showToast } from "@/components/ui/toast";
import type { TermInstanceItem } from "../types";

interface SetActiveTermDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  termInstance: TermInstanceItem;
  onSuccess?: () => void;
}

/**
 * Confirmation dialog for setting a term instance as active.
 */
export function SetActiveTermDialog({
  open,
  onOpenChange,
  termInstance,
  onSuccess,
}: SetActiveTermDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("termInstanceId", termInstance.id);

    const result = await setActiveTermInstanceAction(formData);

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
      showToast(result.error, "error");
    }

    setIsSubmitting(false);
  }

  const termLabel = formatTermInstanceLabel(
    termInstance.schoolYearCode,
    termInstance.semester,
    termInstance.term
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Active Term</DialogTitle>
          <DialogDescription>
            Are you sure you want to make this the active term? This will affect
            the default term used throughout the system.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{termLabel}</strong> will become the active term.
              {termInstance.status === "ACTIVE" && " This term is already active."}
            </AlertDescription>
          </Alert>
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
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || termInstance.status === "ACTIVE"}
          >
            {isSubmitting ? "Setting..." : "Set Active"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

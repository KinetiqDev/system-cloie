"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface CloseEvaluationDialogProps {
  deploymentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  /** Entity noun shown in title and confirm button; defaults to "Evaluation". */
  entityLabel?: string;
}

export function CloseEvaluationDialog({
  deploymentName,
  open,
  onOpenChange,
  onConfirm,
  isPending,
  entityLabel = "Evaluation",
}: CloseEvaluationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive size-5" />
            Close {entityLabel}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to close <span className="font-semibold">{deploymentName}</span>?
            This action cannot be undone. Respondents will no longer be able to submit responses.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={onConfirm} loading={isPending}>
            Close {entityLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

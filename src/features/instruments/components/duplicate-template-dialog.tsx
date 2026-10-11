"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@/components/ui/responsive-alert-dialog";
import { Button } from "@/components/ui/button";

type DuplicateTemplateDialogProps = {
  templateName: string;
  open: boolean;
  isPending: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DuplicateTemplateDialog({
  templateName,
  open,
  isPending,
  error,
  onOpenChange,
  onConfirm,
}: DuplicateTemplateDialogProps) {
  return (
    <ResponsiveAlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isPending) return;
        onOpenChange(next);
      }}
    >
      <ResponsiveAlertDialogContent desktopClassName="sm:max-w-md">
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle>Duplicate Template</ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            Create a copy of <span className="font-semibold">{templateName}</span>? The copy will
            appear as a new template you can edit.
          </ResponsiveAlertDialogDescription>
        </ResponsiveAlertDialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel disabled={isPending}>Cancel</ResponsiveAlertDialogCancel>
          <Button onClick={onConfirm} loading={isPending}>
            Duplicate
          </Button>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
}

"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface ReopenEvaluationDialogProps {
  deploymentName: string;
  isPending: boolean;
  onConfirm: (deadlineAt: Date) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  /** Entity noun shown in title and confirm button; defaults to "Evaluation". */
  entityLabel?: string;
  /** Who the reopened deployment serves; defaults to "existing assigned students". */
  audienceLabel?: string;
}

export function ReopenEvaluationDialog({
  deploymentName,
  isPending,
  onConfirm,
  onOpenChange,
  open,
  entityLabel = "Evaluation",
  audienceLabel = "existing assigned students",
}: ReopenEvaluationDialogProps) {
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setDeadline("");
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const deadlineAt = new Date(deadline);

    if (!deadline || Number.isNaN(deadlineAt.getTime()) || deadlineAt.getTime() <= Date.now()) {
      setError("Choose a deadline later than the current time.");
      return;
    }

    setError(null);
    onConfirm(deadlineAt);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="text-primary size-5" />
              Reopen {entityLabel}
            </DialogTitle>
            <DialogDescription>
              Reopen <span className="font-semibold">{deploymentName}</span> for {audienceLabel}.
              Their saved drafts and submitted responses will remain unchanged.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="reopen-deadline">New deadline</FieldLabel>
              <Input
                id="reopen-deadline"
                type="datetime-local"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby="reopen-deadline-description"
                disabled={isPending}
                required
              />
              <FieldDescription id="reopen-deadline-description">
                The evaluation becomes active immediately and closes after this date and time.
              </FieldDescription>
              <FieldError>{error}</FieldError>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              Reopen {entityLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

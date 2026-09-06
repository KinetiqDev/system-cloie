"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { buildStudentEvaluationAnswerKey } from "@/features/responses/answer-keys";
import type { StudentEvaluationSection } from "@/features/responses/types";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  sections: StudentEvaluationSection[];
  answers: Record<string, number | string>;
  isSubmitting?: boolean;
  submissionError?: string | null;
}

export function ReviewModal({
  isOpen,
  onClose,
  onSubmit,
  sections,
  answers,
  isSubmitting = false,
  submissionError = null,
}: ReviewModalProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const reviewBody = (
    <div
      className="flex-1 overflow-y-auto p-6"
      role="region"
      aria-label="Review answers"
      tabIndex={0}
    >
      <div className="space-y-8">
        {sections.map((s) => (
          <div key={s.id}>
            <h3 className="text-text-muted text-label-sm mb-4 font-bold tracking-wider uppercase">
              {s.name}
            </h3>
            <div className="space-y-4">
              {s.items.map((item) => {
                const answerKey =
                  item.kind === "quantitative"
                    ? buildStudentEvaluationAnswerKey(s.id, "quantitative", item.itemKey)
                    : buildStudentEvaluationAnswerKey(s.id, "qualitative", item.promptKey);
                const answer = answers[answerKey];

                return (
                  <div
                    key={item.kind === "quantitative" ? item.itemKey : item.promptKey}
                    className="border-border flex items-start justify-between gap-4 border-b py-3"
                  >
                    <span className="text-text-secondary text-sm">{item.prompt}</span>
                    <span className="text-selected-fg bg-primary-soft shrink-0 rounded-md px-3 py-1 font-black">
                      {answer ?? "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Alert variant="warning" className="mt-8">
        <AlertCircle className="size-5 shrink-0" />
        <AlertTitle>Responses are final after submission</AlertTitle>
        <AlertDescription>
          Please review your answers carefully. By clicking submit, your responses will be finalized
          and locked. You cannot edit them after this step.
        </AlertDescription>
      </Alert>
    </div>
  );

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="font-bold">
        Go Back
      </Button>
      <Button onClick={onSubmit} disabled={isSubmitting} className="min-w-[140px] px-8 font-bold">
        {isSubmitting ? "Submitting..." : "Confirm & Submit"}
      </Button>
    </>
  );

  if (!isDesktop) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose} showSwipeHandle>
        <DrawerContent className="flex h-[min(88dvh,52rem)] flex-col overflow-hidden px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <DrawerHeader className="border-border shrink-0 border-b px-0 pt-4 pb-3 text-left">
            <DrawerTitle className="font-heading flex items-center gap-2 text-lg font-bold">
              <CheckCircle2 className="text-success size-5" />
              Review Your Answers
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              Review all your answers before final submission.
            </DrawerDescription>
          </DrawerHeader>

          {reviewBody}

          {submissionError && (
            <div className="shrink-0 pt-2">
              <Alert variant="destructive" role="alert">
                <AlertCircle className="size-4" />
                <AlertTitle className="sr-only">Submission failed</AlertTitle>
                <AlertDescription className="font-medium">{submissionError}</AlertDescription>
              </Alert>
            </div>
          )}

          <DrawerFooter className="bg-surface shrink-0 gap-3 border-t px-0 pt-3 sm:gap-0">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex h-[80vh] max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b p-6">
          <DialogTitle className="font-heading flex items-center gap-2 text-xl font-black">
            <CheckCircle2 className="text-success size-5" />
            Review Your Answers
          </DialogTitle>
          <DialogDescription className="sr-only">
            Review all your answers before final submission.
          </DialogDescription>
        </DialogHeader>

        {reviewBody}

        {submissionError && (
          <div className="shrink-0 px-6">
            <Alert variant="destructive" role="alert">
              <AlertCircle className="size-4" />
              <AlertTitle className="sr-only">Submission failed</AlertTitle>
              <AlertDescription className="font-medium">{submissionError}</AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="bg-surface shrink-0 gap-3 border-t p-6 sm:gap-0">
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

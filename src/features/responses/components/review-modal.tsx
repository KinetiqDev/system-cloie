import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { buildStudentEvaluationAnswerKey } from "@/features/responses/answer-keys";
import type { StudentEvaluationSection } from "@/features/responses/types";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  sections: StudentEvaluationSection[];
  answers: Record<string, number | string>;
  isSubmitting?: boolean;
}

export function ReviewModal({
  isOpen,
  onClose,
  onSubmit,
  sections,
  answers,
  isSubmitting = false,
}: ReviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex h-[80vh] max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b p-6">
          <DialogTitle className="font-heading flex items-center gap-2 text-xl font-black">
            <CheckCircle2 className="text-success size-5" />
            Review Your Answers
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {sections.map((s) => (
              <div key={s.id}>
                <h3 className="text-primary mb-4 text-[10px] font-bold tracking-widest uppercase">
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
                        className="border-border/50 flex items-start justify-between gap-4 border-b py-3"
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

          <div className="mt-8 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <AlertCircle className="size-5 shrink-0 text-amber-600" />
            <p className="text-xs leading-relaxed font-medium text-amber-800">
              Please review your answers carefully. By clicking submit, your responses will be
              finalized and locked. You cannot edit them after this step.
            </p>
          </div>
        </div>

        <DialogFooter className="bg-surface shrink-0 gap-3 border-t p-6 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="font-bold">
            Go Back
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary-hover min-w-[140px] px-8 font-bold"
          >
            {isSubmitting ? "Submitting..." : "Confirm & Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Check,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ReviewModal } from "./review-modal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { buildStudentEvaluationAnswerKey } from "@/features/responses/answer-keys";
import type { StudentEvaluationSection } from "@/features/responses/types";

function hasQuantitativeAnswer(value: number | string | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

function hasQualitativeAnswer(value: number | string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isItemRequired(item: StudentEvaluationSection["items"][number]): boolean {
  // Absent flag means required (legacy snapshots), matching the server default.
  return item.required !== false;
}

function isSectionComplete(
  section: StudentEvaluationSection,
  answers: Record<string, number | string>
): boolean {
  if (section.items.length === 0) {
    return true;
  }

  return section.items.every((item) => {
    if (!isItemRequired(item)) {
      return true;
    }

    const answerKey =
      item.kind === "quantitative"
        ? buildStudentEvaluationAnswerKey(section.id, "quantitative", item.itemKey)
        : buildStudentEvaluationAnswerKey(section.id, "qualitative", item.promptKey);
    const answerValue = answers[answerKey];

    return item.kind === "quantitative"
      ? hasQuantitativeAnswer(answerValue)
      : hasQualitativeAnswer(answerValue);
  });
}

function findFirstIncompleteSectionIndex(
  sections: StudentEvaluationSection[],
  answers: Record<string, number | string>
): number {
  const index = sections.findIndex((section) => !isSectionComplete(section, answers));

  return index === -1 ? Math.max(0, sections.length - 1) : index;
}

function buildSectionValidationMessage(
  quantitativeCount: number,
  qualitativeCount: number
): string {
  const plural = qualitativeCount > 1 ? "s" : "";

  if (quantitativeCount > 0 && qualitativeCount > 0) {
    return `Please answer all questions, including the written response${plural}, before proceeding (${quantitativeCount + qualitativeCount} remaining).`;
  }

  if (qualitativeCount > 0) {
    return `Please complete the written response${plural} in this section before proceeding (${qualitativeCount} remaining).`;
  }

  return `Please answer all questions in this section before proceeding (${quantitativeCount} remaining).`;
}

const SUBMISSION_ERROR_FALLBACK = "We couldn't submit your response right now. Please try again.";

function isTechnicalErrorText(message: string): boolean {
  return (
    /\b(Error|TypeError|RangeError|ReferenceError|SyntaxError)\b/i.test(message) ||
    /\[object Object\]/i.test(message) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(message) ||
    /\bat\s+[^\n]+\s+\(?[^\n]*\d+:\d+\)?/.test(message) ||
    /\b(violation|constraint|digest|traceback|stack trace)\b/i.test(message)
  );
}

function toSafeSubmissionError(rawError: string | undefined): string {
  const message = rawError?.trim();

  if (!message || isTechnicalErrorText(message)) {
    return SUBMISSION_ERROR_FALLBACK;
  }

  return message;
}

function formatServerTimestamp(isoTimestamp: string | undefined): string | null {
  if (!isoTimestamp) {
    return null;
  }

  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

type SectionItem = StudentEvaluationSection["items"][number];

type QuantitativeItemFieldProps = {
  item: Extract<SectionItem, { kind: "quantitative" }>;
  currentValue: number | string | undefined;
  validationError: string | null;
  onValueChange: (itemKey: string, value: number | string) => void;
};

type QualitativeItemFieldProps = {
  item: Extract<SectionItem, { kind: "qualitative" }>;
  currentValue: string;
  validationError: string | null;
  onValueChange: (itemKey: string, value: number | string) => void;
};

function getNormalizedSuggestedResponses(suggestedResponses?: string[]): string[] {
  if (!suggestedResponses?.length) {
    return [];
  }

  const seen = new Set<string>();

  return suggestedResponses.reduce<string[]>((acc, suggestion) => {
    const normalizedSuggestion = suggestion.trim();

    if (!normalizedSuggestion || seen.has(normalizedSuggestion)) {
      return acc;
    }

    seen.add(normalizedSuggestion);
    acc.push(normalizedSuggestion);
    return acc;
  }, []);
}

function QuantitativeItemField({
  item,
  currentValue,
  validationError,
  onValueChange,
}: QuantitativeItemFieldProps) {
  return (
    <fieldset
      className={cn(
        "bg-surface rounded-xl border p-4 transition-colors",
        validationError && !currentValue ? "border-danger bg-danger-soft/30" : "border-border"
      )}
    >
      <legend className="mb-4 px-1 font-semibold">{item.prompt}</legend>
      <div role="radiogroup" aria-label={item.prompt} className="flex flex-wrap gap-4 sm:gap-6">
        {item.scale.map((v, idx) => {
          const descriptorLabel = item.descriptorLabels?.[idx];
          return (
            <label key={v} className="group flex cursor-pointer flex-col items-center gap-1">
              <input
                type="radio"
                name={`q-${item.itemKey}`}
                value={v}
                checked={currentValue === v}
                onChange={() => onValueChange(item.itemKey, v)}
                className="peer sr-only"
              />
              <div className="border-border-strong peer-focus-visible:ring-ring peer-checked:bg-primary peer-checked:border-primary hover:bg-primary-soft hover:border-primary peer-checked:text-on-primary flex size-12 touch-manipulation items-center justify-center rounded-full border-2 text-lg font-bold transition-[color,background-color,border-color,box-shadow,transform] peer-focus-visible:ring-3 active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100">
                {v}
              </div>
              {descriptorLabel && (
                <span className="text-text-muted text-caption mt-0.5 max-w-[80px] text-center leading-tight">
                  {descriptorLabel}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function QualitativeItemField({
  item,
  currentValue,
  validationError,
  onValueChange,
}: QualitativeItemFieldProps) {
  const handleSuggestedResponseClick = (suggestion: string) => {
    const trimmedSuggestion = suggestion.trim();
    if (!trimmedSuggestion) return;

    const tokens = currentValue
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const alreadySelected = tokens.includes(trimmedSuggestion);

    const nextTokens = alreadySelected
      ? tokens.filter((t) => t !== trimmedSuggestion)
      : [...tokens, trimmedSuggestion];

    onValueChange(item.promptKey, nextTokens.join(", "));
  };

  return (
    <fieldset
      className={cn(
        "bg-surface rounded-xl border p-4 transition-colors",
        validationError && isItemRequired(item) && currentValue.trim().length === 0
          ? "border-danger bg-danger-soft/30"
          : "border-border"
      )}
    >
      <legend className="mb-4 px-1 font-semibold">{item.prompt}</legend>

      {item.suggestedResponses && item.suggestedResponses.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {getNormalizedSuggestedResponses(item.suggestedResponses).map((suggestion, index) => (
            <button
              key={`${item.promptKey}:${index}:${suggestion}`}
              type="button"
              onClick={() => handleSuggestedResponseClick(suggestion)}
              className={cn(
                "text-label-sm touch-manipulation rounded-full border px-3 py-1.5 font-medium transition-[color,background-color,border-color,box-shadow,transform] pointer-coarse:min-h-11 pointer-coarse:px-4 motion-reduce:transition-none",
                "hover:bg-primary-soft hover:border-primary hover:text-selected-fg",
                "focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                "active:scale-95 motion-reduce:active:scale-100",
                currentValue
                  .split(",")
                  .map((value) => value.trim())
                  .includes(suggestion)
                  ? "bg-primary/10 border-primary text-selected-fg"
                  : "bg-surface border-border text-text-secondary"
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <Textarea
        aria-label={item.prompt}
        value={currentValue}
        onChange={(e) => onValueChange(item.promptKey, e.target.value)}
        placeholder="Enter your response…"
        className="min-h-[100px]"
      />
    </fieldset>
  );
}
interface WizardShellProps {
  assignmentId: string;
  title: string;
  courseTitle?: string;
  sections: StudentEvaluationSection[];
  initialAnswers?: Record<string, number | string>;
  returnRoute?: string;
  submittedHistoryRoute?: string;
  submittedReviewHref?: string;
  onSaveDraft?: (input: {
    assignmentId: string;
    sectionKey: string;
    answers: Record<string, number | string>;
  }) => Promise<{ success: boolean; savedAt?: string; error?: string }>;
  onSubmitResponse?: (input: {
    assignmentId: string;
    answers: Record<string, number | string>;
  }) => Promise<{ success: boolean; responseId?: string; submittedAt?: string; error?: string }>;
}

export function WizardShell({
  assignmentId,
  title,
  courseTitle,
  sections,
  initialAnswers = {},
  returnRoute = "/",
  submittedHistoryRoute,
  submittedReviewHref,
  onSaveDraft,
  onSubmitResponse,
}: WizardShellProps) {
  const [currentStep, setCurrentStep] = React.useState(() =>
    findFirstIncompleteSectionIndex(sections, initialAnswers)
  );
  const [answers, setAnswers] = React.useState<Record<string, number | string>>(initialAnswers);
  const [isReviewOpen, setIsReviewOpen] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [submissionError, setSubmissionError] = React.useState<string | null>(null);
  const [submittedReceipt, setSubmittedReceipt] = React.useState<{
    responseId?: string;
    submittedAt?: string;
  } | null>(null);

  const router = useRouter();
  const totalSteps = sections.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const currentSection = sections[currentStep];

  const scrollToTop = () => {
    const behavior = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    const mainContainer = document.querySelector("main");
    if (mainContainer) {
      mainContainer.scrollTo({ top: 0, behavior });
    } else {
      window.scrollTo({ top: 0, behavior });
    }
  };

  const handleValueChange = (itemKey: string, value: number | string) => {
    const firstItem = currentSection.items.find((item) =>
      item.kind === "quantitative" ? item.itemKey === itemKey : item.promptKey === itemKey
    );

    if (!firstItem) {
      return;
    }

    const answerKey = buildStudentEvaluationAnswerKey(currentSection.id, firstItem.kind, itemKey);
    setAnswers((prev) => ({
      ...prev,
      [answerKey]: value,
    }));
    setValidationError(null);
  };

  const validateCurrentSection = React.useCallback(() => {
    const unansweredQuantitative = currentSection.items.filter((item) => {
      if (item.kind !== "quantitative" || !isItemRequired(item)) {
        return false;
      }
      const answerKey = buildStudentEvaluationAnswerKey(
        currentSection.id,
        "quantitative",
        item.itemKey
      );
      return !hasQuantitativeAnswer(answers[answerKey]);
    });
    const unansweredQualitative = currentSection.items.filter((item) => {
      if (item.kind !== "qualitative" || !isItemRequired(item)) {
        return false;
      }
      const answerKey = buildStudentEvaluationAnswerKey(
        currentSection.id,
        "qualitative",
        item.promptKey
      );
      return !hasQualitativeAnswer(answers[answerKey]);
    });

    const remaining = unansweredQuantitative.length + unansweredQualitative.length;
    if (remaining > 0) {
      setValidationError(
        buildSectionValidationMessage(unansweredQuantitative.length, unansweredQualitative.length)
      );
      return false;
    }
    setValidationError(null);
    return true;
  }, [currentSection, answers]);

  const handleSaveDraft = React.useCallback(async () => {
    if (!onSaveDraft) return;

    setIsSaving(true);
    try {
      const sectionAnswers: Record<string, number | string> = {};
      for (const [key, value] of Object.entries(answers)) {
        if (key.startsWith(`${currentSection.id}:`)) {
          sectionAnswers[key] = value;
        }
      }

      const result = await onSaveDraft({
        assignmentId,
        sectionKey: currentSection.id,
        answers: sectionAnswers,
      });

      if (result.success) {
        setLastSaved(new Date());
      }
    } finally {
      setIsSaving(false);
    }
  }, [onSaveDraft, assignmentId, currentSection.id, answers]);

  const handleNext = async () => {
    if (validateCurrentSection()) {
      await handleSaveDraft();

      if (currentStep < totalSteps - 1) {
        setCurrentStep((prev) => prev + 1);
        scrollToTop();
      } else {
        setIsReviewOpen(true);
        setSubmissionError(null);
      }
    } else {
      scrollToTop();
    }
  };

  const handlePrevious = () => {
    void handleSaveDraft();
    setCurrentStep((prev) => Math.max(0, prev - 1));
    setValidationError(null);
    scrollToTop();
  };

  const handleSubmit = async () => {
    if (!onSubmitResponse) {
      setIsReviewOpen(false);
      setIsSubmitted(true);
      return;
    }

    setIsSaving(true);
    setSubmissionError(null);
    try {
      const result = await onSubmitResponse({
        assignmentId,
        answers,
      });

      if (result.success) {
        setIsReviewOpen(false);
        setIsSubmitted(true);
        setSubmittedReceipt({
          responseId: result.responseId,
          submittedAt: result.submittedAt,
        });
      } else {
        setSubmissionError(toSafeSubmissionError(result.error));
      }
    } catch {
      setSubmissionError(SUBMISSION_ERROR_FALLBACK);
    } finally {
      setIsSaving(false);
    }
  };

  const restoredDraft = Object.keys(initialAnswers).length > 0;
  const savedTimeText = isSaving
    ? "Saving..."
    : lastSaved
      ? lastSaved.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      : restoredDraft
        ? "Draft restored"
        : "Not saved";

  if (isSubmitted) {
    const receiptResponseId = submittedReceipt?.responseId;
    const formattedSubmittedAt = formatServerTimestamp(submittedReceipt?.submittedAt);
    const hasReceiptData = Boolean(receiptResponseId || formattedSubmittedAt);
    const historyHref =
      submittedReviewHref ??
      (submittedHistoryRoute && receiptResponseId
        ? `${submittedHistoryRoute}/${receiptResponseId}`
        : null);

    return (
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in flex min-h-[60vh] flex-col items-center justify-center text-center motion-safe:duration-500">
        <div className="bg-success/10 mb-6 flex size-20 items-center justify-center rounded-full">
          <CheckCircle2 className="text-success size-10" />
        </div>
        <h1 className="font-heading mb-2 text-3xl font-black">Evaluation Submitted!</h1>
        <p className="text-text-secondary mb-8 max-w-md">
          Thank you for completing the {title}. Your feedback has been recorded and will help us
          improve our quality of service.
        </p>

        {hasReceiptData && (
          <div className="bg-surface border-border mx-auto mb-8 w-full max-w-md rounded-xl border p-4 text-left sm:p-5">
            <p className="text-text-muted text-label-sm font-bold tracking-wider uppercase">
              Submission receipt
            </p>
            <dl className="mt-3 space-y-2">
              {receiptResponseId && (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-text-secondary text-body-sm shrink-0">Reference</dt>
                  <dd className="text-text-primary text-body-sm font-semibold break-all text-right tabular-nums">
                    {receiptResponseId}
                  </dd>
                </div>
              )}
              {formattedSubmittedAt && (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-text-secondary text-body-sm shrink-0">Submitted</dt>
                  <dd className="text-text-primary text-body-sm font-semibold text-right">
                    {formattedSubmittedAt}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        <div className="flex w-full max-w-xs flex-col items-stretch gap-3">
          {historyHref && (
            <Button
              variant="outline"
              onClick={() => router.push(historyHref)}
              className="min-h-11 font-bold"
            >
              View Submitted Response
            </Button>
          )}
          <Button onClick={() => router.push(returnRoute)} className="min-h-11 px-8 font-bold">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] flex-col">
      {/* Sticky Wizard Header */}
      <div className="bg-background border-border sticky top-0 z-20 mb-4 border-b pb-3 sm:mb-6 sm:pb-4">
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(returnRoute)}
            className="-ml-2"
          >
            <ArrowLeft className="mr-2 size-4" /> Back to Dashboard
          </Button>
          <div className="text-text-muted text-label-sm flex items-center gap-2 font-bold tracking-wider uppercase">
            <Save className="size-4" /> {isSaving ? "Saving..." : savedTimeText}
          </div>
        </div>
        <h1 className="font-heading text-heading-md mb-2 font-black sm:mb-3">{title}</h1>
        {courseTitle && (
          <p className="text-text-secondary text-body-md mb-2 sm:mb-3">{courseTitle}</p>
        )}
        <div className="space-y-1.5">
          <div className="text-text-muted text-label-sm flex justify-between font-bold uppercase">
            <span>
              Section {currentStep + 1} of {totalSteps}
            </span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress
            value={progress}
            className="h-2"
            aria-label={`Section progress: ${Math.round(progress)}%`}
          />
          {totalSteps > 1 && (
            <div
              role="list"
              aria-label="Section completion"
              className="mt-2 flex flex-wrap items-center gap-1.5"
            >
              {sections.map((section, index) => {
                const complete = isSectionComplete(section, answers);
                const isCurrent = index === currentStep;
                const stateLabel = complete
                  ? "completed"
                  : isCurrent
                    ? "in progress"
                    : "not started";

                return (
                  <span
                    key={section.id}
                    role="listitem"
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "text-caption flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium",
                      complete
                        ? "border-success/40 bg-success/10 text-success"
                        : isCurrent
                          ? "border-primary bg-primary-soft text-selected-fg"
                          : "border-border text-text-muted"
                    )}
                  >
                    {complete ? (
                      <Check className="size-3" />
                    ) : (
                      <span aria-hidden="true">{index + 1}</span>
                    )}
                    <span className="sr-only">{`Section ${index + 1} ${stateLabel}`}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Section Content */}
        <div className="pb-32">
          {validationError && (
            <Alert
              variant="destructive"
              className="motion-safe:animate-in motion-safe:slide-in-from-top-2 mb-6"
            >
              <AlertCircle className="size-4" />
              <AlertTitle className="sr-only">Validation Error</AlertTitle>
              <AlertDescription className="font-medium">{validationError}</AlertDescription>
            </Alert>
          )}

          {currentStep === 0 && (
            <div className="bg-surface border-border mb-6 rounded-xl border p-4 sm:p-5">
              <h2 className="text-title-md mb-2 font-bold">How to answer</h2>
              <ul className="text-text-secondary text-body-sm list-disc space-y-1.5 pl-5">
                <li>Rate each statement on the scale provided.</li>
                <li>Written-response questions must be answered before you can continue.</li>
                <li>Suggested response chips are optional — tap one to add it, or type your own.</li>
              </ul>
            </div>
          )}

          <h2 className="text-title-lg mb-4 font-bold">{currentSection.name}</h2>
          <p className="text-text-secondary text-body-sm mb-6 sm:mb-8">
            {currentSection.description}
          </p>

          <div className="space-y-8">
            {currentSection.items.map((item) => {
              const answerKey = buildStudentEvaluationAnswerKey(
                currentSection.id,
                item.kind,
                item.kind === "quantitative" ? item.itemKey : item.promptKey
              );
              const rawValue = answers[answerKey];
              const currentValue =
                item.kind === "qualitative"
                  ? typeof rawValue === "string"
                    ? rawValue
                    : ""
                  : rawValue;

              return item.kind === "quantitative" ? (
                <QuantitativeItemField
                  key={item.itemKey}
                  item={item}
                  currentValue={currentValue}
                  validationError={validationError}
                  onValueChange={handleValueChange}
                />
              ) : (
                <QualitativeItemField
                  key={item.promptKey}
                  item={item}
                  currentValue={currentValue as string}
                  validationError={validationError}
                  onValueChange={handleValueChange}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky Wizard Footer */}
      <div className="bg-surface border-border fixed inset-x-0 bottom-0 z-[60] border-t px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:left-64">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="min-h-11 font-bold"
          >
            <ArrowLeft className="mr-2 size-4" /> Previous
          </Button>

          <Button
            onClick={handleNext}
            className="min-h-11 min-w-[160px] font-bold"
            disabled={isSaving}
          >
            {currentStep === totalSteps - 1 ? (
              <span className="flex items-center">
                Review & Submit <CheckCircle className="ml-2 size-4" />
              </span>
            ) : (
              <span className="flex items-center">
                Next Section <ArrowRight className="ml-2 size-4" />
              </span>
            )}
          </Button>
        </div>
      </div>

      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onSubmit={handleSubmit}
        isSubmitting={isSaving}
        submissionError={submissionError}
        sections={sections}
        answers={answers}
      />
    </div>
  );
}

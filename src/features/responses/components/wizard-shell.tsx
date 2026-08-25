"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Save, CheckCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { ReviewModal } from "./review-modal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { buildStudentEvaluationAnswerKey } from "@/features/responses/answer-keys";
import type { StudentEvaluationSection } from "@/features/responses/types";

interface WizardShellProps {
  assignmentId: string;
  title: string;
  courseTitle?: string;
  sections: StudentEvaluationSection[];
  initialAnswers?: Record<string, number | string>;
  returnRoute?: string;
  onSaveDraft?: (input: {
    assignmentId: string;
    sectionKey: string;
    answers: Record<string, number | string>;
  }) => Promise<{ success: boolean; savedAt?: string; error?: string }>;
  onSubmitResponse?: (input: {
    assignmentId: string;
    answers: Record<string, number | string>;
  }) => Promise<{ success: boolean; responseId?: string; error?: string }>;
}

export function WizardShell({
  assignmentId,
  title,
  courseTitle,
  sections,
  initialAnswers = {},
  returnRoute = "/",
  onSaveDraft,
  onSubmitResponse,
}: WizardShellProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, number | string>>(initialAnswers);
  const [isReviewOpen, setIsReviewOpen] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

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

  const getNormalizedSuggestedResponses = React.useCallback((suggestedResponses?: string[]) => {
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
  }, []);

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

  const handleSuggestedResponseClick = (
    promptKey: string,
    suggestion: string,
    currentValue: string
  ) => {
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

    handleValueChange(promptKey, nextTokens.join(", "));
  };

  const validateCurrentSection = React.useCallback(() => {
    const requiredItems = currentSection.items.filter((item) => item.kind === "quantitative");
    const unanswered = requiredItems.filter((item) => {
      const answerKey = buildStudentEvaluationAnswerKey(
        currentSection.id,
        "quantitative",
        item.itemKey
      );
      return !answers[answerKey];
    });

    if (unanswered.length > 0) {
      setValidationError(
        `Please answer all questions in this section before proceeding (${unanswered.length} remaining).`
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
    try {
      const result = await onSubmitResponse({
        assignmentId,
        answers,
      });

      if (result.success) {
        setIsReviewOpen(false);
        setIsSubmitted(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const savedTimeText = lastSaved
    ? lastSaved.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : "Not saved";

  if (isSubmitted) {
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
        <Button onClick={() => router.push(returnRoute)} className="px-8 font-bold">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] flex-col">
      {/* Sticky Wizard Header */}
      <div className="bg-background border-border sticky top-0 z-20 mb-6 border-b pb-4">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
            <ArrowLeft className="mr-2 size-4" /> Back to Dashboard
          </Button>
          <div className="text-text-muted text-label-sm flex items-center gap-2 font-bold tracking-wider uppercase">
            <Save className="size-4" /> {isSaving ? "Saving..." : savedTimeText}
          </div>
        </div>
        <h1 className="font-heading text-heading-md mb-3 font-black">{title}</h1>
        {courseTitle && <p className="text-text-secondary text-body-md mb-3">{courseTitle}</p>}
        <div className="space-y-1.5">
          <div className="text-text-muted text-label-sm flex justify-between font-bold uppercase">
            <span>
              Section {currentStep + 1} of {totalSteps}
            </span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
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

          <h2 className="text-title-lg mb-4 font-bold">{currentSection.name}</h2>
          <p className="text-text-secondary text-body-sm mb-8">{currentSection.description}</p>

          <div className="space-y-8">
            {currentSection.items.map((item) => {
              if (item.kind === "quantitative") {
                const typedAnswerKey = buildStudentEvaluationAnswerKey(
                  currentSection.id,
                  "quantitative",
                  item.itemKey
                );
                const currentValue = answers[typedAnswerKey];

                return (
                  <fieldset
                    key={item.itemKey}
                    className={cn(
                      "bg-surface rounded-xl border p-4 transition-colors",
                      validationError && !currentValue
                        ? "border-danger bg-danger-soft/30"
                        : "border-border"
                    )}
                  >
                    <legend className="mb-4 px-1 font-semibold">{item.prompt}</legend>
                    <div
                      role="radiogroup"
                      aria-label={item.prompt}
                      className="flex flex-wrap gap-4 sm:gap-6"
                    >
                      {item.scale.map((v, idx) => {
                        const descriptorLabel = item.descriptorLabels?.[idx];
                        return (
                          <label
                            key={v}
                            className="group flex cursor-pointer flex-col items-center gap-1"
                          >
                            <input
                              type="radio"
                              name={`q-${item.itemKey}`}
                              value={v}
                              checked={currentValue === v}
                              onChange={() => handleValueChange(item.itemKey, v)}
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
              } else {
                const answerKey = buildStudentEvaluationAnswerKey(
                  currentSection.id,
                  "qualitative",
                  item.promptKey
                );
                const currentValue = (answers[answerKey] as string) || "";

                return (
                  <fieldset
                    key={item.promptKey}
                    className="bg-surface border-border rounded-xl border p-4"
                  >
                    <legend className="mb-4 px-1 font-semibold">{item.prompt}</legend>

                    {/* Suggestion chips for guided open-ended questions */}
                    {item.suggestedResponses && item.suggestedResponses.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {getNormalizedSuggestedResponses(item.suggestedResponses).map(
                          (suggestion, index) => (
                            <button
                              key={`${item.promptKey}:${index}:${suggestion}`}
                              type="button"
                              onClick={() =>
                                handleSuggestedResponseClick(
                                  item.promptKey,
                                  suggestion,
                                  currentValue
                                )
                              }
                              className={cn(
                                "text-label-sm touch-manipulation rounded-full border px-3 py-1.5 font-medium transition-[color,background-color,border-color,box-shadow,transform] motion-reduce:transition-none",
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
                          )
                        )}
                      </div>
                    )}

                    <Textarea
                      aria-label={item.prompt}
                      value={currentValue}
                      onChange={(e) => handleValueChange(item.promptKey, e.target.value)}
                      placeholder="Enter your response…"
                      className="min-h-[100px]"
                    />
                  </fieldset>
                );
              }
            })}
          </div>
        </div>
      </div>

      {/* Sticky Wizard Footer */}
      <div className="bg-surface border-border fixed inset-x-0 bottom-0 z-40 border-t p-4 lg:left-64">
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
        sections={sections}
        answers={answers}
      />
    </div>
  );
}

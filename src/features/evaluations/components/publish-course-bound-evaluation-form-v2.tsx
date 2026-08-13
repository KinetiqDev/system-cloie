"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showToast } from "@/components/ui/toast";
import type {
  PreviewCourseBoundRespondentsInput,
  PreviewCourseBoundRespondentsResult,
  PreviewRespondent,
  PublishCourseBoundEvaluationInput,
  PublishCourseBoundEvaluationResult,
} from "@/features/evaluations/types";
import type { TemplateStructure } from "@/features/instruments/types";
import { isNeutralOtherExplanation } from "../exclusion-text";
import { AssignmentPicker, type AssignmentOption } from "./assignment-picker";
import { Info } from "lucide-react";

export type PublicationContext = {
  bindings: Array<{
    ciloDescriptionSnapshot: string;
    ciloId: string;
    itemKey: string;
    questionPromptSnapshot: string;
    sectionKey: string;
  }>;
  cilos: Array<{ description: string; id: string }>;
  course: {
    code: string;
    id: string;
    title: string;
  };
  template: {
    id: string;
    name: string;
    structure: TemplateStructure;
  };
};

type Step = "configure" | "preview";
type ExclusionCategory =
  | "APPROVED_ACCOMMODATION"
  | "NOT_TAKING_ASSESSMENT"
  | "ADMINISTRATIVE_EXCEPTION"
  | "OTHER";

type ExclusionDraft = {
  category: ExclusionCategory;
  otherExplanation: string;
};

interface PublishCourseBoundEvaluationFormV2Props {
  assignments: AssignmentOption[];
  previewAction: (
    payload: PreviewCourseBoundRespondentsInput
  ) => Promise<PreviewCourseBoundRespondentsResult>;
  publicationContext: PublicationContext;
  publicationContextsByAssignmentId?: Record<string, PublicationContext>;
  publishAction: (
    payload: PublishCourseBoundEvaluationInput
  ) => Promise<PublishCourseBoundEvaluationResult>;
  isOnBehalf?: boolean;
  successRedirectPath?: string;
  programId?: string;
}

/**
 * Phase 6: Simplified publish form using course assignment picker.
 * Removes manual AY/semester/term inputs in favor of assignment selection.
 */
export function PublishCourseBoundEvaluationFormV2({
  assignments,
  previewAction,
  publicationContext,
  publicationContextsByAssignmentId,
  publishAction,
  isOnBehalf: isOnBehalfProp = false,
  successRedirectPath = "/faculty/tools",
  programId,
}: PublishCourseBoundEvaluationFormV2Props) {
  // Step state
  const [step, setStep] = useState<Step>("configure");

  // Form fields
  const [deploymentName, setDeploymentName] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [activationSchedule, setActivationSchedule] = useState("");
  const [deadline, setDeadline] = useState("");

  // The server page derives this from the active portal role.
  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);
  const selectedPublicationContext = selectedAssignmentId
    ? (publicationContextsByAssignmentId?.[selectedAssignmentId] ?? publicationContext)
    : publicationContext;
  const isOnBehalf = isOnBehalfProp;

  // Preview state
  const [previewRespondents, setPreviewRespondents] = useState<PreviewRespondent[]>([]);
  const [excludedMembershipIds, setExcludedMembershipIds] = useState<string[]>([]);
  const [exclusionDrafts, setExclusionDrafts] = useState<Record<string, ExclusionDraft>>({});
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Status
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  const fallbackPublishErrorMessage = "Unable to publish evaluation right now. Please try again.";

  const bindingByCiloId = new Map(
    selectedPublicationContext.bindings.map((binding) => [binding.ciloId, binding])
  );

  // Build a lookup from sectionKey:itemKey → { sectionIndex, sectionTitle, questionIndex }
  const questionLocationMap = new Map<
    string,
    { sectionIndex: number; sectionTitle: string; questionIndex: number }
  >();
  for (const [sIdx, section] of selectedPublicationContext.template.structure.entries()) {
    for (const [qIdx, question] of section.questions.entries()) {
      questionLocationMap.set(`${section.key}:${question.key}`, {
        sectionIndex: sIdx + 1,
        sectionTitle: section.title,
        questionIndex: qIdx + 1,
      });
    }
  }

  const handleExcludeRespondent = (membershipId: string, excluded: boolean) => {
    setExcludedMembershipIds((previous) => {
      if (excluded) {
        if (previous.includes(membershipId)) return previous;
        return [...previous, membershipId];
      }
      return previous.filter((id) => id !== membershipId);
    });
    if (!excluded) {
      setExclusionDrafts((previous) => {
        const next = { ...previous };
        delete next[membershipId];
        return next;
      });
    } else {
      setExclusionDrafts((previous) => ({
        [membershipId]: previous[membershipId] ?? {
          category: "ADMINISTRATIVE_EXCEPTION",
          otherExplanation: "",
        },
        ...previous,
      }));
    }
  };

  const updateExclusionDraft = (membershipId: string, update: Partial<ExclusionDraft>) => {
    setExclusionDrafts((previous) => ({
      ...previous,
      [membershipId]: {
        category: previous[membershipId]?.category ?? "ADMINISTRATIVE_EXCEPTION",
        otherExplanation: previous[membershipId]?.otherExplanation ?? "",
        ...update,
      },
    }));
  };

  const validateConfiguration = (): boolean => {
    if (!deploymentName.trim()) {
      const message = "Please provide a deployed evaluation name.";
      setError(message);
      showToast(message, "error");
      return false;
    }

    if (!selectedAssignmentId) {
      const message = "Please select a class assignment.";
      setError(message);
      showToast(message, "error");
      return false;
    }

    return true;
  };

  const handlePreview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!validateConfiguration()) return;

    setIsLoadingPreview(true);

    try {
      const result = await previewAction({
        assignmentId: selectedAssignmentId!,
        programId,
      });

      if (!result.success) {
        const message = `${result.error}${result.referenceId ? ` Support reference: ${result.referenceId}.` : ""}`;
        setError(message);
        showToast(message, "error");
        return;
      }

      setPreviewRespondents(result.data);
      setExcludedMembershipIds([]);
      setExclusionDrafts({});
      setStep("preview");
    } catch {
      setError("Unable to load respondent preview. Please try again.");
      showToast("Unable to load respondent preview. Please try again.", "error");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handlePublishFinal = async () => {
    setError(null);
    setIsSubmitting(true);

    const excluded = previewRespondents
      .filter((respondent) => excludedMembershipIds.includes(respondent.membershipId))
      .map((respondent) => {
        const draft = exclusionDrafts[respondent.membershipId] ?? {
          category: "ADMINISTRATIVE_EXCEPTION" as const,
          otherExplanation: "",
        };
        return {
          category: draft.category,
          membershipId: respondent.membershipId,
          ...(draft.category === "OTHER"
            ? { otherExplanation: draft.otherExplanation.trim() }
            : {}),
        };
      });

    const invalidOther = excluded.some(
      (exclusion) =>
        exclusion.category === "OTHER" &&
        (!exclusion.otherExplanation ||
          exclusion.otherExplanation.length < 5 ||
          exclusion.otherExplanation.length > 200 ||
          !isNeutralOtherExplanation(exclusion.otherExplanation))
    );
    if (invalidOther) {
      const message =
        "Other exclusion explanations must be 5-200 neutral characters without sensitive details.";
      setError(message);
      showToast(message, "error");
      setIsSubmitting(false);
      return;
    }

    if (excluded.length === previewRespondents.length) {
      const message = "At least one roster member must receive this evaluation.";
      setError(message);
      showToast(message, "error");
      setIsSubmitting(false);
      return;
    }

    const payload: PublishCourseBoundEvaluationInput = {
      assignmentId: selectedAssignmentId!,
      activationAt: activationSchedule ? new Date(activationSchedule) : null,
      deadlineAt: deadline ? new Date(deadline) : null,
      deploymentName: deploymentName.trim(),
      exclusions: excluded,
      programId,
      templateId: selectedPublicationContext.template.id,
    };

    try {
      const result = await publishAction(payload);

      if (!result.success) {
        setError(result.error);
        showToast(result.error, "error");
        return;
      }

      const toastMessage = `Evaluation published successfully! ${result.data.assignmentCount} assignment(s) created.`;
      router.push(`${successRedirectPath}?toast=${encodeURIComponent(toastMessage)}`);
      return;
    } catch {
      setError(fallbackPublishErrorMessage);
      showToast(fallbackPublishErrorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep("configure");
    setExcludedMembershipIds([]);
    setExclusionDrafts({});
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-heading-lg">Publish CILO Evaluation</h1>
        <p className="text-muted-foreground text-sm">
          Select a class assignment to target the right students. The course context and
          CILO-to-question bindings come from the saved faculty template.
        </p>
      </div>

      {isOnBehalf && selectedAssignment && (
        <Alert variant="information" role="status">
          <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <AlertDescription className="text-sm">
            <strong>Note:</strong> You are deploying this evaluation on behalf of{" "}
            <span className="font-semibold">
              {selectedAssignment.facultyName || "the assigned faculty member"}
            </span>
            . Question customization is disabled for on-behalf deployments.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="border-border bg-card space-y-4 rounded-xl border p-5">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Template
            </p>
            <h2 className="text-foreground text-lg font-semibold">
              {selectedPublicationContext.template.name}
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Course
              </p>
              <p className="text-foreground text-sm">
                {selectedPublicationContext.course.code} - {selectedPublicationContext.course.title}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Saved CILO Bindings</h3>
                <p className="text-muted-foreground text-sm">
                  These bindings were saved in the template builder and will be frozen into the
                  published evaluation.
                </p>
              </div>
              {!isOnBehalf && (
                <Button
                  render={
                    <Link href={`/faculty/tools/${selectedPublicationContext.template.id}/edit`} />
                  }
                  type="button"
                  variant="outline"
                >
                  Edit Template
                </Button>
              )}
            </div>

            <ol className="space-y-3">
              {selectedPublicationContext.cilos.map((cilo, index) => {
                const binding = bindingByCiloId.get(cilo.id);

                return (
                  <li key={cilo.id} className="border-border rounded-lg border p-4">
                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                      CILO {index + 1}
                    </p>
                    <p className="text-foreground mt-2 text-sm">{cilo.description}</p>
                    {binding &&
                      (() => {
                        const location = questionLocationMap.get(
                          `${binding.sectionKey}:${binding.itemKey}`
                        );
                        return (
                          <div className="bg-muted mt-3 rounded-md p-3">
                            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                              {location
                                ? `Section ${location.sectionIndex}: ${location.sectionTitle} · Question ${location.questionIndex}`
                                : "Bound Likert Question"}
                            </p>
                            <p className="text-foreground mt-1 text-sm">
                              {binding.questionPromptSnapshot}
                            </p>
                          </div>
                        );
                      })()}
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {step === "configure" ? (
          <form
            className="border-border bg-card space-y-6 rounded-xl border p-5"
            onSubmit={handlePreview}
          >
            <div className="space-y-2">
              <Label htmlFor="deployment-name">Deployed Evaluation Name</Label>
              <Input
                id="deployment-name"
                placeholder="e.g. IT 401 Post-Term CILO Evaluation"
                value={deploymentName}
                onChange={(event) => setDeploymentName(event.target.value)}
              />
            </div>

            <AssignmentPicker
              assignments={assignments}
              value={selectedAssignmentId}
              onChange={setSelectedAssignmentId}
              label="Class Assignment"
              placeholder="Select a class..."
            />

            {selectedAssignment && (
              <Card className="bg-muted">
                <CardContent className="space-y-2 pt-6">
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Selected Class
                  </p>
                  <p className="text-foreground font-medium">
                    {selectedAssignment.courseCode} - {selectedAssignment.courseTitle}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {selectedAssignment.programCode} —{" "}
                    {selectedAssignment.yearLevel.replace("_", " ").toLowerCase()}
                    {selectedAssignment.section ? ` — ${selectedAssignment.section}` : ""}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="activation">Activation (optional)</Label>
                <Input
                  id="activation"
                  type="datetime-local"
                  value={activationSchedule}
                  onChange={(event) => setActivationSchedule(event.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Leave blank to activate immediately.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline (optional)</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Optional. Respondents cannot submit after this deadline.
                </p>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={isLoadingPreview}
              disabled={!selectedAssignmentId}
            >
              {isLoadingPreview ? "Loading Preview..." : "Preview Respondents"}
            </Button>
          </form>
        ) : (
          <div className="border-border bg-card space-y-6 rounded-xl border p-5">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Respondent Preview</h3>
              <p className="text-muted-foreground text-sm">
                {previewRespondents.length - excludedMembershipIds.length} of{" "}
                {previewRespondents.length} active roster member(s) will receive this evaluation.
                Uncheck any students you wish to exclude.
              </p>
            </div>

            <div className="max-h-96 space-y-2 overflow-y-auto">
              {previewRespondents.map((respondent) => {
                const isExcluded = excludedMembershipIds.includes(respondent.membershipId);
                const exclusion = exclusionDrafts[respondent.membershipId];

                return (
                  <div
                    key={respondent.membershipId}
                    className="border-border hover:bg-muted flex items-start gap-3 rounded-lg border p-3"
                  >
                    <Checkbox
                      aria-label={`Include ${respondent.name}`}
                      checked={!isExcluded}
                      id={`respondent-${respondent.membershipId}`}
                      onCheckedChange={(checked) =>
                        handleExcludeRespondent(respondent.membershipId, checked !== true)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label
                        className="cursor-pointer"
                        htmlFor={`respondent-${respondent.membershipId}`}
                      >
                        <p className="font-medium">
                          {respondent.name}
                        </p>
                        <p className="text-muted-foreground text-sm">{respondent.email}</p>
                        <p className="text-muted-foreground text-xs">
                          {respondent.programCode} —{" "}
                          {respondent.yearLevel.replace("_", " ").toLowerCase()}
                          {respondent.section ? ` — ${respondent.section}` : ""}
                        </p>
                      </Label>
                      {isExcluded && (
                        <div className="mt-3 flex flex-col gap-2">
                          <Label htmlFor={`exclusion-category-${respondent.membershipId}`}>
                            Exclusion reason
                          </Label>
                          <Select
                            value={exclusion?.category ?? "ADMINISTRATIVE_EXCEPTION"}
                            onValueChange={(value) =>
                              updateExclusionDraft(respondent.membershipId, {
                                category: value as ExclusionCategory,
                              })
                            }
                          >
                            <SelectTrigger
                              id={`exclusion-category-${respondent.membershipId}`}
                              className="w-full"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="APPROVED_ACCOMMODATION">
                                Approved accommodation
                              </SelectItem>
                              <SelectItem value="NOT_TAKING_ASSESSMENT">
                                Not taking this assessment
                              </SelectItem>
                              <SelectItem value="ADMINISTRATIVE_EXCEPTION">
                                Administrative exception
                              </SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          {exclusion?.category === "OTHER" && (
                            <div className="flex flex-col gap-1">
                              <Input
                                aria-label={`Other explanation for ${respondent.name}`}
                                maxLength={200}
                                minLength={5}
                                onChange={(event) =>
                                  updateExclusionDraft(respondent.membershipId, {
                                    otherExplanation: event.target.value,
                                  })
                                }
                                placeholder="Neutral explanation (5–200 characters)"
                                value={exclusion.otherExplanation}
                              />
                              <p className="text-muted-foreground text-xs">
                                Use neutral wording only. Sensitive medical and disciplinary details
                                are not allowed.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={handleBack} disabled={isSubmitting}>
                Back
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handlePublishFinal}
                loading={isSubmitting}
              >
                {isSubmitting ? "Publishing..." : "Publish Evaluation"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

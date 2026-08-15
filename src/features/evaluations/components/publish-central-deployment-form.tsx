"use client";

import { useState, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Users } from "lucide-react";
import { type TargetStakeholder, YearLevel } from "@prisma/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { showToast } from "@/components/ui/toast";
import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import type {
  PreviewCentralDeploymentInput,
  PreviewCentralDeploymentRespondent,
  PreviewCentralDeploymentResult,
} from "@/features/evaluations/types";
import type { TermInstanceItem } from "@/features/academic-calendar/types";
import { getSemesterLabel, getTermLabel } from "@/lib/constants/academic";

// ─── Types ───────────────────────────────────────────────────────────────────

type ActionResult =
  | { success: true; deploymentId: string; assignmentCount: number; status: string }
  | { success: false; error: string };

type Step = "configure" | "preview";

interface PublishCentralDeploymentFormProps {
  templates: Array<{ id: string; name: string; code: string }>;
  yearLevels: YearLevel[];
  majors: Array<{ id: string; name: string }>;
  programId: string;
  programLabel: string;
  preselectedTemplateId?: string;
  termInstances: TermInstanceItem[];
  activeTermId?: string;
  previewAction: (payload: PreviewCentralDeploymentInput) => Promise<PreviewCentralDeploymentResult>;
  publishAction: (formData: FormData) => Promise<ActionResult>;
}

// ─── Stakeholder Options ─────────────────────────────────────────────────────

const STAKEHOLDER_OPTIONS = [
  { value: "STUDENT", label: "Students" },
  { value: "ALUMNI", label: "Alumni" },
  { value: "INDUSTRY_PARTNER", label: "Industry Partners" },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

export function PublishCentralDeploymentForm({
  templates,
  yearLevels,
  majors,
  programId,
  programLabel,
  preselectedTemplateId,
  termInstances,
  activeTermId,
  previewAction,
  publishAction,
}: PublishCentralDeploymentFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(preselectedTemplateId ?? "");
  const [targetStakeholder, setTargetStakeholder] = useState<string>("STUDENT");
  const [selectedTermInstanceId, setSelectedTermInstanceId] = useState<string>(activeTermId ?? "");
  const [selectedYearLevel, setSelectedYearLevel] = useState<string>("");
  const [selectedMajorId, setSelectedMajorId] = useState<string>("");
  const [step, setStep] = useState<Step>("configure");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Preview state
  const [previewRespondents, setPreviewRespondents] = useState<PreviewCentralDeploymentRespondent[]>([]);
  const [excludedRespondentIds, setExcludedRespondentIds] = useState<string[]>([]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const showYearLevel = targetStakeholder === "STUDENT";
  const showMajor = majors.length > 0;

  const handleExcludeRespondent = (userId: string, excluded: boolean) => {
    setExcludedRespondentIds((previous) => {
      if (excluded) {
        if (previous.includes(userId)) return previous;
        return [...previous, userId];
      }
      return previous.filter((id) => id !== userId);
    });
  };

  const handlePreview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!selectedTemplateId) {
      setError("Please select a template to deploy.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("programId", programId);
    const yearLevelValue = selectedYearLevel.length > 0
      ? (selectedYearLevel as YearLevel)
      : undefined;
    const majorId = selectedMajorId || undefined;

    // Phase 7: Validate term instance selection
    if (!selectedTermInstanceId) {
      setError("Please select an academic term.");
      return;
    }

    if (targetStakeholder === "STUDENT" && !yearLevelValue) {
      setError("Please select a target year level.");
      return;
    }

    setIsLoadingPreview(true);

    try {
      const result = await previewAction({
        termInstanceId: selectedTermInstanceId,
        majorId,
        programId,
        targetStakeholder: targetStakeholder as TargetStakeholder,
        yearLevel: yearLevelValue,
      });

      if (!result.success) {
        setError(result.error);
        showToast(result.error, "error");
        return;
      }

      setPreviewRespondents(result.data);
      setExcludedRespondentIds([]);
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

    if (!formRef.current) return;

    const formData = new FormData(formRef.current);

    // Attach the curated respondent list
    const finalRespondentIds = previewRespondents
      .filter((r) => !excludedRespondentIds.includes(r.userId))
      .map((r) => r.userId);

    formData.set("respondent_ids", JSON.stringify(finalRespondentIds));

    try {
      const result = await publishAction(formData);

      if (!result.success) {
        setError(result.error);
        showToast(result.error, "error");
        return;
      }

      const toastMessage = `Deployment published successfully! ${result.assignmentCount} assignment(s) created. Status: ${result.status}.`;
      router.push(
        `/program-head/programs/${encodeURIComponent(programId)}/tools?tab=published&toast=${encodeURIComponent(toastMessage)}`
      );
    } catch {
      setError("Unable to publish deployment right now. Please try again.");
      showToast("Unable to publish deployment right now. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-heading-lg">Publish Evaluation Tool</h1>
        <p className="text-body-md text-muted-foreground">
          Deploy an evaluation instrument to target stakeholders within{" "}
          <span className="font-semibold">{programLabel}</span>.
        </p>
      </div>

      {/* Form card */}
      <form
        ref={formRef}
        className="border-border bg-card space-y-6 rounded-2xl border p-6 shadow-sm"
        onSubmit={handlePreview}
      >
        <input type="hidden" name="programId" value={programId} />
        <Field>
          <FieldLabel htmlFor="deployment_name">Deployed Evaluation Name</FieldLabel>
          <FieldContent>
            <Input
              id="deployment_name"
              name="deployment_name"
              placeholder="e.g. BSIT Exit Survey 2026"
              required
            />
            <p className="text-muted-foreground text-xs">
              This is the name respondents and reviewers will see for this publication.
            </p>
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="template_id">Evaluation Template</FieldLabel>
          <FieldContent>
            {preselectedTemplateId && selectedTemplate ? (
              <>
                <div className="border-input bg-muted flex items-center gap-3 rounded-lg border px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{selectedTemplate.name}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">Pre-selected</Badge>
                </div>
                <input type="hidden" name="template_id" value={selectedTemplateId} />
              </>
            ) : (
              <>
                <Select
                  value={selectedTemplateId}
                  onValueChange={(value) => setSelectedTemplateId(value ?? "")}
                >
                  <SelectTrigger id="template_id" className="w-full">
                    <SelectValue placeholder="Select a template...">
                      {selectedTemplateId
                        ? (templates.find((t) => t.id === selectedTemplateId)?.name ??
                          "Select a template...")
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="template_id" value={selectedTemplateId} />
              </>
            )}
          </FieldContent>
        </Field>

        {/* Two-column grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left column — Deployment Schedule */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="text-primary size-5" />
              <h2 className="text-label-lg font-semibold tracking-wide uppercase">
                Deployment Schedule
              </h2>
            </div>

            {/* Activation Date & Time */}
            <Field>
              <FieldLabel htmlFor="activation_at">Activation Date & Time</FieldLabel>
              <FieldContent>
                <Input type="datetime-local" id="activation_at" name="activation_at" />
                <p className="text-muted-foreground text-xs">
                  Leave empty to activate immediately upon publication.
                </p>
              </FieldContent>
            </Field>

            {/* Deadline Date & Time */}
            <Field>
              <FieldLabel htmlFor="deadline_at">Deadline Date & Time</FieldLabel>
              <FieldContent>
                <Input type="datetime-local" id="deadline_at" name="deadline_at" />
                <p className="text-muted-foreground text-xs">
                  Optional. Respondents cannot submit after this deadline.
                </p>
              </FieldContent>
            </Field>
          </div>

          {/* Right column — Audience Targeting */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="text-primary size-5" />
              <h2 className="text-label-lg font-semibold tracking-wide uppercase">
                Audience Targeting
              </h2>
            </div>

            {/* Academic Context - Phase 7: Term Instance Picker */}
            <Field>
              <FieldLabel htmlFor="term_instance_id">Academic Term</FieldLabel>
              <FieldContent>
                <Select
                  value={selectedTermInstanceId}
                  onValueChange={(value) => setSelectedTermInstanceId(value ?? "")}
                >
                  <SelectTrigger id="term_instance_id" className="w-full">
                    <SelectValue placeholder="Select a term...">
                      {selectedTermInstanceId
                        ? (() => {
                            const ti = termInstances.find((t) => t.id === selectedTermInstanceId);
                            return ti
                              ? `${ti.schoolYearCode} — ${getSemesterLabel(ti.semester)}${
                                  ti.term ? ` — ${getTermLabel(ti.term)}` : ""
                                }${ti.status === "ACTIVE" ? " (Active)" : ""}`
                              : null;
                          })()
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {termInstances.map((ti) => (
                      <SelectItem key={ti.id} value={ti.id}>
                        <span className="flex items-center gap-2">
                          {ti.status === "ACTIVE" && (
                            <span className="bg-primary size-2 rounded-full" />
                          )}
                          {ti.schoolYearCode} — {getSemesterLabel(ti.semester)}
                          {ti.term ? ` — ${getTermLabel(ti.term)}` : ""}
                          {ti.status === "ACTIVE" ? " (Active)" : ""}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="term_instance_id" value={selectedTermInstanceId} />
                <p className="text-muted-foreground text-xs">
                  Select the academic term for this deployment.
                </p>
              </FieldContent>
            </Field>

            {/* Target Stakeholder */}
            <fieldset className="space-y-2">
              <legend className="text-sm leading-none font-medium">Target Stakeholder</legend>
              <RadioGroup
                value={targetStakeholder}
                onValueChange={(value) => setTargetStakeholder(value ?? "STUDENT")}
              >
                {STAKEHOLDER_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={option.value} />
                    {option.label}
                  </label>
                ))}
              </RadioGroup>
              <input type="hidden" name="target_stakeholder" value={targetStakeholder} />
            </fieldset>

            {/* Year Level is required for student-targeted deployments. */}
            {showYearLevel && yearLevels.length > 0 && (
              <Field>
                <FieldLabel htmlFor="year_level">Year Level</FieldLabel>
                <FieldContent>
                  <Select
                    value={selectedYearLevel}
                    onValueChange={(value) => setSelectedYearLevel(value ?? "")}
                  >
                    <SelectTrigger id="year_level" className="w-full">
                      <SelectValue placeholder="Select year level">
                        {selectedYearLevel
                          ? getYearLevelDisplay(selectedYearLevel as YearLevel)
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {yearLevels.map((yl) => (
                        <SelectItem key={yl} value={yl}>
                          {getYearLevelDisplay(yl)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="year_level" value={selectedYearLevel} />
                </FieldContent>
              </Field>
            )}

            {/* Major — conditional on program having majors */}
            {showMajor && (
              <Field>
                <FieldLabel htmlFor="major_id">Major</FieldLabel>
                <FieldContent>
                  <Select
                    value={selectedMajorId}
                    onValueChange={(value) => setSelectedMajorId(value ?? "")}
                  >
                    <SelectTrigger id="major_id" className="w-full">
                      <SelectValue placeholder="All majors">
                        {selectedMajorId
                          ? (majors.find((m) => m.id === selectedMajorId)?.name ?? null)
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All majors</SelectItem>
                      {majors.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="major_id" value={selectedMajorId} />
                </FieldContent>
              </Field>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && step === "configure" && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        {step === "configure" && (
          <div className="border-border flex items-center justify-end gap-3 border-t pt-4">
            <a
               href={`/program-head/programs/${encodeURIComponent(programId)}/tools`}
              className="text-muted-foreground hover:text-foreground text-sm font-medium"
            >
              Cancel
            </a>
            <Button
              type="submit"
              loading={isLoadingPreview}
              disabled={templates.length === 0}
            >
              {isLoadingPreview ? "Loading preview..." : "Preview Respondents"}
            </Button>
          </div>
        )}
      </form>

      {/* Preview Step */}
      {step === "preview" && (
        <div className="border-border bg-card space-y-6 rounded-2xl border p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-label-lg font-semibold tracking-wide uppercase">
              Respondent Preview
            </h2>
            <p className="text-muted-foreground text-sm">
              {previewRespondents.length} respondent(s) found.
              {excludedRespondentIds.length > 0 && (
                <span className="text-warning ml-1 font-medium">
                  {excludedRespondentIds.length} excluded.
                </span>
              )}
            </p>
          </div>

          {previewRespondents.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No respondents matched the targeting criteria.
            </p>
          ) : (
            <div className="max-h-[400px] overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr className="text-muted-foreground text-left text-xs font-semibold uppercase">
                    <th className="px-3 py-2">
                      <Checkbox
                        aria-label="Select all respondents"
                        checked={excludedRespondentIds.length === 0}
                        onCheckedChange={(checked) => {
                          if (checked === true) {
                            setExcludedRespondentIds([]);
                          } else if (checked === false) {
                            setExcludedRespondentIds(
                              previewRespondents.map((r) => r.userId)
                            );
                          }
                        }}
                      />
                    </th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    {targetStakeholder === "STUDENT" && (
                      <>
                        <th className="px-3 py-2">Program</th>
                        <th className="px-3 py-2">Year Level</th>
                        <th className="px-3 py-2">Section</th>
                      </>
                    )}
                    {targetStakeholder === "INDUSTRY_PARTNER" && (
                      <th className="px-3 py-2">Program</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewRespondents.map((respondent) => {
                    const isExcluded = excludedRespondentIds.includes(respondent.userId);
                    return (
                      <tr
                        key={respondent.userId}
                        className={isExcluded ? "bg-danger-soft/20 opacity-60" : ""}
                      >
                        <td className="px-3 py-2">
                          <Checkbox
                            aria-label={`Include ${respondent.name}`}
                            checked={!isExcluded}
                            onCheckedChange={(checked) =>
                              handleExcludeRespondent(respondent.userId, checked !== true)
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          {respondent.name}
                        </td>
                        <td className="px-3 py-2">{respondent.email}</td>
                        {targetStakeholder === "STUDENT" && (
                          <>
                            <td className="px-3 py-2">{respondent.programCode ?? "—"}</td>
                            <td className="px-3 py-2">{respondent.yearLevel ? getYearLevelDisplay(respondent.yearLevel as YearLevel) : "—"}</td>
                          </>
                        )}
                        {targetStakeholder === "INDUSTRY_PARTNER" && (
                          <td className="px-3 py-2">{respondent.programCode ?? "—"}</td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {error && step === "preview" && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={handlePublishFinal}
              loading={isSubmitting}
              disabled={
                previewRespondents.length === 0 ||
                previewRespondents.length === excludedRespondentIds.length
              }
            >
              {isSubmitting ? "Publishing..." : "Confirm and Publish"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep("configure");
                setError(null);
              }}
              disabled={isSubmitting}
            >
              Back to Configuration
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

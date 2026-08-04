"use client";

import { useState, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { type TargetStakeholder, YearLevel } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    const yearLevelValue = formData.get("year_level");
    const yearLevel = yearLevelValue && typeof yearLevelValue === "string" && yearLevelValue.length > 0
      ? (yearLevelValue as YearLevel)
      : undefined;
    const majorId = (formData.get("major_id") as string) || undefined;

    // Phase 7: Validate term instance selection
    if (!selectedTermInstanceId) {
      setError("Please select an academic term.");
      return;
    }

    if (targetStakeholder === "STUDENT" && !yearLevel) {
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
        yearLevel,
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
        <div className="space-y-2">
          <Label htmlFor="deployment_name">Deployed Evaluation Name</Label>
          <Input
            id="deployment_name"
            name="deployment_name"
            placeholder="e.g. BSIT Exit Survey 2026"
            required
          />
          <p className="text-muted-foreground text-xs">
            This is the name respondents and reviewers will see for this publication.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="template_id">Evaluation Template</Label>
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
            <select
              id="template_id"
              name="template_id"
              className="border-input h-9 w-full rounded-lg border bg-transparent px-2.5 text-sm"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              required
            >
              <option value="">Select a template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Two-column grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left column — Deployment Schedule */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <svg
                className="text-primary h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h2 className="text-label-lg font-semibold tracking-wide uppercase">
                Deployment Schedule
              </h2>
            </div>

            {/* Activation Date & Time */}
            <div className="space-y-2">
              <Label htmlFor="activation_at">Activation Date & Time</Label>
              <Input type="datetime-local" id="activation_at" name="activation_at" />
              <p className="text-muted-foreground text-xs">
                Leave empty to activate immediately upon publication.
              </p>
            </div>

            {/* Deadline Date & Time */}
            <div className="space-y-2">
              <Label htmlFor="deadline_at">Deadline Date & Time</Label>
              <Input type="datetime-local" id="deadline_at" name="deadline_at" />
              <p className="text-muted-foreground text-xs">
                Optional. Respondents cannot submit after this deadline.
              </p>
            </div>
          </div>

          {/* Right column — Audience Targeting */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <svg
                className="text-primary h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h2 className="text-label-lg font-semibold tracking-wide uppercase">
                Audience Targeting
              </h2>
            </div>

            {/* Academic Context - Phase 7: Term Instance Picker */}
            <div className="space-y-2">
              <Label htmlFor="term_instance_id">Academic Term</Label>
              <select
                id="term_instance_id"
                name="term_instance_id"
                className="border-input h-9 w-full rounded-lg border bg-transparent px-2.5 text-sm"
                value={selectedTermInstanceId}
                onChange={(e) => setSelectedTermInstanceId(e.target.value)}
                required
              >
                <option value="">Select a term...</option>
                {termInstances.map((ti) => (
                  <option key={ti.id} value={ti.id}>
                    {ti.schoolYearCode} — {getSemesterLabel(ti.semester)}
                    {ti.term ? ` — ${getTermLabel(ti.term)}` : ""}
                    {ti.status === "ACTIVE" ? " (Active)" : ""}
                  </option>
                ))}
              </select>
              <p className="text-muted-foreground text-xs">
                Select the academic term for this deployment.
              </p>
            </div>

            {/* Target Stakeholder */}
            <fieldset className="space-y-2">
              <legend className="text-sm leading-none font-medium">Target Stakeholder</legend>
              <div className="space-y-2">
                {STAKEHOLDER_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="target_stakeholder"
                      value={option.value}
                      checked={targetStakeholder === option.value}
                      onChange={() => setTargetStakeholder(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Year Level is required for student-targeted deployments. */}
            {showYearLevel && yearLevels.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="year_level">Year Level</Label>
                <select
                  id="year_level"
                  name="year_level"
                  required={showYearLevel}
                  className="border-input h-9 w-full rounded-lg border bg-transparent px-2.5 text-sm"
                >
                  <option value="">Select year level</option>
                  {yearLevels.map((yl) => (
                    <option key={yl} value={yl}>
                      {getYearLevelDisplay(yl)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Major — conditional on program having majors */}
            {showMajor && (
              <div className="space-y-2">
                <Label htmlFor="major_id">Major</Label>
                <select
                  id="major_id"
                  name="major_id"
                  className="border-input h-9 w-full rounded-lg border bg-transparent px-2.5 text-sm"
                >
                  <option value="">All majors</option>
                  {majors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && step === "configure" && (
          <p className="bg-danger/10 text-danger rounded-lg px-3 py-2 text-sm">{error}</p>
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
              disabled={isLoadingPreview || templates.length === 0}
              className="bg-primary text-on-primary"
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
                      <input
                        type="checkbox"
                        checked={excludedRespondentIds.length === 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setExcludedRespondentIds([]);
                          } else {
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
                        <th className="px-3 py-2">Student ID</th>
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
                          <input
                            type="checkbox"
                            checked={!isExcluded}
                            onChange={(e) =>
                              handleExcludeRespondent(respondent.userId, !e.target.checked)
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          {respondent.lastName}, {respondent.firstName}
                        </td>
                        <td className="px-3 py-2">{respondent.email}</td>
                        {targetStakeholder === "STUDENT" && (
                          <>
                            <td className="px-3 py-2">{respondent.programCode ?? "—"}</td>
                            <td className="px-3 py-2">{respondent.yearLevel ? getYearLevelDisplay(respondent.yearLevel as YearLevel) : "—"}</td>
                            <td className="px-3 py-2">{respondent.studentId ?? "—"}</td>
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
            <p className="bg-danger/10 text-danger rounded-lg px-3 py-2 text-sm">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={handlePublishFinal}
              disabled={
                isSubmitting ||
                previewRespondents.length === 0 ||
                previewRespondents.length === excludedRespondentIds.length
              }
              className="bg-primary text-on-primary"
            >
              {isSubmitting ? (
                "Publishing..."
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  Confirm and Publish
                </span>
              )}
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

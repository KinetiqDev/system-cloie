import Link from "next/link";
import { ArrowLeft, FileText, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import { getStatusVariant } from "./evaluation-status";
import { FacultyEvaluationRespondents } from "./faculty-evaluation-respondents";
import { LateIncludeDialog } from "./late-include-dialog";
import { getExclusionCategoryLabel, getReversalCategoryLabel } from "../exclusion-categories";
import { lateIncludeCourseBoundEvaluationAction } from "@/lib/actions/course-bound-evaluation-actions";
import type { FacultyEvaluationDetail } from "../types";

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getScopeLabel(scope: string): string {
  if (!scope) return "—";
  return scope
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function FacultyEvaluationDetailView({ detail }: { detail: FacultyEvaluationDetail }) {
  const safeDetail = detail;
  const total = safeDetail.totalAssignments ?? 0;
  const responseCount = safeDetail.responseCount ?? 0;
  const inProgressCount = safeDetail.inProgressCount ?? 0;
  const notStartedCount = safeDetail.notStartedCount ?? 0;
  const percent = total > 0 ? Math.round((responseCount / total) * 100) : 0;
  const progressValue = total > 0 ? (responseCount / total) * 100 : 0;

  const instrument = safeDetail.instrument;
  const sections = Array.isArray(instrument?.sections) ? instrument.sections : [];
  const bindings = Array.isArray(safeDetail.templateBindings) ? safeDetail.templateBindings : [];
  const cilos = Array.isArray(safeDetail.cilos) ? safeDetail.cilos : [];

  const bindingByKey = new Map(
    bindings.map((binding) => [`${binding.sectionKey}::${binding.itemKey}`, binding])
  );
  const ciloById = new Map(cilos.map((cilo) => [cilo.id, cilo]));

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Evaluation Tools", href: "/faculty/tools?tab=published" },
          { label: safeDetail.deploymentName },
        ]}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/faculty/tools?tab=published"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to Evaluation Tools
        </Link>
      </div>
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-text-primary text-xl font-semibold tracking-tight sm:text-2xl">
            {safeDetail.deploymentName}
          </h1>
          <Badge variant={getStatusVariant(safeDetail.status)}>
            {statusLabel(safeDetail.status)}
          </Badge>
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span>{safeDetail.courseInfo.courseCode}</span>
          <span aria-hidden="true">·</span>
          <span>
            {instrument?.name ?? "Instrument"}{" "}
            {typeof instrument?.versionNumber === "number" ? `v${instrument.versionNumber}` : ""}
          </span>
        </div>
      </div>

      {/* Summary grid: deployment / timeline */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Course Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Course Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Course</span>
              <span className="text-right font-medium">
                {safeDetail.courseInfo.courseCode} — {safeDetail.courseInfo.courseTitle}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Scope</span>
              <span className="font-medium">
                {getScopeLabel(safeDetail.courseInfo.courseScope)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Program</span>
              <span className="text-right font-medium">
                {safeDetail.courseInfo.programCode} — {safeDetail.courseInfo.programName}
              </span>
            </div>
            {safeDetail.courseInfo.majorName && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Major</span>
                <span className="font-medium">{safeDetail.courseInfo.majorName}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deployment / Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schedule</CardTitle>
            <CardDescription>Publication window and academic period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Published</span>
              <span className="font-medium tabular-nums">{formatDate(safeDetail.publishedAt)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Available from</span>
              <span className="text-right font-medium tabular-nums">
                {safeDetail.activationAt
                  ? formatDate(safeDetail.activationAt)
                  : "Immediately after publication"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Deadline</span>
              <span className="font-medium tabular-nums">
                {safeDetail.deadlineAt ? formatDate(safeDetail.deadlineAt) : "No deadline"}
              </span>
            </div>
            <div className="flex flex-col gap-1 border-t pt-3 sm:flex-row sm:justify-between sm:gap-4">
              <span className="text-muted-foreground">Academic Period</span>
              <span className="font-medium sm:text-right">{safeDetail.termInstanceLabel}</span>
            </div>
          </CardContent>
        </Card>

        {/* Targets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Target Students</CardTitle>
            <CardDescription>Students included by program and year level.</CardDescription>
          </CardHeader>
          <CardContent>
            {safeDetail.targets.length === 0 ? (
              <span className="text-muted-foreground text-sm">All eligible year levels</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {safeDetail.targets.map((target, index) => (
                  <Badge key={`${target.programId}-${target.yearLevel}-${index}`} variant="outline">
                    {target.programCode}
                    {target.yearLevel
                      ? ` · ${getYearLevelDisplay(target.yearLevel)}`
                      : " · All levels"}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accessible progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Response Progress</CardTitle>
          <CardDescription>
            Submitted, in progress, and not started across assigned respondents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress
            value={progressValue}
            aria-label={`Response progress: ${responseCount} of ${total} submitted, ${percent}%`}
          >
            <ProgressLabel className="text-sm font-medium">Completion</ProgressLabel>
            <span className="text-muted-foreground ml-auto text-sm tabular-nums">
              {responseCount} / {total}
            </span>
          </Progress>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="bg-success size-2 rounded-full" aria-hidden="true" />
              <span>
                <span className="font-semibold tabular-nums">{responseCount}</span>{" "}
                <span className="text-muted-foreground">submitted</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-warning size-2 rounded-full" aria-hidden="true" />
              <span>
                <span className="font-semibold tabular-nums">{inProgressCount}</span>{" "}
                <span className="text-muted-foreground">in progress</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-muted-foreground size-2 rounded-full" aria-hidden="true" />
              <span>
                <span className="font-semibold tabular-nums">{notStartedCount}</span>{" "}
                <span className="text-muted-foreground">not started</span>
              </span>
            </div>
            <div className="ml-auto flex items-baseline gap-1">
              <span className="text-2xl font-bold tabular-nums">{percent}</span>
              <span className="text-muted-foreground text-xs">%</span>
              <span className="text-muted-foreground ml-2 hidden text-xs sm:inline">
                of {total} assigned
              </span>
            </div>
          </div>

          <p className="text-muted-foreground text-xs" aria-live="polite">
            {responseCount} of {total} respondents have submitted. {inProgressCount} in progress,{" "}
            {notStartedCount} not started.
          </p>
        </CardContent>
      </Card>

      {/* Respondents – responsive table/cards with local filter */}
      <FacultyEvaluationRespondents respondents={safeDetail.respondents ?? []} />

      {/* Instrument – frozen questions */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-heading text-base font-semibold">Instrument</h2>
          <p className="text-muted-foreground text-sm">
            {instrument?.name ?? "Instrument"}{" "}
            {typeof instrument?.versionNumber === "number"
              ? `· Version ${instrument.versionNumber}`
              : ""}{" "}
            · Frozen at publication. Type, descriptors, and CILO links preserved.
          </p>
        </div>

        {sections.length === 0 ? (
          <Card>
            <CardContent className="py-10">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileText aria-hidden="true" className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>No instrument questions</EmptyTitle>
                  <EmptyDescription>
                    This evaluation has no frozen instrument sections or the snapshot was malformed.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sections.map((section) => (
              <Card key={section.sectionKey}>
                <CardHeader>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  {section.description && <CardDescription>{section.description}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-4">
                  {section.questions.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No questions in this section.</p>
                  ) : (
                    section.questions.map((question) => {
                      const binding = bindingByKey.get(
                        `${section.sectionKey}::${question.itemKey}`
                      );
                      const cilo = binding?.ciloId ? ciloById.get(binding.ciloId) : null;
                      return (
                        <div key={question.itemKey} className="space-y-3 rounded-lg border p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="text-foreground flex-1 text-sm leading-relaxed font-medium">
                              {question.prompt}
                            </p>
                            <div className="flex shrink-0 flex-wrap gap-1.5">
                              <Badge
                                variant={question.type === "likert" ? "information" : "secondary"}
                              >
                                {question.type === "likert" ? "Likert" : "Open-ended"}
                              </Badge>
                              <Badge variant="outline">
                                {question.required ? "Required" : "Optional"}
                              </Badge>
                            </div>
                          </div>

                          {question.type === "likert" && question.likertDescriptors.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                Scale descriptors
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {question.likertDescriptors.map((descriptor) => (
                                  <span
                                    key={`${question.itemKey}-${descriptor.value}`}
                                    className="bg-muted inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs"
                                  >
                                    <span className="font-semibold tabular-nums">
                                      {descriptor.value}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {descriptor.label}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {question.type === "guided_open_ended" &&
                            question.suggestedResponses.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                  Suggested responses
                                </p>
                                <ul className="text-muted-foreground list-inside list-disc space-y-0.5 text-sm">
                                  {question.suggestedResponses.map((response, index) => (
                                    <li key={`${question.itemKey}-suggestion-${index}`}>
                                      {response}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                          {binding ? (
                            <div className="bg-muted/50 space-y-1 rounded-md border p-3">
                              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                CILO link
                              </p>
                              {cilo ? (
                                <>
                                  <p className="text-sm font-medium">{cilo.label}</p>
                                  <p className="text-foreground text-sm">{cilo.description}</p>
                                  {binding.ciloDescriptionSnapshot &&
                                    binding.ciloDescriptionSnapshot !== cilo.description && (
                                      <p className="text-muted-foreground text-xs italic">
                                        Snapshot: {binding.ciloDescriptionSnapshot}
                                      </p>
                                    )}
                                </>
                              ) : (
                                <p className="text-muted-foreground text-sm">
                                  {binding.ciloDescriptionSnapshot}
                                </p>
                              )}
                              <p className="text-muted-foreground text-xs">
                                Prompt snapshot: {binding.questionPromptSnapshot}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Exclusions & late inclusion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exclusions & late inclusion</CardTitle>
          <CardDescription>
            Students excluded at publication. While the window is open, eligible exclusions can be
            late-included back into the evaluation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {safeDetail.lateInclusionOpen && (
            <LateIncludeDialog
              action={lateIncludeCourseBoundEvaluationAction}
              evaluationId={safeDetail.evaluationId}
              exclusions={safeDetail.exclusions ?? []}
              status={safeDetail.status}
            />
          )}

          {!safeDetail.exclusions || safeDetail.exclusions.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center">
              <UsersRound
                aria-hidden="true"
                className="text-muted-foreground mx-auto mb-2 size-6"
              />
              <p className="text-muted-foreground text-sm">
                No roster exclusions for this evaluation.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {safeDetail.exclusions.map((exclusion) => (
                <div
                  key={exclusion.membershipId}
                  className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{exclusion.studentName}</p>
                    <p className="text-muted-foreground text-xs">
                      {getExclusionCategoryLabel(exclusion.category)}
                      {exclusion.reversalCategory
                        ? ` · Reversed: ${getReversalCategoryLabel(exclusion.reversalCategory)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={exclusion.membershipActive ? "outline" : "secondary"}>
                      {exclusion.membershipActive ? "Roster active" : "Roster inactive"}
                    </Badge>
                    {exclusion.reversedAt ? (
                      <Badge variant="secondary">Reversed {formatDate(exclusion.reversedAt)}</Badge>
                    ) : (
                      <Badge variant="outline">Active exclusion</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            Late inclusion is audit-tracked and does not modify the authoritative course roster.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

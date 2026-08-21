"use client";

import { memo, useMemo } from "react";
import { Target } from "lucide-react";
import type { CILOMappingManifestation } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import type { CourseAlignment } from "@/features/outcomes/services/manage-course-alignment";
import { cn } from "@/lib/utils";
import { MANIFESTATION_OPTIONS, ManifestationPicker, manifestationLabel } from "./manifestation-picker";

export type ManifestationDraftState = Record<string, Record<string, CILOMappingManifestation>>;

type ManifestationAlignmentContentProps = {
  alignment: CourseAlignment;
  draft: ManifestationDraftState;
  disabled: boolean;
  onChangeCell: (
    ciloId: string,
    targetId: string,
    manifestation: CILOMappingManifestation | null
  ) => void;
};

type TargetCopy = {
  shortNoun: string;
  header: string;
  caption: string;
  incompleteMessage: string;
  emptyTitle: string;
  emptyDescription: string;
  archivedTitle: string;
  archivedDescription: string;
  archivedLabel: string;
};

function targetCopy(scope: CourseAlignment["course"]["scope"]): TargetCopy {
  if (scope === "GENERAL_EDUCATION") {
    return {
      shortNoun: "ILO",
      header: "CILO / ILO",
      caption: "CILO to Institutional Outcome manifestation matrix.",
      incompleteMessage:
        "Choose Learning, Practice, or Opportunity for at least one Institutional Outcome per CILO before reviewing this alignment.",
      emptyTitle: "No Institutional Outcomes have been defined yet.",
      emptyDescription:
        "The General Education Coordinator must create an active Institutional Outcome before Course alignment can be completed.",
      archivedTitle: "Archived Institutional Outcomes",
      archivedDescription:
        "Historical manifestations on archived Institutional Outcomes are read-only and do not count toward completeness.",
      archivedLabel: "Archived Institutional Outcome manifestations, read-only",
    };
  }
  return {
    shortNoun: "PLO",
    header: "CILO / PLO",
    caption: "CILO to Program Learning Outcome manifestation matrix.",
    incompleteMessage:
      "Choose Learning, Practice, or Opportunity for all PLOs before reviewing this alignment.",
    emptyTitle: "No Program Learning Outcomes have been defined for this program.",
    emptyDescription: "A Program Head must create PLOs before Course alignment can be completed.",
    archivedTitle: "Archived Program Learning Outcomes",
    archivedDescription:
      "Historical manifestations on archived PLOs are read-only and do not count toward completeness.",
    archivedLabel: "Archived Program Learning Outcome manifestations, read-only",
  };
}

function manifestLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-muted-foreground">
      {MANIFESTATION_OPTIONS.map((option) => (
        <li key={option.value} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="bg-primary/10 text-primary flex size-6 items-center justify-center rounded-md text-xs font-semibold"
          >
            {option.letter}
          </span>
          <span>{option.label}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Course alignment matrix: a desktop table (`hidden md:block`) and mobile CILO
 * cards (`md:hidden`), both driving the same draft state through `onChangeCell`.
 * Copy follows Course scope so Program-specific columns are PLOs and General
 * Education columns are Institutional Outcomes.
 */
export function ManifestationAlignmentContent({
  alignment,
  draft,
  disabled,
  onChangeCell,
}: ManifestationAlignmentContentProps) {
  const { cilos, targets } = alignment;
  const copy = targetCopy(alignment.course.scope);
  const totalPairs = cilos.length * targets.length;
  const classifiedPairs = cilos.reduce(
    (total, cilo) => total + targets.filter((target) => draft[cilo.id]?.[target.id]).length,
    0
  );
  const remaining = totalPairs - classifiedPairs;
  const coveredCilos = cilos.filter((cilo) =>
    targets.some((target) => draft[cilo.id]?.[target.id])
  ).length;

  if (targets.length === 0) {
    return (
      <>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Target className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>{copy.emptyTitle}</EmptyTitle>
            <EmptyDescription>{copy.emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
        <ArchivedManifestationRows alignment={alignment} copy={copy} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p
          className="text-muted-foreground flex flex-wrap items-baseline gap-x-2 text-body-sm"
          aria-live="polite"
        >
          <span className="text-foreground font-medium">
            {alignment.course.scope === "GENERAL_EDUCATION"
              ? `${coveredCilos} of ${cilos.length} CILOs covered`
              : `${classifiedPairs} of ${totalPairs} relationships classified`}
          </span>
          {alignment.course.scope === "PROGRAM_SPECIFIC" && <span>{remaining} remaining</span>}
        </p>
        {((alignment.course.scope === "PROGRAM_SPECIFIC" && remaining > 0) ||
          (alignment.course.scope === "GENERAL_EDUCATION" && coveredCilos < cilos.length)) && (
          <p className="text-muted-foreground text-body-sm" aria-live="polite">
            {copy.incompleteMessage}
          </p>
        )}
      </div>
      {manifestLegend()}

      <div className="hidden md:block" data-testid="manifestation-matrix">
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <caption className="sr-only">{copy.caption}</caption>
            <thead>
              <tr className="border-b">
                <th
                  scope="col"
                  className="text-muted-foreground sticky left-0 z-10 h-10 bg-background px-3 text-left font-medium"
                >
                  {copy.header}
                </th>
                {targets.map((target, targetIndex) => (
                  <th
                    key={target.id}
                    scope="col"
                    aria-label={`${copy.shortNoun} ${targetIndex + 1}: ${target.code}, ${target.description}`}
                    className="min-w-40 px-3 pt-2 pb-2 text-left align-top font-medium"
                  >
                    <span className="block">
                      {copy.shortNoun} {targetIndex + 1}
                    </span>
                    <span className="block text-xs text-muted-foreground">{target.code}</span>
                    <span className="mt-1 block text-xs leading-snug break-words font-normal text-muted-foreground">
                      {target.description}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cilos.map((cilo, ciloIndex) => (
                <tr key={cilo.id} className="border-b">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 max-w-56 bg-background px-3 py-3 text-left align-top font-medium"
                  >
                    <span className="text-foreground">CILO {ciloIndex + 1}</span>
                    <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
                      {cilo.description}
                    </span>
                  </th>
                  {targets.map((target, targetIndex) => {
                    const value = draft[cilo.id]?.[target.id] ?? null;
                    const unanswered = value === null;
                    return (
                      <td
                        key={target.id}
                        className={cn("px-3 py-2", unanswered ? "bg-muted/40" : "bg-background")}
                      >
                        <div
                          className={cn(
                            "flex min-h-9 items-center justify-center rounded-lg border px-1.5",
                            unanswered
                              ? "border-dashed border-border text-muted-foreground"
                              : "border-border bg-surface-input"
                          )}
                        >
                          {unanswered ? <span className="sr-only">Unanswered</span> : null}
                          <ManifestationPicker
                            ciloIndex={ciloIndex + 1}
                            targetIndex={targetIndex + 1}
                            targetNoun={copy.shortNoun}
                            value={value}
                            disabled={disabled}
                            onChange={(next) => onChangeCell(cilo.id, target.id, next)}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:hidden" data-testid="manifestation-cards">
        {cilos.map((cilo, ciloIndex) => (
          <Card key={cilo.id}>
            <CardHeader>
              <CardTitle className="text-title-md">CILO {ciloIndex + 1}</CardTitle>
              <CardDescription>{cilo.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {targets.map((target, targetIndex) => {
                const value = draft[cilo.id]?.[target.id] ?? null;
                const unanswered = value === null;
                return (
                  <div
                    key={target.id}
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border p-3",
                      unanswered
                        ? "border-dashed border-border bg-muted/40"
                        : "border-border bg-surface-input"
                    )}
                  >
                    <p className="flex flex-wrap items-baseline gap-x-1.5">
                      <span className="text-label-lg font-medium">
                        {copy.shortNoun} {targetIndex + 1}
                      </span>
                      <span className="text-muted-foreground text-body-sm">{target.code}</span>
                    </p>
                    <p className="text-muted-foreground text-body-sm">{target.description}</p>
                    {unanswered && (
                      <p className="text-muted-foreground text-body-sm">Unanswered</p>
                    )}
                    <ManifestationPicker
                      ciloIndex={ciloIndex + 1}
                      targetIndex={targetIndex + 1}
                      targetNoun={copy.shortNoun}
                      value={value}
                      disabled={disabled}
                      onChange={(next) => onChangeCell(cilo.id, target.id, next)}
                      variant="full"
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      <ArchivedManifestationRows alignment={alignment} copy={copy} />
    </div>
  );
}

const ArchivedManifestationRows = memo(function ArchivedManifestationRows({
  alignment,
  copy,
}: {
  alignment: CourseAlignment;
  copy: TargetCopy;
}) {
  const activeTargetIds = useMemo(
    () => new Set(alignment.targets.map((target) => target.id)),
    [alignment.targets]
  );
  const archivedTargetById = useMemo(
    () => new Map(alignment.unavailableTargets.map((target) => [target.id, target])),
    [alignment.unavailableTargets]
  );
  const rows = useMemo(
    () =>
      alignment.cilos.flatMap((cilo, ciloIndex) =>
        cilo.mappings
          .filter((mapping) => !activeTargetIds.has(mapping.targetId))
          .map((mapping) => ({
            ciloId: cilo.id,
            ciloIndex: ciloIndex + 1,
            targetId: mapping.targetId,
            manifestation: mapping.manifestation,
          }))
      ),
    [alignment.cilos, activeTargetIds]
  );
  if (rows.length === 0) return null;
  return (
    <div
      className="rounded-xl border border-dashed border-border bg-muted/30 p-4"
      data-testid="archived-manifestation-rows"
      aria-label={copy.archivedLabel}
    >
      <p className="font-medium">{copy.archivedTitle}</p>
      <p className="text-muted-foreground text-body-sm">{copy.archivedDescription}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {rows.map((row) => {
          const target = archivedTargetById.get(row.targetId);
          const code = target?.code ?? row.targetId;
          return (
            <li key={`${row.ciloId}:${row.targetId}`} className="flex flex-wrap items-center gap-2">
              <span className="text-body-sm font-medium">CILO {row.ciloIndex}</span>
              <span className="text-body-sm">{code}</span>
              <Badge variant="outline" className="text-muted-foreground">
                Archived
              </Badge>
              <span className="text-body-sm">{manifestationLabel(row.manifestation)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
});

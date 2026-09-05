import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, ListChecks } from "lucide-react";
import { notFound } from "next/navigation";
import type { CILOMappingManifestation } from "@prisma/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  listCILOMappingsForProgram,
  type CourseCILOMappings,
} from "@/features/outcomes/services/manage-program-head-outcomes";
import { buildProgramHeadOutcomesPath } from "@/lib/constants/program-head-routes";

export const metadata = {
  title: "CILO Mapping Review | Program Head | System CLOIE",
};

function manifestationLabel(value: CILOMappingManifestation | null): string {
  if (!value) return "Unanswered";
  const word = `${value.charAt(0)}${value.slice(1).toLowerCase()}`;
  return `${word} (${value.charAt(0)})`;
}

function manifestationFor(
  cilo: CourseCILOMappings["cilos"][number],
  ploId: string
): CILOMappingManifestation | null {
  return cilo.manifestations.find((m) => m.ploId === ploId)?.manifestation ?? null;
}

export default async function SelectedProgramOutcomeMappingPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const result = await listCILOMappingsForProgram(programId);

  if (!result.success) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-3xl">
        <Button
          render={<Link href={buildProgramHeadOutcomesPath(programId)} />}
          variant="ghost"
          className="mb-4 inline-flex items-center gap-2 px-0"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Program Learning Outcomes
        </Button>
        <h1 className="text-heading-xl text-foreground text-pretty">CILO Mapping Review</h1>
        <p className="text-body-md text-muted-foreground mt-2 text-pretty">
          Review how Course Intended Learning Outcomes manifest across this program&apos;s Program
          Learning Outcomes. Faculty manage these classifications in Course alignment. This review
          is read-only.
        </p>
      </div>

      {result.data.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListChecks className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No CILO mappings found</EmptyTitle>
            <EmptyDescription>
              Faculty classify CILO-to-PLO manifestations through Course alignment. Classified CILOs
              appear here for readiness review.
            </EmptyDescription>
          </EmptyHeader>
          <Button
            render={<Link href={buildProgramHeadOutcomesPath(programId)} />}
            variant="outline"
          >
            Review Program Learning Outcomes
          </Button>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {result.data.map((course) => (
            <Card key={course.courseId}>
              <CardHeader className="gap-2 border-b">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-brand-accent text-brand-accent-on">
                    <span className="text-label-sm">{course.courseCode}</span>
                  </Badge>
                  <Badge variant="information" className="text-label-sm">
                    Program-specific
                  </Badge>
                </div>
                <h2 className="font-heading text-title-lg font-semibold text-pretty">
                  {course.courseTitle}
                </h2>
                <CardDescription>
                  {course.cilos.length} {course.cilos.length === 1 ? "CILO" : "CILOs"} defined
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  {course.plos.length === 0 && (
                    <Alert>
                      <AlertDescription>
                        No Program Learning Outcomes have been defined for this program. A Program
                        Head must create PLOs before Course alignment can be completed.
                      </AlertDescription>
                    </Alert>
                  )}
                  {course.plos.length > 0 && (
                    <div className="hidden md:block">
                      <div className="border-border overflow-x-auto rounded-lg border">
                        <table className="w-full min-w-[38rem] border-collapse">
                          <thead>
                            <tr className="border-border bg-surface-secondary border-b">
                              <th
                                scope="col"
                                className="text-text-muted text-label-sm py-3 pr-4 pl-4 text-left font-semibold"
                              >
                                CILO
                              </th>
                              {course.plos.map((plo) => (
                                <th
                                  key={plo.id}
                                  scope="col"
                                  className="text-text-primary py-3 pr-4 pl-4 text-left"
                                >
                                  <span className="text-label-sm block font-semibold">
                                    {plo.code}
                                  </span>
                                  <span
                                    className="text-text-muted text-caption block max-w-44 truncate font-normal"
                                    title={plo.description}
                                  >
                                    {plo.description}
                                  </span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {course.cilos.map((cilo, index) => (
                              <tr
                                key={cilo.id}
                                className="border-border border-b align-top last:border-b-0"
                              >
                                <th
                                  scope="row"
                                  className="text-text-muted py-3 pr-4 pl-4 text-left"
                                >
                                  <span className="text-label-sm block font-semibold">
                                    CILO {index + 1}
                                  </span>
                                  <span
                                    className="text-text-primary text-body-sm mt-1 block max-w-56"
                                    title={cilo.description}
                                  >
                                    {cilo.description}
                                  </span>
                                </th>
                                {course.plos.map((plo) => (
                                  <td key={plo.id} className="text-text-primary py-3 pr-4 pl-4">
                                    <span className="text-label-sm">
                                      {manifestationLabel(manifestationFor(cilo, plo.id))}
                                    </span>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  <div
                    className={
                      course.plos.length > 0
                        ? "flex flex-col gap-4 md:hidden"
                        : "flex flex-col gap-4"
                    }
                  >
                    {course.cilos.map((cilo, index) => (
                      <div
                        key={cilo.id}
                        className="border-border bg-surface-secondary rounded-lg border p-4"
                        role="group"
                        aria-label={`CILO ${index + 1}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-text-muted text-caption font-semibold tracking-wider uppercase">
                            CILO {index + 1}
                          </span>
                          <Badge
                            variant={cilo.readiness === "ready" ? "success" : "warning"}
                            className="text-label-sm gap-1"
                          >
                            {cilo.readiness === "ready" ? (
                              <CheckCircle2 aria-hidden className="size-3.5" />
                            ) : (
                              <AlertTriangle aria-hidden className="size-3.5" />
                            )}
                            {cilo.readiness === "ready" ? "Aligned" : "Needs mapping"}
                          </Badge>
                        </div>
                        <p className="text-body-md text-text-primary mt-1">{cilo.description}</p>
                        {course.plos.length > 0 && (
                          <ul className="mt-3 flex flex-col gap-2">
                            {course.plos.map((plo) => {
                              const manifestation = manifestationFor(cilo, plo.id);
                              return (
                                <li
                                  key={plo.id}
                                  className="border-border bg-card flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5"
                                >
                                  <span className="flex min-w-0 flex-col gap-0.5">
                                    <span className="text-label-sm font-semibold">{plo.code}</span>
                                    <span className="text-text-muted text-body-sm">
                                      {plo.description}
                                    </span>
                                  </span>
                                  <span className="text-label-sm shrink-0">
                                    {manifestationLabel(manifestation)}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                  {course.archivedPlos.length > 0 && (
                    <div
                      className="border-border bg-muted/30 rounded-lg border border-dashed p-4"
                      role="region"
                      aria-label="Archived Program Learning Outcome manifestations, read-only"
                      data-testid="archived-mapping-rows"
                    >
                      <p className="text-label-sm font-semibold">
                        Archived Program Learning Outcomes
                      </p>
                      <p className="text-text-muted text-body-sm">
                        Historical manifestations on archived PLOs are read-only and do not count
                        toward completeness.
                      </p>
                      <ul className="mt-3 flex flex-col gap-2">
                        {course.cilos.flatMap((cilo, index) =>
                          cilo.archivedManifestations.map((mapping) => {
                            const archivedPlo = course.archivedPlos.find(
                              (plo) => plo.id === mapping.ploId
                            );
                            return (
                              <li
                                key={`${cilo.id}:${mapping.ploId}`}
                                className="flex flex-wrap items-center gap-2"
                              >
                                <span className="text-label-sm font-semibold">
                                  CILO {index + 1}
                                </span>
                                <span className="text-body-sm">
                                  {archivedPlo?.code ?? mapping.ploId}
                                </span>
                                <Badge variant="outline" className="text-text-muted">
                                  Archived
                                </Badge>
                                <span className="text-body-sm">
                                  {manifestationLabel(mapping.manifestation)}
                                </span>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

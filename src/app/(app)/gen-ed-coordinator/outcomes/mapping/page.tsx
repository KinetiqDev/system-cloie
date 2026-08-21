// Mapping review intentionally mirrors program-head mapping card layout per #493 spec (college-wide GE vs program-bound) — shared card/Badge/Alert composition.
// fallow-ignore-file code-duplication
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CILOMappingManifestation } from "@prisma/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { buildGenEdOutcomesPath } from "@/lib/constants/gen-ed-routes";
import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { listCILOILOMappingsForGE } from "@/features/outcomes/services/manage-gen-ed-outcomes";
import { ArrowLeft, ListChecks } from "lucide-react";

// Mirrors program-head mapping labels; duplication is intentional scope separation (college-wide GE vs program-bound).
// fallow-ignore-next-line code-duplication
function manifestationLabel(value: CILOMappingManifestation | null): string {
  if (!value) return "Unanswered";
  const word = `${value.charAt(0)}${value.slice(1).toLowerCase()}`;
  return `${word} (${value.charAt(0)})`;
}

// fallow-ignore-next-line complexity
export default async function GenEdOutcomesMappingPage() {
  const session = await resolveAuthSession();

  if (!session) {
    redirect("/portal/respondents");
  }

  if (session.activeRole !== ROLES.GEN_ED_COORDINATOR) {
    redirect("/unauthorized");
  }

  const result = await listCILOILOMappingsForGE();

  if (!result.success) {
    throw new Error(result.error);
  }

  const data = result.data;

  return (
    <div>
      <div className="mb-10">
        <Button
          render={<Link href={buildGenEdOutcomesPath()} />}
          variant="ghost"
          className="mb-4 inline-flex items-center gap-2 px-0"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Institutional Learning Outcomes
        </Button>
        <h1 className="font-heading text-text-primary mb-2 text-4xl font-bold tracking-tight lg:text-5xl">
          CILO Mapping Review
        </h1>
        <p className="text-body-md text-text-muted">
          College-wide read-only review of General Education CILO-to-ILO mappings. Faculty classify
          every CILO-to-ILO pair through Course alignment. This review is read-only.
        </p>
      </div>

      {data.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListChecks className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No CILO mappings found</EmptyTitle>
            <EmptyDescription>
              Faculty classify CILO-to-ILO manifestations through Course alignment. Classified CILOs
              appear here for readiness review.
            </EmptyDescription>
          </EmptyHeader>
          <Button render={<Link href={buildGenEdOutcomesPath()} />} variant="outline">
            Review Institutional Learning Outcomes
          </Button>
        </Empty>
      ) : (
        <div className="space-y-6">
          {data.map((course) => (
            <Card key={course.courseId}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-3">
                  <Badge variant="default" className="text-label-sm">
                    {course.courseCode}
                  </Badge>
                  <span>{course.courseTitle}</span>
                  <Badge variant="secondary" className="text-label-sm">
                    Shared General Education
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {course.cilos.length} {course.cilos.length === 1 ? "CILO" : "CILOs"} defined
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {course.cilos.map((cilo, index) => (
                    <div
                      key={cilo.id}
                      className="border-border rounded-lg border p-4"
                      aria-label={`CILO ${index + 1}`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <span className="text-text-muted text-caption font-semibold tracking-wider uppercase">
                            CILO {index + 1}
                          </span>
                          <p className="text-body-md text-text-primary mt-1">{cilo.description}</p>
                        </div>
                        <Badge
                          variant={cilo.readiness === "ready" ? "default" : "outline"}
                          className="text-label-sm shrink-0"
                        >
                          {cilo.readiness === "ready" ? "Aligned" : "Needs mapping"}
                        </Badge>
                      </div>
                      {cilo.mappedTargets.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {cilo.mappedTargets.map((target) => (
                            <Badge
                              key={target.mappingId}
                              variant="secondary"
                              className="text-label-sm max-w-40 truncate"
                              title={target.description}
                            >
                              {target.code}
                              {target.manifestation ? ` · ${manifestationLabel(target.manifestation)}` : ""}
                              {!target.is_active && " (archived)"}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Alert>
                          <AlertDescription>
                            No mapped outcome. Faculty can align this CILO to Institutional Outcomes
                            through Course alignment.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

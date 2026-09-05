// Mapping review intentionally mirrors program-head mapping card layout per #493 spec (college-wide GE vs program-bound) — shared card/Badge/Alert composition.
// fallow-ignore-file code-duplication
import Link from "next/link";
import { redirect } from "next/navigation";
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
import { buildGenEdOutcomesPath } from "@/lib/constants/gen-ed-routes";
import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { listCILOILOMappingsForGE } from "@/features/outcomes/services/manage-gen-ed-outcomes";
import { AlertTriangle, ArrowLeft, CheckCircle2, ListChecks } from "lucide-react";

export const metadata = {
  title: "CILO Mapping Review | Gen Ed Coordinator | System CLOIE",
};

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
    <div className="flex flex-col gap-6">
      <div className="max-w-3xl">
        <Button
          render={<Link href={buildGenEdOutcomesPath()} />}
          variant="ghost"
          className="mb-4 inline-flex items-center gap-2 px-0"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Institutional Learning Outcomes
        </Button>
        <h1 className="text-heading-xl text-foreground text-pretty">CILO Mapping Review</h1>
        <p className="text-body-md text-muted-foreground mt-2 text-pretty">
          Review the college-wide alignment between General Education CILOs and Institutional
          Learning Outcomes. Faculty manage these classifications in Course alignment. This review
          is read-only.
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
        <div className="flex flex-col gap-4">
          {data.map((course) => (
            <Card key={course.courseId}>
              <CardHeader className="gap-2 border-b">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-brand-accent text-brand-accent-on">
                    <span className="text-label-sm">{course.courseCode}</span>
                  </Badge>
                  <Badge variant="information" className="text-label-sm">
                    Shared General Education
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
                <div className="flex flex-col gap-3">
                  {course.cilos.map((cilo, index) => (
                    <div
                      key={cilo.id}
                      className="border-border bg-surface-secondary rounded-lg border p-4"
                      role="group"
                      aria-label={`CILO ${index + 1}`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="text-muted-foreground text-caption font-semibold tracking-wider uppercase">
                            CILO {index + 1}
                          </span>
                          <p className="text-body-md text-foreground mt-1 text-pretty">
                            {cilo.description}
                          </p>
                        </div>
                        <Badge
                          variant={cilo.readiness === "ready" ? "success" : "warning"}
                          className="text-label-sm shrink-0 gap-1"
                        >
                          {cilo.readiness === "ready" ? (
                            <CheckCircle2 className="size-3.5" aria-hidden="true" />
                          ) : (
                            <AlertTriangle className="size-3.5" aria-hidden="true" />
                          )}
                          {cilo.readiness === "ready" ? "Aligned" : "Needs mapping"}
                        </Badge>
                      </div>
                      {cilo.mappedTargets.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {cilo.mappedTargets.map((target) => (
                            <Badge
                              key={target.mappingId}
                              variant={target.is_active ? "information" : "outline"}
                              className="text-label-sm h-auto max-w-full justify-start py-1.5 whitespace-normal"
                            >
                              <span>
                                <span className="font-semibold">{target.code}</span>
                                {target.manifestation
                                  ? ` · ${manifestationLabel(target.manifestation)}`
                                  : " · Unanswered"}
                                {!target.is_active && " · Archived"}
                              </span>
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

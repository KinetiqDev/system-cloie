import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";

import { BackLink } from "@/components/ui/back-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { FacultyCourseWithCiloCount } from "@/features/evaluations/services/list-faculty-courses-with-cilos";

const COURSE_LABEL = (course: FacultyCourseWithCiloCount) => `${course.code} — ${course.title}`;

function readinessLabel(course: FacultyCourseWithCiloCount): string {
  if (course.readiness === "ready") return "Ready";
  if (course.readiness === "missing-cilos") return "Missing CILOs";
  return `Incomplete mapping ${course.coveredCiloCount} of ${course.ciloCount}`;
}

/**
 * Course gate for faculty template authoring. Question–CILO bindings and the
 * publication alignment gate both resolve through one Course, so a faculty
 * template starts by choosing that Course. Each option carries its CILO state,
 * and a Course without CILOs routes to encoding them instead of into a builder
 * that could not bind anything.
 */
export function FacultyCourseGate({
  courses,
  backHref,
  builderHrefFor,
  eyebrow,
  heading,
  intro,
}: {
  courses: FacultyCourseWithCiloCount[];
  backHref: string;
  /** Builder entry that pre-selects the chosen Course, e.g. `?course=<id>`. */
  builderHrefFor: (courseId: string) => string;
  eyebrow: string;
  heading: string;
  intro: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div className="space-y-3">
        <BackLink href={backHref}>Back to Evaluation Tools</BackLink>
        <div className="space-y-2">
          <p className="text-label-sm text-muted-foreground tracking-wider uppercase">{eyebrow}</p>
          <h1 className="text-heading-xl text-text-primary">{heading}</h1>
          <p className="text-body-sm text-muted-foreground">{intro}</p>
        </div>
      </div>

      {courses.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No assigned courses yet</EmptyTitle>
            <EmptyDescription>
              A template binds to a course you actively teach. Ask the department office to assign
              you a course for the current term.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" render={<Link href="/faculty/cilos" />}>
              Back to Manage CILOs
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <section aria-labelledby="course-gate-heading" className="space-y-4">
          <h2 id="course-gate-heading" className="text-heading-md text-text-primary">
            Your courses
          </h2>
          <ul className="grid gap-4 lg:grid-cols-2">
            {courses.map((course) => {
              const hasCilos = course.ciloCount > 0;
              return (
                <li key={course.id} className="flex">
                  <Card className="flex h-full w-full flex-col">
                    <CardHeader>
                      <CardTitle className="text-title-md">{COURSE_LABEL(course)}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {course.courseScopeLabel}
                        </Badge>
                        <Badge
                          variant={course.readiness === "ready" ? "default" : "outline"}
                          className="text-xs"
                        >
                          {readinessLabel(course)}
                        </Badge>
                      </div>
                      <p className="text-caption text-muted-foreground">
                        {hasCilos
                          ? `${course.ciloCount} ${course.ciloCount === 1 ? "CILO" : "CILOs"} ready to bind to questions.`
                          : "No CILOs yet. Encode them before authoring questions."}
                      </p>
                    </CardContent>
                    <CardFooter className="mt-auto flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        render={
                          <Link
                            href={
                              hasCilos
                                ? builderHrefFor(course.id)
                                : `/faculty/cilos/new?course=${encodeURIComponent(course.id)}`
                            }
                          />
                        }
                      >
                        {hasCilos ? (
                          `Continue with ${course.code}`
                        ) : (
                          <>
                            <Plus className="size-4" data-icon="inline-start" />
                            {`Encode CILOs for ${course.code}`}
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

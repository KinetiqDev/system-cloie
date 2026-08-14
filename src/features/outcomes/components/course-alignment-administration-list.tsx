import Link from "next/link";
import { ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import type { CourseAlignmentSummary } from "../services/manage-course-alignment";

type CourseAlignmentAdministrationListProps = {
  courses: CourseAlignmentSummary[];
};

export function CourseAlignmentAdministrationList({
  courses,
}: CourseAlignmentAdministrationListProps) {
  return (
    <section className="space-y-4" aria-labelledby="course-mapping-administration-heading">
      <div>
        <h2 id="course-mapping-administration-heading" className="text-heading-md">
          Course Mapping Administration
        </h2>
        <p className="text-body-md text-text-muted mt-2">
          Review and correct Course alignment across the college. General Education Courses map to
          Institutional Outcomes; Program-specific Courses map to their owning Program&apos;s
          Graduate Outcomes.
        </p>
      </div>
      {courses.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListChecks className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No Courses need mapping administration</EmptyTitle>
            <EmptyDescription>
              Courses with active CILOs appear here once Faculty begin aligning them.
            </EmptyDescription>
          </EmptyHeader>
          <Button render={<Link href="/secretary/courses" />} variant="outline">
            Browse Courses
          </Button>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <Card key={course.courseId}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-3">
                  <Badge variant="default" className="text-label-sm">
                    {course.code}
                  </Badge>
                  <span className="text-body-md">{course.title}</span>
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-2">
                  {course.scope === "GENERAL_EDUCATION" ? (
                    <Badge variant="secondary" className="text-label-sm">
                      General Education
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-label-sm">
                      {course.program?.code}
                    </Badge>
                  )}
                  <span>
                    {course.alignedCiloCount} of {course.ciloCount}{" "}
                    {course.ciloCount === 1 ? "CILO" : "CILOs"} aligned
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <Badge
                  variant={course.readiness === "ready" ? "default" : "outline"}
                  className="text-label-sm"
                >
                  {course.readiness === "ready" ? "Ready" : "Incomplete mapping"}
                </Badge>
                <Button
                  render={
                    <Link href={`/secretary/learning-outcomes/alignment/${course.courseId}`} />
                  }
                  variant="outline"
                  size="sm"
                >
                  Review alignment
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

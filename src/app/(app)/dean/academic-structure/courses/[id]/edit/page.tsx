import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseForm } from "@/features/academic-structure/components/course-form";
import { updateCourseAction } from "@/lib/actions/management-foundation-actions";
import { prisma } from "@/lib/db/prisma";

export default async function DeanEditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const [course, programs, majors] = await Promise.all([
    prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        course_scope: true,
        program_id: true,
        major_id: true,
        default_year_level: true,
        default_semester: true,
        default_term: true,
      },
    }),
    prisma.program.findMany({
      where: { is_active: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.major.findMany({
      where: { is_active: true },
      select: { id: true, name: true, program_id: true, program: { select: { code: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!course) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dean/academic-structure/courses"
        className="text-link inline-flex min-h-11 items-center"
      >
        Back to Courses
      </Link>
      <nav className="text-text-muted text-xs">Courses &gt; Edit &gt; {course.code}</nav>
      <Card>
        <CardHeader>
          <CardTitle>Edit Course</CardTitle>
          <CardDescription>
            Update course details for {course.code} - {course.title}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CourseForm
            action={updateCourseAction}
            programs={programs}
            majors={majors.map((m) => ({ ...m, program_code: m.program.code }))}
            defaultValues={{
              id: course.id,
              code: course.code,
              title: course.title,
              description: course.description,
              course_scope: course.course_scope,
              program_id: course.program_id,
              major_id: course.major_id,
              default_year_level: course.default_year_level,
              default_semester: course.default_semester,
              default_term: course.default_term,
            }}
            submitLabel="Update Course"
          />
        </CardContent>
      </Card>
    </div>
  );
}

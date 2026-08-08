import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseForm } from "@/features/academic-structure/components/course-form";
import { createCourseAction } from "@/lib/actions/management-foundation-actions";
import { prisma } from "@/lib/db/prisma";
import { CreateCourseClientWrapper } from "./client-wrapper";

export default async function CreateCoursePage() {
  const programs = await prisma.program.findMany({
    where: { is_active: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  const majors = await prisma.major.findMany({
    where: { is_active: true },
    select: {
      id: true,
      name: true,
      program_id: true,
      program: { select: { code: true } },
    },
    orderBy: { name: "asc" },
  });

  const majorsForForm = majors.map((m) => ({
    id: m.id,
    name: m.name,
    program_id: m.program_id,
    program_code: m.program.code,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        href="/secretary/courses"
        className="text-link inline-flex items-center gap-2 text-sm font-medium hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      {/* Breadcrumb */}
      <nav className="text-text-muted text-xs">Courses &gt; Create New Course</nav>

      <Card>
        <CardHeader>
          <CardTitle>Create New Course</CardTitle>
          <CardDescription>
            Register a new general education, program-wide, or major-specific course for downstream
            publishing flows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateCourseClientWrapper
            action={createCourseAction}
            programs={programs}
            majors={majorsForForm}
          />
        </CardContent>
      </Card>
    </div>
  );
}

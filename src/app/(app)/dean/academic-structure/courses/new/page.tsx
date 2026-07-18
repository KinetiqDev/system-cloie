import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseForm } from "@/features/academic-structure/components/course-form";
import { createCourseAction } from "@/lib/actions/management-foundation-actions";
import { prisma } from "@/lib/db/prisma";

export default async function DeanCreateCoursePage() {
  const [programs, majors] = await Promise.all([
    prisma.program.findMany({ where: { is_active: true }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } }),
    prisma.major.findMany({ where: { is_active: true }, select: { id: true, name: true, program_id: true, program: { select: { code: true } } }, orderBy: { name: "asc" } }),
  ]);
  return <div className="mx-auto max-w-3xl space-y-6"><Link href="/dean/academic-structure/courses" className="text-primary inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:underline"><ArrowLeft className="size-4" />Back</Link><nav className="text-text-muted text-xs">Courses &gt; Create New Course</nav><Card><CardHeader><CardTitle>Create New Course</CardTitle><CardDescription>Register a new course for downstream publishing flows.</CardDescription></CardHeader><CardContent><CourseForm action={createCourseAction} programs={programs} majors={majors.map((m) => ({ ...m, program_code: m.program.code }))} submitLabel="Create Course" /></CardContent></Card></div>;
}

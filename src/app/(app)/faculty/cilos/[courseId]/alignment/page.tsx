import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { CourseAlignmentEditor } from "@/features/outcomes/components/course-alignment-editor";
import { readCourseAlignment } from "@/features/outcomes/services/manage-course-alignment";
import {
  commitCourseAlignmentAction,
  prepareCourseAlignmentAction,
} from "@/lib/actions/course-alignment-actions";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";

export const metadata = {
  title: "Course Alignment | Faculty | CLOIE",
};

export default async function CourseAlignmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const session = await resolveAuthSession();
  if (!session) redirect("/portal/respondents");

  const { courseId } = await params;
  const { returnTo } = (await searchParams) ?? {};
  const backHref = returnTo && returnTo.startsWith("/faculty/cilos") ? returnTo : "/faculty/cilos";
  const result = await readCourseAlignment(courseId);
  if (!result.success) notFound();
  return (
    <div className="mx-auto w-full max-w-6xl">
      <Link
        href={backHref}
        className="text-link focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:underline focus-visible:ring-3 focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" />
        Back to Manage CILOs
      </Link>
      <nav className="text-caption text-muted-foreground">
        Manage CILOs &gt; {result.data.course.code}: {result.data.course.title} &gt; Alignment
      </nav>
      <CourseAlignmentEditor
        alignment={result.data}
        prepareAction={prepareCourseAlignmentAction}
        commitAction={commitCourseAlignmentAction}
      />
    </div>
  );
}

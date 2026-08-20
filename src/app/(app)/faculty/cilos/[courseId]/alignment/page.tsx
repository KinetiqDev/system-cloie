import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { CourseAlignmentEditor } from "@/features/outcomes/components/course-alignment-editor";
import { readCourseAlignment } from "@/features/outcomes/services/manage-course-alignment";
import {
  commitCourseAlignmentAction,
  prepareCourseAlignmentAction,
  saveDraftCourseAlignmentAction,
} from "@/lib/actions/course-alignment-actions";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";

export const metadata = {
  title: "Course Alignment | Faculty | CLOIE",
};

export default async function CourseAlignmentPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await resolveAuthSession();
  if (!session) redirect("/portal/respondents");

  const { courseId } = await params;
  const result = await readCourseAlignment(courseId);
  if (!result.success) notFound();

  return (
    <div className="max-w-4xl">
      <Link
        href="/faculty/cilos"
        className="text-link inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:underline focus-visible:ring-ring focus-visible:ring-3 focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" />
        Back to Manage CILOs
      </Link>
      <nav className="text-muted-foreground text-xs">
        Manage CILOs &gt; {result.data.course.code}: {result.data.course.title} &gt; Alignment
      </nav>
      <CourseAlignmentEditor
        alignment={result.data}
        prepareAction={prepareCourseAlignmentAction}
        commitAction={commitCourseAlignmentAction}
        saveDraftAction={saveDraftCourseAlignmentAction}
      />
    </div>
  );
}

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
      <CourseAlignmentEditor
        alignment={result.data}
        prepareAction={prepareCourseAlignmentAction}
        commitAction={commitCourseAlignmentAction}
        saveDraftAction={saveDraftCourseAlignmentAction}
      />
    </div>
  );
}

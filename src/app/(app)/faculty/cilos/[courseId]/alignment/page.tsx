import { notFound, redirect } from "next/navigation";
import { FacultyCourseAlignmentEditor } from "@/features/outcomes/components/faculty-course-alignment-editor";
import { readFacultyCourseAlignment } from "@/features/outcomes/services/manage-faculty-course-alignment";
import {
  commitCourseAlignmentAction,
  prepareCourseAlignmentAction,
} from "@/lib/actions/faculty-course-alignment-actions";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";

export const metadata = {
  title: "Course Alignment | Faculty | CLOIE",
};

export default async function FacultyCourseAlignmentPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await resolveAuthSession();
  if (!session) redirect("/portal/respondents");

  const { courseId } = await params;
  const result = await readFacultyCourseAlignment(courseId);
  if (!result.success) notFound();

  return (
    <div className="max-w-4xl">
      <FacultyCourseAlignmentEditor
        alignment={result.data}
        prepareAction={prepareCourseAlignmentAction}
        commitAction={commitCourseAlignmentAction}
      />
    </div>
  );
}

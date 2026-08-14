import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CourseAlignmentEditor } from "@/features/outcomes/components/course-alignment-editor";
import { readCourseAlignment } from "@/features/outcomes/services/manage-course-alignment";
import {
  commitCourseAlignmentAction,
  prepareCourseAlignmentAction,
} from "@/lib/actions/course-alignment-actions";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";

export const metadata = {
  title: "Course Mapping Administration | Secretary | CLOIE",
};

export default async function SecretaryCourseAlignmentPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await resolveAuthSession();
  if (!session || session.activeRole !== ROLES.SECRETARY) redirect("/unauthorized");

  const { courseId } = await params;
  const result = await readCourseAlignment(courseId);
  if (!result.success) notFound();

  return (
    <div className="max-w-4xl">
      <Button
        render={<Link href="/secretary/learning-outcomes" />}
        variant="ghost"
        className="mb-4 inline-flex items-center gap-2 px-0"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Learning Outcomes
      </Button>
      <CourseAlignmentEditor
        alignment={result.data}
        eyebrow="Secretary Course mapping administration"
        emptyStateAction={{
          href: "/secretary/learning-outcomes",
          label: "Back to Learning Outcomes",
        }}
        prepareAction={prepareCourseAlignmentAction}
        commitAction={commitCourseAlignmentAction}
      />
    </div>
  );
}

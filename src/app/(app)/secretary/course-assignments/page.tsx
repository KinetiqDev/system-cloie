import { redirect } from "next/navigation";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { CourseAssignmentsPageShell } from "@/features/course-assignments/components/course-assignments-page-shell";
import { loadAllProgramCourseAssignmentsPageData } from "@/features/course-assignments/services/load-all-program-course-assignments-page";

export const metadata = {
  title: "Course Assignments — Secretary | CLOIE",
};

export default async function SecretaryCourseAssignmentsPage() {
  const session = await resolveAuthSession();

  if (!session || !session.roles.includes(ROLES.SECRETARY)) {
    redirect("/unauthorized");
  }

  const pageData = await loadAllProgramCourseAssignmentsPageData();

  return (
    <CourseAssignmentsPageShell
      pageTitle="Course Assignments"
      pageDescription="Manage faculty assignments for all programs, including General Education courses"
      mode="all-program"
      defaultIsActive={true}
      {...pageData}
    />
  );
}

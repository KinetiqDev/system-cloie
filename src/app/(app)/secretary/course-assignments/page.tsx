import { redirect } from "next/navigation";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { CourseAssignmentsPageShell } from "@/features/course-assignments/components/course-assignments-page-shell";
import { loadAllProgramCourseAssignmentsPageData } from "@/features/course-assignments/services/load-all-program-course-assignments-page";
import { loadCourseAssignmentListPage } from "@/features/course-assignments/services/load-course-assignment-list-page";

export const metadata = {
  title: "Course Assignments — Secretary | CLOIE",
};

export default async function SecretaryCourseAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await resolveAuthSession();

  if (!session || session.activeRole !== ROLES.SECRETARY) {
    redirect("/unauthorized");
  }

  const [pageData, listPage] = await Promise.all([
    loadAllProgramCourseAssignmentsPageData(),
    loadCourseAssignmentListPage({
      pathname: "/secretary/course-assignments",
      rawSearchParams: await searchParams,
      role: "all-program",
    }),
  ]);

  return (
    <CourseAssignmentsPageShell
      key={JSON.stringify(listPage.state)}
      pageTitle="Course Assignments"
      pageDescription="View faculty assignments across all programs. Assignment stewardship belongs to the General Education Coordinator and Program Heads."
      mode="all-program"
      canManageAssignments={false}
      initialData={listPage.result.success ? listPage.result.data : null}
      initialFilters={listPage.initialFilters}
      initialPage={listPage.state.page}
      initialError={listPage.result.success ? null : listPage.result.error}
      {...pageData}
    />
  );
}

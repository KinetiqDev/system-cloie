import { redirect } from "next/navigation";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { CourseScope } from "@prisma/client";
import { CourseAssignmentsPageShell } from "@/features/course-assignments/components/course-assignments-page-shell";
import { loadAllProgramCourseAssignmentsPageData } from "@/features/course-assignments/services/load-all-program-course-assignments-page";
import { loadCourseAssignmentListPage } from "@/features/course-assignments/services/load-course-assignment-list-page";

export const metadata = {
  title: "Course Assignments — Gen Ed Coordinator | CLOIE",
};

// fallow-ignore-next-line complexity
export default async function GenEdCoordinatorCourseAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await resolveAuthSession();

  if (!session || session.activeRole !== ROLES.GEN_ED_COORDINATOR) {
    redirect("/unauthorized");
  }

  const [pageData, listPage] = await Promise.all([
    loadAllProgramCourseAssignmentsPageData(undefined, CourseScope.GENERAL_EDUCATION),
    loadCourseAssignmentListPage({
      pathname: "/gen-ed-coordinator/course-assignments",
      rawSearchParams: await searchParams,
      role: "general-education",
    }),
  ]);

  return (
    <CourseAssignmentsPageShell
      key={JSON.stringify(listPage.state)}
      pageTitle="General Education Assignments"
      pageDescription="Manage General Education course assignments across all active programs"
      mode="general-education"
      initialData={listPage.result.success ? listPage.result.data : null}
      initialFilters={listPage.initialFilters}
      initialPage={listPage.state.page}
      initialError={listPage.result.success ? null : listPage.result.error}
      {...pageData}
    />
  );
}

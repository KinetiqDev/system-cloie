import { notFound } from "next/navigation";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { CourseAssignmentsPageShell } from "@/features/course-assignments/components/course-assignments-page-shell";
import { loadCourseAssignmentListPage } from "@/features/course-assignments/services/load-course-assignment-list-page";
import { loadProgramHeadCourseAssignmentsPageData } from "@/features/course-assignments/services/load-all-program-course-assignments-page";

export const metadata = {
  title: "Course Assignments | Program Head | CLOIE",
};

export default async function SelectedProgramCourseAssignmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { programId } = await params;
  const rawSearchParams = await searchParams;

  const contextResult = await resolveProgramHeadContext(programId);
  if (!contextResult.success) notFound();

  const pageData = await loadProgramHeadCourseAssignmentsPageData(programId);
  const listPage = await loadCourseAssignmentListPage({
    pathname: `/program-head/programs/${encodeURIComponent(programId)}/course-assignments`,
    rawSearchParams,
    role: "program-head",
    programId,
    defaultTermInstanceId: pageData.activeTermInstanceId,
  });

  return (
    <CourseAssignmentsPageShell
      key={JSON.stringify(listPage.state)}
      pageTitle="Course Assignments"
      pageDescription={`Manage ${contextResult.data.selectedProgram.code} Program-specific Course assignments`}
      mode="program-head"
      selectedProgramId={programId}
      initialData={listPage.result.success ? listPage.result.data : null}
      initialFilters={listPage.initialFilters}
      initialPage={listPage.state.page}
      initialError={listPage.result.success ? null : listPage.result.error}
      {...pageData}
    />
  );
}

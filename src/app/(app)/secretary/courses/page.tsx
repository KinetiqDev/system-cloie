import { listManagementCoursesSummary } from "@/features/academic-structure/services/list-management-courses-summary";
import { ManagementCoursesList } from "@/features/academic-structure/components/management-courses-list";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Courses", "Secretary") };

export default async function SecretaryCoursesPage() {
  const { courses, kpi, programs } = await listManagementCoursesSummary();

  return <ManagementCoursesList courses={courses} kpi={kpi} programs={programs} />;
}

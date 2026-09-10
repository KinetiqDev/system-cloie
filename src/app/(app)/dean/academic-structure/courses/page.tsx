import { listManagementCoursesSummary } from "@/features/academic-structure/services/list-management-courses-summary";
import { ManagementCoursesList } from "@/features/academic-structure/components/management-courses-list";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Courses", "Dean") };

export default async function DeanCoursesPage() {
  const { courses, kpi, programs } = await listManagementCoursesSummary();
  return (
    <ManagementCoursesList
      courses={courses}
      kpi={kpi}
      programs={programs}
      basePath="/dean/academic-structure/courses"
    />
  );
}

import { notFound } from "next/navigation";
import { ProgramHeadCoursesCatalog } from "@/features/academic-structure/components/program-head-courses-catalog";
import { listProgramHeadCourses } from "@/features/academic-structure/services/resolve-program-head-courses";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = {
  title: buildPageTitle("Courses", "Program Head"),
};

export default async function SelectedProgramCoursesPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const coursesResult = await listProgramHeadCourses(programId);

  if (!coursesResult.success) notFound();

  return (
    <ProgramHeadCoursesCatalog
      program={coursesResult.data.program}
      courses={coursesResult.data.courses}
      summary={coursesResult.data.summary}
      majors={coursesResult.data.majors}
    />
  );
}

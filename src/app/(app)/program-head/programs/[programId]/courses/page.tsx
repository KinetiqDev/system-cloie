import { notFound } from "next/navigation";
import { ProgramHeadCoursesCatalog } from "@/features/academic-structure/components/program-head-courses-catalog";
import { listProgramHeadCourses } from "@/features/academic-structure/services/resolve-program-head-courses";

export const metadata = {
  title: "Courses | Program Head | System CLOIE",
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

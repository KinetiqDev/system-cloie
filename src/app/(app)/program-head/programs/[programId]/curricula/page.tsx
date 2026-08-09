import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listProgramHeadCurriculumPageData } from "@/features/curriculum/services/read-curriculum-pages";
import { CurriculumVersionList } from "@/features/curriculum/components/curriculum-version-list";

export const metadata: Metadata = {
  title: "Curricula | Program Head",
  description: "Manage curriculum versions for the selected program",
};

export default async function SelectedProgramCurriculaPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const result = await listProgramHeadCurriculumPageData(programId);

  if (!result.success) {
    notFound();
  }

  return (
    <CurriculumVersionList
      programs={[result.data.program]}
      curricula={result.data.curricula}
      courses={result.data.courses}
      schoolYears={result.data.schoolYears}
    />
  );
}

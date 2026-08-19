import { notFound } from "next/navigation";
import { listProgramPLOs } from "@/features/outcomes/services/manage-program-head-outcomes";
import { ProgramHeadOutcomesPage } from "@/features/outcomes/components/program-head-outcomes-page";

export const metadata = {
  title: "Program Learning Outcomes | Program Head | CLOIE",
};

export default async function SelectedProgramOutcomesPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const result = await listProgramPLOs(programId);

  if (!result.success) notFound();

  return <ProgramHeadOutcomesPage plos={result.data.plos} program={result.data.program} />;
}

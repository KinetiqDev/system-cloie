import { redirect } from "next/navigation";
import { buildProgramHeadResponsesPath } from "@/lib/constants/program-head-routes";

export default async function SelectedProgramCiloReviewsRedirect({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params;
  redirect(buildProgramHeadResponsesPath(programId));
}

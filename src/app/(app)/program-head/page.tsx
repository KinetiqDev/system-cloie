import { redirect } from "next/navigation";
import { ProgramHeadNoAssignmentState, ProgramHeadSelector } from "@/features/auth/components/program-head-selector";
import { resolveProgramHeadEntry } from "@/features/auth/services/resolve-program-head-context";
import { readSelectedProgramCookie } from "@/features/auth/services/selected-program-cookie";
import { buildProgramHeadDashboardPath } from "@/lib/constants/program-head-routes";
export default async function ProgramHeadEntryPage() {
  const result = await resolveProgramHeadEntry();

  if (!result.success) {
    redirect("/unauthorized");
  }

  const { authorizedPrograms } = result.data;

  if (authorizedPrograms.length === 0) {
    return <ProgramHeadNoAssignmentState />;
  }

  if (authorizedPrograms.length === 1) {
    redirect(buildProgramHeadDashboardPath(authorizedPrograms[0].id));
  }

  const cookieProgramId = await readSelectedProgramCookie();
  if (cookieProgramId && authorizedPrograms.some((p) => p.id === cookieProgramId)) {
    redirect(buildProgramHeadDashboardPath(cookieProgramId));
  }

  return <ProgramHeadSelector programs={authorizedPrograms} />;
}

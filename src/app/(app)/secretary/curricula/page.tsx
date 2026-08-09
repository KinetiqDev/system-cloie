import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { listSecretaryCurriculumPageData } from "@/features/curriculum/services/read-curriculum-pages";
import { CurriculumVersionList } from "@/features/curriculum/components/curriculum-version-list";

export const metadata: Metadata = {
  title: "Curricula | Secretary",
  description: "Manage curriculum versions across all programs",
};

export default async function SecretaryCurriculaPage() {
  const session = await resolveAuthSession();

  if (!session || session.activeRole !== ROLES.SECRETARY) {
    redirect("/dashboard");
  }

  const data = await listSecretaryCurriculumPageData();

  return <CurriculumVersionList programs={data.programs} schoolYears={data.schoolYears} />;
}

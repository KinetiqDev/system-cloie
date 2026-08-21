import { redirect } from "next/navigation";
import { GenEdCoursesCatalog } from "@/features/academic-structure/components/gen-ed-courses-catalog";
import { listGenEdCourses } from "@/features/academic-structure/services/resolve-gen-ed-courses";
import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";

export const metadata = {
  title: "Courses — General Education Catalog — Gen Ed Coordinator | System CLOIE",
};

export default async function GenEdCoordinatorCoursesPage() {
  const session = await resolveAuthSession();

  if (!session) {
    redirect("/portal/respondents");
  }

  if (session.activeRole !== ROLES.GEN_ED_COORDINATOR) {
    redirect("/unauthorized");
  }

  const result = await listGenEdCourses();

  if (!result.success) {
    redirect("/unauthorized");
  }

  return <GenEdCoursesCatalog courses={result.data.courses} summary={result.data.summary} />;
}

import { redirect } from "next/navigation";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { buildPageTitle } from "@/lib/page-title";
import { readStudentImportContext } from "@/features/users/services/student-import";
import { StudentImport } from "@/features/users/components/student-import";

export const metadata = { title: buildPageTitle("Import students", "Secretary") };

export default async function StudentImportPage() {
  const session = await resolveAuthSession();
  if (session?.activeRole !== ROLES.SECRETARY) redirect("/unauthorized");
  const { programs } = await readStudentImportContext();
  return <StudentImport programs={programs} />;
}

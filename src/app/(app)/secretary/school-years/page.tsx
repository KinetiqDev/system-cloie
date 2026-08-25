import { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { listSchoolYears } from "@/features/academic-calendar/services/list-school-years";
import { SchoolYearsClientPage } from "./client-page";

export const metadata: Metadata = {
  title: "School Years | Admin",
  description: "Manage school years and academic terms",
};

interface SchoolYearsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SchoolYearsPage({
  searchParams,
}: SchoolYearsPageProps) {
  const session = await resolveAuthSession();

  if (!session || !session.roles.includes(ROLES.SECRETARY)) {
    redirect("/dashboard");
  }

  const [{ items: activeYears }, { items: archivedYears }, params] =
    await Promise.all([
      listSchoolYears({ includeArchived: false }),
      listSchoolYears({ onlyArchived: true }),
      searchParams,
    ]);

  const initialTab = params.tab === "archived" ? "archived" : "active";

  return (
    <SchoolYearsClientPage
      initialActive={activeYears}
      initialArchived={archivedYears}
      initialTab={initialTab}
    />
  );
}

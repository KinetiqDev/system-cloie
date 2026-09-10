import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { getSchoolYearById } from "@/features/academic-calendar/services/list-school-years";
import { SchoolYearDetailClientPage } from "./client-page";
import { buildPageTitle } from "@/lib/page-title";

interface SchoolYearDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: SchoolYearDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const schoolYear = await getSchoolYearById(id);

  return {
    title: schoolYear
      ? buildPageTitle(schoolYear.code, "School Years", "Secretary")
      : buildPageTitle("School Year Not Found", "Secretary"),
    description: "View and manage school year details",
  };
}

export default async function SchoolYearDetailPage({ params }: SchoolYearDetailPageProps) {
  const session = await resolveAuthSession();

  if (!session || !session.roles.includes(ROLES.SECRETARY)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const schoolYear = await getSchoolYearById(id);

  if (!schoolYear) {
    notFound();
  }

  return <SchoolYearDetailClientPage schoolYear={schoolYear} />;
}

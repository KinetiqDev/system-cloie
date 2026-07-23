import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { CourseRosterDiscoveryPage } from "@/features/course-assignments/components/course-roster-pages";
import { listAuthorizedCourseRosterAssignments } from "@/features/course-assignments/services/read-course-rosters";

export const metadata = { title: "My Course Rosters - Faculty | CLOIE" };

const searchParamsSchema = z.object({
  search: z.string().trim().max(100).optional(),
  history: z.enum(["1"]).optional(),
  page: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .optional(),
});

export default async function FacultyCourseRostersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; history?: string; page?: string }>;
}) {
  const parsed = searchParamsSchema.safeParse(await searchParams);
  if (!parsed.success) notFound();
  const result = await listAuthorizedCourseRosterAssignments({
    facultyOnly: true,
    includeHistory: parsed.data.history === "1",
    search: parsed.data.search,
    page: (parsed.data.page ?? 1) - 1,
  });
  if (!result.success) {
    const supportSuffix = result.referenceId ? ` Support reference: ${result.referenceId}.` : "";
    return <CourseRosterDiscoveryPage data={null} error={`${result.error}${supportSuffix}`} />;
  }
  const requestedPage = (parsed.data.page ?? 1) - 1;
  if (result.data.page !== requestedPage) {
    const params = new URLSearchParams({ page: String(result.data.page + 1) });
    if (result.data.search) params.set("search", result.data.search);
    if (result.data.includeHistory) params.set("history", "1");
    redirect(`/faculty/course-rosters?${params}`);
  }
  return <CourseRosterDiscoveryPage data={result.data} />;
}

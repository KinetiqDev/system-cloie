import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { CourseRosterDiscoveryPage } from "@/features/course-assignments/components/course-roster-pages";
import { listAuthorizedCourseRosterAssignments } from "@/features/course-assignments/services/read-course-rosters";

export const metadata = { title: "My Course Rosters - Faculty | CLOIE" };

const searchParamsSchema = z.object({
  search: z.string().trim().max(100).optional(),
  history: z.enum(["1"]).optional(),
  view: z.enum(["list", "card"]).default("list"),
  page: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .optional(),
});

function buildCanonicalCourseRostersUrl({
  page,
  includePage,
  search,
  includeHistory,
  view,
}: {
  page: number;
  includePage: boolean;
  search: string;
  includeHistory: boolean;
  view: "list" | "card";
}) {
  const params = new URLSearchParams();
  if (includePage) params.set("page", String(page + 1));
  if (search) params.set("search", search);
  if (includeHistory) params.set("history", "1");
  if (view === "card") params.set("view", "card");
  const query = params.toString();

  return `/faculty/course-rosters${query ? `?${query}` : ""}`;
}

export default async function FacultyCourseRostersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; history?: string; view?: string; page?: string }>;
}) {
  const requestedSearchParams = await searchParams;
  const parsed = searchParamsSchema.safeParse(requestedSearchParams);
  if (!parsed.success) notFound();
  const result = await listAuthorizedCourseRosterAssignments({
    facultyOnly: true,
    includeHistory: parsed.data.history === "1",
    search: parsed.data.search,
    page: (parsed.data.page ?? 1) - 1,
  });
  if (!result.success) {
    const supportSuffix = result.referenceId ? ` Support reference: ${result.referenceId}.` : "";
    return (
      <CourseRosterDiscoveryPage
        data={null}
        error={`${result.error}${supportSuffix}`}
        view={parsed.data.view}
      />
    );
  }
  const requestedPage = (parsed.data.page ?? 1) - 1;
  const pageChanged = result.data.page !== requestedPage;
  if (pageChanged || requestedSearchParams.view === "list") {
    redirect(
      buildCanonicalCourseRostersUrl({
        page: result.data.page,
        includePage: pageChanged || parsed.data.page !== undefined,
        search: result.data.search,
        includeHistory: result.data.includeHistory,
        view: parsed.data.view,
      })
    );
  }
  return <CourseRosterDiscoveryPage data={result.data} view={parsed.data.view} />;
}

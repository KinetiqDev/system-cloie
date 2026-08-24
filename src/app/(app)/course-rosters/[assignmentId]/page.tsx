import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { CourseRosterDetailPage } from "@/features/course-assignments/components/course-roster-pages";
import { getCourseRosterDetail } from "@/features/course-assignments/services/read-course-rosters";
import { ROLES } from "@/lib/constants/roles";

export const metadata = { title: "Course Roster | CLOIE" };

const searchParamsSchema = z.object({
  search: z.string().trim().max(100).optional(),
  removed: z.enum(["1"]).optional(),
  sort: z.enum(["asc", "desc"]).optional(),
  page: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .optional(),
});

export default async function CourseRosterDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ search?: string; removed?: string; sort?: string; page?: string }>;
}) {
  const [{ assignmentId }, rawSearchParams] = await Promise.all([params, searchParams]);
  if (!z.string().uuid().safeParse(assignmentId).success) notFound();
  const parsed = searchParamsSchema.safeParse(rawSearchParams);
  if (!parsed.success) notFound();
  const session = await resolveAuthSession();
  if (session?.activeRole === ROLES.PROGRAM_HEAD) redirect("/program-head");
  const result = await getCourseRosterDetail(assignmentId, {
    includeRemoved: parsed.data.removed === "1",
    search: parsed.data.search,
    page: parsed.data.page,
    sortDirection: parsed.data.sort,
  });
  if (!result.success) {
    if (result.error === "Course assignment not found.") notFound();
    const backHref = resolveBackHref(session?.activeRole);
    const backLabel =
      session?.activeRole === ROLES.FACULTY
        ? "Back to My Course Rosters"
        : "Back to Course Assignments";
    const supportSuffix = result.referenceId ? ` Support reference: ${result.referenceId}.` : "";
    return (
      <CourseRosterDetailPage
        data={null}
        error={`${result.error}${supportSuffix}`}
        backHref={backHref}
        backLabel={backLabel}
      />
    );
  }
  const backHref = resolveBackHref(session?.activeRole);
  const backLabel =
    session?.activeRole === ROLES.FACULTY
      ? "Back to My Course Rosters"
      : "Back to Course Assignments";
  if (result.data.page !== (parsed.data.page ?? 1)) {
    const params = new URLSearchParams({
      page: String(result.data.page),
      sort: result.data.sortDirection,
    });
    if (result.data.search) params.set("search", result.data.search);
    if (result.data.includeRemoved) params.set("removed", "1");
    redirect(`/course-rosters/${assignmentId}?${params}`);
  }
  return <CourseRosterDetailPage data={result.data} backHref={backHref} backLabel={backLabel} />;
}

function resolveBackHref(activeRole: string | null | undefined) {
  return activeRole === ROLES.SECRETARY
    ? "/secretary/course-assignments"
    : activeRole === ROLES.DEAN
      ? "/dean/academic-structure/course-assignments"
      : activeRole === ROLES.PROGRAM_HEAD
        ? "/program-head"
        : "/faculty/course-rosters";
}

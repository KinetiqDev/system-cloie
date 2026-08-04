import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { CourseRosterDetailPage } from "@/features/course-assignments/components/course-roster-pages";
import { getCourseRosterDetail } from "@/features/course-assignments/services/read-course-rosters";
import {
  buildProgramHeadCourseAssignmentsPath,
  buildProgramHeadCourseRosterPath,
  buildProgramHeadProgramPath,
} from "@/lib/constants/program-head-routes";

export const metadata = { title: "Course Roster | Program Head | CLOIE" };

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

export default async function SelectedProgramCourseRosterRoute({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string; assignmentId: string }>;
  searchParams: Promise<{ search?: string; removed?: string; sort?: string; page?: string }>;
}) {
  const [{ programId, assignmentId }, rawSearchParams] = await Promise.all([params, searchParams]);
  if (!z.string().uuid().safeParse(programId).success) notFound();
  if (!z.string().uuid().safeParse(assignmentId).success) notFound();

  const contextResult = await resolveProgramHeadContext(programId);
  if (!contextResult.success) notFound();

  const parsed = searchParamsSchema.safeParse(rawSearchParams);
  if (!parsed.success) notFound();

  const result = await getCourseRosterDetail(assignmentId, {
    programId,
    includeRemoved: parsed.data.removed === "1",
    search: parsed.data.search,
    page: parsed.data.page,
    sortDirection: parsed.data.sort,
  });
  const backHref = buildProgramHeadCourseAssignmentsPath(programId);
  const rosterBasePath = buildProgramHeadProgramPath(programId, "course-rosters");

  if (!result.success) {
    if (result.error === "Course assignment not found.") notFound();
    const supportSuffix = result.referenceId ? ` Support reference: ${result.referenceId}.` : "";
    return (
      <CourseRosterDetailPage
        data={null}
        error={`${result.error}${supportSuffix}`}
        backHref={backHref}
        backLabel="Back to Course Assignments"
        rosterBasePath={rosterBasePath}
        programId={programId}
      />
    );
  }

  if (result.data.page !== (parsed.data.page ?? 1)) {
    const query = new URLSearchParams({
      page: String(result.data.page),
      sort: result.data.sortDirection,
    });
    if (result.data.search) query.set("search", result.data.search);
    if (result.data.includeRemoved) query.set("removed", "1");
    redirect(`${buildProgramHeadCourseRosterPath(programId, assignmentId)}?${query}`);
  }

  return (
    <CourseRosterDetailPage
      data={result.data}
      backHref={backHref}
      backLabel="Back to Course Assignments"
      rosterBasePath={rosterBasePath}
      programId={programId}
    />
  );
}

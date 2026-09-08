import { redirect } from "next/navigation";
import { ensureRoleAccess } from "@/features/auth/policies/ensure-role-access";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { FacultyAnalyticsDashboard } from "@/features/analytics/components/faculty-analytics-dashboard";
import {
  getFacultyAnalyticsData,
  getFacultyAnalyticsOptions,
  normalizeFacultyAnalyticsFilters,
} from "@/features/analytics/services/get-faculty-analytics-data";
import type { FacultyAnalyticsFilters } from "@/features/analytics/types";
import { ROLES } from "@/lib/constants/roles";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Analytics", "Faculty") };

// Route shells session/role guards, filter normalization, and parallel authorized reads;
// the guard checks are the route's authorization contract.
// fallow-ignore-next-line complexity
export default async function FacultyAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await resolveAuthSession();
  if (!session) redirect("/portal/respondents");

  const redirectPath = ensureRoleAccess({
    activeRole: session.activeRole,
    allowedRoles: [ROLES.FACULTY],
  });
  if (redirectPath) redirect(redirectPath);

  const raw = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const filters = normalizeFacultyAnalyticsFilters({
    view: first(raw.view) as FacultyAnalyticsFilters["view"],
    termInstanceId: first(raw.termInstanceId),
    courseId: first(raw.courseId),
    assignmentId: first(raw.assignmentId),
    evaluationId: first(raw.evaluationId),
    status: first(raw.status) as FacultyAnalyticsFilters["status"],
  });
  const [analytics, optionResult] = await Promise.all([
    getFacultyAnalyticsData(filters),
    getFacultyAnalyticsOptions(),
  ]);

  if (!analytics.success) {
    return (
      <div className="space-y-2">
        <h1 className="text-heading-lg">My evaluation analytics</h1>
        <p className="text-body-md text-text-secondary">{analytics.error}</p>
      </div>
    );
  }
  if (!optionResult.success) {
    return (
      <div className="space-y-2">
        <h1 className="text-heading-lg">My evaluation analytics</h1>
        <p className="text-body-md text-text-secondary">{optionResult.error}</p>
      </div>
    );
  }

  return (
    <FacultyAnalyticsDashboard
      key={JSON.stringify(filters)}
      data={analytics.data}
      options={optionResult.options}
    />
  );
}

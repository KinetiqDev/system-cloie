import { CollegeAnalyticsPage } from "@/features/analytics/components/college-analytics-page";
import { COLLEGE_OVERSIGHT_ROUTES } from "@/lib/constants/college-oversight";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Analytics", "Secretary") };

export default function SecretaryAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <CollegeAnalyticsPage searchParams={searchParams} routes={COLLEGE_OVERSIGHT_ROUTES.SECRETARY} />
  );
}

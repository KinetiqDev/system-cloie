import { ALUMNI_PORTAL, StakeholderDashboardPage } from "@/components/stakeholder-portal-pages";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Dashboard", "Alumni") };

export default function AlumniDashboardPage() {
  return <StakeholderDashboardPage portal={ALUMNI_PORTAL} />;
}

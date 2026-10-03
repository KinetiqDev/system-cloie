import { ALUMNI_PORTAL, StakeholderHistoryPage } from "@/components/stakeholder-portal-pages";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("History", "Alumni") };

export default function AlumniHistoryPage() {
  return <StakeholderHistoryPage portal={ALUMNI_PORTAL} />;
}

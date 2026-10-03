import {
  INDUSTRY_PARTNER_PORTAL,
  StakeholderDashboardPage,
} from "@/components/stakeholder-portal-pages";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Dashboard", "Industry Partner") };

export default function IndustryPartnerDashboardPage() {
  return <StakeholderDashboardPage portal={INDUSTRY_PARTNER_PORTAL} />;
}

import {
  INDUSTRY_PARTNER_PORTAL,
  StakeholderHistoryPage,
} from "@/components/stakeholder-portal-pages";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("History", "Industry Partner") };

export default function IndustryPartnerHistoryPage() {
  return <StakeholderHistoryPage portal={INDUSTRY_PARTNER_PORTAL} />;
}

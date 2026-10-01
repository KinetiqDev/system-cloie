import {
  INDUSTRY_PARTNER_PORTAL,
  StakeholderEvaluationsPage,
} from "@/components/stakeholder-portal-pages";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Evaluations", "Industry Partner") };

export default function IndustryPartnerEvaluationsPage() {
  return <StakeholderEvaluationsPage portal={INDUSTRY_PARTNER_PORTAL} />;
}

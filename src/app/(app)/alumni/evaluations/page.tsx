import { ALUMNI_PORTAL, StakeholderEvaluationsPage } from "@/components/stakeholder-portal-pages";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Evaluations", "Alumni") };

export default function AlumniEvaluationsPage() {
  return <StakeholderEvaluationsPage portal={ALUMNI_PORTAL} />;
}

import { BookOpen } from "lucide-react";
import { DeanGroupLanding } from "../dean-group-landing";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("College Oversight", "Dean") };

export default function CollegeOversightPage() {
  return (
    <DeanGroupLanding
      title="College Oversight"
      purpose="Review read-only learning outcome readiness across academic programs."
      notice="Oversight views use selected Academic Period data and expose no authoring or export controls."
      tools={[
        {
          name: "Learning Outcomes",
          href: "/dean/college-oversight/learning-outcomes",
          description: "Review graduate outcomes and mapping gaps.",
          icon: BookOpen,
        },
      ]}
    />
  );
}

import { BookOpen, UsersRound } from "lucide-react";
import { DeanGroupLanding } from "../dean-group-landing";

export default function CollegeOversightPage() {
  return (
    <DeanGroupLanding
      title="College Oversight"
      purpose="Review read-only learning outcome readiness and enrollment totals across academic programs."
      notice="Oversight views use selected Academic Period data and expose no authoring or export controls."
      tools={[
        { name: "Learning Outcomes", href: "/dean/college-oversight/learning-outcomes", description: "Review graduate outcomes and mapping gaps.", icon: BookOpen },
        { name: "Enrollments", href: "/dean/college-oversight/enrollments", description: "Review program and class enrollment totals.", icon: UsersRound },
      ]}
    />
  );
}

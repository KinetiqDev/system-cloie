import {
  AudienceLanding,
  LandingItems,
  LandingLinks,
  LandingSection,
} from "@/features/entry/components/audience-landing";
import { resolveHelpUrl } from "@/features/entry/help-center-links";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = {
  title: buildPageTitle("Staff & Faculty"),
  description:
    "Evaluation management, learning outcomes, and getting started with System CLOIE for staff and faculty.",
};

export default function StaffLandingPage() {
  return (
    <AudienceLanding
      audience="Staff & Faculty"
      scope="For Secretary, Dean, Program Head, Gen Ed Coordinator, and Faculty"
      statement="Sign in to set up and run your part of the evaluation cycle, and to review the evidence your role is responsible for."
      loginHref="/login/staff"
      signInLabel="Staff & faculty sign in"
      secondaryAction={{ href: "/register/faculty", label: "Submit a Faculty request" }}
      prerequisites={[
        "Use your @acd.edu.ph or @acdeducation.com Google account.",
        "If your account holds more than one role, you choose the workspace you want after signing in.",
        "Faculty access needs an approved request. Other staff access is provisioned by the Secretary.",
      ]}
      guideHref={resolveHelpUrl("/entry/staff")}
    >
      <LandingSection id="academic-work" title="What you do in System CLOIE">
        <LandingItems
          items={[
            {
              title: "Prepare the academic context",
              description:
                "Set up the academic structures, outcomes, course assignments, and rosters your role is responsible for.",
            },
            {
              title: "Prepare and run evaluations",
              description:
                "Build evaluation tools and publish evaluations where your role permits, keeping outcomes and stakeholder questions connected.",
            },
            {
              title: "Review the evidence",
              description:
                "Follow submitted responses into review and attainment analytics, and use that evidence for quality assurance and improvement.",
            },
          ]}
        />
      </LandingSection>
      <LandingSection id="getting-started" title="Guidance for your role">
        <LandingLinks
          lead="Each workspace has its own guide. Open the one that matches the role you sign in with; the Help Center covers accounts, courses, and permissions that look missing."
          items={[
            { label: "Secretary guide", href: resolveHelpUrl("/", "SECRETARY") },
            { label: "Dean guide", href: resolveHelpUrl("/", "DEAN") },
            { label: "Program Head guide", href: resolveHelpUrl("/", "PROGRAM_HEAD") },
            {
              label: "General Education Coordinator guide",
              href: resolveHelpUrl("/", "GEN_ED_COORDINATOR"),
            },
            { label: "Faculty guide", href: resolveHelpUrl("/", "FACULTY") },
          ]}
        />
      </LandingSection>
    </AudienceLanding>
  );
}

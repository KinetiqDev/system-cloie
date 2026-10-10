import {
  AudienceLanding,
  LandingColumns,
  LandingLinks,
  LandingSection,
} from "@/features/entry/components/audience-landing";
import { resolveHelpUrl } from "@/features/entry/help-center-links";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = {
  title: buildPageTitle("Alumni & Industry Partners"),
  description:
    "Graduate and industry feedback, account guidance, and stakeholder evaluations in System CLOIE.",
};

export default function ExternalLandingPage() {
  return (
    <AudienceLanding
      audience="Alumni & Industry Partners"
      scope="For ACD graduates and partner organizations"
      statement="Sign in to answer the graduate and industry evaluations open to you, and to see what you have already submitted."
      loginHref="/login/external"
      signInLabel="Alumni & partner sign in"
      secondaryAction={{ href: "/register/external", label: "Create an account" }}
      prerequisites={[
        "Use your email address and password, or a Google account. An ACD email is not required.",
        "When you register, choose Alumni or Industry Partner. The choice sets up your profile.",
        "Your workspace lists the evaluations you are eligible to answer, and what you have submitted.",
      ]}
      guideHref={resolveHelpUrl("/entry/external")}
    >
      <LandingSection id="participation" title="What your answer contributes">
        <LandingColumns
          items={[
            {
              title: "Alumni",
              description:
                "Reflect on your graduate experience and the learning outcomes you have carried into further study, work, and daily life.",
              action: {
                href: resolveHelpUrl("/alumni/dashboard"),
                label: "Read the alumni guide",
              },
            },
            {
              title: "Industry partners",
              description:
                "Share how your organization sees the graduates it works with, and the capabilities that matter in practice.",
              action: {
                href: resolveHelpUrl("/industry-partner/dashboard"),
                label: "Read the industry partner guide",
              },
            },
          ]}
        />
      </LandingSection>
      <LandingSection id="getting-started" title="Getting in">
        <LandingColumns
          items={[
            {
              title: "Already have an account?",
              description:
                "Sign in with the email address and password you registered, or with Google. Your account already knows which evaluations are yours.",
            },
            {
              title: "New to System CLOIE?",
              description:
                "Choose Alumni or Industry Partner, verify your email address, then complete that profile. Verifying your email is not institutional approval.",
            },
          ]}
        />
      </LandingSection>
      <LandingSection id="evaluations" title="Take part at your own pace">
        <LandingLinks
          lead="You can complete a profile, answer what is open to you, and come back to a draft later. These guides cover each step."
          items={[
            { label: "Complete your profile", href: resolveHelpUrl("/alumni/profile") },
            {
              label: "Answer an evaluation",
              href: resolveHelpUrl("/alumni/evaluations"),
            },
            { label: "Your submitted history", href: resolveHelpUrl("/alumni/history") },
            {
              label: "Industry partner guide",
              href: resolveHelpUrl("/industry-partner/dashboard"),
            },
          ]}
        />
      </LandingSection>
    </AudienceLanding>
  );
}

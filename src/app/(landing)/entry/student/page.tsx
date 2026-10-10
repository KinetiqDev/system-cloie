import {
  AudienceLanding,
  LandingItems,
  LandingLinks,
  LandingSection,
} from "@/features/entry/components/audience-landing";
import { resolveHelpUrl } from "@/features/entry/help-center-links";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = {
  title: buildPageTitle("Students"),
  description:
    "Course evaluations, saved responses, and getting started with System CLOIE for students.",
};

export default function StudentLandingPage() {
  return (
    <AudienceLanding
      audience="Students"
      scope="For current students"
      statement="Sign in to answer the course evaluations open to you, and to check the ones you have already submitted."
      loginHref="/login/student"
      signInLabel="Student sign in"
      prerequisites={[
        "Have your ACD Google account ready — @acd.edu.ph or @acdeducation.com.",
        "The Secretary's office sets up your account and academic placement. There is no student self-registration.",
        "A saved response stays unsubmitted until you finish and submit it.",
      ]}
      guideHref={resolveHelpUrl("/entry/student")}
    >
      <LandingSection id="evaluations" title="What you do in System CLOIE">
        <LandingItems
          items={[
            {
              title: "Answer your evaluations",
              description:
                "Your dashboard lists the evaluations available to your account. Open one to see what it asks you to answer.",
              link: {
                href: resolveHelpUrl("/student/evaluations"),
                label: "Guide: answering an evaluation",
              },
            },
            {
              title: "Save and come back",
              description:
                "Keep a draft when you need more time. Nothing is submitted until you finish and submit the evaluation yourself.",
              link: {
                href: resolveHelpUrl("/student/saved-responses"),
                label: "Guide: saved responses",
              },
            },
            {
              title: "See what you submitted",
              description:
                "Your history lists the evaluations you have completed, so you can keep track of your participation.",
              link: {
                href: resolveHelpUrl("/student/history"),
                label: "Guide: submitted history",
              },
            },
          ]}
        />
      </LandingSection>
      <LandingSection id="getting-started" title="If something is missing">
        <LandingLinks
          lead="An account that has not been set up yet cannot open a workspace, and there is no self-registration to fall back on. If your account or academic placement is missing, contact the Secretary's office. These guides cover the rest."
          items={[
            { label: "Student guide: signing in", href: resolveHelpUrl("/entry/student") },
            { label: "Student guide: evaluations", href: resolveHelpUrl("/student/evaluations") },
            { label: "Student guide: submitted history", href: resolveHelpUrl("/student/history") },
          ]}
        />
      </LandingSection>
    </AudienceLanding>
  );
}

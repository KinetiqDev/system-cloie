import {
  AudienceLanding,
  LandingSection,
  LandingTopics,
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
      introduction="Your experience helps improve learning. Use System CLOIE to answer course evaluations and share feedback on the learning outcomes you have achieved."
      loginHref="/login/student"
      signInLabel="Student sign in"
      guideHref={resolveHelpUrl("/entry/student")}
    >
      <LandingSection id="evaluations" title="From your first answer to your final submission">
        <LandingTopics
          items={[
            {
              title: "Find your evaluations",
              description:
                "Your dashboard shows evaluations available to your account. Open an evaluation to see what you need to answer.",
              href: resolveHelpUrl("/student/evaluations"),
            },
            {
              title: "Continue a saved response",
              description:
                "Return to a draft when you need more time. Saved answers are not submitted until you finish and submit the evaluation.",
              href: resolveHelpUrl("/student/evaluations/example"),
            },
            {
              title: "Check your submitted work",
              description:
                "Use your history to review evaluations you have already submitted and keep track of completed participation.",
              href: resolveHelpUrl("/student/history"),
            },
          ]}
        />
      </LandingSection>
      <LandingSection id="getting-started" title="Before you sign in">
        <div className="grid gap-8 md:grid-cols-2 md:gap-16">
          <div>
            <h3 className="text-heading-md font-semibold">Have your ACD Google account ready</h3>
            <p className="text-body-md text-muted-foreground mt-3 leading-relaxed">
              Use your @acd.edu.ph or @acdeducation.com account. The Secretary&apos;s office sets up
              your account and academic placement; there is no student self-registration.
            </p>
          </div>
          <div>
            <h3 className="text-heading-md font-semibold">Need help getting in?</h3>
            <p className="text-body-md text-muted-foreground mt-3 leading-relaxed">
              If your account has not been set up, contact the Secretary&apos;s office. The student
              user guide explains sign-in, evaluations, and submitted-response history.
            </p>
            <a
              href={resolveHelpUrl("/entry/student")}
              className="text-link focus-visible:ring-ring mt-3 inline-flex min-h-11 items-center rounded-md font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              Read the student guide
            </a>
          </div>
        </div>
      </LandingSection>
    </AudienceLanding>
  );
}

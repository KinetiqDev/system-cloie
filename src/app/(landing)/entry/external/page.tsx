import Link from "next/link";
import {
  AudienceLanding,
  LandingSection,
  LandingTopics,
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
      introduction="Help connect learning to life beyond college. Share graduate and industry feedback that supports Assumption College of Davao’s learning-outcome review and continuous improvement."
      loginHref="/login/external"
      signInLabel="Alumni & partner sign in"
      guideHref={resolveHelpUrl("/entry/external")}
    >
      <LandingSection id="participation" title="Your perspective adds to the evidence">
        <div className="grid gap-8 md:grid-cols-2 md:gap-16">
          <div>
            <h3 className="text-heading-md font-semibold">For alumni</h3>
            <p className="text-body-md text-muted-foreground mt-3 leading-relaxed">
              Reflect on your graduate experience and the learning outcomes you carry into further
              study, work, and everyday life. Complete alumni evaluations available to your account.
            </p>
            <a
              href={resolveHelpUrl("/alumni/dashboard")}
              className="text-link focus-visible:ring-ring mt-3 inline-flex min-h-11 items-center rounded-md font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              Read the alumni guide
            </a>
          </div>
          <div>
            <h3 className="text-heading-md font-semibold">For industry partners</h3>
            <p className="text-body-md text-muted-foreground mt-3 leading-relaxed">
              Share your organization&apos;s perspective on graduates and their capabilities.
              Complete partner evaluations available to your account and program affiliations.
            </p>
            <a
              href={resolveHelpUrl("/industry-partner/dashboard")}
              className="text-link focus-visible:ring-ring mt-3 inline-flex min-h-11 items-center rounded-md font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              Read the industry partner guide
            </a>
          </div>
        </div>
      </LandingSection>
      <LandingSection id="getting-started" title="Before you sign in">
        <div className="grid gap-8 md:grid-cols-2 md:gap-16">
          <div>
            <h3 className="text-heading-md font-semibold">Already have an account?</h3>
            <p className="text-body-md text-muted-foreground mt-3 leading-relaxed">
              Use your email and password or Google account. An ACD email address is not required.
              Your workspace shows evaluations you are eligible to answer and your submitted
              history.
            </p>
          </div>
          <div>
            <h3 className="text-heading-md font-semibold">New to System CLOIE?</h3>
            <p className="text-body-md text-muted-foreground mt-3 leading-relaxed">
              Choose Alumni or Industry Partner when you register, verify your identity, then
              complete the appropriate profile. Verification of your email is separate from
              institutional account review.
            </p>
            <Link
              href="/register/external"
              className="text-link focus-visible:ring-ring mt-3 inline-flex min-h-11 items-center rounded-md font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              Create an account
            </Link>
          </div>
        </div>
      </LandingSection>
      <LandingSection id="evaluations" title="Take part at your own pace">
        <LandingTopics
          items={[
            {
              title: "Complete your profile",
              description:
                "Provide your graduate or organization details so System CLOIE can establish the context for your participation.",
            },
            {
              title: "Answer available evaluations",
              description:
                "Open the evaluations in your workspace. Save a draft when you need more time, and submit when your response is ready.",
            },
            {
              title: "Find help and track participation",
              description:
                "Review your submitted history and use the Help Center for account, evaluation, and verification guidance.",
            },
          ]}
        />
      </LandingSection>
    </AudienceLanding>
  );
}

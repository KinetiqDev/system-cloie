import Link from "next/link";
import {
  AudienceLanding,
  LandingSection,
  LandingTopics,
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
      introduction="Connect academic work to learning-outcome evidence. System CLOIE brings evaluation setup, stakeholder responses, and attainment review into your assigned workspace."
      loginHref="/login/staff"
      signInLabel="Staff & faculty sign in"
      guideHref={resolveHelpUrl("/entry/staff")}
    >
      <LandingSection id="academic-work" title="Support the evaluation cycle">
        <LandingTopics
          items={[
            {
              title: "Prepare the academic context",
              description:
                "Manage the academic structures, outcomes, course assignments, and rosters your role is responsible for. Access follows your assigned scope.",
            },
            {
              title: "Prepare and run evaluations",
              description:
                "Build evaluation tools and publish evaluations where your role permits. Keep learning outcomes and stakeholder questions connected.",
            },
            {
              title: "Review the evidence",
              description:
                "Follow submitted responses into review and attainment analytics. Use the evidence available to your role to support quality assurance and improvement.",
            },
          ]}
        />
      </LandingSection>
      <LandingSection id="getting-started" title="Before you sign in">
        <div className="grid gap-8 md:grid-cols-2 md:gap-16">
          <div>
            <h3 className="text-heading-md font-semibold">One sign-in, your assigned workspace</h3>
            <p className="text-body-md text-muted-foreground mt-3 leading-relaxed">
              Use your @acd.edu.ph or @acdeducation.com Google account. Secretary, Dean, Program
              Head, General Education Coordinator, and Faculty accounts sign in here. If you have
              more than one role, choose a workspace after sign-in.
            </p>
          </div>
          <div>
            <h3 className="text-heading-md font-semibold">New faculty member?</h3>
            <p className="text-body-md text-muted-foreground mt-3 leading-relaxed">
              Submit a Faculty request with your ACD Google account. The institution reviews your
              request before Faculty workspace access is granted. Other staff access is provisioned
              by the Secretary.
            </p>
            <Link
              href="/register/faculty"
              className="text-link focus-visible:ring-ring mt-3 inline-flex min-h-11 items-center rounded-md font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              Submit a Faculty request
            </Link>
          </div>
        </div>
      </LandingSection>
      <LandingSection id="guides" title="Guidance for your role">
        <p className="text-body-md text-muted-foreground max-w-3xl leading-relaxed">
          The Help Center explains each workspace, the actions available to your role, and what to
          do when an account, course, or permission is missing.
        </p>
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
          {[
            { label: "Secretary guide", role: "SECRETARY" as const },
            { label: "Dean guide", role: "DEAN" as const },
            { label: "Program Head guide", role: "PROGRAM_HEAD" as const },
            { label: "General Education Coordinator guide", role: "GEN_ED_COORDINATOR" as const },
            { label: "Faculty guide", role: "FACULTY" as const },
          ].map(({ label, role }) => (
            <li key={role}>
              <a
                href={resolveHelpUrl("/", role)}
                className="text-link focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </LandingSection>
    </AudienceLanding>
  );
}

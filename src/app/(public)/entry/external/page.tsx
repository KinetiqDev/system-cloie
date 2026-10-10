import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EntryShell } from "@/features/entry";
import { buttonVariants } from "@/components/ui/button";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = {
  title: buildPageTitle("Alumni & Industry Partners"),
  description: "Alumni and industry partner access to stakeholder evaluations in System CLOIE.",
};

export default function ExternalLandingPage() {
  return (
    <EntryShell
      title="Alumni & Industry Partners"
      description="Share graduate and industry feedback with System CLOIE."
      backLink={{ href: "/", label: "Choose another audience" }}
      footer={
        <p className="text-body-sm text-muted-foreground">
          New to System CLOIE?{" "}
          <Link
            href="/register/external"
            className="text-link hover:text-primary-hover font-medium underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <p className="text-body-md text-muted-foreground leading-relaxed">
        Sign in to view your available evaluations and share feedback as an alumnus or industry
        partner.
      </p>
      <Link href="/login/external" className={buttonVariants({ className: "w-full" })}>
        Alumni &amp; partner sign in
        <ArrowRight aria-hidden="true" />
      </Link>
      <p className="text-body-sm text-muted-foreground leading-relaxed">
        Use your email and password or Google account. An ACD email address is not required.
      </p>
    </EntryShell>
  );
}

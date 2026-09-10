import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShieldAlert,
  FileKey,
  Users,
  Ban,
  XCircle,
  CalendarDays,
  LogOut,
  ArrowLeft,
  UserRoundX,
  IdCard,
} from "lucide-react";
import { buildPageTitle } from "@/lib/page-title";

type PageProps = {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const STATUS_CONFIGS = {
  "invalid-domain": {
    title: "Institutional Email Required",
    description: "This role requires signing in with an official ACD institutional email address.",
    details:
      "If you logged in with a personal Google account, please sign out and sign in again using your @acd.edu.ph or @acdeducation.com email.",
    icon: ShieldAlert,
    color: "danger",
    showRetry: true,
  },
  "pre-provisioning-required": {
    title: "Account Provisioning Required",
    description: "Your account is not yet provisioned for this role.",
    details:
      "Access for the administration (Secretary, College Dean, and Program Head roles) must be configured in the database before you can enter. Please contact the IT Support team or system administrator to provision your account.",
    icon: FileKey,
    color: "warning",
    showRetry: true,
  },
  "role-mismatch": {
    title: "Role Mismatch",
    description: "The role you selected does not match your registered account role.",
    details:
      "Your institutional Google account is registered under a different role. If you need to access this role, please sign out and sign in using the correct role selection, or request a role change from an administrator.",
    icon: Users,
    color: "info",
    showRetry: true,
  },
  inactive: {
    title: "Account Inactive",
    description: "Your CLOIE account is currently inactive.",
    details:
      "This account has been deactivated by a system administrator. You cannot access the system dashboards. Please reach out to administration or IT support if you believe this is an error.",
    icon: Ban,
    color: "danger",
    showRetry: false,
  },
  rejected: {
    title: "Application Rejected",
    description: "Your registration application was not approved.",
    details:
      "Following institutional review, your self-service Alumni or Industry Partner registration application was rejected by the administration. Consequently, access to system dashboards is restricted.",
    icon: XCircle,
    color: "danger",
    showRetry: false,
  },
  "deferred-enrollment": {
    title: "Enrollment Deferred",
    description: "No active academic term configured.",
    details:
      "Your Student academic profile was successfully registered, but your enrollment could not be processed because there is currently no active academic term set in CLOIE. Please contact a school administrator to configure the academic calendar.",
    icon: CalendarDays,
    color: "warning",
    showRetry: false,
  },
  "missing-google-name": {
    title: "Google Account Name Required",
    description: "Your Google account does not provide a usable display name for CLOIE.",
    details:
      "CLOIE needs the name on your Google account before it can create or first-link your institutional account. Open your Google Account profile, set a full name, then return to role selection and sign in again. No account was created or linked by this attempt.",
    icon: IdCard,
    color: "warning",
    showRetry: true,
  },
  "identity-conflict": {
    title: "Sign-In Could Not Be Completed",
    description: "This Google sign-in cannot be connected to the matching CLOIE account.",
    details:
      "The account email is already associated with a different sign-in identity. Your existing CLOIE record was left unchanged. Sign out, return to role selection, and use the Google account originally linked to this email, or contact IT support for help.",
    icon: UserRoundX,
    color: "danger",
    showRetry: true,
  },
} as const;

type StatusType = keyof typeof STATUS_CONFIGS;

function isStatusType(type: string): type is StatusType {
  return Object.hasOwn(STATUS_CONFIGS, type);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  if (isStatusType(type)) {
    return { title: buildPageTitle(STATUS_CONFIGS[type].title) };
  }
  return { title: buildPageTitle("Status") };
}

export default async function StatusPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const { type } = resolvedParams;

  if (!isStatusType(type)) {
    notFound();
  }

  const config = STATUS_CONFIGS[type];
  const Icon = config.icon;

  // Semantic color roles for the status alert presentation
  const colorMap = {
    danger: {
      bg: "bg-danger-soft/30",
      border: "border-danger/20",
      text: "text-danger",
      iconBg: "bg-danger/10",
      iconColor: "text-danger",
    },
    warning: {
      bg: "bg-warning-soft/30",
      border: "border-warning/20",
      text: "text-warning",
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
    info: {
      bg: "bg-info-soft/30",
      border: "border-info/20",
      text: "text-info",
      iconBg: "bg-info/10",
      iconColor: "text-info",
    },
  }[config.color];

  // Specific context formatting for invalid-domain role parameter
  let descriptionText: string = config.description;
  if (type === "invalid-domain") {
    const roleParam =
      typeof resolvedSearchParams?.role === "string" ? resolvedSearchParams.role : undefined;
    if (roleParam) {
      const displayRole = roleParam.replace("-", " ").toUpperCase();
      descriptionText = `The ${displayRole} role requires signing in with an official ACD institutional email address.`;
    }
  }

  return (
    <div className="relative z-10 mx-auto w-full max-w-md p-4">
      {/* Header Section */}
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-5 flex items-center gap-4">
          <Image
            src="/logos/acd-logo.png"
            alt="Assumption College of Davao Logo"
            width={48}
            height={48}
            className="shrink-0 object-contain"
          />
          <Image
            src="/logos/cloie-logo.png"
            alt="CLOIE Logo"
            width={486}
            height={513}
            className="h-12 w-auto shrink-0 object-contain"
            priority
          />
        </div>
        <h1 className="text-heading-xl text-primary font-bold tracking-tight">System CLOIE</h1>
        <p className="text-label-sm text-muted-foreground mt-1 tracking-wider uppercase">
          Access Status
        </p>
      </div>

      {/* Main Status Card */}
      <Card className="border-border bg-surface overflow-hidden border shadow-sm">
        {/* Color accent bar at the top */}
        <div
          className={`h-1.5 w-full ${config.color === "danger" ? "bg-danger" : config.color === "warning" ? "bg-warning" : "bg-info"}`}
        />

        <CardHeader className="space-y-4 pt-8 pb-6 text-center">
          <div className="flex justify-center">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full ${colorMap.iconBg}`}
            >
              <Icon className={`size-7 ${colorMap.iconColor}`} />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-heading-lg text-foreground font-bold">
              {config.title}
            </CardTitle>
            <CardDescription className="text-body-md text-muted-foreground px-2">
              {descriptionText}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pb-8">
          <div className="bg-muted/50 border-border text-body-sm text-muted-foreground rounded-lg border p-4 leading-relaxed">
            {config.details}
          </div>

          <div className="flex flex-col gap-3 pt-2">
            {config.showRetry && (
              <Button
                render={<Link href="/portal/respondents" />}
                className="w-full"
                variant="default"
              >
                <ArrowLeft className="mr-2 size-4" />
                Back to Role Selection
              </Button>
            )}

            <form action="/api/auth/logout" method="post" className="w-full">
              <Button
                type="submit"
                variant="outline"
                className="hover:bg-danger-soft hover:text-danger hover:border-danger/30 w-full transition-all duration-200"
              >
                <LogOut className="mr-2 size-4" />
                Sign Out of Account
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Help Footer */}
      <p className="text-body-sm text-muted-foreground mt-6 text-center">
        Need assistance?{" "}
        <a
          href="mailto:support@acdeducation.com"
          className="text-primary hover:text-primary-hover focus-visible:ring-primary rounded font-medium underline-offset-2 transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Contact IT Support
        </a>
      </p>
    </div>
  );
}

import { ROLES, type Role } from "@/lib/constants/roles";
import type { ProfileGate } from "@/features/users/services/resolve-profile-gate";

type DestinationInput = {
  requestedPath?: string | null;
  intent?: string | null;
  activeRole: Role | null;
  profileGate: ProfileGate;
};

function sanitizeRequestedPath(requestedPath?: string | null): string | null {
  if (!requestedPath || requestedPath === "/dashboard") {
    return null;
  }

  if (!requestedPath.startsWith("/") || requestedPath.startsWith("//")) {
    return null;
  }

  if (/[\u0000-\u001F\u007F\\]/.test(requestedPath)) {
    return null;
  }

  return requestedPath;
}

export function resolvePostLoginDestination({
  requestedPath,
  intent,
  activeRole,
  profileGate,
}: DestinationInput): string {
  const sanitizedRequestedPath = sanitizeRequestedPath(requestedPath);

  if (profileGate.status === "INACTIVE") {
    return "/status/inactive";
  }

  if (profileGate.status === "REJECTED_EXTERNAL_ACCOUNT") {
    return "/status/rejected";
  }

  if (profileGate.status === "DEFERRED_ENROLLMENT") {
    return "/student/dashboard";
  }

  if (profileGate.status === "ROLE_SELECTION_REQUIRED") {
    if (intent === "alumni") {
      return "/onboarding?intent=alumni";
    }
    if (intent === "industry-partner" || intent === "industry_partner") {
      return "/onboarding?intent=industry-partner";
    }
    if (intent === "faculty") {
      return "/onboarding?intent=faculty";
    }
    return "/onboarding?intent=student";
  }

  if (profileGate.status === "STUDENT_ONBOARDING_REQUIRED") {
    return "/onboarding?intent=student";
  }

  if (profileGate.status === "FACULTY_ONBOARDING_REQUIRED") {
    return "/onboarding?intent=faculty";
  }

  if (profileGate.status === "ALUMNI_ONBOARDING_REQUIRED") {
    return "/onboarding?intent=alumni";
  }

  if (profileGate.status === "INDUSTRY_PARTNER_ONBOARDING_REQUIRED") {
    return "/onboarding?intent=industry-partner";
  }

  if (sanitizedRequestedPath && !sanitizedRequestedPath.startsWith("/onboarding")) {
    return sanitizedRequestedPath;
  }

  switch (activeRole) {
    case ROLES.SECRETARY:
      return "/secretary/dashboard";
    case ROLES.DEAN:
      return "/dean/dashboard";
    case ROLES.PROGRAM_HEAD:
      return "/program-head/dashboard";
    case ROLES.FACULTY:
      return "/faculty/dashboard";
    case ROLES.STUDENT:
      return "/student/dashboard";
    case ROLES.ALUMNI:
      return "/alumni/dashboard";
    case ROLES.INDUSTRY_PARTNER:
      return "/industry-partner/dashboard";
    case ROLES.GEN_ED_COORDINATOR:
      return "/gen-ed-coordinator/dashboard";
    default:
      return "/dashboard";
  }
}

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

  if (profileGate.status === "FACULTY_APPROVAL_PENDING") {
    return "/status/faculty-pending";
  }

  if (profileGate.status === "FACULTY_REQUEST_REJECTED") {
    return "/status/faculty-rejected";
  }

  if (profileGate.status === "AUTH_METHOD_MISMATCH") {
    return "/status/method-mismatch";
  }

  if (profileGate.status === "DEFERRED_ENROLLMENT") {
    return "/student/dashboard";
  }

  if (profileGate.status === "ROLE_SELECTION_REQUIRED") {
    // A role-less account must make a deliberate choice. Student is
    // Secretary-provisioned only (issue #649), so a role-less Student sign-in
    // resolves to the unprovisioned status instead of a self-service form, and
    // every unrecognised entry intent returns to the entrances rather than
    // defaulting into any role's onboarding.
    if (intent === "student") {
      return "/status/unprovisioned-student";
    }
    if (intent === "faculty") {
      return "/register/faculty";
    }
    if (intent === "alumni") {
      return "/onboarding?intent=alumni";
    }
    if (intent === "industry-partner" || intent === "industry_partner") {
      return "/onboarding?intent=industry-partner";
    }
    return "/";
  }

  if (profileGate.status === "STUDENT_PLACEMENT_REQUIRED") {
    // Student placement is institution-recorded (issue #649): there is no
    // self-service placement form to route to, so the account receives the
    // same Secretary-guidance status an unprovisioned Student sees.
    return "/status/unprovisioned-student";
  }

  if (profileGate.status === "FACULTY_ONBOARDING_REQUIRED") {
    // Faculty scope is institutional: the only self-service step is the
    // explicit registration request, so an affiliation-less Faculty role is
    // routed there rather than to a placement form (issue #649).
    return "/register/faculty";
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

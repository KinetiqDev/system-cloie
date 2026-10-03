import type { Role } from "@/lib/constants/roles";

export function ensureRoleAccess(input: {
  activeRole: Role | null;
  allowedRoles: Role[];
  unauthorizedPath?: string;
}): string | null {
  if (!input.activeRole) {
    return "/";
  }

  if (input.allowedRoles.includes(input.activeRole)) {
    return null;
  }

  return input.unauthorizedPath ?? "/unauthorized";
}

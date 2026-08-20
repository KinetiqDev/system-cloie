import { SystemRole } from "@prisma/client";

export const ROLES = SystemRole;

export type Role = SystemRole;

// Hierarchy for simple role-based UI access where logical
export const ROLE_LEVELS: Record<Role, number> = {
  [SystemRole.SECRETARY]: 100,
  [SystemRole.DEAN]: 80,
  [SystemRole.PROGRAM_HEAD]: 70,
  [SystemRole.FACULTY]: 50,
  [SystemRole.STUDENT]: 10,
  [SystemRole.ALUMNI]: 20,
  [SystemRole.INDUSTRY_PARTNER]: 30,
  [SystemRole.GEN_ED_COORDINATOR]: 75,
};

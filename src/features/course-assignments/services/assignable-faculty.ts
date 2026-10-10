import { FacultyApprovalStatus, Prisma } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";

export const assignableFacultyWhere = {
  is_active: true,
  roles: { some: { role: ROLES.FACULTY } },
  OR: [
    { faculty_access_request_owned: { is: null } },
    { faculty_access_request_owned: { is: { status: FacultyApprovalStatus.APPROVED } } },
  ],
} satisfies Prisma.UserWhereInput;

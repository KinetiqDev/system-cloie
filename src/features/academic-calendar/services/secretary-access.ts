import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import type { ServiceResult } from "@/lib/utils/service-result";

/** Academic calendar writes belong to the Secretary's *active* role (ADR 0022). */
export async function verifySecretaryAccess(): Promise<ServiceResult<{ userId: string }>> {
  const session = await resolveAuthSession();

  if (!session || session.activeRole !== ROLES.SECRETARY) {
    return { success: false, error: "Secretary access required" };
  }

  return { success: true, data: { userId: session.userId } };
}

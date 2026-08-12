import { prisma } from "@/lib/db/prisma";
import type { UpdateUserBySecretaryInput } from "../schemas/update-user";
import { type ServiceResult } from "@/lib/utils/service-result";

export async function updateUserBySecretary(input: UpdateUserBySecretaryInput): Promise<ServiceResult> {
  const { id, name } = input;

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return { success: false, error: "User not found." };
  }

  await prisma.user.update({
    where: { id },
    data: {
      name,
    },
  });

  return { success: true, data: undefined };
}

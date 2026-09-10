import { BackLink } from "@/components/ui/back-link";
import { prisma } from "@/lib/db/prisma";
import { AddUserForm } from "@/features/users/components/secretary-add-user-form";
import { createUserBySecretaryAction } from "@/lib/actions/secretary-user-crud-actions";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("New User", "Secretary") };

export default async function AddNewUserPage() {
  const programs = await prisma.program.findMany({
    where: { is_active: true },
    include: {
      majors: { where: { is_active: true }, orderBy: { name: "asc" } },
    },
    orderBy: { code: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/secretary/users">Back to Users</BackLink>

      <nav className="text-text-muted text-xs">User &gt; Add New User</nav>

      <AddUserForm programs={programs} createAction={createUserBySecretaryAction} />
    </div>
  );
}

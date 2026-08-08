import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { AddUserForm } from "@/features/users/components/secretary-add-user-form";
import { createUserBySecretaryAction } from "@/lib/actions/secretary-user-crud-actions";

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
      <Link
        href="/secretary/users"
        className="text-link inline-flex items-center gap-2 text-sm font-medium hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      <nav className="text-text-muted text-xs">User &gt; Add New User</nav>

      <AddUserForm programs={programs} createAction={createUserBySecretaryAction} />
    </div>
  );
}

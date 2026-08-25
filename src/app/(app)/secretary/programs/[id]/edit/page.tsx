import { notFound } from "next/navigation";
import Link from "next/link";
import { getProgram } from "@/features/academic-structure/services/manage-programs";
import { updateProgramAction } from "@/lib/actions/admin-program-actions";
import { ProgramForm } from "@/features/academic-structure/components/program-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProgramPage({ params }: Props) {
  const { id } = await params;
  const program = await getProgram(id);

  if (!program) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <Link href="/secretary/programs" className={buttonVariants({ variant: "outline", size: "sm" })}>
          ← Back
        </Link>
        <div className="min-w-0">
          <h1 className="text-heading-lg">Edit: {program.code}</h1>
          <p className="text-body-sm text-text-secondary truncate">{program.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Program Details</CardTitle>
          <CardDescription>Update the program code or name.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProgramForm
            action={updateProgramAction}
            defaultValues={{
              id: program.id,
              code: program.code,
              name: program.name,
            }}
            submitLabel="Update Program"
          />
        </CardContent>
      </Card>
    </div>
  );
}

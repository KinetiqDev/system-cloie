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

export default async function DeanEditProgramPage({ params }: Props) {
  const { id } = await params;
  const program = await getProgram(id);

  if (!program) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dean/programs" className={buttonVariants({ variant: "outline", size: "sm" })}>
          ← Back to Programs
        </Link>
        <div>
          <h1 className="text-heading-lg">Edit Program: {program.code}</h1>
          <p className="text-body-md text-text-secondary">{program.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Program Details</CardTitle>
          <CardDescription>Update the program code, name, or description.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProgramForm
            action={updateProgramAction}
            defaultValues={{
              id: program.id,
              code: program.code,
              name: program.name,
              description: program.description,
            }}
            submitLabel="Update Program"
          />
        </CardContent>
      </Card>
    </div>
  );
}

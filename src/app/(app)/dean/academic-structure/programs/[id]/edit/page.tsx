import { notFound } from "next/navigation";
import Link from "next/link";
import { getProgram } from "@/features/academic-structure/services/manage-programs";
import { updateProgramAction } from "@/lib/actions/admin-program-actions";
import { ProgramForm } from "@/features/academic-structure/components/program-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DeanEditProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const program = await getProgram((await params).id);
  if (!program) notFound();
  return (
    <div className="space-y-6">
      <Link
        href="/dean/academic-structure/programs"
        className="text-primary inline-flex min-h-11 items-center"
      >
        Back to Programs
      </Link>
      <h1 className="text-heading-lg">Edit Program: {program.code}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Program Details</CardTitle>
          <CardDescription>Update program details.</CardDescription>
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

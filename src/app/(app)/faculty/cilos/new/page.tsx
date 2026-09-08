import { redirect } from "next/navigation";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { listFacultyCoursesWithCilos } from "@/features/evaluations/services/list-faculty-courses-with-cilos";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AddCiloForm } from "./add-cilo-form";
import {
  loadCilosForCourseAction,
  saveCilosForCourseAction,
} from "@/lib/actions/faculty-cilo-actions";

export const metadata = {
  title: "Add CILOs | Faculty | CLOIE",
};

export default async function FacultyAddCiloPage({
  searchParams,
}: {
  searchParams?: Promise<{ course?: string; returnTo?: string }>;
}) {
  const session = await resolveAuthSession();

  if (!session) {
    redirect("/portal/respondents");
  }

  const params = (await searchParams) ?? {};
  const returnTo =
    params.returnTo && params.returnTo.startsWith("/faculty/cilos") ? params.returnTo : undefined;
  const result = await listFacultyCoursesWithCilos();

  if (!result.success) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <h1 className="text-heading-lg">Add New CILO</h1>
        <Alert variant="destructive">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <AddCiloForm
      courses={JSON.parse(JSON.stringify(result.data.courses))}
      initialCourseId={params.course}
      returnTo={returnTo}
      saveAction={saveCilosForCourseAction}
      loadCilosAction={loadCilosForCourseAction}
    />
  );
}

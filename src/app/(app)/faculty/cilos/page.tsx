import { redirect } from "next/navigation";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { listFacultyCoursesWithCilos } from "@/features/evaluations/services/list-faculty-courses-with-cilos";
import { listSchoolYears } from "@/features/academic-calendar/services/list-school-years";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FacultyCilosCourseList } from "@/features/evaluations/components/faculty-cilos-course-list";
import {
  loadCilosForCourseAction,
  saveCilosForCourseAction,
} from "@/lib/actions/faculty-cilo-actions";

interface FacultyCilosPageProps {
  searchParams: Promise<{ term?: string }>;
}

export default async function FacultyCilosPage({ searchParams }: FacultyCilosPageProps) {
  const session = await resolveAuthSession();
  const { term: termInstanceId } = await searchParams;

  if (!session) {
    redirect("/portal/respondents");
  }

  // Fetch courses (optionally filtered by term) and term instances
  const [coursesResult, schoolYearsResult] = await Promise.all([
    listFacultyCoursesWithCilos(termInstanceId),
    listSchoolYears(),
  ]);

  if (!coursesResult.success) {
    return (
      <div className="space-y-4">
        <h1 className="text-heading-lg">Manage CILOs</h1>
        <Alert variant="destructive">
          <AlertDescription>{coursesResult.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Flatten term instances from all school years
  const termInstances = schoolYearsResult.items.flatMap((sy) => sy.termInstances);

  return (
    <FacultyCilosCourseList
      courses={JSON.parse(JSON.stringify(coursesResult.data.courses))}
      termInstances={termInstances}
      selectedTermId={termInstanceId}
      loadCilosAction={loadCilosForCourseAction}
      saveCilosAction={saveCilosForCourseAction}
    />
  );
}

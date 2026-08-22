import { redirect } from "next/navigation";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { getActiveTermId } from "@/features/academic-calendar/services/resolve-active-term";
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

// fallow-ignore-next-line complexity
export default async function FacultyCilosPage({ searchParams }: FacultyCilosPageProps) {
  const session = await resolveAuthSession();
  const { term: termInstanceId } = await searchParams;

  if (!session) {
    redirect("/portal/respondents");
  }

  // When no term is explicitly chosen, default the filter to the current
  // active academic context so faculty see the period they are working in.
  const activeTermId = await getActiveTermId();
  const effectiveTermInstanceId = termInstanceId || activeTermId || undefined;

  // Fetch courses (optionally filtered by term) and term instances
  const [coursesResult, schoolYearsResult] = await Promise.all([
    listFacultyCoursesWithCilos(effectiveTermInstanceId),
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
      selectedTermId={effectiveTermInstanceId}
      loadCilosAction={loadCilosForCourseAction}
      saveCilosAction={saveCilosForCourseAction}
    />
  );
}

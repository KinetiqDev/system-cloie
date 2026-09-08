"use client";

import { BackLink } from "@/components/ui/back-link";
import { CalendarStructureView } from "@/features/academic-calendar/components/calendar-structure-view";
import type { SchoolYearWithTerms } from "@/features/academic-calendar/types";

interface SchoolYearDetailClientPageProps {
  schoolYear: SchoolYearWithTerms;
}

export function SchoolYearDetailClientPage({
  schoolYear,
}: SchoolYearDetailClientPageProps) {

  return (
    <div className="container mx-auto py-6">
      <BackLink href="/secretary/school-years">Back to School Years</BackLink>

      <CalendarStructureView schoolYears={[schoolYear]} />
    </div>
  );
}

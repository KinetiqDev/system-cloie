"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CalendarStructureView } from "@/features/academic-calendar/components/calendar-structure-view";
import type { SchoolYearWithTerms } from "@/features/academic-calendar/types";

interface SchoolYearDetailClientPageProps {
  schoolYear: SchoolYearWithTerms;
}

export function SchoolYearDetailClientPage({
  schoolYear,
}: SchoolYearDetailClientPageProps) {
  const router = useRouter();

  return (
    <div className="container mx-auto py-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/secretary/school-years")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to School Years
      </Button>

      <CalendarStructureView schoolYears={[schoolYear]} />
    </div>
  );
}

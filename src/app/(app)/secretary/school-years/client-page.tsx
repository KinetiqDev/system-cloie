"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CalendarStructureView } from "@/features/academic-calendar/components/calendar-structure-view";
import { SchoolYearForm } from "@/features/academic-calendar/components/school-year-form";
import type { SchoolYearWithTerms } from "@/features/academic-calendar/types";

interface SchoolYearsClientPageProps {
  initialData: SchoolYearWithTerms[];
}

export function SchoolYearsClientPage({ initialData }: SchoolYearsClientPageProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">School Years</h1>
          <p className="text-muted-foreground mt-1">
            Manage academic years, semesters, and their terms
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create School Year
        </Button>
      </div>

      <SchoolYearForm
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => setOpen(false)}
      />

      <CalendarStructureView schoolYears={initialData} />
    </div>
  );
}

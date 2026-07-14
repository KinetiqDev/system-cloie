"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Archive, CheckCircle } from "lucide-react";
import { formatDateRange } from "@/lib/utils/date-format";
import { getSemesterLabel, getTermLabel } from "@/lib/constants/academic";
import { TermInstanceForm } from "@/features/academic-calendar/components/term-instance-form";
import { SetActiveTermDialog } from "@/features/academic-calendar/components/set-active-term-dialog";
import type { SchoolYearWithTerms, TermInstanceItem } from "@/features/academic-calendar/types";

interface SchoolYearDetailClientPageProps {
  schoolYear: SchoolYearWithTerms;
}

export function SchoolYearDetailClientPage({
  schoolYear,
}: SchoolYearDetailClientPageProps) {
  const router = useRouter();
  const [addingTerm, setAddingTerm] = useState(false);
  const [settingActiveTerm, setSettingActiveTerm] = useState<TermInstanceItem | null>(null);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/secretary/school-years")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to School Years
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{schoolYear.code}</h1>
              {schoolYear.isArchived && (
                <Badge variant="secondary">
                  <Archive className="mr-1 h-3 w-3" />
                  Archived
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {formatDateRange(schoolYear.startDate, schoolYear.endDate)}
            </p>
          </div>
          {!schoolYear.isArchived && (
            <Button onClick={() => setAddingTerm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Term Instance
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Term Instances</CardTitle>
        </CardHeader>
        <CardContent>
          {schoolYear.termInstances.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <p>No term instances yet.</p>
              {!schoolYear.isArchived && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setAddingTerm(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Term
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Semester</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schoolYear.termInstances.map((term) => (
                  <TableRow key={term.id}>
                    <TableCell>{getSemesterLabel(term.semester)}</TableCell>
                    <TableCell>{term.term ? getTermLabel(term.term) : "—"}</TableCell>
                    <TableCell>
                      {term.status === "ACTIVE" ? (
                        <Badge variant="default">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDateRange(term.startDate, term.endDate)}
                    </TableCell>
                    <TableCell>
                      {!term.status === "ACTIVE" && !schoolYear.isArchived && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSettingActiveTerm(term)}
                        >
                          Set Active
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {addingTerm && (
        <TermInstanceForm
          open={addingTerm}
          onOpenChange={setAddingTerm}
          schoolYearId={schoolYear.id}
          schoolYearCode={schoolYear.code}
          onSuccess={() => setAddingTerm(false)}
        />
      )}

      {settingActiveTerm && (
        <SetActiveTermDialog
          open={!!settingActiveTerm}
          onOpenChange={(open: boolean) => !open && setSettingActiveTerm(null)}
          termInstance={settingActiveTerm}
          onSuccess={() => setSettingActiveTerm(null)}
        />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AcademicPeriodStatus, AcademicSemester } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Archive, CalendarClock, CheckCircle2, Play, Power, PowerOff, XCircle } from "lucide-react";
import { formatDateRange } from "@/lib/utils/date-format";
import { SEMESTER_OPTIONS, getSemesterLabel, getTermLabel } from "@/lib/constants/academic";
import {
  activateSchoolYearAction,
  archiveSchoolYearAction,
  deactivateSchoolYearAction,
  setActiveSemesterAction,
  transitionPeriodStatusAction,
} from "@/lib/actions/secretary-school-year-actions";
import { showToast } from "@/components/ui/toast";
import { SetActiveTermDialog } from "./set-active-term-dialog";
import type { SchoolYearWithTerms, TermInstanceItem } from "../types";

const SEMESTER_ORDER: AcademicSemester[] = [AcademicSemester.FIRST, AcademicSemester.SECOND, AcademicSemester.SUMMER];

const STATUS_BADGE_VARIANT: Record<AcademicPeriodStatus, "outline" | "success" | "secondary" | "destructive"> = {
  PLANNED: "outline",
  ACTIVE: "success",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

function termLabel(term: TermInstanceItem["term"]): string {
  return term ? getTermLabel(term) : "Summer";
}

interface CalendarStructureViewProps {
  schoolYears: SchoolYearWithTerms[];
}

/**
 * Fixed structural calendar view: School Year -> Semester -> Term hierarchy
 * with lifecycle action buttons per state. Receives serialized data from a
 * Server Component page; every mutation runs through the Secretary lifecycle
 * server actions and refreshes the read model via router.refresh().
 */
export function CalendarStructureView({ schoolYears }: CalendarStructureViewProps) {
  const router = useRouter();
  const [settingActiveTerm, setSettingActiveTerm] = useState<TermInstanceItem | null>(null);
  const [semesterDialog, setSemesterDialog] = useState<{
    schoolYearId: string;
    title: string;
    initialSemester: AcademicSemester;
    onSubmit: (semester: AcademicSemester) => Promise<{ success: boolean; error?: string }>;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ yearId: string; message: string } | null>(null);

  async function runAction(
    yearId: string,
    key: string,
    action: () => Promise<{ success: boolean; error?: string }>
  ) {
    setPendingAction(key);
    setActionError(null);
    try {
      const result = await action();
      if (result.success) {
        router.refresh();
      } else {
        setActionError({ yearId, message: result.error ?? "Action failed" });
        showToast(result.error ?? "Action failed", "error");
      }
    } catch {
      setActionError({ yearId, message: "Action failed; please try again" });
      showToast("Action failed; please try again", "error");
    } finally {
      setPendingAction(null);
    }
  }

  function openSemesterDialog(
    schoolYearId: string,
    initialSemester: AcademicSemester,
    title: string,
    onSubmit: (semester: AcademicSemester) => Promise<{ success: boolean; error?: string }>
  ) {
    setActionError(null);
    setSemesterDialog({ schoolYearId, title, initialSemester, onSubmit });
  }

  if (schoolYears.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border bg-card p-8 text-center text-sm">
        No school years yet. Create one to start building the academic calendar.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {schoolYears.map((year) => {
        const errorFor = actionError?.yearId === year.id ? actionError.message : null;

        return (
          <SchoolYearCard
            key={year.id}
            year={year}
            pendingAction={pendingAction}
            actionError={errorFor}
            onActivate={() =>
            openSemesterDialog(
              year.id,
              AcademicSemester.FIRST,
              "Activate School Year",
              async (semester) => {
                const formData = new FormData();
                formData.append("id", year.id);
                formData.append("semester", semester);
                return activateSchoolYearAction(formData);
              }
            )
          }
          onDeactivate={() =>
            runAction(year.id, `deactivate:${year.id}`, async () => {
              const formData = new FormData();
              formData.append("id", year.id);
              return deactivateSchoolYearAction(formData);
            })
          }
          onArchive={() =>
            runAction(year.id, `archive:${year.id}`, async () => {
              const formData = new FormData();
              formData.append("id", year.id);
              return archiveSchoolYearAction(formData);
            })
          }
          onSetSemester={(semester) =>
            runAction(year.id, `semester:${year.id}`, async () => {
              const formData = new FormData();
              formData.append("schoolYearId", year.id);
              formData.append("semester", semester);
              return setActiveSemesterAction(formData);
            })
          }
          onMakeActive={(term) => setSettingActiveTerm(term)}
          onComplete={(termId) =>
            runAction(year.id, `complete:${termId}`, async () => {
              const formData = new FormData();
              formData.append("periodId", termId);
              formData.append("target", "COMPLETED");
              return transitionPeriodStatusAction(formData);
            })
          }
          onCancel={(termId) =>
            runAction(year.id, `cancel:${termId}`, async () => {
              const formData = new FormData();
              formData.append("periodId", termId);
              formData.append("target", "CANCELLED");
              return transitionPeriodStatusAction(formData);
            })
          }
          />
        );
      })}

      {settingActiveTerm && (
        <SetActiveTermDialog
          open={!!settingActiveTerm}
          onOpenChange={(open: boolean) => !open && setSettingActiveTerm(null)}
          termInstance={settingActiveTerm}
          onSuccess={() => {
            setSettingActiveTerm(null);
            router.refresh();
          }}
        />
      )}

      {semesterDialog && (
        <SemesterSelectionDialog
          open={!!semesterDialog}
          onOpenChange={(open: boolean) => !open && setSemesterDialog(null)}
          title={semesterDialog.title}
          initialSemester={semesterDialog.initialSemester}
          onSubmit={async (semester) => {
            const result = await semesterDialog.onSubmit(semester);
            if (result.success) {
              setSemesterDialog(null);
              showToast("School year updated", "success");
              router.refresh();
            }
            return result;
          }}
        />
      )}
    </div>
  );
}

interface SchoolYearCardProps {
  year: SchoolYearWithTerms;
  pendingAction: string | null;
  actionError: string | null;
  onActivate: () => void;
  onDeactivate: () => void;
  onArchive: () => void;
  onSetSemester: (semester: AcademicSemester) => void;
  onMakeActive: (term: TermInstanceItem) => void;
  onComplete: (termId: string) => void;
  onCancel: (termId: string) => void;
}

function SchoolYearCard({
  year,
  pendingAction,
  actionError,
  onActivate,
  onDeactivate,
  onArchive,
  onSetSemester,
  onMakeActive,
  onComplete,
  onCancel,
}: SchoolYearCardProps) {
  const archived = year.isArchived;
  const busy = pendingAction !== null;

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">{year.code}</span>
          {year.isActive && !archived && <Badge variant="success">Active</Badge>}
          {archived && <Badge variant="secondary">Archived</Badge>}
          <span className="text-muted-foreground text-sm">
            {formatDateRange(year.startDate, year.endDate)}
          </span>
        </div>

        <SchoolYearHeaderActions
          yearId={year.id}
          isActive={year.isActive}
          archived={archived}
          busy={busy}
          pendingAction={pendingAction}
          onActivate={onActivate}
          onDeactivate={onDeactivate}
          onArchive={onArchive}
        />
      </div>

      {actionError && (
        <div className="border-t px-4 py-3">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="border-t">
        {SEMESTER_ORDER.map((semester) => (
          <SemesterSection
            key={semester}
            semester={semester}
            terms={year.termInstances.filter((t) => t.semester === semester)}
            isActiveSemester={year.isActive && year.activeSemester === semester}
            yearActive={year.isActive}
            activeSemester={year.activeSemester}
            archived={archived}
            busy={busy}
            pendingSemesterKey={pendingAction === `semester:${year.id}`}
            onSetSemester={onSetSemester}
            onMakeActive={onMakeActive}
            onComplete={onComplete}
            onCancel={onCancel}
          />
        ))}
      </div>
    </div>
  );
}

interface SchoolYearHeaderActionsProps {
  yearId: string;
  isActive: boolean;
  archived: boolean;
  busy: boolean;
  pendingAction: string | null;
  onActivate: () => void;
  onDeactivate: () => void;
  onArchive: () => void;
}

function SchoolYearHeaderActions({
  yearId,
  isActive,
  archived,
  busy,
  pendingAction,
  onActivate,
  onDeactivate,
  onArchive,
}: SchoolYearHeaderActionsProps) {
  if (archived) {
    return null;
  }

  if (isActive) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onDeactivate}
        disabled={busy || pendingAction === `deactivate:${yearId}`}
      >
        <PowerOff className="mr-1 h-3.5 w-3.5" />
        Deactivate
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={onActivate} disabled={busy}>
        <Power className="mr-1 h-3.5 w-3.5" />
        Activate
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onArchive}
        disabled={busy || pendingAction === `archive:${yearId}`}
      >
        <Archive className="mr-1 h-3.5 w-3.5" />
        Archive
      </Button>
    </div>
  );
}

interface SemesterSectionProps {
  semester: AcademicSemester;
  terms: TermInstanceItem[];
  isActiveSemester: boolean;
  yearActive: boolean;
  activeSemester: AcademicSemester | null;
  archived: boolean;
  busy: boolean;
  pendingSemesterKey: boolean;
  onSetSemester: (semester: AcademicSemester) => void;
  onMakeActive: (term: TermInstanceItem) => void;
  onComplete: (termId: string) => void;
  onCancel: (termId: string) => void;
}

function SemesterSection({
  semester,
  terms,
  isActiveSemester,
  yearActive,
  activeSemester,
  archived,
  busy,
  pendingSemesterKey,
  onSetSemester,
  onMakeActive,
  onComplete,
  onCancel,
}: SemesterSectionProps) {
  return (
    <div className="border-b last:border-b-0">
      <div className="flex items-center justify-between bg-muted/50 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm">{getSemesterLabel(semester)}</span>
          {isActiveSemester && <Badge variant="success">Active semester</Badge>}
        </div>
        {yearActive && !archived && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSetSemester(semester)}
            disabled={busy || pendingSemesterKey}
          >
            <CalendarClock className="mr-1 h-3.5 w-3.5" />
            Set Active Semester
          </Button>
        )}
      </div>

      {terms.length === 0 ? (
        <div className="text-muted-foreground px-4 py-2 text-sm">No terms in this semester.</div>
      ) : (
        terms.map((term) => (
          <div key={term.id} className="flex items-center justify-between gap-3 px-4 py-2 pl-10">
            <div className="flex items-center gap-3">
              <span className="text-sm">{termLabel(term.term)}</span>
              <Badge variant={STATUS_BADGE_VARIANT[term.status]}>{term.status}</Badge>
            </div>
            <TermActions
              term={term}
              canActivate={yearActive && activeSemester === term.semester}
              archived={archived}
              busy={busy}
              onMakeActive={onMakeActive}
              onComplete={onComplete}
              onCancel={onCancel}
            />
          </div>
        ))
      )}
    </div>
  );
}

interface TermActionsProps {
  term: TermInstanceItem;
  canActivate: boolean;
  archived: boolean;
  busy: boolean;
  onMakeActive: (term: TermInstanceItem) => void;
  onComplete: (termId: string) => void;
  onCancel: (termId: string) => void;
}

function TermActions({
  term,
  canActivate,
  archived,
  busy,
  onMakeActive,
  onComplete,
  onCancel,
}: TermActionsProps) {
  if (archived || term.status === "COMPLETED" || term.status === "CANCELLED") {
    return null;
  }

  // The lifecycle service rejects activation outside the active hierarchy
  // (School Year active + semester matching the active semester), so the
  // action is only offered when that hierarchy already permits it.
  if (term.status === "PLANNED") {
    if (!canActivate) {
      return null;
    }
    return (
      <Button variant="outline" size="sm" onClick={() => onMakeActive(term)} disabled={busy}>
        <Play className="mr-1 h-3.5 w-3.5" />
        Make Active
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => onComplete(term.id)} disabled={busy}>
        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
        Complete
      </Button>
      <Button variant="outline" size="sm" onClick={() => onCancel(term.id)} disabled={busy}>
        <XCircle className="mr-1 h-3.5 w-3.5" />
        Cancel
      </Button>
    </div>
  );
}

interface SemesterSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialSemester: AcademicSemester;
  onSubmit: (semester: AcademicSemester) => Promise<{ success: boolean; error?: string }>;
}

function SemesterSelectionDialog({
  open,
  onOpenChange,
  title,
  initialSemester,
  onSubmit,
}: SemesterSelectionDialogProps) {
  const [semester, setSemester] = useState<AcademicSemester>(initialSemester);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await onSubmit(semester);
      if (!result.success) {
        setError(result.error ?? "Action failed");
        setIsSubmitting(false);
        return;
      }
    } catch {
      setError("Action failed; please try again");
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Choose the semester that will be active in this school year.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="semester-select">Semester</Label>
            <Select value={semester} onValueChange={(value) => setSemester(value as AcademicSemester)}>
              <SelectTrigger id="semester-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEMESTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} loading={isSubmitting}>
            {isSubmitting ? "Saving…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { SystemRole, YearLevel, StudentSection, VerificationStatus } from "@prisma/client";
import { Loader2, Mail, LockKeyhole, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showToast } from "@/components/ui/toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  editUserBySecretaryAction,
  getUserEditRecordAction,
} from "@/lib/actions/secretary-edit-user-actions";
import { formatRole, getRoleBadgeClass } from "@/features/users/lib/role-visuals";
import type { SecretaryUserEditRecord } from "@/features/users/services/get-user-edit-record";

function formatYearLevel(yl: YearLevel): string {
  return yl
    .replace("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatSection(sec: StudentSection): string {
  return sec.charAt(0).toUpperCase() + sec.slice(1).toLowerCase();
}

function formatVerificationStatus(status: VerificationStatus | null): string {
  return status ? status.charAt(0) + status.slice(1).toLowerCase() : "Not set";
}

function verificationEffect(status: VerificationStatus): string {
  if (status === VerificationStatus.APPROVED) return "Approved — normal dashboard access.";
  if (status === VerificationStatus.REJECTED) return "Rejected — dashboard access is blocked.";
  return "Pending — limited dashboard access until reviewed.";
}

const SECTION_OPTIONS: { label: string; value: StudentSection }[] = [
  { label: "Morning", value: "MORNING" },
  { label: "Afternoon", value: "AFTERNOON" },
  { label: "Evening", value: "EVENING" },
];

// Simple value classes for the selects whose current value can be short
// (year level, section, verification status): full width, no wrap handling.
const TRIGGER_FULL = "w-full";
// For selects whose current value can be a long program/major name:
// full width, auto height (defeats the primitive's data-[size=default]:h-8),
// and clamp disabled so the name wraps to multiple lines.
const TRIGGER_LONG = "w-full h-auto! min-h-8 pointer-coarse:min-h-11";
const VALUE_LONG = "whitespace-normal line-clamp-none!";
const ITEM_WRAP = "[&>span]:whitespace-normal";

function LockedChip() {
  return (
    <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 text-xs font-medium">
      <LockKeyhole className="size-3.5" aria-hidden="true" />
      Locked
    </span>
  );
}

interface EditUserDialogProps {
  userId: string | null;
  currentUserId: string;
  onClose: () => void;
  onUserUpdated: () => void;
  programs: Array<{
    id: string;
    code: string;
    name: string;
    isActive?: boolean;
    majors: Array<{ id: string; name: string; isActive?: boolean }>;
  }>;
  yearLevels: YearLevel[];
}

export function EditUserDialog({
  userId,
  currentUserId,
  onClose,
  onUserUpdated,
  programs,
  yearLevels,
}: EditUserDialogProps) {
  const open = userId !== null;
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) onClose();
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-4 overflow-hidden p-4 sm:max-w-lg">
          {userId && (
            <EditUserDialogBody
              userId={userId}
              currentUserId={currentUserId}
              onClose={onClose}
              onUserUpdated={onUserUpdated}
              programs={programs}
              yearLevels={yearLevels}
              surface="dialog"
            />
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} showSwipeHandle>
      <DrawerContent className="flex max-h-[88dvh] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        {userId && (
          <EditUserDialogBody
            userId={userId}
            currentUserId={currentUserId}
            onClose={onClose}
            onUserUpdated={onUserUpdated}
            programs={programs}
            yearLevels={yearLevels}
            surface="drawer"
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

interface EditUserDialogBodyProps {
  userId: string;
  currentUserId: string;
  onClose: () => void;
  onUserUpdated: () => void;
  programs: Array<{
    id: string;
    code: string;
    name: string;
    isActive?: boolean;
    majors: Array<{ id: string; name: string; isActive?: boolean }>;
  }>;
  yearLevels: YearLevel[];
  surface: "dialog" | "drawer";
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; record: SecretaryUserEditRecord }
  | { status: "error"; message: string };

function EditUserDialogBody({
  userId,
  currentUserId,
  onClose,
  onUserUpdated,
  programs,
  yearLevels,
  surface,
}: EditUserDialogBodyProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  // Base identity — opaque canonical account name
  const [name, setName] = useState("");

  // Student fields
  const [programId, setProgramId] = useState("");
  const [majorId, setMajorId] = useState<string | null>(null);
  const [yearLevel, setYearLevel] = useState<YearLevel | null>(null);
  const [section, setSection] = useState<StudentSection | null>(null);
  const [graduationYear, setGraduationYear] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");

  // Program Head assignment set (complete desired managed-Program set).
  const [programHeadProgramIds, setProgramHeadProgramIds] = useState<string[]>([]);

  // Confirmation state
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null);
  const [confirmationSummary, setConfirmationSummary] = useState<{
    profileChanged?: boolean;
    placementChanged?: boolean;
    facultyProgramChanged?: boolean;
    programHeadAssignmentChanged?: boolean;
    alumniChanged?: boolean;
    industryPartnerChanged?: boolean;
    oldValues: Record<string, string>;
    newValues: Record<string, string>;
  } | null>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();

  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === programId),
    [programs, programId]
  );

  const programHasMajors = selectedProgram && selectedProgram.majors.length > 0;
  const selectedProgramIsArchived = selectedProgram?.isActive === false;

  const handleProgramChange = (v: string | null) => {
    const val = v ?? "";
    setProgramId(val);

    // Clear major when program changes
    const newProgram = programs.find((p) => p.id === val);
    if (newProgram) {
      if (newProgram.majors.length === 0) {
        setMajorId(null);
      } else if (majorId && !newProgram.majors.some((m) => m.id === majorId)) {
        setMajorId(null);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await getUserEditRecordAction(userId);
      if (cancelled) return;
      if (!result.success) {
        setLoadState({ status: "error", message: result.error });
        return;
      }
      setName(result.data.name);

      if (result.data.role === SystemRole.STUDENT) {
        setProgramId(result.data.student?.programId ?? "");
        setMajorId(result.data.student?.majorId ?? null);
        setYearLevel((result.data.activeEnrollment?.yearLevel as YearLevel) ?? null);
        setSection((result.data.activeEnrollment?.section as StudentSection) ?? null);
      } else if (result.data.role === SystemRole.FACULTY) {
        setProgramId(result.data.faculty?.primaryProgramId ?? "");
        // Clear state that belongs to other role slices so stale IDs do not leak across user switches
        setMajorId(null);
        setYearLevel(null);
        setSection(null);
        setGraduationYear("");
        setVerificationStatus(null);
        setCompanyName("");
        setPosition("");
        setProgramHeadProgramIds([]);
        setConfirmationToken(null);
        setConfirmationSummary(null);
      } else if (result.data.role === SystemRole.PROGRAM_HEAD) {
        setProgramHeadProgramIds(
          (result.data.programHead?.assignments ?? []).map((assignment) => assignment.programId)
        );
      } else if (result.data.role === SystemRole.ALUMNI) {
        setProgramId(result.data.alumni?.programId ?? "");
        setMajorId(result.data.alumni?.majorId ?? null);
        setGraduationYear(result.data.alumni?.graduationYear?.toString() ?? "");
        setVerificationStatus(result.data.verification?.status ?? null);
      } else if (result.data.role === SystemRole.INDUSTRY_PARTNER) {
        setCompanyName(result.data.industryPartner?.companyName ?? "");
        setPosition(result.data.industryPartner?.position ?? "");
        setProgramId(result.data.industryPartner?.programId ?? "");
        setVerificationStatus(result.data.verification?.status ?? null);
      }

      setLoadState({ status: "ready", record: result.data });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (userId === currentUserId) {
      setSubmitError("Cannot edit your own account.");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSubmitError("Name is required.");
      return;
    }

    setSubmitError(null);
    const formData = new FormData();
    if (loadState.status !== "ready") return;

    formData.set("id", userId);
    formData.set("name", trimmedName);

    if (loadState.status === "ready" && loadState.record.role === SystemRole.STUDENT) {
      if (!programId) {
        setSubmitError("Program is required.");
        return;
      }
      if (programHasMajors && !majorId) {
        setSubmitError("Major is required for the selected program.");
        return;
      }

      const canEditPlacement = !!loadState.record.activeEnrollment;
      const hasYearLevel = !!yearLevel;
      const hasSection = !!section;
      if (hasYearLevel !== hasSection) {
        setSubmitError("Year level and section must be provided together if updating placement.");
        return;
      }

      formData.set("student.program_id", programId);
      if (majorId) formData.set("student.major_id", majorId);
      if (canEditPlacement && yearLevel) formData.set("student.year_level", yearLevel);
      if (canEditPlacement && section) formData.set("student.section", section);
    } else if (loadState.status === "ready" && loadState.record.role === SystemRole.FACULTY) {
      if (!programId) {
        setSubmitError("Primary program affiliation is required.");
        return;
      }
      formData.set("faculty.program_id", programId);
    } else if (loadState.status === "ready" && loadState.record.role === SystemRole.PROGRAM_HEAD) {
      // The complete desired set is submitted even when every checkbox is
      // unchecked, so a zero-active-assignment save is possible.
      formData.set("program_head.present", "1");
      for (const programId of programHeadProgramIds) {
        formData.append("program_head.program_ids", programId);
      }
    } else if (loadState.status === "ready" && loadState.record.role === SystemRole.ALUMNI) {
      const year = Number(graduationYear);
      if (!Number.isInteger(year) || year < 1950) {
        setSubmitError("Graduation year must be a whole number from 1950 onward.");
        return;
      }
      if (!programId) {
        setSubmitError("Program is required.");
        return;
      }
      if (!verificationStatus) {
        setSubmitError("Verification status must be selected.");
        return;
      }
      if (programHasMajors && !majorId) {
        setSubmitError("Major is required for the selected program.");
        return;
      }
      formData.set("alumni.graduation_year", String(year));
      formData.set("alumni.program_id", programId);
      if (majorId) formData.set("alumni.major_id", majorId);
      formData.set("alumni.verification_status", verificationStatus);
    } else if (
      loadState.status === "ready" &&
      loadState.record.role === SystemRole.INDUSTRY_PARTNER
    ) {
      if (!companyName.trim()) {
        setSubmitError("Organization name is required.");
        return;
      }
      if (!verificationStatus) {
        setSubmitError("Verification status must be selected.");
        return;
      }
      formData.set("industry_partner.company_name", companyName.trim());
      if (position.trim()) formData.set("industry_partner.position", position.trim());
      if (programId) formData.set("industry_partner.program_id", programId);
      formData.set("industry_partner.verification_status", verificationStatus);
    }

    if (confirmationToken) {
      formData.set("confirmationToken", confirmationToken);
    }

    const record = loadState.status === "ready" ? loadState.record : null;
    const label = record ? record.name : "User";

    startSubmit(async () => {
      const result = await editUserBySecretaryAction(formData);
      if (!result.success) {
        setSubmitError(result.error);
        return;
      }

      if (result.data?.protectedConfirmationRequired) {
        if (record?.role === SystemRole.STUDENT) {
          // Build summary
          const oldM = record?.student?.majorId;
          const newM = majorId;
          const oldYL = record?.activeEnrollment?.yearLevel;
          const newYL = yearLevel;
          const oldSec = record?.activeEnrollment?.section;
          const newSec = section;

          const profileChanged = !!(oldM !== newM);
          const placementChanged = !!(newYL && newSec && (oldYL !== newYL || oldSec !== newSec));

          setConfirmationToken(result.data.token!);
          setConfirmationSummary({
            profileChanged,
            placementChanged,
            oldValues: result.data.confirmationReview?.oldValues ?? {},
            newValues: result.data.confirmationReview?.newValues ?? {},
          });
        } else if (record?.role === SystemRole.FACULTY) {
          setConfirmationToken(result.data.token!);
          setConfirmationSummary({
            facultyProgramChanged: true,
            oldValues: result.data.confirmationReview?.oldValues ?? {},
            newValues: result.data.confirmationReview?.newValues ?? {},
          });
        } else if (record?.role === SystemRole.PROGRAM_HEAD) {
          setConfirmationToken(result.data.token!);
          setConfirmationSummary({
            programHeadAssignmentChanged: true,
            oldValues: result.data.confirmationReview?.oldValues ?? {},
            newValues: result.data.confirmationReview?.newValues ?? {},
          });
        } else if (record?.role === SystemRole.ALUMNI) {
          setConfirmationToken(result.data.token!);
          setConfirmationSummary({
            alumniChanged: true,
            oldValues: result.data.confirmationReview?.oldValues ?? {},
            newValues: result.data.confirmationReview?.newValues ?? {},
          });
        } else if (record?.role === SystemRole.INDUSTRY_PARTNER) {
          setConfirmationToken(result.data.token!);
          setConfirmationSummary({
            industryPartnerChanged: true,
            oldValues: result.data.confirmationReview?.oldValues ?? {},
            newValues: result.data.confirmationReview?.newValues ?? {},
          });
        }
        return;
      }

      showToast(`${label}'s information has been updated.`);
      onUserUpdated();
      onClose();
    });
  };

  const handleCancelConfirmation = () => {
    setConfirmationToken(null);
    setConfirmationSummary(null);
    setSubmitError(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {surface === "drawer" ? (
        <DrawerHeader className="shrink-0 px-0 pt-2 pb-4 text-left">
          <DrawerTitle>{confirmationToken ? "Confirm Changes" : "Edit User"}</DrawerTitle>
          <DrawerDescription>
            {confirmationToken
              ? "These fields are protected. Review each change before saving."
              : loadState.status === "ready"
                ? `Update details for ${loadState.record.name}.`
                : "Update the selected user's information."}
          </DrawerDescription>
        </DrawerHeader>
      ) : (
        <DialogHeader className="shrink-0">
          <DialogTitle>{confirmationToken ? "Confirm Changes" : "Edit User"}</DialogTitle>
          <DialogDescription>
            {confirmationToken
              ? "These fields are protected. Review each change before saving."
              : loadState.status === "ready"
                ? `Update details for ${loadState.record.name}.`
                : "Update the selected user's information."}
          </DialogDescription>
        </DialogHeader>
      )}

      {loadState.status === "loading" && (
        <div
          role="status"
          aria-live="polite"
          className="text-muted-foreground flex items-center gap-2 py-6 text-sm"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading user record…
        </div>
      )}

      {loadState.status === "error" && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{loadState.message}</AlertDescription>
        </Alert>
      )}

      {loadState.status === "ready" && !confirmationToken && (
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col gap-3"
          aria-busy={isSubmitting}
        >
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-user-name">Name</FieldLabel>
                <Input
                  id="edit-user-name"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  disabled={isSubmitting}
                  autoComplete="off"
                />
                <FieldDescription>
                  Shown across this user&apos;s records. A name-only change saves immediately; other
                  edits ask for confirmation first.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Account</FieldLabel>
                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                  <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{loadState.record.email}</span>
                  <LockedChip />
                </div>
                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                  <Badge className={getRoleBadgeClass(loadState.record.role)}>
                    {formatRole(loadState.record.role)}
                  </Badge>
                  <span className="ml-auto">
                    <LockedChip />
                  </span>
                </div>
                <FieldDescription>
                  Email comes from Google sign-in; roles are assigned by administrators.
                </FieldDescription>
              </Field>

              <Separator />

              {loadState.record.role === SystemRole.STUDENT && (
                <FieldSet className="gap-4">
                  <FieldLegend variant="label">Program and Placement</FieldLegend>
                  <Field>
                    <FieldLabel htmlFor="edit-user-program">Program</FieldLabel>
                    <Select
                      value={programId}
                      onValueChange={handleProgramChange}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="edit-user-program" className={TRIGGER_LONG}>
                        <SelectValue placeholder="Select program" className={VALUE_LONG}>
                          {selectedProgram?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {programs
                          .filter((p) => p.isActive !== false)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id} className={ITEM_WRAP}>
                              {p.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {selectedProgramIsArchived && (
                      <FieldDescription>
                        This program is archived. It stays selected for reference; archived programs
                        cannot be newly chosen.
                      </FieldDescription>
                    )}
                  </Field>

                  {programHasMajors && (
                    <Field>
                      <FieldLabel htmlFor="edit-user-major">Major</FieldLabel>
                      <Select
                        value={majorId ?? ""}
                        onValueChange={setMajorId}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger id="edit-user-major" className={TRIGGER_LONG}>
                          <SelectValue placeholder="Select major" className={VALUE_LONG}>
                            {selectedProgram?.majors.find((major) => major.id === majorId)?.name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {selectedProgram.majors
                            .filter((m) => m.isActive !== false)
                            .map((m) => (
                              <SelectItem key={m.id} value={m.id} className={ITEM_WRAP}>
                                {m.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel htmlFor="edit-user-year-level">Year Level</FieldLabel>
                      <Select
                        value={yearLevel ?? ""}
                        onValueChange={(val) => setYearLevel(val as YearLevel)}
                        disabled={isSubmitting || !loadState.record.activeEnrollment}
                      >
                        <SelectTrigger id="edit-user-year-level" className={TRIGGER_FULL}>
                          <SelectValue placeholder="Select year level">
                            {yearLevel ? formatYearLevel(yearLevel) : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">(None)</SelectItem>
                          {yearLevels.map((yl) => (
                            <SelectItem key={yl} value={yl}>
                              {formatYearLevel(yl)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="edit-user-section">Section</FieldLabel>
                      <Select
                        value={section ?? ""}
                        onValueChange={(val) => setSection(val as StudentSection)}
                        disabled={isSubmitting || !loadState.record.activeEnrollment}
                      >
                        <SelectTrigger id="edit-user-section" className={TRIGGER_FULL}>
                          <SelectValue placeholder="Select section">
                            {section ? formatSection(section) : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">(None)</SelectItem>
                          {SECTION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <FieldDescription>
                    Year level and section save only while the student has an active enrollment in
                    the current term.
                  </FieldDescription>
                </FieldSet>
              )}

              {loadState.record.role === SystemRole.FACULTY && (
                <Field>
                  <FieldLabel htmlFor="edit-user-faculty-program">Primary Program Affiliation</FieldLabel>
                  <Select
                    value={programId}
                    onValueChange={(v) => setProgramId(v ?? "")}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="edit-user-faculty-program" className={TRIGGER_LONG}>
                      <SelectValue placeholder="Select primary program" className={VALUE_LONG}>
                        {selectedProgram?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {programs
                        .filter((p) => p.isActive !== false)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id} className={ITEM_WRAP}>
                            {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Other program affiliations stay unchanged. Choosing a program this faculty
                    member already belongs to makes it primary.
                  </FieldDescription>
                </Field>
              )}

              {loadState.record.role === SystemRole.PROGRAM_HEAD && (
                <FieldSet className="border-t pt-4">
                  <FieldLegend variant="label">Managed Programs</FieldLegend>
                  <FieldDescription>
                    Select every program this program head manages. Unchecking deactivates the
                    assignment; checking again restores it from assignment history. Archived programs
                    cannot be newly selected.
                  </FieldDescription>
                  <FieldGroup className="gap-2">
                    {programs.map((program) => {
                      const isCurrentAssignment = (
                        loadState.record.programHead?.assignments ?? []
                      ).some((assignment) => assignment.programId === program.id);
                      const isSelectable = program.isActive !== false || isCurrentAssignment;
                      const isChecked = programHeadProgramIds.includes(program.id);
                      return (
                        <Field key={program.id} orientation="horizontal" className="gap-3">
                          <Checkbox
                            id={`edit-user-program-head-${program.id}`}
                            checked={isChecked}
                            disabled={!isSelectable || isSubmitting}
                            onCheckedChange={(next) => {
                              setProgramHeadProgramIds((current) =>
                                next
                                  ? [...current, program.id]
                                  : current.filter((id) => id !== program.id)
                              );
                            }}
                          />
                          <FieldLabel
                            htmlFor={`edit-user-program-head-${program.id}`}
                            className="font-normal"
                          >
                            {program.name}
                            {program.isActive === false && isCurrentAssignment && (
                              <span className="text-muted-foreground ml-1 text-xs">
                                (archived context only)
                              </span>
                            )}
                          </FieldLabel>
                        </Field>
                      );
                    })}
                  </FieldGroup>
                  <FieldDescription>
                    Saving applies the full selection as one confirmed change. Assignment history is
                    kept. Other program heads, course assignments, evaluations, and past academic
                    work are unaffected.
                  </FieldDescription>
                </FieldSet>
              )}

              {loadState.record.role === SystemRole.ALUMNI && (
                <FieldSet className="gap-4">
                  <FieldLegend variant="label">Academic History and Verification</FieldLegend>
                  <Field>
                    <FieldLabel htmlFor="edit-user-alumni-program">Program</FieldLabel>
                    <Select
                      value={programId}
                      onValueChange={handleProgramChange}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="edit-user-alumni-program" className={TRIGGER_LONG}>
                        <SelectValue placeholder="Select program" className={VALUE_LONG}>
                          {selectedProgram?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {programs
                          .filter((p) => p.isActive !== false)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id} className={ITEM_WRAP}>
                              {p.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {programHasMajors && (
                    <Field>
                      <FieldLabel htmlFor="edit-user-alumni-major">Major</FieldLabel>
                      <Select
                        value={majorId ?? ""}
                        onValueChange={setMajorId}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger id="edit-user-alumni-major" className={TRIGGER_LONG}>
                          <SelectValue placeholder="Select major" className={VALUE_LONG}>
                            {selectedProgram?.majors.find((major) => major.id === majorId)?.name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {selectedProgram.majors
                            .filter((m) => m.isActive !== false)
                            .map((m) => (
                              <SelectItem key={m.id} value={m.id} className={ITEM_WRAP}>
                                {m.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                  <Field>
                    <FieldLabel htmlFor="edit-user-alumni-graduation-year">Graduation Year</FieldLabel>
                    <Input
                      id="edit-user-alumni-graduation-year"
                      type="number"
                      min={1950}
                      max={new Date().getFullYear() + 5}
                      value={graduationYear}
                      onChange={(event) => setGraduationYear(event.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="edit-user-alumni-verification">Verification Status</FieldLabel>
                    <Select
                      value={verificationStatus}
                      onValueChange={(value) => setVerificationStatus(value as VerificationStatus)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="edit-user-alumni-verification" className={TRIGGER_FULL}>
                        <SelectValue>{formatVerificationStatus(verificationStatus)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={VerificationStatus.PENDING}>Pending</SelectItem>
                        <SelectItem value={VerificationStatus.APPROVED}>Approved</SelectItem>
                        <SelectItem value={VerificationStatus.REJECTED}>Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      {verificationStatus
                        ? verificationEffect(verificationStatus)
                        : "Choose a verification status."}
                    </FieldDescription>
                  </Field>
                </FieldSet>
              )}

              {loadState.record.role === SystemRole.INDUSTRY_PARTNER && (
                <FieldSet className="gap-4">
                  <FieldLegend variant="label">Organization and Verification</FieldLegend>
                  <Field>
                    <FieldLabel htmlFor="edit-user-industry-company">Organization Name</FieldLabel>
                    <Input
                      id="edit-user-industry-company"
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="edit-user-industry-position">Position (optional)</FieldLabel>
                    <Input
                      id="edit-user-industry-position"
                      value={position}
                      onChange={(event) => setPosition(event.target.value)}
                      disabled={isSubmitting}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="edit-user-industry-program">
                      Affiliated Program (optional)
                    </FieldLabel>
                    <Select
                      value={programId}
                      onValueChange={(value) => setProgramId(value ?? "")}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="edit-user-industry-program" className={TRIGGER_LONG}>
                        <SelectValue placeholder="No affiliated program" className={VALUE_LONG}>
                          {selectedProgram?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No affiliated program</SelectItem>
                        {programs
                          .filter((p) => p.isActive !== false)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id} className={ITEM_WRAP}>
                              {p.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {selectedProgramIsArchived && (
                      <FieldDescription>
                        This program is archived. It stays selected for reference; archived programs
                        cannot be newly chosen.
                      </FieldDescription>
                    )}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="edit-user-industry-verification">
                      Verification Status
                    </FieldLabel>
                    <Select
                      value={verificationStatus}
                      onValueChange={(value) => setVerificationStatus(value as VerificationStatus)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="edit-user-industry-verification" className={TRIGGER_FULL}>
                        <SelectValue>{formatVerificationStatus(verificationStatus)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={VerificationStatus.PENDING}>Pending</SelectItem>
                        <SelectItem value={VerificationStatus.APPROVED}>Approved</SelectItem>
                        <SelectItem value={VerificationStatus.REJECTED}>Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      {verificationStatus
                        ? verificationEffect(verificationStatus)
                        : "Choose a verification status."}
                    </FieldDescription>
                  </Field>
                </FieldSet>
              )}
            </FieldGroup>
          </div>

          <div className="flex shrink-0 gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none">
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      )}

      {loadState.status === "ready" && confirmationToken && confirmationSummary && (
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col gap-3"
          aria-busy={isSubmitting}
        >
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="bg-muted/20 space-y-4 rounded-md border p-4">
              {confirmationSummary.profileChanged && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Academic Profile Changes</h4>
                  <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                    <div className="text-muted-foreground">Previous:</div>
                    <div>
                      {confirmationSummary.oldValues.program} •{" "}
                      {confirmationSummary.oldValues.major}
                    </div>
                    <div className="text-link font-medium">New:</div>
                    <div className="font-medium">
                      {confirmationSummary.newValues.program} •{" "}
                      {confirmationSummary.newValues.major}
                    </div>
                  </div>
                </div>
              )}

              {confirmationSummary.placementChanged && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Active Term Placement Changes</h4>
                  <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                    <div className="text-muted-foreground">Previous:</div>
                    <div>
                      {confirmationSummary.oldValues.year} •{" "}
                      {confirmationSummary.oldValues.section}
                    </div>
                    <div className="text-link font-medium">New:</div>
                    <div className="font-medium">
                      {confirmationSummary.newValues.year} •{" "}
                      {confirmationSummary.newValues.section}
                    </div>
                  </div>
                </div>
              )}

              {confirmationSummary.facultyProgramChanged && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Primary Program Affiliation Changes</h4>
                  <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                    <div className="text-muted-foreground">Previous:</div>
                    <div>{confirmationSummary.oldValues.program}</div>
                    <div className="text-link font-medium">New:</div>
                    <div className="font-medium">{confirmationSummary.newValues.program}</div>
                  </div>
                </div>
              )}

              {confirmationSummary.programHeadAssignmentChanged && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Program Head Assignment Changes</h4>
                  <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                    <div className="text-muted-foreground">Previous:</div>
                    <div>{confirmationSummary.oldValues.programs}</div>
                    <div className="text-link font-medium">New:</div>
                    <div className="font-medium">{confirmationSummary.newValues.programs}</div>
                  </div>
                </div>
              )}

              {confirmationSummary.alumniChanged && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Alumni Academic History and Verification</h4>
                  <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                    <div className="text-muted-foreground">Previous:</div>
                    <div>
                      {confirmationSummary.oldValues.program} •{" "}
                      {confirmationSummary.oldValues.major} •{" "}
                      {confirmationSummary.oldValues.graduationYear} •{" "}
                      {confirmationSummary.oldValues.verification}
                    </div>
                    <div className="text-link font-medium">New:</div>
                    <div className="font-medium">
                      {confirmationSummary.newValues.program} •{" "}
                      {confirmationSummary.newValues.major} •{" "}
                      {confirmationSummary.newValues.graduationYear} •{" "}
                      {confirmationSummary.newValues.verification}
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {verificationStatus
                      ? verificationEffect(verificationStatus)
                      : "Choose a verification status."}
                  </p>
                </div>
              )}

              {confirmationSummary.industryPartnerChanged && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">
                    Industry Partner Organization and Verification
                  </h4>
                  <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                    <div className="text-muted-foreground">Previous:</div>
                    <div>
                      {confirmationSummary.oldValues.company} •{" "}
                      {confirmationSummary.oldValues.position} •{" "}
                      {confirmationSummary.oldValues.program} •{" "}
                      {confirmationSummary.oldValues.verification}
                    </div>
                    <div className="text-link font-medium">New:</div>
                    <div className="font-medium">
                      {confirmationSummary.newValues.company} •{" "}
                      {confirmationSummary.newValues.position} •{" "}
                      {confirmationSummary.newValues.program} •{" "}
                      {confirmationSummary.newValues.verification}
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {verificationStatus
                      ? verificationEffect(verificationStatus)
                      : "Choose a verification status."}
                  </p>
                </div>
              )}

              <p className="text-muted-foreground flex items-start gap-2 pt-2 text-sm">
                <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" />
                {confirmationSummary.alumniChanged || confirmationSummary.industryPartnerChanged
                  ? "Profile and verification save together."
                  : confirmationSummary.facultyProgramChanged
                    ? "Other program affiliations stay unchanged. Choosing a program this faculty member already belongs to makes it primary."
                    : confirmationSummary.programHeadAssignmentChanged
                      ? "Your selection replaces the current assignment set. Unchecked programs deactivate; checked programs stay active or return from history. Nothing is deleted, and other users' assignments are unaffected."
                      : "Past enrollments stay unchanged. This saves profile and current-term details only."}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelConfirmation}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              Keep editing
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none">
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  Confirming…
                </>
              ) : (
                "Confirm and Save"
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

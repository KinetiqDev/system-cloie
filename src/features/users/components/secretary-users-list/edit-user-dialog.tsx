"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { SystemRole, YearLevel, StudentSection, VerificationStatus } from "@prisma/client";
import { Loader2, Mail, ShieldAlert, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showToast } from "@/components/ui/toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
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
  if (status === VerificationStatus.APPROVED) return "Approved: normal role-dashboard access.";
  if (status === VerificationStatus.REJECTED) return "Rejected: role-dashboard access is blocked.";
  return "Pending: limited dashboard access remains with a review notice.";
}

const SECTION_OPTIONS: { label: string; value: StudentSection }[] = [
  { label: "Morning", value: "MORNING" },
  { label: "Afternoon", value: "AFTERNOON" },
  { label: "Evening", value: "EVENING" },
];

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
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {userId && (
          <EditUserDialogBody
            key={userId}
            userId={userId}
            currentUserId={currentUserId}
            onClose={onClose}
            onUserUpdated={onUserUpdated}
            programs={programs}
            yearLevels={yearLevels}
          />
        )}
      </DialogContent>
    </Dialog>
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
}: EditUserDialogBodyProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  // Base identity — opaque canonical account name
  const [name, setName] = useState("");

  // Student fields
  const [studentIdNumber, setStudentIdNumber] = useState("");
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
        setStudentIdNumber(result.data.student?.studentIdNumber ?? "");
        setProgramId(result.data.student?.programId ?? "");
        setMajorId(result.data.student?.majorId ?? null);
        setYearLevel((result.data.activeEnrollment?.yearLevel as YearLevel) ?? null);
        setSection((result.data.activeEnrollment?.section as StudentSection) ?? null);
      } else if (result.data.role === SystemRole.FACULTY) {
        setProgramId(result.data.faculty?.primaryProgramId ?? "");
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
      if (!studentIdNumber.trim()) {
        setSubmitError("Student ID number is required.");
        return;
      }
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

      formData.set("student.student_id_number", studentIdNumber.trim());
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
    <>
      <DialogHeader>
        <DialogTitle>{confirmationToken ? "Confirm Changes" : "Edit User"}</DialogTitle>
        <DialogDescription>
          {confirmationToken
            ? "Please review the protected changes before saving."
            : loadState.status === "ready"
              ? `Update details for ${loadState.record.name}.`
              : "Update the selected user's information."}
        </DialogDescription>
      </DialogHeader>

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
        <form onSubmit={handleSubmit} className="space-y-4 pt-2" aria-busy={isSubmitting}>
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-user-name">Name</Label>
            <Input
              id="edit-user-name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              disabled={isSubmitting}
              autoComplete="off"
            />
            <p className="text-muted-foreground text-xs">
              Corrects the canonical account name. Name-only edits do not require academic
              confirmation.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-label-sm text-muted-foreground tracking-wider uppercase">
              Account Email
            </legend>
            <div className="border-input bg-muted/40 text-muted-foreground flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <Mail className="size-4" aria-hidden="true" />
              <span className="truncate">{loadState.record.email}</span>
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Locked
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              Email is matched to the Google-authenticated identity and cannot be changed here.
            </p>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-label-sm text-muted-foreground tracking-wider uppercase">
              CLOIE Account Role
            </legend>
            <div className="border-input bg-muted/40 text-muted-foreground flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <Badge className={getRoleBadgeClass(loadState.record.role)}>
                {formatRole(loadState.record.role)}
              </Badge>
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium">
                <ShieldAlert className="size-3.5" aria-hidden="true" />
                Locked
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              Role changes are an administrator-controlled workflow and are not part of this dialog.
            </p>
          </fieldset>

          {loadState.record.role === SystemRole.STUDENT && (
            <>
              <div className="space-y-2 border-t pt-4">
                <Label htmlFor="edit-user-student-id">Student ID Number</Label>
                <Input
                  id="edit-user-student-id"
                  name="student.student_id_number"
                  value={studentIdNumber}
                  onChange={(event) => setStudentIdNumber(event.target.value)}
                  required
                  disabled={isSubmitting}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-user-program">Program</Label>
                <Select
                  value={programId}
                  onValueChange={handleProgramChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="edit-user-program">
                    <SelectValue placeholder="Select program">{selectedProgram?.name}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {programs
                      .filter((p) => p.isActive !== false)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {selectedProgramIsArchived && (
                  <p className="text-muted-foreground text-xs">
                    Current program is archived. It remains context only; new archived selections
                    are unavailable.
                  </p>
                )}
              </div>

              {programHasMajors && (
                <div className="space-y-2">
                  <Label htmlFor="edit-user-major">Major</Label>
                  <Select value={majorId ?? ""} onValueChange={setMajorId} disabled={isSubmitting}>
                    <SelectTrigger id="edit-user-major">
                      <SelectValue placeholder="Select major">
                        {selectedProgram?.majors.find((major) => major.id === majorId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProgram.majors
                        .filter((m) => m.isActive !== false)
                        .map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-user-year-level">Year Level</Label>
                  <Select
                    value={yearLevel ?? ""}
                    onValueChange={(val) => setYearLevel(val as YearLevel)}
                    disabled={isSubmitting || !loadState.record.activeEnrollment}
                  >
                    <SelectTrigger id="edit-user-year-level">
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-user-section">Section</Label>
                  <Select
                    value={section ?? ""}
                    onValueChange={(val) => setSection(val as StudentSection)}
                    disabled={isSubmitting || !loadState.record.activeEnrollment}
                  >
                    <SelectTrigger id="edit-user-section">
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
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                If the student does not have an active term enrollment, year level and section
                cannot be saved.
              </p>
            </>
          )}

          {loadState.record.role === SystemRole.FACULTY && (
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="edit-user-faculty-program">Primary Program Affiliation</Label>
              <Select
                value={programId}
                onValueChange={(v) => setProgramId(v ?? "")}
                disabled={isSubmitting}
              >
                <SelectTrigger id="edit-user-faculty-program">
                  <SelectValue placeholder="Select primary program">
                    {selectedProgram?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {programs
                    .filter((p) => p.isActive !== false)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Additional active affiliations remain unchanged. If the selected program is
                currently an additional affiliation, it will be promoted to primary.
              </p>
            </div>
          )}

          {loadState.record.role === SystemRole.PROGRAM_HEAD && (
            <FieldSet className="border-t pt-4">
              <FieldLegend variant="label">Managed Programs</FieldLegend>
              <FieldDescription>
                Choose every Program this Program Head manages. Unchecking a Program deactivates its
                assignment; checking it again reactivates the existing assignment history row.
                Programs cannot be newly selected while archived.
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
                The complete assignment set is saved as one protected change. No assignment history
                row is deleted; other Program Heads, course assignments, evaluations, and historical
                academic work remain unchanged.
              </FieldDescription>
            </FieldSet>
          )}

          {loadState.record.role === SystemRole.ALUMNI && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-sm font-semibold">Academic History and Verification</p>
              <div className="space-y-2">
                <Label htmlFor="edit-user-alumni-program">Program</Label>
                <Select
                  value={programId}
                  onValueChange={handleProgramChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="edit-user-alumni-program">
                    <SelectValue placeholder="Select program">{selectedProgram?.name}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {programs
                      .filter((p) => p.isActive !== false)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {programHasMajors && (
                <div className="space-y-2">
                  <Label htmlFor="edit-user-alumni-major">Major</Label>
                  <Select value={majorId ?? ""} onValueChange={setMajorId} disabled={isSubmitting}>
                    <SelectTrigger id="edit-user-alumni-major">
                      <SelectValue placeholder="Select major">
                        {selectedProgram?.majors.find((major) => major.id === majorId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProgram.majors
                        .filter((m) => m.isActive !== false)
                        .map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-user-alumni-graduation-year">Graduation Year</Label>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-alumni-verification">Verification Status</Label>
                <Select
                  value={verificationStatus}
                  onValueChange={(value) => setVerificationStatus(value as VerificationStatus)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="edit-user-alumni-verification">
                    <SelectValue>{formatVerificationStatus(verificationStatus)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={VerificationStatus.PENDING}>Pending</SelectItem>
                    <SelectItem value={VerificationStatus.APPROVED}>Approved</SelectItem>
                    <SelectItem value={VerificationStatus.REJECTED}>Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  {verificationStatus
                    ? verificationEffect(verificationStatus)
                    : "Choose a verification status."}
                </p>
              </div>
            </div>
          )}

          {loadState.record.role === SystemRole.INDUSTRY_PARTNER && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-sm font-semibold">Organization and Verification</p>
              <div className="space-y-2">
                <Label htmlFor="edit-user-industry-company">Organization Name</Label>
                <Input
                  id="edit-user-industry-company"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-industry-position">Position (optional)</Label>
                <Input
                  id="edit-user-industry-position"
                  value={position}
                  onChange={(event) => setPosition(event.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-industry-program">Affiliated Program (optional)</Label>
                <Select
                  value={programId}
                  onValueChange={(value) => setProgramId(value ?? "")}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="edit-user-industry-program">
                    <SelectValue placeholder="No affiliated program">
                      {selectedProgram?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No affiliated program</SelectItem>
                    {programs
                      .filter((p) => p.isActive !== false)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {selectedProgramIsArchived && (
                  <p className="text-muted-foreground text-xs">
                    Current program is archived. It remains context only; new archived selections
                    are unavailable.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-industry-verification">Verification Status</Label>
                <Select
                  value={verificationStatus}
                  onValueChange={(value) => setVerificationStatus(value as VerificationStatus)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="edit-user-industry-verification">
                    <SelectValue>{formatVerificationStatus(verificationStatus)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={VerificationStatus.PENDING}>Pending</SelectItem>
                    <SelectItem value={VerificationStatus.APPROVED}>Approved</SelectItem>
                    <SelectItem value={VerificationStatus.REJECTED}>Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  {verificationStatus
                    ? verificationEffect(verificationStatus)
                    : "Choose a verification status."}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
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
        <form onSubmit={handleSubmit} className="space-y-4 pt-2" aria-busy={isSubmitting}>
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="bg-muted/20 space-y-4 rounded-md border p-4">
            {confirmationSummary.profileChanged && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Academic Profile Changes</h4>
                <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                  <div className="text-muted-foreground">Previous:</div>
                  <div>
                    {confirmationSummary.oldValues.program} • {confirmationSummary.oldValues.major}
                  </div>
                  <div className="text-link font-medium">New:</div>
                  <div className="font-medium">
                    {confirmationSummary.newValues.program} • {confirmationSummary.newValues.major}
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
                    {confirmationSummary.oldValues.year} • {confirmationSummary.oldValues.section}
                  </div>
                  <div className="text-link font-medium">New:</div>
                  <div className="font-medium">
                    {confirmationSummary.newValues.year} • {confirmationSummary.newValues.section}
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
                    {confirmationSummary.oldValues.program} • {confirmationSummary.oldValues.major}{" "}
                    • {confirmationSummary.oldValues.graduationYear} •{" "}
                    {confirmationSummary.oldValues.verification}
                  </div>
                  <div className="text-link font-medium">New:</div>
                  <div className="font-medium">
                    {confirmationSummary.newValues.program} • {confirmationSummary.newValues.major}{" "}
                    • {confirmationSummary.newValues.graduationYear} •{" "}
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
                  ? "Additional active affiliations remain unchanged. If the selected program is currently an additional affiliation, it will be promoted to primary."
                  : confirmationSummary.programHeadAssignmentChanged
                    ? "The assignment set is replaced by the selected set. Selected Programs stay active or are reactivated from history; unselected active assignments become inactive. No assignment history is deleted. Other Program Heads, course assignments, evaluations, and historical academic work remain unchanged."
                    : "Historical enrollments remain unchanged. This update only applies to the static profile and the current active term."}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelConfirmation}
              disabled={isSubmitting}
            >
              Go Back
            </Button>
            <Button type="submit" disabled={isSubmitting}>
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
    </>
  );
}

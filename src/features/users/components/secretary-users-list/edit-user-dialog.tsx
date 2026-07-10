"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { SystemRole, YearLevel, StudentSection, VerificationStatus } from "@prisma/client";
import { Loader2, Mail, ShieldAlert, ShieldCheck, CheckCircle2 } from "lucide-react";
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
import {
  editUserBySecretaryAction,
  getUserEditRecordAction,
} from "@/lib/actions/secretary-edit-user-actions";
import type { SecretaryUserEditRecord } from "@/features/users/services/get-user-edit-record";

function formatRole(role: SystemRole): string {
  return role
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

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
  if (status === VerificationStatus.APPROVED) return "Approved: normal Alumni dashboard access.";
  if (status === VerificationStatus.REJECTED)
    return "Rejected: Alumni dashboard access is blocked.";
  return "Pending: limited dashboard access remains with a review notice.";
}

const SECTION_OPTIONS: { label: string; value: StudentSection }[] = [
  { label: "Morning", value: "MORNING" },
  { label: "Afternoon", value: "AFTERNOON" },
  { label: "Evening", value: "EVENING" },
];

function getRoleBadgeClass(role: SystemRole): string {
  switch (role) {
    case SystemRole.SECRETARY:
      return "bg-red-100 text-red-700";
    case SystemRole.DEAN:
      return "bg-purple-100 text-purple-700";
    case SystemRole.PROGRAM_HEAD:
      return "bg-indigo-100 text-indigo-700";
    case SystemRole.FACULTY:
      return "bg-blue-100 text-blue-700";
    case SystemRole.STUDENT:
      return "bg-emerald-100 text-emerald-700";
    case SystemRole.ALUMNI:
      return "bg-amber-100 text-amber-800";
    case SystemRole.INDUSTRY_PARTNER:
      return "bg-sky-100 text-sky-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
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
    majors: Array<{ id: string; name: string }>;
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
    majors: Array<{ id: string; name: string }>;
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

  // Base fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Student fields
  const [studentIdNumber, setStudentIdNumber] = useState("");
  const [programId, setProgramId] = useState("");
  const [majorId, setMajorId] = useState<string | null>(null);
  const [yearLevel, setYearLevel] = useState<YearLevel | null>(null);
  const [section, setSection] = useState<StudentSection | null>(null);
  const [graduationYear, setGraduationYear] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(
    VerificationStatus.PENDING
  );

  // Confirmation state
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null);
  const [confirmationSummary, setConfirmationSummary] = useState<{
    profileChanged?: boolean;
    placementChanged?: boolean;
    facultyProgramChanged?: boolean;
    programHeadAssignmentChanged?: boolean;
    alumniChanged?: boolean;
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
      setFirstName(result.data.firstName);
      setLastName(result.data.lastName);

      if (result.data.role === SystemRole.STUDENT) {
        setStudentIdNumber(result.data.student?.studentIdNumber ?? "");
        setProgramId(result.data.student?.programId ?? "");
        setMajorId(result.data.student?.majorId ?? null);
        setYearLevel((result.data.activeEnrollment?.yearLevel as YearLevel) ?? null);
        setSection((result.data.activeEnrollment?.section as StudentSection) ?? null);
      } else if (result.data.role === SystemRole.FACULTY) {
        setProgramId(result.data.faculty?.primaryProgramId ?? "");
      } else if (result.data.role === SystemRole.PROGRAM_HEAD) {
        setProgramId(result.data.programHead?.assignmentProgramId ?? "");
      } else if (result.data.role === SystemRole.ALUMNI) {
        setProgramId(result.data.alumni?.programId ?? "");
        setMajorId(result.data.alumni?.majorId ?? null);
        setGraduationYear(result.data.alumni?.graduationYear?.toString() ?? "");
        setVerificationStatus(result.data.verification?.status ?? VerificationStatus.PENDING);
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

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst || !trimmedLast) {
      setSubmitError("First name and last name are required.");
      return;
    }

    setSubmitError(null);
    const formData = new FormData();
    if (loadState.status !== "ready") return;

    formData.set("id", userId);
    formData.set("role", loadState.record.role);
    formData.set("first_name", trimmedFirst);
    formData.set("last_name", trimmedLast);

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

      const hasYearLevel = !!yearLevel;
      const hasSection = !!section;
      if (hasYearLevel !== hasSection) {
        setSubmitError("Year level and section must be provided together if updating placement.");
        return;
      }

      formData.set("student.student_id_number", studentIdNumber.trim());
      formData.set("student.program_id", programId);
      if (majorId) formData.set("student.major_id", majorId);
      if (yearLevel) formData.set("student.year_level", yearLevel);
      if (section) formData.set("student.section", section);
    } else if (loadState.status === "ready" && loadState.record.role === SystemRole.FACULTY) {
      if (!programId) {
        setSubmitError("Primary program affiliation is required.");
        return;
      }
      formData.set("faculty.program_id", programId);
    } else if (loadState.status === "ready" && loadState.record.role === SystemRole.PROGRAM_HEAD) {
      if (!programId) {
        setSubmitError("Managed program is required.");
        return;
      }
      formData.set("program_head.program_id", programId);
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
      if (programHasMajors && !majorId) {
        setSubmitError("Major is required for the selected program.");
        return;
      }
      formData.set("alumni.graduation_year", String(year));
      formData.set("alumni.program_id", programId);
      if (majorId) formData.set("alumni.major_id", majorId);
      formData.set("alumni.verification_status", verificationStatus);
    }

    if (confirmationToken) {
      formData.set("confirmationToken", confirmationToken);
    }

    const record = loadState.status === "ready" ? loadState.record : null;
    const label = record ? `${record.firstName} ${record.lastName}` : "User";

    startSubmit(async () => {
      const result = await editUserBySecretaryAction(formData);
      if (!result.success) {
        setSubmitError(result.error);
        return;
      }

      if (result.data?.protectedConfirmationRequired) {
        if (record?.role === SystemRole.STUDENT) {
          // Build summary
          const oldP = record?.student?.programId;
          const newP = programId;
          const oldM = record?.student?.majorId;
          const newM = majorId;
          const oldYL = record?.activeEnrollment?.yearLevel;
          const newYL = yearLevel;
          const oldSec = record?.activeEnrollment?.section;
          const newSec = section;

          const profileChanged = !!(oldP !== newP || oldM !== newM);
          const placementChanged = !!(newYL && newSec && (oldYL !== newYL || oldSec !== newSec));

          setConfirmationToken(result.data.token!);
          setConfirmationSummary({
            profileChanged,
            placementChanged,
            oldValues: {
              program: programs.find((p) => p.id === oldP)?.name ?? "None",
              major:
                programs.find((p) => p.id === oldP)?.majors.find((m) => m.id === oldM)?.name ??
                "None",
              year: oldYL ? formatYearLevel(oldYL as YearLevel) : "None",
              section: oldSec ? formatSection(oldSec as StudentSection) : "None",
            },
            newValues: {
              program: programs.find((p) => p.id === newP)?.name ?? "None",
              major:
                programs.find((p) => p.id === newP)?.majors.find((m) => m.id === newM)?.name ??
                "None",
              year: newYL ? formatYearLevel(newYL) : "None",
              section: newSec ? formatSection(newSec) : "None",
            },
          });
        } else if (record?.role === SystemRole.FACULTY) {
          const oldP = record?.faculty?.primaryProgramId;
          const newP = programId;
          setConfirmationToken(result.data.token!);
          setConfirmationSummary({
            facultyProgramChanged: true,
            oldValues: {
              program: programs.find((p) => p.id === oldP)?.name ?? "None",
            },
            newValues: {
              program: programs.find((p) => p.id === newP)?.name ?? "None",
            },
          });
        } else if (record?.role === SystemRole.PROGRAM_HEAD) {
          const oldP = record.programHead?.assignmentProgramId;
          setConfirmationToken(result.data.token!);
          setConfirmationSummary({
            programHeadAssignmentChanged: true,
            oldValues: {
              program: programs.find((p) => p.id === oldP)?.name ?? "No active assignment",
            },
            newValues: {
              program: programs.find((p) => p.id === programId)?.name ?? "None",
            },
          });
        } else if (record?.role === SystemRole.ALUMNI) {
          setConfirmationToken(result.data.token!);
          setConfirmationSummary({
            alumniChanged: true,
            oldValues: {
              program:
                programs.find((p) => p.id === record.alumni?.programId)?.name ?? "No profile",
              major:
                programs
                  .find((p) => p.id === record.alumni?.programId)
                  ?.majors.find((m) => m.id === record.alumni?.majorId)?.name ?? "None",
              graduationYear: record.alumni ? String(record.alumni.graduationYear) : "No profile",
              verification: formatVerificationStatus(record.verification?.status ?? null),
            },
            newValues: {
              program: programs.find((p) => p.id === programId)?.name ?? "None",
              major: selectedProgram?.majors.find((m) => m.id === majorId)?.name ?? "None",
              graduationYear,
              verification: formatVerificationStatus(verificationStatus),
            },
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
              ? `Update details for ${loadState.record.firstName} ${loadState.record.lastName}.`
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
        <div role="alert" className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          {loadState.message}
        </div>
      )}

      {loadState.status === "ready" && !confirmationToken && (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2" aria-busy={isSubmitting}>
          {submitError && (
            <div role="alert" className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {submitError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-user-first-name">First Name</Label>
            <Input
              id="edit-user-first-name"
              name="first_name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
              disabled={isSubmitting}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-user-last-name">Last Name</Label>
            <Input
              id="edit-user-last-name"
              name="last_name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              required
              disabled={isSubmitting}
              autoComplete="off"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
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
            <legend className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
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
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {programHasMajors && (
                <div className="space-y-2">
                  <Label htmlFor="edit-user-major">Major</Label>
                  <Select value={majorId ?? ""} onValueChange={setMajorId} disabled={isSubmitting}>
                    <SelectTrigger id="edit-user-major">
                      <SelectValue placeholder="Select major" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProgram.majors.map((m) => (
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
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="edit-user-year-level">
                      <SelectValue placeholder="Select year level" />
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
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="edit-user-section">
                      <SelectValue placeholder="Select section" />
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
                  <SelectValue placeholder="Select primary program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
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
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="edit-user-program-head-program">Managed Program</Label>
              <Select
                value={programId}
                onValueChange={(v) => setProgramId(v ?? "")}
                disabled={isSubmitting}
              >
                <SelectTrigger id="edit-user-program-head-program">
                  <SelectValue placeholder="Select managed program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Only this Program Head&apos;s assignment changes. Other Program Heads and course
                assignments remain unchanged.
              </p>
            </div>
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
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
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
                      <SelectValue placeholder="Select major" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProgram.majors.map((m) => (
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={VerificationStatus.PENDING}>Pending</SelectItem>
                    <SelectItem value={VerificationStatus.APPROVED}>Approved</SelectItem>
                    <SelectItem value={VerificationStatus.REJECTED}>Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  {verificationEffect(verificationStatus)}
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
            <div role="alert" className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {submitError}
            </div>
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
                  <div className="text-primary font-medium">New:</div>
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
                  <div className="text-primary font-medium">New:</div>
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
                  <div className="text-primary font-medium">New:</div>
                  <div className="font-medium">{confirmationSummary.newValues.program}</div>
                </div>
              </div>
            )}

            {confirmationSummary.programHeadAssignmentChanged && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Program Head Assignment Changes</h4>
                <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                  <div className="text-muted-foreground">Previous:</div>
                  <div>{confirmationSummary.oldValues.program}</div>
                  <div className="text-primary font-medium">New:</div>
                  <div className="font-medium">{confirmationSummary.newValues.program}</div>
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
                  <div className="text-primary font-medium">New:</div>
                  <div className="font-medium">
                    {confirmationSummary.newValues.program} • {confirmationSummary.newValues.major}{" "}
                    • {confirmationSummary.newValues.graduationYear} •{" "}
                    {confirmationSummary.newValues.verification}
                  </div>
                </div>
                <p className="text-muted-foreground text-sm">
                  {verificationEffect(verificationStatus)}
                </p>
              </div>
            )}

            <p className="text-muted-foreground flex items-start gap-2 pt-2 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              {confirmationSummary.alumniChanged
                ? "Academic history and verification save together."
                : confirmationSummary.facultyProgramChanged
                  ? "Additional active affiliations remain unchanged. If the selected program is currently an additional affiliation, it will be promoted to primary."
                  : confirmationSummary.programHeadAssignmentChanged
                    ? "The previous assignment becomes inactive. If this program was managed before, its existing assignment-history row is reactivated. Other Program Heads, course assignments, evaluations, and historical academic work remain unchanged."
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

// fallow-ignore-file code-duplication
"use client";

import { useState, useTransition } from "react";
import { BookOpen, Building2, GraduationCap, Loader2, Mail, Plus } from "lucide-react";
import { SystemRole } from "@prisma/client";
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
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { showToast } from "@/components/ui/toast";
import {
  addRoleToExistingUserAction,
  removeRoleFromUserAction,
  toggleUserActiveAction,
} from "@/lib/actions/management-foundation-actions";
import { formatRole, getRoleBadgeClass } from "@/features/users/lib/role-visuals";
import {
  getPlacementLabel,
  STUDENT_SECTION_OPTIONS,
  YEAR_LEVEL_OPTIONS,
} from "@/lib/constants/academic";
import type { SecretaryUserSummaryItem } from "../../services/list-secretary-users-summary";

/**
 * Enum order — the same order the server returns an account's assigned roles
 * in, so locally added roles land in the list where a reload would put them.
 */
const ROLE_ORDER: SystemRole[] = [
  SystemRole.SECRETARY,
  SystemRole.DEAN,
  SystemRole.PROGRAM_HEAD,
  SystemRole.FACULTY,
  SystemRole.STUDENT,
  SystemRole.ALUMNI,
  SystemRole.INDUSTRY_PARTNER,
  SystemRole.GEN_ED_COORDINATOR,
];

type ProgramOption = {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
  majors: Array<{ id: string; name: string; isActive?: boolean }>;
};

interface UserDialogsProps {
  viewUser: SecretaryUserSummaryItem | null;
  onCloseView: () => void;
  onUserUpdated: () => void;
  programs: ProgramOption[];
}

/**
 * Secretary User Management dialogs. The View dialog owns the account's
 * Roles & Assignments section — adding a role and revoking one — while the
 * adaptive Edit User dialog lives in `./edit-user-dialog` and is mounted by
 * the list page.
 */
export function UserDialogs({ viewUser, onCloseView, onUserUpdated, programs }: UserDialogsProps) {
  if (!viewUser) {
    return null;
  }

  return (
    <ViewUserDialog
      key={viewUser.id}
      user={viewUser}
      programs={programs}
      onClose={onCloseView}
      onUserUpdated={onUserUpdated}
    />
  );
}

interface ViewUserDialogProps {
  user: SecretaryUserSummaryItem;
  programs: ProgramOption[];
  onClose: () => void;
  onUserUpdated: () => void;
}

function ViewUserDialog({ user, programs, onClose, onUserUpdated }: ViewUserDialogProps) {
  // The dialog mirrors role changes locally: the row it was opened from is a
  // snapshot, so the refreshed list data alone cannot update an open dialog.
  const [roles, setRoles] = useState<SystemRole[]>(user.roles);
  const [isRevoking, startRevoke] = useTransition();

  const handleRevoke = (role: SystemRole) => {
    startRevoke(async () => {
      const result = await removeRoleFromUserAction(user.id, role);
      if (!result.success) {
        showToast(result.error, "error");
        return;
      }

      setRoles((current) => current.filter((entry) => entry !== role));
      showToast(`${formatRole(role)} access has been revoked.`);
      onUserUpdated();
    });
  };

  const handleAdded = (role: SystemRole) => {
    setRoles((current) => ROLE_ORDER.filter((entry) => entry === role || current.includes(entry)));
    onUserUpdated();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>Viewing information for {user.name}.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1">
            <label className="text-label-sm text-muted-foreground tracking-wider uppercase">
              Name
            </label>
            <p className="text-sm font-semibold">{user.name}</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-label-sm text-muted-foreground tracking-wider uppercase">
              Email Address
            </label>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Mail className="text-muted-foreground size-4" />
              {user.email}
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-label-sm text-muted-foreground tracking-wider uppercase">
                Roles &amp; Assignments
              </label>
              <AddRolePopover
                user={user}
                assignedRoles={roles}
                programs={programs}
                onAdded={handleAdded}
              />
            </div>
            <div className="flex flex-col gap-2">
              {roles.map((role) => (
                <div
                  key={role}
                  className="bg-muted/30 flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <Badge className={getRoleBadgeClass(role)}>{formatRole(role)}</Badge>
                  <RevokeRoleButton
                    role={role}
                    userName={user.name}
                    isOnlyRole={roles.length === 1}
                    isRevoking={isRevoking}
                    onConfirm={() => handleRevoke(role)}
                  />
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              Revoking a role removes it from this account. Program Head and Faculty program records
              are deactivated with it; Student and Industry Partner roles need their profile records
              removed first.
            </p>
          </div>

          <Separator />

          <div className="flex flex-col gap-1">
            <label className="text-label-sm text-muted-foreground tracking-wider uppercase">
              Program
            </label>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="text-muted-foreground size-4" />
              {user.programLabel}
            </div>
          </div>
          {user.majorLabel && user.majorLabel !== "N/A" && (
            <div className="flex flex-col gap-1">
              <label className="text-label-sm text-muted-foreground tracking-wider uppercase">
                Major
              </label>
              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="text-muted-foreground size-4" />
                {user.majorLabel}
              </div>
            </div>
          )}
          {user.placement && (
            <div className="flex flex-col gap-1">
              <label className="text-label-sm text-muted-foreground tracking-wider uppercase">
                Year &amp; Section
              </label>
              <div className="flex items-center gap-2 text-sm">
                <GraduationCap className="text-muted-foreground size-4" />
                {getPlacementLabel(user.placement)}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-label-sm text-muted-foreground tracking-wider uppercase">
              Status
            </label>
            <Badge variant={user.isActive ? "success" : "secondary"}>
              {user.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RevokeRoleButton({
  role,
  userName,
  isOnlyRole,
  isRevoking,
  onConfirm,
}: {
  role: SystemRole;
  userName: string;
  isOnlyRole: boolean;
  isRevoking: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  const label = formatRole(role);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button type="button" size="sm" variant="ghost" className="text-destructive" />}
        aria-label={`Revoke ${label} role from ${userName}`}
      >
        Revoke
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <PopoverHeader>
          <PopoverTitle>Revoke {label}?</PopoverTitle>
          <PopoverDescription>
            {isOnlyRole
              ? `${userName} has no other role, so this leaves the account without one.`
              : `${userName}'s account keeps its other roles.`}{" "}
            Program Head and Faculty program records are deactivated with the role; Student and
            Industry Partner roles are refused while their profile records exist.
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isRevoking}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={isRevoking}
            onClick={onConfirm}
          >
            {isRevoking ? (
              <>
                <Loader2 className="animate-spin" data-icon="inline-start" />
                Revoking…
              </>
            ) : (
              "Revoke role"
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// fallow-ignore-next-line complexity
function AddRolePopover({
  user,
  assignedRoles,
  programs,
  onAdded,
}: {
  user: SecretaryUserSummaryItem;
  assignedRoles: SystemRole[];
  programs: ProgramOption[];
  onAdded: (role: SystemRole) => void;
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<SystemRole | "">("");
  const [programId, setProgramId] = useState("");
  const [majorId, setMajorId] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [section, setSection] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isAdding, startAdd] = useTransition();

  const availableRoles = ROLE_ORDER.filter((entry) => !assignedRoles.includes(entry));
  const selectedProgram = programs.find((program) => program.id === programId);
  const programMajors = (selectedProgram?.majors ?? []).filter((major) => major.isActive !== false);
  const programHasMajors = programMajors.length > 0;
  const needsProgram =
    role === SystemRole.FACULTY ||
    role === SystemRole.PROGRAM_HEAD ||
    role === SystemRole.STUDENT ||
    role === SystemRole.ALUMNI;
  const allowsProgram = needsProgram || role === SystemRole.INDUSTRY_PARTNER;
  const needsMajor =
    (role === SystemRole.STUDENT || role === SystemRole.ALUMNI) && programHasMajors;
  const needsPlacement = role === SystemRole.STUDENT;
  const needsGraduationYear = role === SystemRole.ALUMNI;
  const needsCompany = role === SystemRole.INDUSTRY_PARTNER;

  function resetForm() {
    setRole("");
    setProgramId("");
    setMajorId("");
    setYearLevel("");
    setSection("");
    setGraduationYear("");
    setCompanyName("");
    setPosition("");
    setFormError(null);
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    setOpen(nextOpen);
  };

  const handleRoleChange = (value: string | null) => {
    setRole((value ?? "") as SystemRole | "");
    // Context records belong to the role, so switching roles drops whatever
    // the previous role would have collected.
    setProgramId("");
    setMajorId("");
    setYearLevel("");
    setSection("");
    setGraduationYear("");
    setCompanyName("");
    setPosition("");
    setFormError(null);
  };

  // fallow-ignore-next-line complexity
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!role) {
      setFormError("Select a role to add.");
      return;
    }
    if (needsProgram && !programId) {
      setFormError(`${formatRole(role)} requires a program.`);
      return;
    }
    if (needsMajor && !majorId) {
      setFormError("A major is required for the selected program.");
      return;
    }
    if (needsPlacement && (!yearLevel || !section)) {
      setFormError("Year level and section are required for a Student role.");
      return;
    }
    const graduationYearNumber = Number(graduationYear);
    if (
      needsGraduationYear &&
      (!graduationYear.trim() ||
        !Number.isInteger(graduationYearNumber) ||
        graduationYearNumber < 1950)
    ) {
      setFormError("Enter a graduation year of 1950 or later.");
      return;
    }
    if (needsCompany && !companyName.trim()) {
      setFormError("Organization name is required for an Industry Partner role.");
      return;
    }

    const formData = new FormData();
    formData.set("user_id", user.id);
    formData.set("role", role);
    if (programId) formData.set("program_id", programId);
    if (majorId) formData.set("major_id", majorId);
    if (yearLevel) formData.set("year_level", yearLevel);
    if (section) formData.set("section", section);
    if (graduationYear.trim()) formData.set("graduation_year", graduationYear.trim());
    if (companyName.trim()) formData.set("company_name", companyName.trim());
    if (position.trim()) formData.set("position", position.trim());

    startAdd(async () => {
      const result = await addRoleToExistingUserAction(formData);
      if (!result.success) {
        setFormError(result.error);
        showToast(result.error, "error");
        return;
      }

      showToast(`${formatRole(role)} has been added to ${user.name}.`);
      onAdded(role);
      setOpen(false);
      resetForm();
    });
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={<Button type="button" size="sm" variant="outline" />}
        disabled={availableRoles.length === 0}
      >
        <Plus className="size-4" data-icon="inline-start" />
        Add Role
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Add a role</PopoverTitle>
          <PopoverDescription>
            Assign another CLOIE role to {user.name} and fill in the records it needs.
          </PopoverDescription>
        </PopoverHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" aria-busy={isAdding}>
          {formError && (
            <p role="alert" className="text-destructive text-sm">
              {formError}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="add-role-role" className="text-sm font-medium">
              Role
            </label>
            <Select value={role} onValueChange={handleRoleChange} disabled={isAdding}>
              <SelectTrigger id="add-role-role" className="w-full">
                <SelectValue placeholder="Select role">
                  {role ? formatRole(role) : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {formatRole(entry)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {allowsProgram && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="add-role-program" className="text-sm font-medium">
                Program{needsProgram ? "" : " (optional)"}
              </label>
              <Select
                value={programId}
                onValueChange={(value) => {
                  setProgramId(value ?? "");
                  setMajorId("");
                }}
                disabled={isAdding}
              >
                <SelectTrigger id="add-role-program" className="w-full">
                  <SelectValue
                    placeholder={needsProgram ? "Select program" : "No affiliated program"}
                  >
                    {selectedProgram
                      ? `${selectedProgram.code} — ${selectedProgram.name}`
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {!needsProgram && <SelectItem value="">No affiliated program</SelectItem>}
                  {programs
                    .filter((program) => program.isActive !== false)
                    .map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.code} — {program.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {needsMajor && selectedProgram && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="add-role-major" className="text-sm font-medium">
                Major
              </label>
              <Select
                value={majorId}
                onValueChange={(value) => setMajorId(value ?? "")}
                disabled={isAdding}
              >
                <SelectTrigger id="add-role-major" className="w-full">
                  <SelectValue placeholder="Select major">
                    {programMajors.find((major) => major.id === majorId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {programMajors.map((major) => (
                    <SelectItem key={major.id} value={major.id}>
                      {major.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {needsPlacement && (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="add-role-year-level" className="text-sm font-medium">
                  Year level
                </label>
                <Select
                  value={yearLevel}
                  onValueChange={(value) => setYearLevel(value ?? "")}
                  disabled={isAdding}
                >
                  <SelectTrigger id="add-role-year-level" className="w-full">
                    <SelectValue placeholder="Select year">
                      {yearLevel
                        ? YEAR_LEVEL_OPTIONS.find((option) => option.value === yearLevel)?.label
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {YEAR_LEVEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="add-role-section" className="text-sm font-medium">
                  Section
                </label>
                <Select
                  value={section}
                  onValueChange={(value) => setSection(value ?? "")}
                  disabled={isAdding}
                >
                  <SelectTrigger id="add-role-section" className="w-full">
                    <SelectValue placeholder="Select section">
                      {section
                        ? STUDENT_SECTION_OPTIONS.find((option) => option.value === section)?.label
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STUDENT_SECTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {needsGraduationYear && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="add-role-graduation-year" className="text-sm font-medium">
                Graduation year
              </label>
              <Input
                id="add-role-graduation-year"
                type="number"
                min={1950}
                max={new Date().getFullYear() + 5}
                value={graduationYear}
                onChange={(event) => setGraduationYear(event.target.value)}
                disabled={isAdding}
                required
              />
            </div>
          )}

          {needsCompany && (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="add-role-company" className="text-sm font-medium">
                  Organization name
                </label>
                <Input
                  id="add-role-company"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  disabled={isAdding}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="add-role-position" className="text-sm font-medium">
                  Position (optional)
                </label>
                <Input
                  id="add-role-position"
                  value={position}
                  onChange={(event) => setPosition(event.target.value)}
                  disabled={isAdding}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isAdding || !role}>
              {isAdding ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  Adding…
                </>
              ) : (
                "Add role"
              )}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

// Helper export for toggle action
export function useToggleUserActive() {
  const [isPending, startTransition] = useTransition();

  const toggleActive = (userId: string, currentActive: boolean, onSuccess: () => void) => {
    startTransition(async () => {
      const result = await toggleUserActiveAction(userId, !currentActive);
      if (result.success) {
        showToast(`User has been ${currentActive ? "deactivated" : "activated"}.`);
        onSuccess();
      }
    });
  };

  return { toggleActive, isPending };
}

"use client";

import { useState, useTransition } from "react";
import { Mail, GraduationCap, Building2, BookOpen } from "lucide-react";
import { StudentSection, SystemRole, YearLevel } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { showToast } from "@/components/ui/toast";
import {
  toggleUserActiveAction,
  updateStudentAcademicContextAction,
} from "@/lib/actions/management-foundation-actions";
import type { SecretaryUserSummaryItem } from "../../services/list-secretary-users-summary";

const SECTION_OPTIONS: { label: string; value: StudentSection }[] = [
  { label: "Morning", value: "MORNING" },
  { label: "Afternoon", value: "AFTERNOON" },
  { label: "Evening", value: "EVENING" },
];

function formatRole(role: SystemRole): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

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

interface UserDialogsProps {
  viewUser: SecretaryUserSummaryItem | null;
  onCloseView: () => void;
  studentContextUser: SecretaryUserSummaryItem | null;
  onCloseStudentContext: () => void;
  programs: Array<{ id: string; code: string; name: string; majors: Array<{ id: string; name: string }> }>;
  yearLevels: YearLevel[];
  onUserUpdated: () => void;
}

/**
 * Secretary User Management dialogs (non-edit). The adaptive Edit User
 * dialog lives in `./edit-user-dialog` and is mounted by the list page.
 * The Student Context dialog remains here only for #80; #81 will fold
 * Student placement into the adaptive Edit User dialog and remove it.
 */
export function UserDialogs({
  viewUser,
  onCloseView,
  studentContextUser,
  onCloseStudentContext,
  programs: _programs,
  yearLevels,
  onUserUpdated,
}: UserDialogsProps) {
  const [isPending, startTransition] = useTransition();
  const [contextError, setContextError] = useState<string | null>(null);

  if (!viewUser && !studentContextUser) {
    return null;
  }

  const handleContextSubmit = (formData: FormData) => {
    if (!studentContextUser) return;
    setContextError(null);
    startTransition(async () => {
      const result = await updateStudentAcademicContextAction(formData);
      if (!result.success) {
        setContextError(result.error);
        return;
      }
      showToast(`${studentContextUser.firstName} ${studentContextUser.lastName}'s academic context has been updated.`);
      onUserUpdated();
      onCloseStudentContext();
    });
  };

  return (
    <>
      {/* View Dialog */}
      {viewUser && (
        <Dialog open={!!viewUser} onOpenChange={(open) => !open && onCloseView()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                Viewing information for {viewUser.firstName} {viewUser.lastName}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
                  Full Name
                </label>
                <p className="text-sm font-semibold">
                  {viewUser.firstName} {viewUser.lastName}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
                  Email Address
                </label>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Mail className="text-muted-foreground size-4" />
                  {viewUser.email}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
                  Role
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {viewUser.roles.map((role) => (
                    <Badge key={role} className={getRoleBadgeClass(role)}>
                      {formatRole(role)}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
                  Program
                </label>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="text-muted-foreground size-4" />
                  {viewUser.programLabel}
                </div>
              </div>
              {viewUser.majorLabel && viewUser.majorLabel !== "N/A" && (
                <div className="space-y-1">
                  <label className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
                    Major
                  </label>
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="text-muted-foreground size-4" />
                    {viewUser.majorLabel}
                  </div>
                </div>
              )}
              {viewUser.sectionLabel && viewUser.sectionLabel !== "—" && (
                <div className="space-y-1">
                  <label className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
                    Section
                  </label>
                  <div className="flex items-center gap-2 text-sm">
                    <GraduationCap className="text-muted-foreground size-4" />
                    {viewUser.sectionLabel}
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
                  Status
                </label>
                <Badge variant={viewUser.isActive ? "default" : "secondary"}>
                  {viewUser.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Student Context Dialog — kept for #80, removed in #81. */}
      {studentContextUser && (
        <Dialog open={!!studentContextUser} onOpenChange={(open) => !open && onCloseStudentContext()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Student Context</DialogTitle>
              <DialogDescription>
                Update academic context for {studentContextUser.firstName}{" "}
                {studentContextUser.lastName}.
              </DialogDescription>
            </DialogHeader>
            <form action={handleContextSubmit} className="space-y-4 pt-2">
              <input type="hidden" name="id" value={studentContextUser.id} />

              {contextError && (
                <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                  {contextError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="ctx-year-level">Year Level</Label>
                <Select name="year_level">
                  <SelectTrigger id="ctx-year-level">
                    <SelectValue placeholder="Select year level" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearLevels.map((yl) => (
                      <SelectItem key={yl} value={yl}>
                        {yl.replace("_", " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ctx-section">Section</Label>
                <Select name="section" defaultValue={studentContextUser.sectionLabel ?? ""}>
                  <SelectTrigger id="ctx-section">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCloseStudentContext}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : "Save Context"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
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

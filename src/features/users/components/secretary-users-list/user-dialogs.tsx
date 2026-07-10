import { useTransition } from "react";
import { Mail, GraduationCap, Building2, BookOpen } from "lucide-react";
import { SystemRole } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast";
import {
  toggleUserActiveAction,
} from "@/lib/actions/management-foundation-actions";
import type { SecretaryUserSummaryItem } from "../../services/list-secretary-users-summary";

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
  onUserUpdated: () => void;
}

/**
 * Secretary User Management view dialog. The adaptive Edit User
 * dialog lives in `./edit-user-dialog` and is mounted by the list page.
 */
export function UserDialogs({
  viewUser,
  onCloseView,
}: UserDialogsProps) {
  if (!viewUser) {
    return null;
  }

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

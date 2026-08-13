import { useTransition } from "react";
import { Mail, GraduationCap, Building2, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast";
import { toggleUserActiveAction } from "@/lib/actions/management-foundation-actions";
import { formatRole, getRoleBadgeClass } from "@/features/users/lib/role-visuals";
import type { SecretaryUserSummaryItem } from "../../services/list-secretary-users-summary";

interface UserDialogsProps {
  viewUser: SecretaryUserSummaryItem | null;
  onCloseView: () => void;
  onUserUpdated: () => void;
}

/**
 * Secretary User Management view dialog. The adaptive Edit User
 * dialog lives in `./edit-user-dialog` and is mounted by the list page.
 */
export function UserDialogs({ viewUser, onCloseView }: UserDialogsProps) {
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
                Viewing information for {viewUser.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 pt-2">
              <div className="flex flex-col gap-1">
                <label className="text-label-sm text-muted-foreground tracking-wider uppercase">
                  Name
                </label>
                <p className="text-sm font-semibold">{viewUser.name}</p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-sm text-muted-foreground tracking-wider uppercase">
                  Email Address
                </label>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Mail className="text-muted-foreground size-4" />
                  {viewUser.email}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-sm text-muted-foreground tracking-wider uppercase">
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
              <div className="flex flex-col gap-1">
                <label className="text-label-sm text-muted-foreground tracking-wider uppercase">
                  Program
                </label>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="text-muted-foreground size-4" />
                  {viewUser.programLabel}
                </div>
              </div>
              {viewUser.majorLabel && viewUser.majorLabel !== "N/A" && (
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm text-muted-foreground tracking-wider uppercase">
                    Major
                  </label>
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="text-muted-foreground size-4" />
                    {viewUser.majorLabel}
                  </div>
                </div>
              )}
              {viewUser.sectionLabel && viewUser.sectionLabel !== "—" && (
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm text-muted-foreground tracking-wider uppercase">
                    Section
                  </label>
                  <div className="flex items-center gap-2 text-sm">
                    <GraduationCap className="text-muted-foreground size-4" />
                    {viewUser.sectionLabel}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-label-sm text-muted-foreground tracking-wider uppercase">
                  Status
                </label>
                <Badge variant={viewUser.isActive ? "success" : "secondary"}>
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

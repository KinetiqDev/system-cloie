"use client";

import { useEffect, useState, useTransition } from "react";
import { SystemRole } from "@prisma/client";
import { Loader2, Mail, ShieldAlert, ShieldCheck } from "lucide-react";
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
}

export function EditUserDialog({
  userId,
  currentUserId,
  onClose,
  onUserUpdated,
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
}: EditUserDialogBodyProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();

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
    formData.set("id", userId);
    formData.set("first_name", trimmedFirst);
    formData.set("last_name", trimmedLast);

    const record = loadState.status === "ready" ? loadState.record : null;
    const label = record ? `${record.firstName} ${record.lastName}` : "User";

    startSubmit(async () => {
      const result = await editUserBySecretaryAction(formData);
      if (!result.success) {
        setSubmitError(result.error);
        return;
      }
      showToast(`${label}'s information has been updated.`);
      onUserUpdated();
      onClose();
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit User</DialogTitle>
        <DialogDescription>
          {loadState.status === "ready"
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
        <div
          role="alert"
          className="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
        >
          {loadState.message}
        </div>
      )}

      {loadState.status === "ready" && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 pt-2"
          aria-busy={isSubmitting}
        >
          {submitError && (
            <div
              role="alert"
              className="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
            >
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

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
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
    </>
  );
}

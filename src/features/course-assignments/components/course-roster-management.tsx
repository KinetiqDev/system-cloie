"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { RotateCcw, UserPlus, UserRoundMinus } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSectionLabel, getYearLevelDisplay } from "@/lib/constants/academic";
import {
  addRosterMembershipAction,
  removeRosterMembershipAction,
  restoreRosterMembershipAction,
} from "@/lib/actions/course-roster-actions";
import type { CourseRosterAssignmentSummary, CourseRosterMember } from "../types";

function MutationMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert aria-live="polite">
      <AlertTitle>Roster update</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function resultMessage(result: {
  success: boolean;
  error?: string;
  referenceId?: string;
  data?: { message: string };
}) {
  if (result.success) return result.data?.message ?? "Roster updated.";
  return `${result.error ?? "The roster request could not be completed."}${result.referenceId ? ` Support reference: ${result.referenceId}.` : ""}`;
}

export function AddRosterMember({ assignmentId }: { assignmentId: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await addRosterMembershipAction({ assignmentId, studentEmail: email });
      setMessage(resultMessage(result));
      if (result.success) setEmail("");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div>
        <h2 className="font-medium">Add Student to roster</h2>
        <p className="text-muted-foreground text-sm">
          Enter existing Student account email. Eligibility is checked against this assignment.
        </p>
      </div>
      <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={submit}>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="roster-student-email" className="text-sm font-medium">
            Student email
          </label>
          <Input
            id="roster-student-email"
            name="studentEmail"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isPending}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          <UserPlus data-icon="inline-start" />
          {isPending ? "Adding..." : "Add Student"}
        </Button>
      </form>
      <MutationMessage message={message} />
    </div>
  );
}

export function RemoveRosterMember({
  assignment,
  member,
}: {
  assignment: CourseRosterAssignmentSummary;
  member: CourseRosterMember;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const assignmentLabel = `${assignment.courseCode} - ${assignment.courseTitle} (${assignment.programCode}, ${getYearLevelDisplay(assignment.yearLevel)}, ${getSectionLabel(assignment.section)}, ${assignment.termLabel})`;

  function remove() {
    setMessage(null);
    startTransition(async () => {
      const result = await removeRosterMembershipAction({
        assignmentId: assignment.assignmentId,
        membershipId: member.membershipId,
      });
      setMessage(resultMessage(result));
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <AlertDialog>
        <AlertDialogTrigger
          render={<Button variant="destructive" size="sm" disabled={isPending} />}
        >
          <UserRoundMinus data-icon="inline-start" />
          Remove
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {member.studentName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {member.studentName} from Course assignment {assignmentLabel} roster only.
              This does not affect the Student account or term placement. This excludes the Student from future
              Course-bound evaluation eligibility for this assignment while membership is removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Student</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove} disabled={isPending}>
              {isPending ? "Removing..." : "Remove from roster"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <MutationMessage message={message} />
    </div>
  );
}

export function RestoreRosterMember({
  assignmentId,
  member,
}: {
  assignmentId: string;
  member: CourseRosterMember;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const reason = member.eligibility.reason?.replaceAll("_", " ").toLowerCase();

  function restore() {
    setMessage(null);
    startTransition(async () => {
      const result = await restoreRosterMembershipAction({
        assignmentId,
        membershipId: member.membershipId,
      });
      setMessage(resultMessage(result));
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={restore}
        disabled={isPending || !member.eligibility.eligible}
        title={member.eligibility.eligible ? undefined : `Cannot restore: ${reason}`}
      >
        <RotateCcw data-icon="inline-start" />
        {isPending ? "Restoring..." : "Restore"}
      </Button>
      {!member.eligibility.eligible && (
        <span className="text-muted-foreground text-xs">Cannot restore: {reason}</span>
      )}
      <MutationMessage message={message} />
    </div>
  );
}

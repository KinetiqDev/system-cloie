"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FacultyAccessRequestListItem } from "@/features/users/services/list-faculty-access-requests";
import {
  approveFacultyRequestAction,
  rejectFacultyRequestAction,
} from "@/lib/actions/faculty-approval-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

type FacultyRequestReviewListProps = {
  requests: FacultyAccessRequestListItem[];
  pendingCount: number;
  currentUserId: string;
};

const STATUS_LABEL: Record<FacultyAccessRequestListItem["status"], string> = {
  PENDING: "Awaiting review",
  APPROVED: "Approved",
  REJECTED: "Not approved",
};

function formatSubmittedAt(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().slice(0, 10);
}

/**
 * Secretary decision surface for self-submitted Faculty requests. Each row
 * shows the requested program and the decision history, and the decision is
 * written through the SECRETARY-scoped server actions.
 */

/** One reviewable request: its detail summary plus the pending decision controls. */
function FacultyRequestRow({
  request,
  note,
  isPending,
  onNoteChange,
  onDecide,
}: {
  request: FacultyAccessRequestListItem;
  note: string;
  isPending: boolean;
  onNoteChange: (value: string) => void;
  onDecide: (decision: "approve" | "reject") => void;
}) {
  const isDecided = request.status !== "PENDING";

  return (
    <Card data-testid={`faculty-request-${request.userId}`}>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="text-title-md truncate">{request.name}</CardTitle>
            <CardDescription className="truncate">{request.email}</CardDescription>
          </div>
          <Badge variant={isDecided ? "secondary" : "warning"} className="w-fit shrink-0">
            {STATUS_LABEL[request.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="text-body-sm grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Requested program</dt>
            <dd className="text-foreground">
              {request.programCode} — {request.programName}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Submitted</dt>
            <dd className="text-foreground">{formatSubmittedAt(request.submittedAt)}</dd>
          </div>
          {!request.isActive && (
            <div className="flex gap-2 sm:col-span-2">
              <dt className="text-muted-foreground">Account</dt>
              <dd className="text-destructive">Deactivated</dd>
            </div>
          )}
          {request.decidedAt && (
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Decided</dt>
              <dd className="text-foreground">{formatSubmittedAt(request.decidedAt)}</dd>
            </div>
          )}
          {request.decisionNote && (
            <div className="flex gap-2 sm:col-span-2">
              <dt className="text-muted-foreground">Note</dt>
              <dd className="text-foreground">{request.decisionNote}</dd>
            </div>
          )}
        </dl>

        {request.status === "PENDING" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`note-${request.userId}`}>Decision note (optional)</Label>
              <Input
                id={`note-${request.userId}`}
                value={note}
                maxLength={500}
                placeholder="Reason shared with the applicant"
                onChange={(event) => onNoteChange(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => onDecide("approve")}
                disabled={isPending}
                className="min-h-11 w-full sm:w-auto"
              >
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Approve Faculty access
              </Button>
              <Button
                variant="outline"
                onClick={() => onDecide("reject")}
                disabled={isPending}
                className="min-h-11 w-full sm:w-auto"
              >
                <XCircle className="size-4" aria-hidden="true" />
                Do not approve
              </Button>
            </div>
          </div>
        )}

        {isDecided && (
          <p className="text-body-sm text-muted-foreground">
            This request is closed. The applicant can submit a new request from Faculty
            registration.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
export function FacultyRequestReviewList({
  requests,
  pendingCount,
  currentUserId,
}: FacultyRequestReviewListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  const decide = (request: FacultyAccessRequestListItem, decision: "approve" | "reject") => {
    setError(null);
    startTransition(async () => {
      const result =
        decision === "approve"
          ? await approveFacultyRequestAction({
              userId: request.userId,
              note: note[request.userId]?.trim() || undefined,
            })
          : await rejectFacultyRequestAction({
              userId: request.userId,
              note: note[request.userId]?.trim() || undefined,
            });

      if (!result.success) {
        setError(result.error);
        return;
      }
      setNote((current) => ({ ...current, [request.userId]: "" }));
      router.refresh();
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-xl text-foreground text-pretty">Faculty Requests</h1>
        <p className="text-body-sm text-text-secondary">
          Review Faculty registration requests. A request grants no Faculty access until you approve
          it.
        </p>
        <p className="text-body-sm text-muted-foreground" data-testid="pending-count">
          {pendingCount} awaiting review
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-body-md text-muted-foreground">No Faculty requests yet.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {requests.map((request) => (
            <li key={request.userId}>
              <FacultyRequestRow
                request={request}
                note={note[request.userId] ?? ""}
                isPending={isPending}
                onNoteChange={(value) =>
                  setNote((current) => ({ ...current, [request.userId]: value }))
                }
                onDecide={(decision) => decide(request, decision)}
              />
            </li>
          ))}
        </ul>
      )}

      <p className="text-body-sm text-muted-foreground">
        You are reviewing as {currentUserId ? "Secretary" : "an authorized role"}.
      </p>
    </div>
  );
}

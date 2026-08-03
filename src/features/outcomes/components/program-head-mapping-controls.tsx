"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  commitMappingAction,
  prepareMappingAction,
  prepareRemoveMappingAction,
} from "@/lib/actions/program-head-outcome-actions";
import type { OutcomeWriteReview } from "@/features/outcomes/services/manage-outcome-writes";

type PrepareState =
  | { success: true; review: OutcomeWriteReview }
  | { success: false; error: string }
  | null;

type Props = {
  programId: string;
  ciloId: string;
  ciloIndex: number;
  mappedGOs: Array<{ id: string; mappingId: string; code: string; description: string }>;
  activeGOs: Array<{ id: string; code: string }>;
};

export function ProgramHeadMappingControls({
  programId,
  ciloId,
  ciloIndex,
  mappedGOs,
  activeGOs,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {mappedGOs.length ? (
        mappedGOs.map((go) => (
          <RemoveMappingControl key={go.mappingId} programId={programId} go={go} />
        ))
      ) : (
        <span className="text-text-muted text-xs italic">No mappings</span>
      )}
      <CreateMappingControl
        programId={programId}
        ciloId={ciloId}
        ciloIndex={ciloIndex}
        mappedGOIds={new Set(mappedGOs.map((go) => go.id))}
        activeGOs={activeGOs}
      />
    </div>
  );
}

function RemoveMappingControl({
  programId,
  go,
}: {
  programId: string;
  go: Props["mappedGOs"][number];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<PrepareState, FormData>(
    async (_state, formData) => prepareRemoveMappingAction(formData),
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isCommitting, startCommit] = useTransition();
  const confirm = () =>
    startCommit(async () => {
      if (!state?.success) return;
      const result = await commitMappingAction(state.review, true);
      if (result.success) router.refresh();
      else setError(result.error);
    });

  return (
    <div>
      <div className="flex items-center gap-1">
        <span
          className="bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-xs"
          title={go.description}
        >
          {go.code}
        </span>
        {state?.success ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-6 px-1 text-xs"
            onClick={confirm}
            disabled={isCommitting}
          >
            {isCommitting ? "Removing..." : "Confirm remove"}
          </Button>
        ) : (
          <form action={action}>
            <input type="hidden" name="programId" value={programId} />
            <input type="hidden" name="id" value={go.mappingId} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="h-6 px-1 text-xs"
              disabled={pending}
            >
              {pending ? "Preparing..." : "Remove"}
            </Button>
          </form>
        )}
      </div>
      {state?.success && <ReviewSummary review={state.review} />}
      {error && (
        <p role="alert" className="text-danger mt-1 text-xs">
          {error}
        </p>
      )}
      {state && !state.success && (
        <p role="alert" className="text-danger mt-1 text-xs">
          {state.error}
        </p>
      )}
    </div>
  );
}

function CreateMappingControl({
  programId,
  ciloId,
  ciloIndex,
  mappedGOIds,
  activeGOs,
}: {
  programId: string;
  ciloId: string;
  ciloIndex: number;
  mappedGOIds: Set<string>;
  activeGOs: Props["activeGOs"];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<PrepareState, FormData>(
    async (_state, formData) => prepareMappingAction(formData),
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isCommitting, startCommit] = useTransition();
  const confirm = () =>
    startCommit(async () => {
      if (!state?.success) return;
      const result = await commitMappingAction(state.review, true);
      if (result.success) router.refresh();
      else setError(result.error);
    });

  return (
    <div className="basis-full">
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="programId" value={programId} />
        <input type="hidden" name="ciloId" value={ciloId} />
        <Select name="goId" required defaultValue="" disabled={state?.success || pending}>
          <SelectTrigger size="sm" aria-label={`Graduate Outcome for CILO ${ciloIndex + 1}`}>
            <SelectValue
              placeholder={state?.success ? "Review selected outcome" : "Map to Graduate Outcome"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {activeGOs
                .filter((go) => !mappedGOIds.has(go.id))
                .map((go) => (
                  <SelectItem key={go.id} value={go.id}>
                    {go.code}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {state?.success ? (
          <Button
            type="button"
            size="sm"
            className="h-7 text-xs"
            onClick={confirm}
            disabled={isCommitting}
          >
            {isCommitting ? "Adding..." : "Confirm mapping"}
          </Button>
        ) : (
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={pending}
          >
            {pending ? "Preparing..." : "Review mapping"}
          </Button>
        )}
      </form>
      {state?.success && <ReviewSummary review={state.review} />}
      {error && (
        <p role="alert" className="text-danger mt-1 text-xs">
          {error}
        </p>
      )}
      {state && !state.success && (
        <p role="alert" className="text-danger mt-1 text-xs">
          {state.error}
        </p>
      )}
    </div>
  );
}

function ReviewSummary({ review }: { review: OutcomeWriteReview }) {
  return (
    <div className="bg-surface-alt mt-2 rounded-md p-2 text-xs" aria-label="Mapping change review">
      <p className="font-semibold">Review this change</p>
      <p>Before: {JSON.stringify(review.before)}</p>
      <p>After: {JSON.stringify(review.after)}</p>
    </div>
  );
}

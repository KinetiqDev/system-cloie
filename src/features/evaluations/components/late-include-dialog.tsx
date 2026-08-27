"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/components/ui/toast";
import type { CourseBoundEvaluationExclusionReversalCategory } from "@prisma/client";
import {
  EXCLUSION_CATEGORY_LABELS,
  REVERSAL_CATEGORY_OPTIONS,
  getReversalCategoryLabel,
} from "../exclusion-categories";
import type {
  FacultyEvaluationDetail,
  LateIncludeCourseBoundEvaluationInput,
  LateIncludeCourseBoundEvaluationResult,
} from "../types";

type Exclusion = FacultyEvaluationDetail["exclusions"][number];


type LateIncludeDialogProps = {
  action: (
    payload: LateIncludeCourseBoundEvaluationInput
  ) => Promise<LateIncludeCourseBoundEvaluationResult>;
  evaluationId: string;
  exclusions: Exclusion[];
  status: string;
};

export function LateIncludeDialog({
  action,
  evaluationId,
  exclusions,
  status,
}: LateIncludeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Exclusion | null>(null);
  const [category, setCategory] =
    useState<CourseBoundEvaluationExclusionReversalCategory>("EXCLUDED_IN_ERROR");
  const [explanation, setExplanation] = useState("");
  const [isPending, startTransition] = useTransition();
  const [reversedMembershipIds, setReversedMembershipIds] = useState<string[]>([]);
  const availableExclusions = exclusions.filter(
    (exclusion) =>
      exclusion.membershipActive &&
      !exclusion.reversedAt &&
      !reversedMembershipIds.includes(exclusion.membershipId)
  );
  const isClosed = status !== "ACTIVE" && status !== "SCHEDULED";

  function openFor(exclusion: Exclusion) {
    setSelected(exclusion);
    setCategory("EXCLUDED_IN_ERROR");
    setExplanation("");
    setOpen(true);
  }

  function submit() {
    if (!selected) return;
    startTransition(async () => {
      const result = await action({
        evaluationId,
        membershipId: selected.membershipId,
        reversalCategory: category,
        ...(category === "OTHER" ? { reversalOtherExplanation: explanation.trim() } : {}),
      });
      if (!result.success) {
        showToast(result.error, "error");
        return;
      }
      setReversedMembershipIds((previous) => [...previous, selected.membershipId]);
      showToast(result.data.message);
      setOpen(false);
    });
  }

  if (isClosed || availableExclusions.length === 0) return null;

  return (
    <>
      <div className="space-y-3 rounded-lg border p-4">
        <div>
          <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
            Excluded roster members
          </h4>
          <p className="text-muted-foreground text-sm">
            Late inclusion records a separate reversal audit and does not unlock this Course roster.
          </p>
        </div>
        <div className="space-y-2">
          {availableExclusions.map((exclusion) => (
            <div
              className="flex items-center justify-between gap-3 rounded-md border p-3"
              key={exclusion.membershipId}
            >
              <div>
                <p className="font-medium">{exclusion.studentName}</p>
                <p className="text-muted-foreground text-xs">
                  {EXCLUSION_CATEGORY_LABELS[exclusion.category]}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => openFor(exclusion)}>
                Late include
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Late include {selected?.studentName}</DialogTitle>
            <DialogDescription>
              This creates evaluation access through Student portal only. It does not change roster
              membership or send notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="late-inclusion-reason">Reversal reason</Label>
              <Select
                value={category}
                onValueChange={(value) =>
                  setCategory(value as CourseBoundEvaluationExclusionReversalCategory)
                }
              >
                <SelectTrigger id="late-inclusion-reason" className="w-full">
                  <SelectValue>{getReversalCategoryLabel(category)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {REVERSAL_CATEGORY_OPTIONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {category === "OTHER" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="late-inclusion-explanation">Neutral explanation</Label>
                <Textarea
                  id="late-inclusion-explanation"
                  maxLength={200}
                  minLength={5}
                  value={explanation}
                  onChange={(event) => setExplanation(event.target.value)}
                  placeholder="Neutral explanation (5-200 characters)"
                />
                <p className="text-muted-foreground text-xs">
                  Do not include sensitive medical or disciplinary details.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={isPending}>
              {isPending ? "Including..." : "Confirm late inclusion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

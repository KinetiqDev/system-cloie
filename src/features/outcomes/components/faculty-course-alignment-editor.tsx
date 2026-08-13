"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, RotateCcw, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type {
  CourseAlignmentReview,
  FacultyCourseAlignment,
} from "@/features/outcomes/services/manage-faculty-course-alignment";

type Props = {
  alignment: FacultyCourseAlignment;
  prepareAction: (input: unknown) => Promise<
    | { success: true; review: CourseAlignmentReview }
    | { success: false; error: string }
  >;
  commitAction: (
    review: unknown,
    confirmed: boolean
  ) => Promise<{ success: true; changed: number } | { success: false; error: string }>;
};

export function FacultyCourseAlignmentEditor({ alignment, prepareAction, commitAction }: Props) {
  const initialTargetIds = Object.fromEntries(
    alignment.cilos.map((cilo) => [cilo.id, cilo.targetIds])
  ) as Record<string, string[]>;
  const [draft, setDraft] = useState(initialTargetIds);
  const [savedTargetIds, setSavedTargetIds] = useState(initialTargetIds);
  const [openCilo, setOpenCilo] = useState<string | null>(null);
  const [search, setSearch] = useState<Record<string, string>>({});
  const [review, setReview] = useState<CourseAlignmentReview | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isDirty = alignment.cilos.some(
    (cilo) => JSON.stringify(draft[cilo.id] ?? []) !== JSON.stringify(savedTargetIds[cilo.id] ?? [])
  );
  const additions = useMemo(
    () =>
      alignment.cilos.flatMap((cilo) =>
        (draft[cilo.id] ?? [])
          .filter((targetId) => !(savedTargetIds[cilo.id] ?? []).includes(targetId))
          .map((targetId) => ({ ciloId: cilo.id, targetId }))
      ),
    [alignment.cilos, draft, savedTargetIds]
  );
  const removals = useMemo(
    () =>
      alignment.cilos.flatMap((cilo) =>
        (savedTargetIds[cilo.id] ?? [])
          .filter((targetId) => !(draft[cilo.id] ?? []).includes(targetId))
          .map((targetId) => ({ ciloId: cilo.id, targetId }))
      ),
    [alignment.cilos, draft, savedTargetIds]
  );

  const targetById = new Map(alignment.targets.map((target) => [target.id, target]));
  const toggleTarget = (ciloId: string, targetId: string) => {
    setDraft((current) => {
      const selected = current[ciloId] ?? [];
      return {
        ...current,
        [ciloId]: selected.includes(targetId)
          ? selected.filter((id) => id !== targetId)
          : [...selected, targetId],
      };
    });
    setSuccess(null);
  };

  const prepareReview = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await prepareAction({
        courseId: alignment.course.id,
        desired: alignment.cilos.map((cilo) => ({ ciloId: cilo.id, targetIds: draft[cilo.id] ?? [] })),
      });
      if (result.success) setReview(result.review);
      else setError(result.error);
    } catch {
      setError("Could not prepare the alignment review. Retry.");
    } finally {
      setPending(false);
    }
  };

  const commitReview = async () => {
    if (!review) return;
    setPending(true);
    setError(null);
    try {
      const result = await commitAction(review, true);
      setReview(null);
      if (result.success) {
        setSavedTargetIds(draft);
        setSuccess(`${result.changed} mapping change${result.changed === 1 ? "" : "s"} saved.`);
      } else {
        setError(result.error);
      }
    } catch {
      setReview(null);
      setError("Could not save the Course alignment. Retry from a fresh review.");
    } finally {
      setPending(false);
    }
  };

  const resetDraft = () => {
    setDraft(savedTargetIds);
    setSuccess(null);
    setError(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Faculty Course alignment</p>
          <h1 className="text-heading-lg">{alignment.course.code}: {alignment.course.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Select the active Graduate Outcomes owned by {alignment.course.program.code}.
          </p>
        </div>
        <Badge variant={alignment.readiness === "ready" ? "default" : "outline"}>
          {alignment.readiness === "ready" ? "Ready" : alignment.readiness === "missing-cilos" ? "Missing CILOs" : "Incomplete mapping"}
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error} Reload the page and retry if the issue persists.</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="success" role="status">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      {alignment.cilos.length === 0 ? (
        <Card>
          <CardHeader><CardTitle>No active CILOs</CardTitle><CardDescription>Add a Course Intended Learning Outcome before aligning this Course.</CardDescription></CardHeader>
        </Card>
      ) : alignment.targets.length === 0 ? (
        <Card>
          <CardHeader><CardTitle>No active Graduate Outcomes</CardTitle><CardDescription>{alignment.course.program.code} has no active targets available for this Course.</CardDescription></CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {/* fallow-ignore-next-line complexity */}
          {alignment.cilos.map((cilo, index) => {
            const query = (search[cilo.id] ?? "").toLowerCase().trim();
            const targets = alignment.targets.filter(
              (target) => !query || `${target.code} ${target.description}`.toLowerCase().includes(query)
            );
            const selectedCount = (draft[cilo.id] ?? []).length;
            return (
              <Card key={cilo.id}>
                <CardHeader>
                  <CardTitle className="text-title-md">CILO {index + 1}</CardTitle>
                  <CardDescription>{cilo.description}</CardDescription>
                  <p className="text-muted-foreground text-sm" aria-live="polite">{selectedCount} Graduate Outcome{selectedCount === 1 ? "" : "s"} selected</p>
                </CardHeader>
                <CardContent>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full justify-between"
                    aria-expanded={openCilo === cilo.id}
                    aria-controls={`cilo-targets-${cilo.id}`}
                    onClick={() => setOpenCilo(openCilo === cilo.id ? null : cilo.id)}
                  >
                    <span>{openCilo === cilo.id ? "Hide Graduate Outcomes" : "Choose Graduate Outcomes"}</span>
                    <ChevronDown data-icon="inline-end" />
                  </Button>
                  {openCilo === cilo.id && (
                    <div id={`cilo-targets-${cilo.id}`} className="mt-3 flex flex-col gap-2">
                      <label htmlFor={`go-search-${cilo.id}`} className="text-sm font-medium">Search Graduate Outcomes</label>
                      <Input
                        id={`go-search-${cilo.id}`}
                        value={search[cilo.id] ?? ""}
                        onChange={(event) => setSearch((current) => ({ ...current, [cilo.id]: event.target.value }))}
                        placeholder="Search by code or statement"
                      />
                      <div className="flex max-h-72 flex-col gap-1 overflow-y-auto" role="group" aria-label={`Graduate Outcomes for CILO ${index + 1}`}>
                        {targets.map((target) => {
                          const selected = (draft[cilo.id] ?? []).includes(target.id);
                          return (
                            <label key={target.id} className="border-border hover:bg-muted flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 focus-within:ring-3 focus-within:ring-ring/50">
                              <Checkbox checked={selected} disabled={pending || review !== null} onCheckedChange={() => toggleTarget(cilo.id, target.id)} aria-label={`${target.code}: ${target.description}`} />
                              <span className="flex flex-col gap-0.5"><span className="font-medium">{target.code}</span><span className="text-muted-foreground text-sm">{target.description}</span></span>
                              {selected && <Check className="text-primary ml-auto mt-0.5" aria-hidden="true" />}
                            </label>
                          );
                        })}
                        {targets.length === 0 && <p className="text-muted-foreground p-3 text-sm">No Graduate Outcomes match this search.</p>}
                      </div>
                    </div>
                  )}
                  {selectedCount > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2" aria-label={`Selected Graduate Outcomes for CILO ${index + 1}`}>
                      {(draft[cilo.id] ?? []).map((targetId) => <Badge key={targetId} variant="secondary">{targetById.get(targetId)?.code ?? targetId}</Badge>)}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={resetDraft} disabled={!isDirty || pending || review !== null}><RotateCcw data-icon="inline-start" />Discard changes</Button>
        <Button type="button" onClick={prepareReview} disabled={!isDirty || pending || alignment.cilos.length === 0 || review !== null} loading={pending}><Save data-icon="inline-start" />Review {additions.length + removals.length} changes</Button>
      </div>

      <AlertDialog open={review !== null} onOpenChange={(open) => !open && setReview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Review Course alignment changes</AlertDialogTitle>
            <AlertDialogDescription>These changes apply to every active teaching assignment for this Program-specific Course. Confirm the complete before and after mapping.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto text-sm">
            {review?.additions.map(({ ciloId, targetId }) => <p key={`add-${ciloId}-${targetId}`}><span className="font-medium text-success">Add</span> {targetById.get(targetId)?.code} to CILO {alignment.cilos.findIndex((cilo) => cilo.id === ciloId) + 1}</p>)}
            {review?.removals.map(({ ciloId, targetId }) => <p key={`remove-${ciloId}-${targetId}`}><span className="font-medium text-destructive">Remove</span> {targetById.get(targetId)?.code} from CILO {alignment.cilos.findIndex((cilo) => cilo.id === ciloId) + 1}</p>)}
            {review && review.additions.length + review.removals.length === 0 && <p>No mapping changes.</p>}
          </div>
          <AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={commitReview} disabled={pending}>{pending ? "Saving..." : "Confirm and save"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

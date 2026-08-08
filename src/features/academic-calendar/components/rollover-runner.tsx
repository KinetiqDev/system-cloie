"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { showToast } from "@/components/ui/toast";
import type { TermInstanceItem } from "../types";
import type {
  RolloverException,
  RunTermRolloverInput,
} from "../services/run-term-rollover";
import { RolloverExceptionsTable } from "./rollover-exceptions-table";

type Step = "confirm" | "running" | "results";

interface RolloverRunnerProps {
  sourceTerm: TermInstanceItem;
  targetTerm: TermInstanceItem;
  previewAction: (input: RunTermRolloverInput) => Promise<
    | {
        success: true;
        data: {
          wouldProcessCount: number;
          wouldCreateCount: number;
          wouldSkipCount: number;
          exceptions: RolloverException[];
        };
      }
    | { success: false; error: string }
  >;
  runAction: (input: RunTermRolloverInput) => Promise<
    | {
        success: true;
        data: {
          processedCount: number;
          createdCount: number;
          skippedCount: number;
          exceptions: RolloverException[];
        };
      }
    | { success: false; error: string }
  >;
}

export function RolloverRunner({
  sourceTerm,
  targetTerm,
  previewAction,
  runAction,
}: RolloverRunnerProps) {
  const [step, setStep] = useState<Step>("confirm");
  const [previewData, setPreviewData] = useState<{
    wouldProcessCount: number;
    wouldCreateCount: number;
    wouldSkipCount: number;
    exceptions: RolloverException[];
  } | null>(null);
  const [resultData, setResultData] = useState<{
    processedCount: number;
    createdCount: number;
    skippedCount: number;
    exceptions: RolloverException[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePreview = async () => {
    setIsLoading(true);
    try {
      const result = await previewAction({
        sourceTermInstanceId: sourceTerm.id,
        targetTermInstanceId: targetTerm.id,
      });

      if (!result.success) {
        showToast(result.error, "error");
        return;
      }

      setPreviewData(result.data);
    } catch {
      showToast("Failed to load preview. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRun = async () => {
    setStep("running");
    setIsLoading(true);

    try {
      const result = await runAction({
        sourceTermInstanceId: sourceTerm.id,
        targetTermInstanceId: targetTerm.id,
      });

      if (!result.success) {
        showToast(result.error, "error");
        setStep("confirm");
        return;
      }

      setResultData(result.data);
      setStep("results");

      const toastMessage = `Rollover complete! ${result.data.createdCount} enrollments created, ${result.data.exceptions.length} exceptions.`;
      showToast(toastMessage, "success");
    } catch {
      showToast("Rollover failed. Please try again.", "error");
      setStep("confirm");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTermLabel = (term: TermInstanceItem) => {
    return term.term
      ? `${term.schoolYearCode} — ${term.semester} — ${term.term}`
      : `${term.schoolYearCode} — ${term.semester}`;
  };

  // ─── Confirm Step ─────────────────────────────────────────────────────────

  if (step === "confirm") {
    return (
      <div className="rounded-xl border bg-card space-y-6 p-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Confirm Term Rollover</h3>
          <p className="text-muted-foreground text-sm">
            This will roll over active student enrollments from the source term to the target
            term, promoting students to their next year level.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 rounded-lg bg-muted p-4">
            <p className="text-muted-foreground text-xs font-semibold uppercase">Source Term</p>
            <p className="font-medium">{formatTermLabel(sourceTerm)}</p>
          </div>
          <div className="space-y-1 rounded-lg bg-muted p-4">
            <p className="text-muted-foreground text-xs font-semibold uppercase">Target Term</p>
            <p className="font-medium">{formatTermLabel(targetTerm)}</p>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium">Cohort Promotion Rules:</p>
          <ul className="text-muted-foreground text-sm space-y-1">
            <li>• 1st Year → 2nd Year</li>
            <li>• 2nd Year → 3rd Year</li>
            <li>• 3rd Year → 4th Year</li>
            <li>• 4th Year → Graduating (exception)</li>
          </ul>
        </div>

        {previewData ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="text-center">
                <p className="text-2xl font-bold">{previewData.wouldProcessCount}</p>
                <p className="text-muted-foreground text-xs">Students to Process</p>
              </div>
              <div className="text-center">
                <p className="text-text-primary text-2xl font-bold">{previewData.wouldCreateCount}</p>
                <p className="text-muted-foreground text-xs">Enrollments to Create</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground text-2xl font-bold">
                  {previewData.wouldSkipCount}
                </p>
                <p className="text-muted-foreground text-xs">Already Enrolled (Skip)</p>
              </div>
            </div>

            {previewData.exceptions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Exceptions ({previewData.exceptions.length})
                </p>
                <RolloverExceptionsTable exceptions={previewData.exceptions} />
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setPreviewData(null)}>
                Refresh Preview
              </Button>
              <Button
                type="button"
                onClick={handleRun}
                loading={isLoading}
                className="flex-1"
              >
                {isLoading ? "Processing..." : "Run Rollover"}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            onClick={handlePreview}
            loading={isLoading}
            className="w-full"
          >
            {isLoading ? "Loading Preview..." : "Preview Rollover"}
          </Button>
        )}
      </div>
    );
  }

  // ─── Running Step ──────────────────────────────────────────────────────────

  if (step === "running") {
    return (
      <div className="rounded-xl border bg-card space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h3 className="text-lg font-semibold">Running Rollover...</h3>
          <p className="text-muted-foreground text-sm">
            Creating enrollments for {formatTermLabel(targetTerm)}
          </p>
        </div>

        <div className="flex items-center justify-center">
          <Spinner size="lg" label="Running rollover" />
        </div>

        <Progress value={50} className="w-full" />

        <p className="text-muted-foreground text-center text-sm">
          This may take a moment for large cohorts.
        </p>
      </div>
    );
  }

  // ─── Results Step ─────────────────────────────────────────────────────────

  if (step === "results" && resultData) {
    return (
      <div className="rounded-xl border bg-card space-y-6 p-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Rollover Complete</h3>
          <p className="text-muted-foreground text-sm">
            Successfully processed enrollments for {formatTermLabel(targetTerm)}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-2xl font-bold">{resultData.processedCount}</p>
            <p className="text-muted-foreground text-xs">Students Processed</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-4 text-center">
            <p className="text-text-primary text-2xl font-bold">{resultData.createdCount}</p>
            <p className="text-muted-foreground text-xs">Enrollments Created</p>
          </div>
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-muted-foreground text-2xl font-bold">
              {resultData.skippedCount}
            </p>
            <p className="text-muted-foreground text-xs">Already Enrolled</p>
          </div>
        </div>

        {resultData.exceptions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Exceptions Requiring Review</p>
            <RolloverExceptionsTable exceptions={resultData.exceptions} />
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => setStep("confirm")}>
            Run Another Rollover
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

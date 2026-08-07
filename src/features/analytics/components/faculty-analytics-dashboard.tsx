"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import { BarChart3, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { showToast } from "@/components/ui/toast";
import type { FacultyAnalyticsEvaluationItem, FacultyAnalyticsData } from "../types";
import type { FacultyAnalyticsFilters } from "../services/list-faculty-analytics-evaluations";
import { FacultyAnalyticsFilters as FilterComponent } from "./faculty-analytics-filters";
import { FacultyAnalyticsSummary } from "./faculty-analytics-summary";
import { FacultyCiloAnalyticsChart } from "./faculty-cilo-analytics-chart";
import { FacultyQualitativeCloud } from "./faculty-qualitative-cloud";
import { FacultyQuantitativeBreakdown } from "./faculty-quantitative-breakdown";
import {
  listFacultyAnalyticsEvaluationsAction,
  getFacultyAnalyticsDataAction,
} from "@/lib/actions/faculty-analytics-actions";

type FacultyAnalyticsDashboardProps = {
  initialEvaluations: FacultyAnalyticsEvaluationItem[];
  availableAcademicYears: string[];
  availableCourses: { id: string; label: string }[];
};

export function FacultyAnalyticsDashboard({
  initialEvaluations,
  availableAcademicYears,
  availableCourses,
}: FacultyAnalyticsDashboardProps) {
  const [evaluations, setEvaluations] =
    useState<FacultyAnalyticsEvaluationItem[]>(initialEvaluations);
  const [filters, setFilters] = useState<FacultyAnalyticsFilters>({});
  const [selectedEvaluationIds, setSelectedEvaluationIds] = useState<string[]>([]);
  const [analyticsData, setAnalyticsData] = useState<FacultyAnalyticsData[]>([]);
  const [isPending, startTransition] = useTransition();
  const isInitialMount = useRef(true);

  const handleFilterChange = useCallback((newFilters: FacultyAnalyticsFilters) => {
    setFilters(newFilters);
  }, []);

  const handleApplyFilters = useCallback(() => {
    startTransition(async () => {
      const result = await listFacultyAnalyticsEvaluationsAction(filters);
      if (result.success) {
        setEvaluations(result.evaluations);
        // Clear selection when filters change
        setSelectedEvaluationIds([]);
        setAnalyticsData([]);
      } else {
        showToast(result.error, "error");
      }
    });
  }, [filters]);

  const handleEvaluationToggle = useCallback((evaluationId: string) => {
    setSelectedEvaluationIds((prev) =>
      prev.includes(evaluationId)
        ? prev.filter((id) => id !== evaluationId)
        : [...prev, evaluationId]
    );
  }, []);

  // Load analytics data when selection changes
  useEffect(() => {
    // Skip on initial mount - analyticsData starts as empty array
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Clear data if no evaluations selected
    if (selectedEvaluationIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clearing data when selection is empty is intentional
      setAnalyticsData([]);
      return;
    }

    // Fetch data for selected evaluations
    startTransition(async () => {
      const result = await getFacultyAnalyticsDataAction(selectedEvaluationIds);
      if (result.success) {
        setAnalyticsData(result.data);
      } else {
        showToast(result.error, "error");
      }
    });
  }, [selectedEvaluationIds]);

  // Aggregate data across all selected evaluations
  const aggregatedData = {
    totalEvaluations: selectedEvaluationIds.length,
    totalResponses: analyticsData.reduce((sum, d) => sum + d.responseCount, 0),
    totalAssignments: analyticsData.reduce((sum, d) => sum + d.totalAssignments, 0),
    overallMean:
      analyticsData.length > 0
        ? analyticsData.reduce((sum, d) => sum + (d.overallMean || 0), 0) / analyticsData.length
        : null,
  };

  const responseRate =
    aggregatedData.totalAssignments > 0
      ? (aggregatedData.totalResponses / aggregatedData.totalAssignments) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-heading-lg flex items-center gap-2">
          <BarChart3 className="size-6" />
          Analytics
        </h1>
        <p className="text-body-md text-text-secondary">
          Comprehensive analytics for your course-bound evaluations. Select evaluations to view
          detailed insights.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="text-muted-foreground size-4" />
              <CardTitle>Filters</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={handleApplyFilters} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Apply Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <FilterComponent
            filters={filters}
            onChange={handleFilterChange}
            availableAcademicYears={availableAcademicYears}
            availableCourses={availableCourses}
          />
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <FacultyAnalyticsSummary
        totalEvaluations={aggregatedData.totalEvaluations}
        totalResponses={aggregatedData.totalResponses}
        totalAssignments={aggregatedData.totalAssignments}
        responseRate={responseRate}
        overallMean={aggregatedData.overallMean}
        isLoading={isPending}
      />

      {/* Evaluation Selector */}
      {evaluations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Evaluations ({selectedEvaluationIds.length} selected)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {evaluations.map((evaluation) => (
                <label
                  key={evaluation.id}
                  className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg border p-3"
                >
                  <Checkbox
                    checked={selectedEvaluationIds.includes(evaluation.id)}
                    onCheckedChange={() => handleEvaluationToggle(evaluation.id)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{evaluation.deploymentName}</p>
                    <p className="text-muted-foreground text-xs">
                      {evaluation.courseCode} • {evaluation.termInstanceLabel}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {evaluation.responseCount}/{evaluation.totalAssignments} responses
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {analyticsData.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* CILO Analytics Pie Chart */}
          <FacultyCiloAnalyticsChart data={analyticsData} />

          {/* Qualitative Word Cloud */}
          <FacultyQualitativeCloud data={analyticsData} />
        </div>
      )}

      {/* Quantitative Breakdown */}
      {analyticsData.length > 0 && <FacultyQuantitativeBreakdown data={analyticsData} />}

      {/* Empty State */}
      {selectedEvaluationIds.length === 0 && evaluations.length > 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="text-muted-foreground mx-auto mb-4 size-10" />
            <p className="text-muted-foreground text-sm">
              Select one or more evaluations above to view detailed analytics.
            </p>
          </CardContent>
        </Card>
      )}

      {evaluations.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="text-muted-foreground mx-auto mb-4 size-10" />
            <p className="text-muted-foreground text-sm">
              No evaluations found. Publish evaluations from the Tools page to see analytics.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

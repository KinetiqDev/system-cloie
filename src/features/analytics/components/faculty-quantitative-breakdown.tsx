"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { FacultyAnalyticsData, FacultyQuantitativeQuestion } from "../types";

type FacultyQuantitativeBreakdownProps = {
  data: FacultyAnalyticsData[];
};

export function FacultyQuantitativeBreakdown({ data }: FacultyQuantitativeBreakdownProps) {
  // Aggregate question metrics across all evaluations
  const questionMap = new Map<
    string,
    {
      sectionKey: string;
      sectionTitle: string;
      itemKey: string;
      prompt: string;
      values: number[];
    }
  >();

  for (const evalData of data) {
    for (const question of evalData.quantitativeQuestions) {
      const key = `${question.sectionKey}:${question.itemKey}`;
      if (!questionMap.has(key)) {
        questionMap.set(key, {
          sectionKey: question.sectionKey,
          sectionTitle: question.sectionTitle,
          itemKey: question.itemKey,
          prompt: question.prompt,
          values: [],
        });
      }
      const entry = questionMap.get(key)!;
      if (question.mean !== null && question.responseCount > 0) {
        // Store weighted mean data
        entry.values.push(...Array(question.responseCount).fill(question.mean));
      }
    }
  }

  const questions: FacultyQuantitativeQuestion[] = Array.from(questionMap.values())
    .map((q) => {
      const mean =
        q.values.length > 0 ? q.values.reduce((a, b) => a + b, 0) / q.values.length : null;
      return {
        sectionKey: q.sectionKey,
        sectionTitle: q.sectionTitle,
        itemKey: q.itemKey,
        prompt: q.prompt,
        mean,
        min: q.values.length > 0 ? Math.min(...q.values) : null,
        max: q.values.length > 0 ? Math.max(...q.values) : null,
        responseCount: q.values.length,
      };
    })
    .filter((q) => q.responseCount > 0)
    .sort((a, b) => (b.mean || 0) - (a.mean || 0));

  if (questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-title-sm">Quantitative Questions</CardTitle>
          <CardDescription>No quantitative data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
            <p className="text-muted-foreground text-sm">No quantitative responses yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-title-sm">Quantitative Questions</CardTitle>
        <CardDescription>
          {questions.length} questions with {questions.reduce((sum, q) => sum + q.responseCount, 0)}{" "}
          total responses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead className="max-w-md">Question</TableHead>
                <TableHead className="text-right">Mean</TableHead>
                <TableHead className="text-right">Min</TableHead>
                <TableHead className="text-right">Max</TableHead>
                <TableHead className="text-right">Responses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((question) => (
                <TableRow key={`${question.sectionKey}:${question.itemKey}`}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {question.sectionTitle}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate text-sm">{question.prompt}</TableCell>
                  <TableCell className="text-right font-medium">
                    {question.mean !== null ? question.mean.toFixed(2) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right">
                    {question.min !== null ? question.min : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right">
                    {question.max !== null ? question.max : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right">
                    {question.responseCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

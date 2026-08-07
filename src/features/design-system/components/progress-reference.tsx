"use client";

import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";

export interface ProgressReferenceItem {
  id: string;
  label: string;
  detail: string;
  value: number;
}

/**
 * Client island for progress references.
 *
 * Base UI ProgressValue accepts a render-prop child, which cannot cross the
 * server/client boundary, so every ProgressValue reference renders here and
 * the sections stay Server Components.
 */
export function ProgressReference() {
  return (
    <Progress value={35} className="w-64">
      <ProgressLabel>Processing</ProgressLabel>
      <ProgressValue>{(value) => value ?? "35%"}</ProgressValue>
    </Progress>
  );
}

export function ProgressListReference({ items }: { items: readonly ProgressReferenceItem[] }) {
  return (
    <>
      {items.map((item) => (
        <Progress key={item.id} value={item.value} className="flex-col">
          <ProgressLabel>{item.label}</ProgressLabel>
          <ProgressValue>{(formattedValue) => formattedValue ?? item.detail}</ProgressValue>
        </Progress>
      ))}
    </>
  );
}

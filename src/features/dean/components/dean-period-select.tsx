"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DeanPeriodSelect({
  periods,
  selectedPeriodId,
}: {
  periods: Array<{ id: string; label: string }>;
  selectedPeriodId: string;
}) {
  const options = periods.map((period) => ({ value: period.id, label: period.label }));
  return (
    <Select name="period" defaultValue={selectedPeriodId} items={options}>
      <SelectTrigger id="period" className="bg-background h-11! w-full sm:min-w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        align="start"
        className="max-h-80 w-[max(var(--anchor-width),20rem)] max-w-[calc(100vw-2rem)]"
      >
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

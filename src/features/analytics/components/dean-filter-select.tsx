"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FilterOption = { value: string; label: string };

export function DeanFilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: FilterOption[];
}) {
  const id = `dean-filter-${name}`;
  return (
    <div className="text-body-sm flex min-w-0 flex-col gap-2">
      <label htmlFor={id}>{label}</label>
      <Select key={value} name={name} defaultValue={value} items={options}>
        <SelectTrigger id={id} className="bg-background h-11! w-full">
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
    </div>
  );
}

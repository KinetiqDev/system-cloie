"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Check, AlertTriangle } from "lucide-react";
import { searchFacultyPoolAction } from "@/lib/actions/course-assignment-actions";
import { useDebounce } from "@/hooks/use-debounce";
import type { FacultySearchResult } from "@/features/course-assignments/types";
interface FacultySearchPopoverProps {
  id?: string;
  selectedFacultyId: string | null;
  selectedFacultyName: string | null;
  targetProgramId?: string;
  targetProgramName?: string;
  onSelect: (faculty: FacultySearchResult) => void;
  disabled?: boolean;
}

export function FacultySearchPopover({
  id,
  selectedFacultyId,
  selectedFacultyName,
  targetProgramId,
  targetProgramName,
  onSelect,
  disabled = false,
}: FacultySearchPopoverProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FacultySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchFaculty = useCallback(async (searchQuery: string) => {
    setLoading(true);
    const result = await searchFacultyPoolAction(searchQuery, 0, 20);
    if (result.success) {
      setResults(result.data.items);
      setTotal(result.data.total);
    }
    setLoading(false);
  }, []);

  const debouncedSearch = useDebounce(fetchFaculty, 300);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      if (results.length === 0 && !loading) {
        void fetchFaculty("");
      }
    }
  };

  const handleSelect = (faculty: FacultySearchResult | null) => {
    if (faculty) {
      onSelect(faculty);
    }
  };

  const isCrossProgram = (faculty: FacultySearchResult) => {
    if (!targetProgramId || !targetProgramName) return false;
    return !faculty.affiliations.includes(targetProgramName);
  };

  const selectedFaculty: FacultySearchResult | null =
    selectedFacultyId && selectedFacultyName
      ? results.find((f) => f.id === selectedFacultyId) ?? {
          id: selectedFacultyId,
          name: selectedFacultyName,
          email: "",
          affiliations: [],
        }
      : null;

  return (
    <Combobox
      open={open}
      onOpenChange={handleOpenChange}
      value={selectedFaculty}
      onValueChange={handleSelect}
      disabled={disabled}
      items={results}
      filter={() => true}
      itemToStringLabel={(f) => f.name}
      itemToStringValue={(f) => f.id}
      autoHighlight
    >
      <ComboboxInput
        id={id}
        className="w-full"
        placeholder="Search faculty…"
        disabled={disabled}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          setQuery(e.target.value);
          debouncedSearch(e.target.value);
        }}
        onFocus={() => {
          if (results.length === 0 && !loading) {
            void fetchFaculty("");
          }
        }}
      />
      <ComboboxContent>
        {loading && (
          <div className="space-y-1 p-2">
            <div className="flex items-center gap-2 px-1 py-1">
              <Spinner size="sm" label="Searching faculty" />
              <span className="text-muted-foreground text-sm">Searching faculty…</span>
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {!loading && (
          <ComboboxEmpty>
            {query.trim() ? "No faculty match your search." : "No faculty available."}
          </ComboboxEmpty>
        )}

        <ComboboxList>
          {(faculty) => {
            const isSelected = selectedFacultyId === faculty.id;
            const isDifferentProgram = isCrossProgram(faculty);

            return (
              <ComboboxItem
                key={faculty.id}
                value={faculty}
                className="items-start py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {faculty.name}
                    </span>
                    {isSelected && (
                      <Check className="text-primary h-3.5 w-3.5 shrink-0" />
                    )}
                  </div>
                  {faculty.email && (
                    <div className="text-muted-foreground truncate text-xs">
                      {faculty.email}
                    </div>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {faculty.primaryAffiliationCode && (
                      <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                        {faculty.primaryAffiliationCode}
                      </Badge>
                    )}
                    {isDifferentProgram && (
                      <Badge variant="warning" className="gap-1 px-1.5 py-0 text-xs">
                        <AlertTriangle className="h-3 w-3" />
                        Different Program
                      </Badge>
                    )}
                  </div>
                </div>
              </ComboboxItem>
            );
          }}
        </ComboboxList>

        {!loading && total > results.length && (
          <div className="text-muted-foreground border-t px-2 py-1.5 text-center text-xs">
            +{total - results.length} more — type to narrow results
          </div>
        )}
      </ComboboxContent>
    </Combobox>
  );
}

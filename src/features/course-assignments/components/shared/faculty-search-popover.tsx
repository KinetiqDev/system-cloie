"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, AlertTriangle, User, ChevronDown } from "lucide-react";
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
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    debouncedSearch(value);
  };

  const handleSelect = (faculty: FacultySearchResult) => {
    onSelect(faculty);
    setOpen(false);
    setQuery("");
  };

  const isCrossProgram = (faculty: FacultySearchResult) => {
    if (!targetProgramId || !targetProgramName) return false;
    return !faculty.affiliations.includes(targetProgramName);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            id={id}
            disabled={disabled}
            aria-label={selectedFacultyName ? `Selected faculty: ${selectedFacultyName}` : undefined}
            className={[
              "border-input hover:bg-accent/50 bg-transparent flex min-h-11 w-full items-center justify-between rounded-lg border px-3 text-sm transition-colors",
              open ? "ring-ring ring-2 ring-offset-1" : "",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
            ].join(" ")}
          >
            {selectedFacultyId ? (
              <span className="flex items-center gap-2 truncate">
                <User className="text-muted-foreground h-4 w-4 shrink-0" />
                <span className="truncate font-medium">
                  {selectedFacultyName || "Unknown Faculty"}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">Search faculty...</span>
            )}
            <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
          </button>
        }
      />
      <PopoverContent className="w-[340px] max-w-[calc(100vw-2rem)] p-0">
        <PopoverHeader className="p-2 pb-0">
          <PopoverTitle className="sr-only">Search faculty</PopoverTitle>
          <PopoverDescription className="sr-only">
            Search faculty by name or email to assign to this course.
          </PopoverDescription>
        </PopoverHeader>
        <div className="p-2">
          <Input
            ref={inputRef}
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        <div className="max-h-[260px] overflow-y-auto px-1 pb-1" aria-busy={loading || undefined}>
          {loading && (
            <div className="space-y-1 p-1">
              <div className="flex items-center gap-2 px-1 py-1">
                <Spinner size="sm" label="Searching faculty" />
                <span className="text-muted-foreground text-sm">Searching faculty...</span>
              </div>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="text-muted-foreground py-6 text-center text-sm">
              {query.trim() ? `No faculty found matching "${query}"` : "No faculty available."}
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-0.5">
              {results.map((faculty) => {
                const isSelected = selectedFacultyId === faculty.id;
                const isDifferentProgram = isCrossProgram(faculty);

                return (
                  <button
                    key={faculty.id}
                    type="button"
                    onClick={() => handleSelect(faculty)}
                    aria-pressed={isSelected}
                    className={[
                      "hover:bg-accent flex w-full items-start gap-2 rounded-md p-2 text-left transition-colors",
                      isSelected ? "bg-accent" : "",
                    ].join(" ")}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {faculty.firstName} {faculty.lastName}
                        </span>
                        {isSelected && <Check className="text-primary h-3.5 w-3.5 shrink-0" />}
                      </div>
                      <div className="text-muted-foreground truncate text-xs">
                        {faculty.email}
                      </div>
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
                  </button>
                );
              })}
            </div>
          )}

          {!loading && total > results.length && (
            <div className="text-muted-foreground border-t px-2 py-1.5 text-center text-xs">
              +{total - results.length} more — type to narrow results
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

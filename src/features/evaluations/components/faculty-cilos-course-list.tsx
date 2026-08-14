"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, Plus, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TermInstancePicker } from "@/features/academic-calendar/components/term-instance-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { FacultyCourseWithCiloCount } from "@/features/evaluations/services/list-faculty-courses-with-cilos";
import type { TermInstanceItem } from "@/features/academic-calendar/types";

// ---------------------------------------------------------------------------
// Types for the CILO modal
// ---------------------------------------------------------------------------

type CiloItem = {
  id: string;
  description: string;
  isNew?: boolean;
};

type ViewEditCilosModalProps = {
  course: FacultyCourseWithCiloCount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadCilosAction: (courseId: string) => Promise<{
    success: boolean;
    cilos?: Array<{ id: string; description: string }>;
    error?: string;
  }>;
  saveCilosAction: (
    courseId: string,
    cilos: Array<{ id?: string; description: string }>
  ) => Promise<{ success: boolean; error?: string }>;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 15;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type FacultyCilosCourseListProps = {
  courses: FacultyCourseWithCiloCount[];
  termInstances: TermInstanceItem[];
  selectedTermId?: string;
  loadCilosAction: ViewEditCilosModalProps["loadCilosAction"];
  saveCilosAction: ViewEditCilosModalProps["saveCilosAction"];
};

// ---------------------------------------------------------------------------
// View/Edit CILOs Modal
// ---------------------------------------------------------------------------

function ViewEditCilosModal({
  course,
  open,
  onOpenChange,
  loadCilosAction,
  saveCilosAction,
}: ViewEditCilosModalProps) {
  const [cilos, setCilos] = useState<CiloItem[]>([]);
  const [newCiloText, setNewCiloText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load CILOs when modal opens
  const handleLoad = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await loadCilosAction(course.id);
      if (result.success && result.cilos) {
        setCilos(
          result.cilos.map((c) => ({
            id: c.id,
            description: c.description,
          }))
        );
        setLoaded(true);
      } else {
        setError(result.error ?? "Failed to load CILOs.");
      }
    } catch {
      setError("Failed to load CILOs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && !loaded && !isLoading) {
      queueMicrotask(() => {
        void handleLoad();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset when closing
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCilos([]);
      setLoaded(false);
      setError(null);
      setSuccessMessage(null);
      setNewCiloText("");
    }
    onOpenChange(nextOpen);
  };

  const handleAddCilo = () => {
    if (!newCiloText.trim()) return;
    setCilos((prev) => [
      ...prev,
      {
        id: `new-${crypto.randomUUID()}`,
        description: newCiloText.trim(),
        isNew: true,
      },
    ]);
    setNewCiloText("");
  };

  const handleRemoveCilo = (id: string) => {
    setCilos((prev) => {
      return prev.filter((c) => c.id !== id);
    });
  };

  const handleUpdateCilo = (id: string, description: string) => {
    setCilos((prev) => prev.map((c) => (c.id === id ? { ...c, description } : c)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const payload = cilos.map((c) => ({
        id: c.isNew ? undefined : c.id,
        description: c.description,
      }));
      const result = await saveCilosAction(course.id, payload);
      if (result.success) {
        setSuccessMessage("CILOs saved successfully.");
        // Reload to get fresh IDs
        await handleLoad();
      } else {
        setError(result.error ?? "Failed to save CILOs.");
      }
    } catch {
      setError("Failed to save CILOs.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            CILOs — {course.code}: {course.title}
          </DialogTitle>
          <DialogDescription>
            View and manage Course-Intended Learning Outcomes for this course.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {successMessage && (
          <Alert variant="success" role="status">
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="text-muted-foreground py-8 text-center text-sm">Loading CILOs...</div>
        ) : (
          <div className="space-y-4">
            {/* Existing CILOs */}
            {cilos.length === 0 ? (
              <div className="border-border text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
                No CILOs defined for this course yet.
              </div>
            ) : (
              <div className="space-y-2">
                {cilos.map((cilo, index) => (
                  <div
                    key={cilo.id}
                    className="border-border bg-surface flex items-start gap-3 rounded-lg border p-3"
                  >
                    <span className="bg-primary/10 text-link mt-1 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                      {index + 1}
                    </span>
                    <Input
                      value={cilo.description}
                      onChange={(e) => handleUpdateCilo(cilo.id, e.target.value)}
                      className="flex-1 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove CILO ${index + 1}`}
                      className="text-destructive hover:bg-destructive/10 min-h-11 min-w-11 shrink-0"
                      onClick={() => handleRemoveCilo(cilo.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new CILO */}
            <div className="flex gap-2">
              <Input
                placeholder="Type a new CILO description..."
                value={newCiloText}
                onChange={(e) => setNewCiloText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCilo();
                  }
                }}
              />
              <Button variant="outline" onClick={handleAddCilo}>
                Add
              </Button>
            </div>

            {/* Save */}
            <div className="border-border flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
              <Button onClick={handleSave} loading={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function FacultyCilosCourseList({
  courses,
  termInstances,
  selectedTermId,
  loadCilosAction,
  saveCilosAction,
}: FacultyCilosCourseListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [typeFilter, setTypeFilter] = useState<string>("__all__");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalCourse, setModalCourse] = useState<FacultyCourseWithCiloCount | null>(null);

  const handleTermChange = (value: string) => {
    const termId = value || null;
    const params = new URLSearchParams(searchParams);
    if (termId) {
      params.set("term", termId);
    } else {
      params.delete("term");
    }
    router.push(`?${params.toString()}`);
  };

  // ---- Filtered courses ----------------------------------------------------
  // fallow-ignore-next-line code-duplication
  const filteredCourses = useMemo(() => {
    let result = courses;

    if (typeFilter === "program_specific") {
      result = result.filter((c) => c.courseScope === "PROGRAM_SPECIFIC" && !c.majorId);
    } else if (typeFilter === "general_education") {
      result = result.filter((c) => c.courseScope === "GENERAL_EDUCATION");
    } else if (typeFilter === "major_specific") {
      result = result.filter((c) => c.majorId !== null);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (c) => c.code.toLowerCase().includes(term) || c.title.toLowerCase().includes(term)
      );
    }

    return result;
  }, [courses, typeFilter, searchTerm]);

  // ---- Pagination ----------------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCourses = filteredCourses.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleTypeChange = (value: string | null) => {
    setTypeFilter(value ?? "__all__");
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-heading-lg">Manage CILOs</h1>
          <p className="text-body-md text-muted-foreground">
            View and manage Course-Intended Learning Outcomes for your affiliated program courses.
          </p>
        </div>
        <Button render={<Link href="/faculty/cilos/new" />} className="shrink-0">
          <Plus className="mr-2 size-4" />
          Add New CILO
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72 shrink-0">
          <TermInstancePicker
            termInstances={termInstances}
            value={selectedTermId ?? ""}
            onChange={handleTermChange}
            placeholder="All Terms"
            label=""
          />
        </div>

        <div className="w-48 shrink-0">
        <Select value={typeFilter} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-full">
            <SelectValue>
              {typeFilter === "__all__"
                ? "All Course Types"
                : typeFilter === "program_specific"
                  ? "Program-Specific"
                  : typeFilter === "general_education"
                    ? "General Education"
                    : "Major-Specific"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Course Types</SelectItem>
            <SelectItem value="program_specific">Program-Specific</SelectItem>
            <SelectItem value="general_education">General Education</SelectItem>
            <SelectItem value="major_specific">Major-Specific</SelectItem>
          </SelectContent>
        </Select>
        </div>

        <div className="relative ml-auto w-full max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by code or title..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Data table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Course Code</TableHead>
            <TableHead>Course Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Major</TableHead>
            <TableHead className="text-right">CILOs</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedCourses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                No courses found.
              </TableCell>
            </TableRow>
          ) : (
            paginatedCourses.map((course) => (
              <TableRow key={course.id}>
                <TableCell className="font-bold">{course.code}</TableCell>
                <TableCell>{course.title}</TableCell>
                <TableCell>
                  <Badge variant="outline">{course.courseScopeLabel}</Badge>
                </TableCell>
                <TableCell>{course.majorName ?? "—"}</TableCell>
                <TableCell className="text-right">{course.ciloCount}</TableCell>
            <TableCell>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setModalCourse(course)}>
                  <Eye className="mr-1 size-4" />
                  View
                </Button>
                <Button variant="outline" size="sm" render={<Link href={`/faculty/cilos/${course.id}/alignment`} />}>
                  Align
                </Button>
              </div>
            </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-muted-foreground text-xs">
            {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filteredCourses.length)} of {filteredCourses.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            ←
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            →
          </Button>
        </div>
      )}

      {/* View/Edit CILOs Modal */}
      {modalCourse && (
        <ViewEditCilosModal
          course={modalCourse}
          open={!!modalCourse}
          onOpenChange={(open) => {
            if (!open) setModalCourse(null);
          }}
          loadCilosAction={loadCilosAction}
          saveCilosAction={saveCilosAction}
        />
      )}
    </div>
  );
}

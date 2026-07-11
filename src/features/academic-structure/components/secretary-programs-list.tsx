"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { BookOpen, GraduationCap, Layers, MoreVertical, Search, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toggleProgramActiveAction } from "@/lib/actions/admin-program-actions";
import { ManageMajorsDialog } from "./manage-majors-dialog";

import type {
  SecretaryProgramSummaryItem,
  SecretaryProgramsKPI,
} from "@/features/academic-structure/services/list-secretary-programs-summary";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 15;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type SecretaryProgramsListProps = {
  programs: SecretaryProgramSummaryItem[];
  kpi: SecretaryProgramsKPI;
  basePath?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SecretaryProgramsList({ programs, kpi, basePath = "/secretary/programs" }: SecretaryProgramsListProps) {
  // ---- Filter state -------------------------------------------------------
  const [statusFilter, setStatusFilter] = useState<string>("__all__");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  // ---- Manage Majors dialog state -----------------------------------------
  const [majorsDialogProgram, setMajorsDialogProgram] = useState<SecretaryProgramSummaryItem | null>(
    null
  );

  // ---- Filtered programs ---------------------------------------------------
  const filteredPrograms = useMemo(() => {
    let result = programs;

    // Status filter
    if (statusFilter === "active") {
      result = result.filter((p) => p.isActive);
    } else if (statusFilter === "inactive") {
      result = result.filter((p) => !p.isActive);
    }

    // Search by code or name
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (p) => p.code.toLowerCase().includes(term) || p.name.toLowerCase().includes(term)
      );
    }

    return result;
  }, [programs, statusFilter, searchTerm]);

  // ---- Pagination ----------------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(filteredPrograms.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPrograms = filteredPrograms.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  // Reset to page 1 when filters change
  const handleStatusChange = (value: string | null) => {
    setStatusFilter(value ?? "__all__");
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // ---- Action handlers -----------------------------------------------------
  const handleToggleActive = (programId: string, currentActive: boolean) => {
    startTransition(async () => {
      await toggleProgramActiveAction(programId, !currentActive);
    });
  };

  // ---- Pagination helpers --------------------------------------------------
  function buildPageNumbers(): (number | "ellipsis")[] {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("ellipsis");
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  }

  // ---- Render --------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-heading-lg">Academic Programs</h1>
        <p className="text-body-md text-text-secondary">
          Manage academic programs, their majors, and program metadata across the college.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Total Programs"
          value={kpi.totalPrograms}
          icon={<BookOpen className="text-muted-foreground size-5" />}
        />
        <KPICard
          label="Active Programs"
          value={kpi.activePrograms}
          icon={<Layers className="text-muted-foreground size-5" />}
        />
        <KPICard
          label="Programs with Majors"
          value={kpi.programsWithMajors}
          icon={<GraduationCap className="text-muted-foreground size-5" />}
        />
        <KPICard
          label="Total Majors"
          value={kpi.totalMajors}
          icon={<Users className="text-muted-foreground size-5" />}
        />
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-end">
        <Button render={<Link href={`${basePath}/new`} />}>Create Program</Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status filter */}
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue>
              {statusFilter === "__all__"
                ? "All Statuses"
                : statusFilter === "active"
                  ? "Active"
                  : "Inactive"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by code or name..."
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
            <TableHead>Code</TableHead>
            <TableHead>Program Name</TableHead>
            <TableHead>Majors</TableHead>
            <TableHead className="text-right">Courses</TableHead>
            <TableHead className="text-right">GOs</TableHead>
            <TableHead className="text-right">Students</TableHead>
            <TableHead className="text-right">Faculty</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedPrograms.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-muted-foreground h-24 text-center">
                No programs found.
              </TableCell>
            </TableRow>
          ) : (
            paginatedPrograms.map((program) => (
              <TableRow key={program.id}>
                <TableCell className="font-bold">{program.code}</TableCell>
                <TableCell>{program.name}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {program.majorNames.length > 0 ? program.majorNames.join(", ") : "—"}
                </TableCell>
                <TableCell className="text-right">{program.courseCount}</TableCell>
                <TableCell className="text-right">{program.goCount}</TableCell>
                <TableCell className="text-right">{program.studentCount}</TableCell>
                <TableCell className="text-right">{program.facultyCount}</TableCell>
                <TableCell>
                  <Badge variant={program.isActive ? "default" : "secondary"}>
                    {program.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="text-text-muted hover:bg-surface-muted hover:text-text-primary inline-flex size-8 items-center justify-center rounded-md transition-colors">
                      <MoreVertical className="size-4" />
                      <span className="sr-only">Actions</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        render={<Link href={`${basePath}/${program.id}/edit`} />}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setMajorsDialogProgram(program)}>
                        Manage Majors
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={isPending}
                        onClick={() => handleToggleActive(program.id, program.isActive)}
                      >
                        {program.isActive ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            ←
          </Button>

          {buildPageNumbers().map((page, idx) =>
            page === "ellipsis" ? (
              <span key={`ellipsis-${idx}`} className="text-muted-foreground px-2 text-sm">
                …
              </span>
            ) : (
              <Button
                key={page}
                variant={page === safePage ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            )
          )}

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

      {/* Result count */}
      <p className="text-muted-foreground text-center text-xs">
        Showing {(safePage - 1) * PAGE_SIZE + 1}–
        {Math.min(safePage * PAGE_SIZE, filteredPrograms.length)} of {filteredPrograms.length}{" "}
        program
        {filteredPrograms.length !== 1 ? "s" : ""}
      </p>

      {/* Manage Majors Dialog */}
      {majorsDialogProgram && (
        <ManageMajorsDialog
          program={{
            id: majorsDialogProgram.id,
            code: majorsDialogProgram.code,
            name: majorsDialogProgram.name,
          }}
          majors={majorsDialogProgram.majors}
          open={!!majorsDialogProgram}
          onOpenChange={(open) => {
            if (!open) setMajorsDialogProgram(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card sub-component
// ---------------------------------------------------------------------------

function KPICard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs font-semibold tracking-wider uppercase">
            {label}
          </CardDescription>
          {icon}
        </div>
        <CardTitle className="text-2xl font-bold">{value.toLocaleString()}</CardTitle>
      </CardHeader>
    </Card>
  );
}

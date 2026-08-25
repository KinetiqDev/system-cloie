"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  buildProgramHeadDashboardPath,
  buildProgramHeadProgramPath,
} from "@/lib/constants/program-head-routes";
import { getProgramHeadProgramIdFromPathname } from "@/lib/constants/navigation";
import type { ProgramHeadProgram } from "@/features/auth/services/resolve-program-head-context";

/**
 * Topbar dropdown that switches the active Program context while staying on
 * the same page. Renders nothing when the Program Head manages at most one
 * Program or when no Program context is selected in the pathname.
 */
export function ProgramHeadSwitcher({ programs }: { programs: ProgramHeadProgram[] }) {
  const pathname = usePathname();
  const activeProgramId = getProgramHeadProgramIdFromPathname(pathname);

  if (!activeProgramId || programs.length <= 1) {
    return null;
  }

  const activeProgram = programs.find((program) => program.id === activeProgramId);
  if (!activeProgram) {
    return null;
  }

  // Preserve the current child page so switching context does not drop the
  // user onto the other Program's dashboard — but only when the child path
  // contains no resource-scoped segments (UUIDs), which belong to the current
  // Program and would 404 under the destination.
  const childPath = pathname.match(/^\/program-head\/programs\/[^/]+(\/.*)?$/)?.[1] ?? "";
  const hasResourceSegment =
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/|$)/i.test(childPath);
  const safeChildPath = hasResourceSegment ? "" : childPath;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Switch Program. Current: ${activeProgram.code}`}
            className="hover:bg-sidebar-accent/40 hover:text-sidebar-foreground gap-1.5"
          >
            <span className="bg-primary/10 text-primary text-caption flex size-6 shrink-0 items-center justify-center rounded-md font-bold">
              {activeProgram.code.slice(0, 2)}
            </span>
            <span className="hidden max-w-44 truncate text-xs font-semibold md:inline">
              {activeProgram.code} — {activeProgram.name}
            </span>
            <span className="text-xs font-semibold md:hidden">{activeProgram.code}</span>
            <ChevronsUpDown className="text-sidebar-foreground/60 size-3.5" aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={8} className="w-72">
        <p className="text-caption text-text-muted px-2.5 pt-1.5 pb-1 font-medium tracking-wide uppercase">
          Switch Program
        </p>
        <DropdownMenuSeparator />
        {programs.map((program) => (
          <DropdownMenuItem
            key={program.id}
            aria-current={program.id === activeProgramId ? "page" : undefined}
            render={
              <Link
                href={
                  safeChildPath
                    ? buildProgramHeadProgramPath(program.id, safeChildPath)
                    : buildProgramHeadDashboardPath(program.id)
                }
              />
            }
            className="gap-2.5"
          >
            <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-bold">
              {program.code.slice(0, 2)}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">{program.code}</span>
              <span className="text-text-muted truncate text-xs">{program.name}</span>
            </span>
            {program.id === activeProgramId && (
              <Check className="text-primary size-4 shrink-0" aria-hidden="true" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

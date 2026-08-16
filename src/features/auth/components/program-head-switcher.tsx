"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronsUpDown, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getProgramHeadProgramIdFromPathname,
  PROGRAM_HEAD_NAV,
} from "@/lib/constants/navigation";
import {
  buildProgramHeadDashboardPath,
  buildProgramHeadProgramPath,
  PROGRAM_HEAD_ENTRY_PATH,
} from "@/lib/constants/program-head-routes";
import type { ProgramHeadProgram } from "@/features/auth/services/resolve-program-head-context";
import { cn } from "@/lib/utils";

interface ProgramHeadSwitcherProps {
  programs?: ProgramHeadProgram[];
}

function resolveTargetHref(targetProgramId: string, currentPathname: string): string {
  const currentProgramId = getProgramHeadProgramIdFromPathname(currentPathname);
  if (!currentProgramId) {
    return buildProgramHeadDashboardPath(targetProgramId);
  }

  const basePath = `${PROGRAM_HEAD_ENTRY_PATH}/programs/${encodeURIComponent(currentProgramId)}`;
  if (currentPathname.startsWith(basePath)) {
    const subPath = currentPathname.slice(basePath.length).replace(/^\/+/, "");
    // Check if subPath matches known child paths
    const matchedItem = PROGRAM_HEAD_NAV.find(
      (item) => item.programHeadChildPath && subPath.startsWith(item.programHeadChildPath)
    );
    if (matchedItem?.programHeadChildPath) {
      return buildProgramHeadProgramPath(targetProgramId, subPath);
    }
  }

  return buildProgramHeadDashboardPath(targetProgramId);
}

export function ProgramHeadSwitcher({ programs = [] }: ProgramHeadSwitcherProps) {
  const pathname = usePathname();

  // The program switcher should only appear on program head roled accounts that have more than one program
  if (programs.length <= 1) {
    return null;
  }

  const selectedProgramId = getProgramHeadProgramIdFromPathname(pathname);
  const currentProgram = programs.find((p) => p.id === selectedProgramId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="border-sidebar-border bg-sidebar hover:bg-sidebar-accent hover:text-sidebar-accent-foreground max-w-[200px] gap-2 px-2.5 sm:max-w-[280px]"
            aria-label="Switch program"
          >
            <div className="bg-primary/10 text-primary flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold">
              {currentProgram ? currentProgram.code.slice(0, 2) : <GraduationCap className="size-3" />}
            </div>
            <div className="flex min-w-0 flex-1 flex-col text-left">
              <span className="truncate text-xs font-semibold">
                {currentProgram ? currentProgram.code : "Select Program"}
              </span>
            </div>
            <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" data-icon="inline-end" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" sideOffset={8} className="w-64 p-0">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-semibold">
            Assigned Programs
          </DropdownMenuLabel>
          <DropdownMenuLabel className="text-muted-foreground text-caption py-0">
            Select a program to switch your workspace
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="flex flex-col gap-1 p-1">
          {programs.map((program) => {
            const isSelected = program.id === selectedProgramId;
            const targetHref = resolveTargetHref(program.id, pathname);

            return (
              <DropdownMenuItem
                key={program.id}
                render={<Link href={targetHref} />}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs",
                  isSelected && "bg-accent font-medium text-accent-foreground"
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {program.code.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{program.code}</p>
                    <p className="text-muted-foreground truncate text-[11px] font-normal">
                      {program.name}
                    </p>
                  </div>
                </div>
                {isSelected && <Check className="text-primary size-4 shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

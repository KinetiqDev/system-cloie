import Link from "next/link";
import { ArrowLeft, ChevronsUpDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PROGRAM_HEAD_ENTRY_PATH } from "@/lib/constants/program-head-routes";
import type { ProgramHeadProgram } from "@/features/auth/services/resolve-program-head-context";

export function ProgramHeadContextHeader({ program }: { program: ProgramHeadProgram }) {
  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
            {program.code.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.16em] uppercase">
              Selected Program
            </p>
            <p className="truncate text-sm font-semibold">
              {program.code} <span className="text-muted-foreground font-normal">{program.name}</span>
            </p>
          </div>
        </div>
        <Link
          href={PROGRAM_HEAD_ENTRY_PATH}
          aria-label="Switch selected Program"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ChevronsUpDown data-icon="inline-start" aria-hidden="true" />
          Switch Program
          <ArrowLeft data-icon="inline-end" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}

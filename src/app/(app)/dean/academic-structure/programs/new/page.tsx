"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgramForm } from "@/features/academic-structure/components/program-form";
import { createProgramAction } from "@/lib/actions/admin-program-actions";

export default function DeanCreateProgramPage() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/dean/academic-structure/programs" className="text-primary inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:underline"><ArrowLeft className="size-4" />Back</Link>
      <nav className="text-text-muted text-xs">Programs &gt; Create New Program</nav>
      <Card><CardHeader><CardTitle>Create New Program</CardTitle><CardDescription>Add a new academic program to the college.</CardDescription></CardHeader><CardContent><ProgramForm action={createProgramAction} submitLabel="Create Program" onSuccess={() => router.push("/dean/academic-structure/programs")} /></CardContent></Card>
    </div>
  );
}

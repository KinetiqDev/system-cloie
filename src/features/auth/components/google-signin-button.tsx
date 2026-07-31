"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton() {
  return (
    <Button variant="outline" className="h-12 w-full" render={<Link href="/" />}>
      Return to portal selection
    </Button>
  );
}
